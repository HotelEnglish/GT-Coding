import prisma from '../utils/db';
import { createAiProvider } from './ai/aiProvider';
import { assertEvidenceQuote, SegmentDraft } from './provenanceService';

/** Mutation window after which a queued/running run is presumed dead. */
const STALE_RUN_MS = 15 * 60 * 1000;

export class AnalysisRunError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function truncate(message: string, max = 500): string {
  return message.length > max ? message.slice(0, max - 1) + '…' : message;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Creates an analysis run in `queued` state and returns immediately (202).
 * Execution continues in-process; the client polls GET /analysis-runs/:id.
 * The idempotency race is resolved via the (workspaceId, requestKey) unique
 * constraint: a losing concurrent create catches P2002 and returns the winner.
 */
export async function startAnalysisRun(
  workspaceId: string,
  projectId: string,
  documentVersionId: string,
  requestKey: string,
) {
  const existing = await prisma.analysisRun.findUnique({
    where: { workspaceId_requestKey: { workspaceId, requestKey } },
    include: { modelRun: true },
  });
  if (existing) return existing;

  const documentVersion = await prisma.sourceDocumentVersion.findFirst({
    where: { id: documentVersionId, document: { projectId, project: { workspaceId } } },
    include: { segments: { orderBy: { startOffset: 'asc' } }, document: true },
  });
  if (!documentVersion) {
    throw new AnalysisRunError(404, 'NOT_FOUND', '未找到属于当前工作区的资料版本。');
  }

  let run;
  try {
    run = await prisma.analysisRun.create({
      data: {
        workspaceId,
        projectId,
        documentVersionId,
        requestKey,
        status: 'queued',
        progress: '排队等待执行',
      },
    });
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      const winner = await prisma.analysisRun.findUnique({
        where: { workspaceId_requestKey: { workspaceId, requestKey } },
        include: { modelRun: true },
      });
      if (winner) return winner;
    }
    throw error;
  }

  // Fire-and-forget execution. All failures must be contained here; the run row
  // is the only interface to the caller.
  void executeRun(run.id, projectId, documentVersion.segments).catch((error) => {
    console.error(`Analysis run ${run.id} escaped execution error:`, error);
  });

  return run;
}

async function executeRun(
  runId: string,
  projectId: string,
  segments: Array<SegmentDraft & { id: string }>,
) {
  const startedAt = new Date();

  const fail = async (message: string) => {
    try {
      await prisma.analysisRun.update({
        where: { id: runId },
        data: { status: 'failed', errorMessage: truncate(message), completedAt: new Date(), progress: null },
      });
    } catch (updateError) {
      console.error(`Analysis run ${runId} failed and could not record failure:`, updateError);
    }
  };

  try {
    await prisma.analysisRun.update({
      where: { id: runId },
      data: { status: 'running', startedAt, progress: '调用模型生成建议' },
    });

    if (segments.length === 0) {
      throw new Error('资料版本没有可分析的文本片段。');
    }

    const provider = createAiProvider();
    const result = await provider.analyze(segments);
    if (result.candidate.codes.length === 0 && result.candidate.memoDrafts.length === 0) {
      throw new Error('模型没有产生任何候选建议。');
    }

    await prisma.analysisRun.update({
      where: { id: runId },
      data: { status: 'running', startedAt, progress: '校验证据引语' },
    });

    for (const candidate of result.candidate.codes) {
      const segmentIndex = segments.findIndex((segment) => segment.text.includes(candidate.quote));
      if (segmentIndex < 0) {
        throw new Error('模型建议含有无法在原文验证的引语。');
      }
      assertEvidenceQuote(segments[segmentIndex], candidate.quote);
    }

    await prisma.analysisRun.update({
      where: { id: runId },
      data: { status: 'running', startedAt, progress: '落库建议' },
    });

    await prisma.$transaction(async (tx) => {
      for (const candidate of result.candidate.codes) {
        const sourceSegment = segments.find((segment) => segment.text.includes(candidate.quote));
        if (!sourceSegment) {
          throw new Error('模型建议含有无法在原文验证的引语。');
        }
        const code = await tx.researchCode.upsert({
          where: { projectId_label: { projectId, label: candidate.label } },
          update: {},
          create: { projectId, label: candidate.label, origin: 'ai', status: 'suggested' },
        });
        await tx.codeAssignment.create({
          data: {
            codeId: code.id,
            sourceSegmentId: sourceSegment.id,
            evidenceQuote: candidate.quote,
            rationale: candidate.rationale,
            origin: 'ai',
            status: 'suggested',
          },
        });
      }

      for (const content of result.candidate.memoDrafts) {
        await tx.analyticMemo.create({ data: { projectId, content, origin: 'ai', status: 'suggested' } });
      }

      await tx.modelRun.create({
        data: {
          analysisRunId: runId,
          provider: result.provider,
          model: result.model,
          promptVersion: 'procedural-mvp-v2',
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: Date.now() - startedAt.getTime(),
          requestMetadata: { mode: process.env.AI_PROVIDER || 'development' },
        },
      });
      await tx.analysisRun.update({
        where: { id: runId },
        data: { status: 'completed', completedAt: new Date(), progress: null },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '分析运行失败。';
    await fail(message);
  }
}

/**
 * Recovers runs orphaned by a process restart: everything still queued/running
 * at boot can no longer execute and is marked failed for the researcher.
 */
export async function markOrphanedRunsFailed(): Promise<void> {
  await prisma.analysisRun.updateMany({
    where: { status: { in: ['queued', 'running'] } },
    data: {
      status: 'failed',
      errorMessage: truncate('进程未等待本次运行完成（应用重启或中断）。'),
      completedAt: new Date(),
      progress: null,
    },
  });
}

/**
 * Passive recovery for the long-lived process case: a GET may observe a run
 * whose execution promise was silently lost. Runs older than the window are
 * declared failed so they are never displayed as "running" forever.
 */
export async function reconcileRun(runId: string) {
  const run = await prisma.analysisRun.findUnique({ where: { id: runId }, include: { modelRun: true } });
  if (!run) return null;
  const phaseAt = run.startedAt ?? run.createdAt;
  if ((run.status === 'queued' || run.status === 'running') && Date.now() - phaseAt.getTime() > STALE_RUN_MS) {
    return prisma.analysisRun.update({
      where: { id: runId },
      data: {
        status: 'failed',
        errorMessage: truncate('模型运行长时间未完成，已按失败处理。请使用新的 Idempotency-Key 重试。'),
        completedAt: new Date(),
        progress: null,
      },
      include: { modelRun: true },
    });
  }
  return run;
}

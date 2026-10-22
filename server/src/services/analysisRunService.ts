import prisma from '../utils/db';
import { createAiProvider } from './ai/aiProvider';
import { assertEvidenceQuote } from './provenanceService';

export async function createAndExecuteAnalysisRun(
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
  if (!documentVersion) throw new Error('未找到属于当前工作区的资料版本。');

  const run = await prisma.analysisRun.create({
    data: { workspaceId, projectId, documentVersionId, requestKey, status: 'queued' },
  });

  const startedAt = new Date();
  await prisma.analysisRun.update({ where: { id: run.id }, data: { status: 'running', startedAt } });

  try {
    const provider = createAiProvider();
    const result = await provider.analyze(documentVersion.segments);
    const segmentDrafts = documentVersion.segments.map((segment) => ({
      startOffset: segment.startOffset,
      endOffset: segment.endOffset,
      text: segment.text,
      contentHash: segment.contentHash,
    }));

    await prisma.$transaction(async (tx) => {
      for (const candidate of result.candidate.codes) {
        const segmentIndex = segmentDrafts.findIndex((segment) => segment.text.includes(candidate.quote));
        if (segmentIndex < 0) throw new Error('模型建议含有无法在原文验证的引语。');
        assertEvidenceQuote(segmentDrafts[segmentIndex], candidate.quote);
        const sourceSegment = documentVersion.segments[segmentIndex];
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
          analysisRunId: run.id,
          provider: result.provider,
          model: result.model,
          promptVersion: 'procedural-mvp-v1',
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          latencyMs: Date.now() - startedAt.getTime(),
          requestMetadata: { mode: process.env.AI_PROVIDER || 'development' },
        },
      });
      await tx.analysisRun.update({ where: { id: run.id }, data: { status: 'completed', completedAt: new Date() } });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '分析运行失败。';
    await prisma.analysisRun.update({ where: { id: run.id }, data: { status: 'failed', errorMessage: message, completedAt: new Date() } });
  }

  return prisma.analysisRun.findUniqueOrThrow({
    where: { id: run.id },
    include: { modelRun: true },
  });
}

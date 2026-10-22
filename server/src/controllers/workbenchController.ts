import { Request, Response } from 'express';
import prisma from '../utils/db';
import { createSegments, hashContent, assertEvidenceQuote, SegmentDraft } from '../services/provenanceService';
import {
  startAnalysisRun,
  reconcileRun,
  AnalysisRunError,
} from '../services/analysisRunService';
import { buildAuditArchiveFile, AuditFormat } from '../services/auditExportService';

function workspaceId(req: Request): string {
  if (!req.workspaceId) throw new Error('本地工作区标识缺失。');
  return req.workspaceId;
}

async function requireProject(projectId: string, ws: string) {
  const project = await prisma.researchProject.findFirst({ where: { id: projectId, workspaceId: ws } });
  if (!project) return null;
  return project;
}

export async function createProject(req: Request, res: Response) {
  try {
    const { title, researchQuestion } = req.body as { title?: unknown; researchQuestion?: unknown };
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '请输入研究项目名称。' } });
    }
    const project = await prisma.researchProject.create({
      data: {
        workspaceId: workspaceId(req),
        title: title.trim().slice(0, 200),
        researchQuestion: typeof researchQuestion === 'string' ? researchQuestion.trim().slice(0, 2000) : null,
        methodology: 'procedural',
      },
    });
    return res.status(201).json({ success: true, data: project });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function listProjects(req: Request, res: Response) {
  try {
    const projects = await prisma.researchProject.findMany({
      where: { workspaceId: workspaceId(req) },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { documents: true, analysisRuns: true } } },
    });
    return res.json({ success: true, data: projects });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function createDocument(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { title, content } = req.body as { title?: unknown; content?: unknown };
    if (typeof title !== 'string' || !title.trim() || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '资料标题和文本内容不能为空。' } });
    }
    if (content.length > 100_000) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '单份资料不能超过 100,000 个字符。' } });
    }
    const project = await requireProject(projectId, workspaceId(req));
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到研究项目。' } });

    const segments = createSegments(content);
    const document = await prisma.sourceDocument.create({
      data: {
        projectId,
        title: title.trim().slice(0, 200),
        versions: {
          create: {
            version: 1,
            content,
            contentHash: hashContent(content),
            segments: { create: segments },
          },
        },
      },
      include: { versions: { include: { segments: { orderBy: { startOffset: 'asc' } } } } },
    });
    return res.status(201).json({ success: true, data: document });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function listProjectDocuments(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const project = await requireProject(projectId, workspaceId(req));
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到研究项目。' } });

    const documents = await prisma.sourceDocument.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { versions: { orderBy: { version: 'desc' }, include: { segments: { orderBy: { startOffset: 'asc' } } } } },
    });
    return res.json({ success: true, data: documents });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function getProjectOverview(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const project = await requireProject(projectId, workspaceId(req));
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到研究项目。' } });

    const [codes, memos, relationships, saturationAssessment] = await Promise.all([
      prisma.researchCode.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
        include: {
          assignments: {
            orderBy: { createdAt: 'asc' },
            include: {
              sourceSegment: {
                include: { documentVersion: { select: { id: true, version: true, contentHash: true } } },
              },
            },
          },
        },
      }),
      prisma.analyticMemo.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } }),
      prisma.categoryRelationship.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } }),
      prisma.saturationAssessment.findUnique({ where: { projectId } }),
    ]);

    return res.json({ success: true, data: { project, codes, memos, relationships, saturationAssessment } });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function startAnalysisRunHandler(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { documentVersionId } = req.body as { documentVersionId?: unknown };
    const requestKey = req.header('idempotency-key');
    if (typeof documentVersionId !== 'string' || !requestKey || requestKey.length > 128) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '需要资料版本和 Idempotency-Key。' } });
    }
    const run = await startAnalysisRun(workspaceId(req), projectId, documentVersionId, requestKey);
    const alreadyExisted = run.status !== 'queued' || run.startedAt !== null;
    return res.status(alreadyExisted ? 200 : 202).json({ success: true, data: run });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function getAnalysisRun(req: Request, res: Response) {
  try {
    const run = await reconcileRun(req.params.id);
    if (!run || run.workspaceId !== workspaceId(req)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到分析运行。' } });
    }
    return res.json({ success: true, data: run });
  } catch (error) {
    return respondError(res, error);
  }
}

const DECISION_ACTIONS = new Set(['accept', 'edit', 'reject', 'defer']);
const ACTION_TO_STATUS: Record<string, 'accepted' | 'edited' | 'rejected' | 'deferred'> = {
  accept: 'accepted',
  edit: 'edited',
  reject: 'rejected',
  defer: 'deferred',
};

export async function decideCodeAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, quote, rationale } = req.body as {
      action?: unknown;
      quote?: unknown;
      rationale?: unknown;
    };

    if (typeof action !== 'string' || !DECISION_ACTIONS.has(action)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '无效的研究决策动作。' } });
    }
    if (quote !== undefined && typeof quote !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '编辑后的引语必须是字符串。' } });
    }
    if (rationale !== undefined && rationale !== null && typeof rationale !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '编辑后的理由必须是字符串。' } });
    }

    const assignment = await prisma.codeAssignment.findUnique({
      where: { id },
      include: {
        code: { include: { project: true } },
        sourceSegment: true,
      },
    });
    if (!assignment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到编码建议。' } });
    }
    if (assignment.code.project.workspaceId !== workspaceId(req)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到编码建议。' } });
    }

    const status = ACTION_TO_STATUS[action];

    if (status === 'edited') {
      const nextQuote = typeof quote === 'string' && quote.trim() ? quote : assignment.evidenceQuote;
      if (action === 'edit' && nextQuote !== assignment.evidenceQuote) {
        const segment: SegmentDraft = {
          startOffset: assignment.sourceSegment.startOffset,
          endOffset: assignment.sourceSegment.endOffset,
          text: assignment.sourceSegment.text,
          contentHash: assignment.sourceSegment.contentHash,
        };
        if (!segment.text.includes(nextQuote)) {
          assertEvidenceQuote(segment, nextQuote);
        }
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.codeAssignment.update({
          where: { id },
          data: {
            status,
            evidenceQuote: nextQuote,
            rationale: typeof rationale === 'string' ? rationale : assignment.rationale,
            originalQuote: assignment.originalQuote ?? assignment.evidenceQuote,
            originalRationale: assignment.originalRationale ?? assignment.rationale,
          },
        });
        await tx.researchDecision.create({
          data: { codeAssignmentId: id, action: status, rationale: typeof rationale === 'string' ? rationale : null },
        });
        return prisma.codeAssignment.findUnique({ where: { id } });
      });
      return res.json({ success: true, data: updated });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.codeAssignment.update({ where: { id }, data: { status } });
      await tx.researchDecision.create({
        data: { codeAssignmentId: id, action: status, rationale: typeof rationale === 'string' ? rationale : null },
      });
      return prisma.codeAssignment.findUnique({ where: { id } });
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function createMemo(req: Request, res: Response) {
  try {
    const { projectId, content } = req.body as { projectId?: unknown; content?: unknown };
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '备忘内容不能为空。' } });
    }
    if (typeof projectId !== 'string' || !(await requireProject(projectId, workspaceId(req)))) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到研究项目。' } });
    }

    const memo = await prisma.analyticMemo.create({
      data: { projectId, content: content.trim().slice(0, 5000), origin: 'researcher', status: 'accepted' },
    });
    return res.status(201).json({ success: true, data: memo });
  } catch (error) {
    return respondError(res, error);
  }
}

const MEMO_ACTIONS = new Set(['accept', 'reject', 'defer']);

export async function decideMemo(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action } = req.body as { action?: unknown };
    if (typeof action !== 'string' || !MEMO_ACTIONS.has(action)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '无效的研究决策动作。' } });
    }

    const memo = await prisma.analyticMemo.findUnique({ where: { id }, include: { project: true } });
    if (!memo || memo.project.workspaceId !== workspaceId(req)) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到备忘录。' } });
    }

    const status = ACTION_TO_STATUS[action];
    const updated = await prisma.$transaction(async (tx) => {
      await tx.analyticMemo.update({ where: { id }, data: { status } });
      await tx.researchDecision.create({ data: { memoId: id, action: status } });
      return prisma.analyticMemo.findUnique({ where: { id } });
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function putSaturationAssessment(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { payload } = req.body as { payload?: unknown };

    if (
      payload === null ||
      typeof payload !== 'object' ||
      typeof (payload as { decision?: unknown }).decision !== 'string' ||
      !(payload as { decision: string }).decision.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '饱和度评估必须包含研究者本人的决策结论。' },
      });
    }

    const project = await requireProject(projectId, workspaceId(req));
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到研究项目。' } });

    const assessment = await prisma.saturationAssessment.upsert({
      where: { projectId },
      create: { projectId, payload: payload as object },
      update: { payload: payload as object },
    });
    return res.json({ success: true, data: assessment });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function exportProjectAudit(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const requested = typeof req.query.format === 'string' ? req.query.format : 'json';
    if (!['json', 'csv'].includes(requested)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '导出格式仅支持 json 或 csv。' } });
    }
    const project = await requireProject(projectId, workspaceId(req));
    if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到研究项目。' } });

    const file = await buildAuditArchiveFile(project, requested as AuditFormat);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    console.log(`[audit-export] workspace=${workspaceId(req)} project=${projectId} format=${requested}`);
    return res.status(200).type(file.contentType).send(file.body);
  } catch (error) {
    return respondError(res, error);
  }
}

function respondError(res: Response, error: unknown) {
  if (error instanceof AnalysisRunError) {
    return res.status(error.status).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }
  console.error('Workbench error:', error);
  return res.status(500).json({
    success: false,
    error: { code: 'WORKBENCH_ERROR', message: '研究工作台请求失败。' },
  });
}

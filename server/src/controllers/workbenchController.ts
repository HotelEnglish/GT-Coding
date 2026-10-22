import { Request, Response } from 'express';
import prisma from '../utils/db';
import { createSegments, hashContent } from '../services/provenanceService';
import { createAndExecuteAnalysisRun } from '../services/analysisRunService';

function workspaceId(req: Request): string {
  if (!req.workspaceId) throw new Error('本地工作区标识缺失。');
  return req.workspaceId;
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
    const project = await prisma.researchProject.findFirst({ where: { id: projectId, workspaceId: workspaceId(req) } });
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

export async function startAnalysisRun(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { documentVersionId } = req.body as { documentVersionId?: unknown };
    const requestKey = req.header('idempotency-key');
    if (typeof documentVersionId !== 'string' || !requestKey || requestKey.length > 128) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '需要资料版本和 Idempotency-Key。' } });
    }
    const run = await createAndExecuteAnalysisRun(workspaceId(req), projectId, documentVersionId, requestKey);
    return res.status(run.status === 'failed' ? 422 : 201).json({ success: run.status !== 'failed', data: run });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function getAnalysisRun(req: Request, res: Response) {
  try {
    const run = await prisma.analysisRun.findFirst({
      where: { id: req.params.id, workspaceId: workspaceId(req) },
      include: { modelRun: true },
    });
    if (!run) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '未找到分析运行。' } });
    return res.json({ success: true, data: run });
  } catch (error) {
    return respondError(res, error);
  }
}

function respondError(res: Response, error: unknown) {
  console.error('Workbench error:', error);
  return res.status(500).json({
    success: false,
    error: { code: 'WORKBENCH_ERROR', message: '研究工作台请求失败。' },
  });
}

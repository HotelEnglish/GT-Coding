import axios, { AxiosResponse } from 'axios';
import { z } from 'zod';
import apiClient from './apiClient';

const WORKBENCH_BASE = '/api/workbench';
const WORKSPACE_HEADER = 'x-gt-workspace';
export const DEFAULT_WORKSPACE_ID = 'local-default';

// ==========================================
// ERRORS
// ==========================================

export class WorkbenchApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'WorkbenchApiError';
    this.code = code;
    this.status = status;
  }
}

// ==========================================
// CONTRACT SCHEMAS
// ==========================================

export const wsProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  researchQuestion: z.string().nullable().optional(),
  methodology: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ documents: z.number(), analysisRuns: z.number() }).optional(),
});
export type WsProject = z.infer<typeof wsProjectSchema>;

export const wsSegmentSchema = z.object({
  id: z.string(),
  startOffset: z.number(),
  endOffset: z.number(),
  text: z.string(),
  contentHash: z.string(),
});

export const wsDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string(),
  versions: z.array(
    z.object({
      id: z.string(),
      version: z.number(),
      contentHash: z.string(),
      createdAt: z.string(),
      segments: z.array(wsSegmentSchema),
    })
  ),
});
export type WsDocument = z.infer<typeof wsDocumentSchema>;

export const wsAssignmentSchema = z.object({
  id: z.string(),
  evidenceQuote: z.string(),
  origin: z.string(),
  status: z.string(),
  rationale: z.string().nullable().optional(),
  originalQuote: z.string().nullable().optional(),
  originalRationale: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sourceSegment: wsSegmentSchema.extend({
    documentVersion: z.object({ id: z.string(), version: z.number(), contentHash: z.string() }),
  }),
});
export type WsAssignment = z.infer<typeof wsAssignmentSchema>;

export const wsCodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  definition: z.string().nullable().optional(),
  origin: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  assignments: z.array(wsAssignmentSchema),
});
export type WsCode = z.infer<typeof wsCodeSchema>;

export const wsMemoSchema = z.object({
  id: z.string(),
  content: z.string(),
  origin: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WsMemo = z.infer<typeof wsMemoSchema>;

export const wsOverviewSchema = z.object({
  project: wsProjectSchema,
  codes: z.array(wsCodeSchema),
  memos: z.array(wsMemoSchema),
  relationships: z.array(z.object({ id: z.string(), relationType: z.string() }).passthrough()),
  saturationAssessment: z
    .object({ id: z.string(), projectId: z.string(), payload: z.unknown() })
    .nullable(),
});
export type WsOverview = z.infer<typeof wsOverviewSchema>;

export const wsRunSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  documentVersionId: z.string(),
  requestKey: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'stalled']),
  progress: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
});
export type WsRun = z.infer<typeof wsRunSchema>;

// ==========================================
// RUN STATUS HELPERS
// ==========================================

export function isRunActive(status: WsRun['status']): boolean {
  return status === 'queued' || status === 'running';
}

// ==========================================
// INTERNAL UTILITIES
// ==========================================

interface Envelope {
  success?: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
}

function workspaceHeaders(workspaceId: string | undefined): Record<string, string> {
  return { [WORKSPACE_HEADER]: workspaceId || DEFAULT_WORKSPACE_ID };
}

function newRequestKey(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function unwrap<T>(schema: z.ZodType<T>, request: Promise<AxiosResponse<Envelope>>): Promise<T> {
  let response: AxiosResponse<Envelope>;
  try {
    response = await request;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const env = (error.response?.data ?? {}) as Envelope;
      throw new WorkbenchApiError(
        env.error?.code ?? 'NETWORK_ERROR',
        env.error?.message ?? '研究工作台请求失败，请检查后端服务。',
        error.response?.status ?? 0
      );
    }
    throw error;
  }
  const payload = response.data;
  if (!payload?.success || payload.data === undefined) {
    throw new WorkbenchApiError(
      payload?.error?.code ?? 'UNKNOWN',
      payload?.error?.message ?? '请求失败。',
      response.status
    );
  }
  const parsed = schema.safeParse(payload.data);
  if (!parsed.success) {
    throw new WorkbenchApiError('CONTRACT_MISMATCH', '服务端返回的数据结构与预期不一致。', response.status);
  }
  return parsed.data;
}

// ==========================================
// PROJECTS
// ==========================================

export async function fetchProjects(workspaceId?: string): Promise<WsProject[]> {
  return unwrap(
    z.array(wsProjectSchema),
    apiClient.get(`${WORKBENCH_BASE}/projects`, { headers: workspaceHeaders(workspaceId) })
  );
}

export async function createProject(
  workspaceId: string | undefined,
  input: { title: string; researchQuestion?: string }
): Promise<WsProject> {
  return unwrap(
    wsProjectSchema,
    apiClient.post(`${WORKBENCH_BASE}/projects`, input, { headers: workspaceHeaders(workspaceId) })
  );
}

// ==========================================
// DOCUMENTS
// ==========================================

export async function fetchDocuments(workspaceId: string | undefined, projectId: string): Promise<WsDocument[]> {
  return unwrap(
    z.array(wsDocumentSchema),
    apiClient.get(`${WORKBENCH_BASE}/projects/${projectId}/documents`, { headers: workspaceHeaders(workspaceId) })
  );
}

export async function createDocument(
  workspaceId: string | undefined,
  projectId: string,
  input: { title: string; content: string }
): Promise<WsDocument> {
  return unwrap(
    wsDocumentSchema,
    apiClient.post(`${WORKBENCH_BASE}/projects/${projectId}/documents`, input, {
      headers: workspaceHeaders(workspaceId),
    })
  );
}

// ==========================================
// OVERVIEW (codes / memos / saturation)
// ==========================================

export async function fetchOverview(workspaceId: string | undefined, projectId: string): Promise<WsOverview> {
  return unwrap(
    wsOverviewSchema,
    apiClient.get(`${WORKBENCH_BASE}/projects/${projectId}/overview`, { headers: workspaceHeaders(workspaceId) })
  );
}

// ==========================================
// ANALYSIS RUNS
// ==========================================

export interface StartRunResult {
  run: WsRun;
  requestKey: string;
  alreadyStarted: boolean;
}

export async function startAnalysisRun(
  workspaceId: string | undefined,
  projectId: string,
  documentVersionId: string
): Promise<StartRunResult> {
  // A fresh idempotency key per user click: retrying the very same HTTP
  // request (network blip) reuses the key, a new click starts a new run.
  const requestKey = newRequestKey();
  const response = await apiClient.post(
    `${WORKBENCH_BASE}/projects/${projectId}/analysis-runs`,
    { documentVersionId },
    { headers: { ...workspaceHeaders(workspaceId), 'idempotency-key': requestKey } }
  );
  const run = wsRunSchema.parse(response.data?.data);
  return { run, requestKey, alreadyStarted: response.status === 200 };
}

export async function fetchAnalysisRun(workspaceId: string | undefined, runId: string): Promise<WsRun> {
  return unwrap(
    wsRunSchema,
    apiClient.get(`${WORKBENCH_BASE}/analysis-runs/${runId}`, { headers: workspaceHeaders(workspaceId) })
  );
}

// ==========================================
// RESEARCH DECISIONS
// ==========================================

export type DecisionAction = 'accept' | 'edit' | 'reject' | 'defer';

export async function decideCodeAssignment(
  workspaceId: string | undefined,
  assignmentId: string,
  input: { action: DecisionAction; quote?: string; rationale?: string }
): Promise<WsAssignment> {
  return unwrap(
    wsAssignmentSchema,
    apiClient.post(`${WORKBENCH_BASE}/code-assignments/${assignmentId}/decisions`, input, {
      headers: workspaceHeaders(workspaceId),
    })
  );
}

export type MemoAction = 'accept' | 'reject' | 'defer';

export async function createMemo(
  workspaceId: string | undefined,
  input: { projectId: string; content: string }
): Promise<WsMemo> {
  const schema = wsMemoSchema.extend({ projectId: z.string() });
  return unwrap(
    schema,
    apiClient.post(`${WORKBENCH_BASE}/memos`, input, { headers: workspaceHeaders(workspaceId) })
  );
}

export async function decideMemo(
  workspaceId: string | undefined,
  memoId: string,
  action: MemoAction
): Promise<WsMemo> {
  return unwrap(
    wsMemoSchema,
    apiClient.post(`${WORKBENCH_BASE}/memos/${memoId}/decisions`, { action }, {
      headers: workspaceHeaders(workspaceId),
    })
  );
}

// ==========================================
// SATURATION ASSESSMENT
// ==========================================

export async function saveSaturationAssessment(
  workspaceId: string | undefined,
  projectId: string,
  payload: { scope?: string; decision: string; undecidedQuestions?: string; counterexamples?: string; rationale?: string }
): Promise<{ id: string; payload: unknown }> {
  const schema = z.object({ id: z.string(), payload: z.unknown() });
  return unwrap(
    schema,
    apiClient.put(`${WORKBENCH_BASE}/projects/${projectId}/saturation-assessment`, { payload }, {
      headers: workspaceHeaders(workspaceId),
    })
  );
}

// ==========================================
// AUDIT EXPORT
// ==========================================

export type AuditFormat = 'json' | 'csv';

/** Direct download URL — browsers handle Content-Disposition natively. */
export function auditExportUrl(projectId: string, format: AuditFormat): string {
  const base = apiClient.defaults.baseURL ?? '';
  return `${base}${WORKBENCH_BASE}/projects/${projectId}/audit-export?format=${format}`;
}

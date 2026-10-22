import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_WORKSPACE_ID,
  WsCode,
  WsDocument,
  WsMemo,
  WsOverview,
  WsProject,
  WsRun,
  WorkbenchApiError,
  auditExportUrl,
  createDocument,
  createMemo,
  createProject,
  decideCodeAssignment,
  decideMemo,
  fetchAnalysisRun,
  fetchDocuments,
  fetchOverview,
  fetchProjects,
  isRunActive,
  saveSaturationAssessment,
  startAnalysisRun,
} from '../utils/workbenchApi';
import type { DecisionAction, MemoAction } from '../utils/workbenchApi';

export interface SaturationForm {
  scope: string;
  decision: string;
  undecidedQuestions: string;
  counterexamples: string;
  rationale: string;
}

interface WorkbenchState {
  // identity
  workspaceId: string;

  // project list / selection
  projects: WsProject[];
  activeProjectId: string | null;

  // workspace data for the active project
  documents: WsDocument[];
  overview: { codes: WsCode[]; memos: WsMemo[]; saturation: SaturationForm | null; relationships: WsOverview['relationships'] } | null;
  run: WsRun | null;
  lastRequestKey: string | null;

  // document creation form
  newDocTitle: string;
  newDocContent: string;

  // memo creation form
  newMemoContent: string;

  // UI mode flags
  isProjectsLoading: boolean;
  isWorkspaceLoading: boolean;
  isActionPending: boolean;
  error: string | null;
  notice: string | null;

  // actions
  loadProjects: () => Promise<void>;
  selectProject: (projectId: string | null) => Promise<void>;
  createProject: (title: string, researchQuestion?: string) => Promise<void>;
  setNewDocDraft: (title: string, content: string) => void;
  submitDocument: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  pollRun: () => Promise<void>;
  launchRun: (documentVersionId: string) => Promise<void>;
  editDecision: (assignmentId: string, quote: string, rationale: string) => Promise<void>;
  decideAssignment: (assignmentId: string, action: Exclude<DecisionAction, 'edit'>) => Promise<void>;
  decideMemo: (memoId: string, action: MemoAction) => Promise<void>;
  addMemo: (content: string) => Promise<void>;
  setNewMemoContent: (content: string) => void;
  setSaturationDraft: (form: SaturationForm) => void;
  saveSaturation: () => Promise<void>;
  exportAudit: (format: 'json' | 'csv') => void;
  clearError: () => void;
  clearNotice: () => void;
}

const EMPTY_SATURATION: SaturationForm = {
  scope: '',
  decision: '',
  undecidedQuestions: '',
  counterexamples: '',
  rationale: '',
};

function workbenchErrorMessage(error: unknown): string {
  if (error instanceof WorkbenchApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '未知错误。';
}

/**
 * Researcher workbench store. All decisions stay researcher-owned: this
 * store only proxies the workbench API and never derives research facts
 * (e.g. no saturation percentage is ever computed client-side).
 */
export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      workspaceId: DEFAULT_WORKSPACE_ID,
      projects: [],
      activeProjectId: null,
      documents: [],
      overview: null,
      run: null,
      lastRequestKey: null,
      newDocTitle: '',
      newDocContent: '',
      newMemoContent: '',
      isProjectsLoading: false,
      isWorkspaceLoading: false,
      isActionPending: false,
      error: null,
      notice: null,

      loadProjects: async () => {
        set({ isProjectsLoading: true, error: null });
        try {
          const projects = await fetchProjects(get().workspaceId);
          set({ projects, isProjectsLoading: false });
        } catch (error) {
          set({ isProjectsLoading: false, error: workbenchErrorMessage(error) });
        }
      },

      selectProject: async (projectId) => {
        set({ activeProjectId: projectId, documents: [], overview: null, run: null });
        if (!projectId) return;
        await get().refreshWorkspace();
      },

      createProject: async (title, researchQuestion) => {
        set({ isActionPending: true, error: null });
        try {
          const project = await createProject(get().workspaceId, { title, researchQuestion });
          set((s) => ({ projects: [project, ...s.projects], isActionPending: false }));
          await get().selectProject(project.id);
        } catch (error) {
          set({ isActionPending: false, error: workbenchErrorMessage(error) });
        }
      },

      setNewDocDraft: (title, content) => set({ newDocTitle: title, newDocContent: content }),

      submitDocument: async () => {
        const { activeProjectId, newDocTitle, newDocContent } = get();
        if (!activeProjectId) return;
        set({ isActionPending: true, error: null });
        try {
          await createDocument(get().workspaceId, activeProjectId, {
            title: newDocTitle,
            content: newDocContent,
          });
          set({ newDocTitle: '', newDocContent: '', isActionPending: false, notice: '资料已存为不可变版本。' });
          await get().refreshWorkspace();
        } catch (error) {
          set({ isActionPending: false, error: workbenchErrorMessage(error) });
        }
      },

      refreshWorkspace: async () => {
        const { activeProjectId, workspaceId } = get();
        if (!activeProjectId) return;
        set({ isWorkspaceLoading: true, error: null });
        try {
          const [documents, overview] = await Promise.all([
            fetchDocuments(workspaceId, activeProjectId),
            fetchOverview(workspaceId, activeProjectId),
          ]);
          await get().pollRun();
          set({
            documents,
            overview: {
              codes: overview.codes,
              memos: overview.memos,
              saturation: overview.saturationAssessment
                ? { ...EMPTY_SATURATION, ...(overview.saturationAssessment.payload as Partial<SaturationForm>) }
                : null,
              relationships: overview.relationships,
            },
            isWorkspaceLoading: false,
          });
        } catch (error) {
          set({ isWorkspaceLoading: false, error: workbenchErrorMessage(error) });
        }
      },

      launchRun: async (documentVersionId) => {
        const { activeProjectId, workspaceId } = get();
        if (!activeProjectId) return;
        set({ isActionPending: true, error: null, notice: null });
        try {
          const { run, requestKey, alreadyStarted } = await startAnalysisRun(workspaceId, activeProjectId, documentVersionId);
          set({
            run,
            lastRequestKey: requestKey,
            isActionPending: false,
            notice: alreadyStarted
              ? '已复用同一幂等请求（本键的运行早已存在），未重复计费或重复执行。'
              : '分析已排队，将随模型生成逐段推进。',
          });
          get().pollRun();
        } catch (error) {
          set({ isActionPending: false, error: workbenchErrorMessage(error) });
        }
      },

      pollRun: async () => {
        const { run, workspaceId } = get();
        if (!run || !isRunActive(run.status)) return;
        try {
          const fresh = await fetchAnalysisRun(workspaceId, run.id);
          set({ run: fresh });
          if (isRunActive(fresh.status)) {
            setTimeout(() => { get().pollRun(); }, 2500);
          } else {
            await get().refreshWorkspace();
          }
        } catch {
          // transient network errors should not kill the loop; retry once later
          setTimeout(() => { get().pollRun(); }, 6000);
        }
      },

      editDecision: async (assignmentId, quote, rationale) => {
        set({ isActionPending: true, error: null });
        try {
          await decideCodeAssignment(get().workspaceId, assignmentId, { action: 'edit', quote, rationale });
          set({ isActionPending: false, notice: '已定稿：AI 原始文本已保留在审计档案中。' });
          await get().refreshWorkspace();
        } catch (error) {
          set({ isActionPending: false, error: workbenchErrorMessage(error) });
        }
      },

      decideAssignment: async (assignmentId, action) => {
        set({ isActionPending: true, error: null });
        try {
          await decideCodeAssignment(get().workspaceId, assignmentId, { action });
          set({ isActionPending: false });
          await get().refreshWorkspace();
        } catch (error) {
          set({ isActionPending: false, error: workbenchErrorMessage(error) });
        }
      },

      decideMemo: async (memoId, action) => {
        set({ isActionPending: true, error: null });
        try {
          await decideMemo(get().workspaceId, memoId, action);
          set({ isActionPending: false });
          await get().refreshWorkspace();
        } catch (error) {
          set({ isActionPending: false, error: workbenchErrorMessage(error) });
        }
      },

      addMemo: async (content) => {
        const { activeProjectId } = get();
        if (!activeProjectId) return;
        set({ isActionPending: true, error: null });
        try {
          await createMemo(get().workspaceId, { projectId: activeProjectId, content });
          set({ newMemoContent: '', isActionPending: false });
          await get().refreshWorkspace();
        } catch (error) {
          set({ isActionPending: false, error: workbenchErrorMessage(error) });
        }
      },

      setNewMemoContent: (content) => set({ newMemoContent: content }),

      setSaturationDraft: (form) =>
        set((s) => ({ overview: s.overview ? { ...s.overview, saturation: form } : s.overview })),

      saveSaturation: async () => {
        const { activeProjectId, overview } = get();
        if (!activeProjectId || !overview?.saturation) return;
        set({ isActionPending: true, error: null });
        try {
          await saveSaturationAssessment(get().workspaceId, activeProjectId, overview.saturation);
          set({ isActionPending: false, notice: '饱和度评估已记录（不属于研究结论自动化）。' });
        } catch (error) {
          set({ isActionPending: false, error: workbenchErrorMessage(error) });
        }
      },

      exportAudit: (format) => {
        const { activeProjectId } = get();
        if (!activeProjectId) return;
        window.open(auditExportUrl(activeProjectId, format), '_blank');
      },

      clearError: () => set({ error: null }),
      clearNotice: () => set({ notice: null }),
    }),
    {
      name: 'gt-workbench-storage',
      partialize: (state) => ({
        workspaceId: state.workspaceId,
        activeProjectId: state.activeProjectId,
        newDocTitle: state.newDocTitle,
        newDocContent: state.newDocContent,
        newMemoContent: state.newMemoContent,
      }),
    }
  )
);

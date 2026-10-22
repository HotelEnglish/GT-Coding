import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import { EvidenceReview } from './EvidenceReview';
import { RunPanel } from './RunPanel';
import { SourceText } from './SourceText';
import { MemoPanel } from './MemoPanel';
import { SaturationAssessmentPanel } from './SaturationAssessmentPanel';
import { AuditExportPanel } from './AuditExportPanel';

export const ProjectWorkspace: React.FC = () => {
  const {
    projects,
    activeProjectId,
    isProjectsLoading,
    isWorkspaceLoading,
    isActionPending,
    error,
    notice,
    documents,
    overview,
    run,
    lastRequestKey,
    loadProjects,
    selectProject,
    createProject,
    setNewDocDraft,
    submitDocument,
    refreshWorkspace,
    launchRun,
    decideAssignment,
    editDecision,
    clearError,
    clearNotice,
  } = useWorkbenchStore();

  React.useEffect(() => {
    void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  React.useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 6000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  if (!activeProject) {
    return (
      <div className="space-y-4" data-testid="project-list">
        <ProjectCreateForm pending={isActionPending} onCreate={(t, rq) => void createProject(t, rq)} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <button
              key={p.id}
              data-testid="project-card"
              onClick={() => void selectProject(p.id)}
              className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="text-sm font-semibold text-gray-900">{p.title}</div>
              {p.researchQuestion && <div className="text-[11px] text-gray-500 mt-1 line-clamp-2">{p.researchQuestion}</div>}
              <div className="mt-2 flex gap-2 text-[10px] text-gray-400">
                <Badge variant="selective">{p._count?.documents ?? 0} 份资料</Badge>
                <Badge variant="neutral">{p._count?.analysisRuns ?? 0} 次运行</Badge>
              </div>
            </button>
          ))}
          {projects.length === 0 && !isProjectsLoading && (
            <p className="text-xs text-gray-500 col-span-full">还没有研究项目，先创建一个。</p>
          )}
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  const suggestedAssignments = (overview?.codes ?? []).flatMap((code) => code.assignments);

  return (
    <div className="space-y-4" data-testid="project-workspace">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 min-w-0">
            <Button size="sm" variant="ghost" onClick={() => void selectProject(null)}>← 返回列表</Button>
            <div className="min-w-0">
              <CardTitle>{activeProject.title}</CardTitle>
              {activeProject.researchQuestion && (
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{activeProject.researchQuestion}</p>
              )}
            </div>
          </div>
          <Badge variant="selective">程序化扎根 · 可审计 MVP</Badge>
        </CardHeader>
        <CardBody>
          <DocumentUpload pending={isActionPending} onDraft={(t, c) => setNewDocDraft(t, c)} onSubmit={() => void submitDocument()} />
        </CardBody>
      </Card>

      <RunPanel documents={documents} run={run} lastRequestKey={lastRequestKey} pending={isActionPending} onLaunch={(vid) => void launchRun(vid)} />

      {notice && (
        <div data-testid="notice" className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{notice}</span>
          <button className="text-emerald-700 hover:text-emerald-900" onClick={clearNotice}>✕</button>
        </div>
      )}
      {error && (
        <div data-testid="error" className="text-[11px] text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <span>{error}</span>
          <button className="text-red-700 hover:text-red-900" onClick={clearError}>✕</button>
        </div>
      )}
      {isWorkspaceLoading && <p className="text-xs text-gray-500">加载数据中…</p>}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)_300px] gap-4 items-start">
        <SourceText documents={documents} suggestedAssignments={suggestedAssignments} />
        <EvidenceReview
          codes={overview?.codes ?? []}
          documents={documents}
          pending={isActionPending}
          onDecide={(id, action) => void decideAssignment(id, action)}
          onEdit={(id, quote, rationale) => void editDecision(id, quote, rationale)}
        />
        <div className="space-y-4 xl:sticky xl:top-16">
          <MemoPanel />
          <SaturationAssessmentPanel />
          <AuditExportPanel />
          <Button size="sm" variant="ghost" data-testid="refresh-workspace" onClick={() => void refreshWorkspace()}>
            ⟳ 刷新工作区
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------- 小型内联表单 ----------

function ProjectCreateForm({ pending, onCreate }: { pending: boolean; onCreate: (title: string, researchQuestion?: string) => void }) {
  const [title, setTitle] = React.useState('');
  const [question, setQuestion] = React.useState('');
  return (
    <Card>
      <CardHeader><CardTitle>新建研究项目</CardTitle></CardHeader>
      <CardBody className="flex flex-wrap gap-2 items-center">
        <input
          data-testid="project-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="项目名称"
          className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 w-52 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <input
          data-testid="project-question-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="研究问题（可选）"
          className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 flex-1 min-w-48 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <Button variant="primary" size="sm" data-testid="create-project" disabled={pending || !title.trim()} onClick={() => { onCreate(title.trim(), question.trim() || undefined); setTitle(''); setQuestion(''); }}>
          创建
        </Button>
      </CardBody>
    </Card>
  );
}

function DocumentUpload({ pending, onDraft, onSubmit }: { pending: boolean; onDraft: (title: string, content: string) => void; onSubmit: () => void }) {
  const { newDocTitle, newDocContent } = useWorkbenchStore();
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          data-testid="doc-title-input"
          value={newDocTitle}
          onChange={(e) => onDraft(e.target.value, newDocContent)}
          placeholder="资料标题（例：访谈一）"
          className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 w-52 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <Button variant="secondary" size="sm" data-testid="doc-submit" disabled={pending || !newDocTitle.trim() || !newDocContent.trim()} onClick={onSubmit}>
          保存为不可变版本
        </Button>
        <span className="text-[10px] text-gray-400">保存后内容与哈希固定，修改将生成新版本。</span>
      </div>
      <textarea
        data-testid="doc-content-input"
        rows={3}
        value={newDocContent}
        onChange={(e) => onDraft(newDocTitle, e.target.value)}
        placeholder="粘贴访谈文本、日记、社区帖子等原始资料…"
        className="w-full text-xs leading-relaxed border border-gray-300 rounded-lg px-2.5 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />
    </div>
  );
}

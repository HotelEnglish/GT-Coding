import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WsAssignment } from '@/utils/workbenchApi';

interface DecisionControlsProps {
  assignment: WsAssignment;
  evidenceVerified: boolean;
  pending: boolean;
  onDecide: (action: 'accept' | 'reject' | 'defer') => void;
  onEdit: (quote: string, rationale: string) => void;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'selective' | 'axial' | 'neutral' | 'success' | 'danger' }> = {
  suggested: { label: 'AI 建议 · 待决策', variant: 'selective' },
  deferred: { label: '已搁置', variant: 'neutral' },
  accepted: { label: '已接受 · 研究者确认', variant: 'success' },
  edited: { label: '已编辑 · 研究者定稿', variant: 'axial' },
  rejected: { label: '已拒绝', variant: 'danger' },
};

/**
 * Researcher decision controls. Fail-closed: quote/rationale edits are only
 * offered while the evidence still verifies against the immutable source,
 * so an unverified suggestion can never be promoted into the record.
 */
export const DecisionControls: React.FC<DecisionControlsProps> = ({ assignment, evidenceVerified, pending, onDecide, onEdit }) => {
  const [editing, setEditing] = React.useState(false);
  const badge = STATUS_BADGES[assignment.status] ?? { label: assignment.status, variant: 'neutral' as const };

  const defaultQuote = assignment.originalQuote ?? assignment.evidenceQuote;
  const defaultRationale = assignment.originalRationale ?? assignment.rationale ?? '';
  const [draftQuote, setDraftQuote] = React.useState(defaultQuote);
  const [draftRationale, setDraftRationale] = React.useState(defaultRationale);

  React.useEffect(() => {
    if (!editing) {
      setDraftQuote(defaultQuote);
      setDraftRationale(defaultRationale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.id, editing]);

  if (assignment.status === 'accepted' || assignment.status === 'edited') {
    return (
      <div className="flex items-center justify-between gap-2 flex-wrap" data-testid="final-decision">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <details className="text-[10px] text-gray-500 cursor-pointer">
          <summary className="select-none">查看保留的 AI 原始建议</summary>
          <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-100 quotes">
            <div><b>原文引语：</b>{assignment.originalQuote ?? assignment.evidenceQuote}</div>
            {assignment.originalRationale && <div className="mt-1"><b>原始理由：</b>{assignment.originalRationale}</div>}
          </div>
        </details>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-2 pt-1" data-testid="edit-form">
        <textarea
          aria-label="编辑后的证据引语"
          value={draftQuote}
          onChange={(e) => setDraftQuote(e.target.value)}
          rows={3}
          className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        {!evidenceVerified && (
          <p className="text-[10px] text-red-700">当前引语无法在不可变原文中定位，保存前必须修正为原文逐字内容。</p>
        )}
        <textarea
          aria-label="编辑后的理由"
          value={draftRationale}
          onChange={(e) => setDraftRationale(e.target.value)}
          rows={2}
          placeholder="研究者的编码理由（可留空沿用 AI 理由）"
          className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() => {
              onEdit(draftQuote.trim(), draftRationale.trim());
              setEditing(false);
            }}
          >
            保存定稿
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditing(false)}>
            取消
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1" data-testid="decision-controls">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {!evidenceVerified && (
          <Badge variant="danger" data-testid="evidence-failed">证据校验失败 · 禁止接受</Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={pending || !evidenceVerified}
          data-testid="accept-button"
          onClick={() => onDecide('accept')}
        >
          接受
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || !evidenceVerified}
          data-testid="edit-button"
          onClick={() => setEditing(true)}
        >
          编辑
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} data-testid="reject-button" onClick={() => onDecide('reject')}>
          拒绝
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          data-testid="defer-button"
          onClick={() => onDecide(assignment.status === 'deferred' ? 'accept' : 'defer')}
        >
          {assignment.status === 'deferred' ? '转正式' : '搁置'}
        </Button>
      </div>
      <p className="text-[10px] text-gray-400">
        状态由每次决策事件追加而成；编辑后 AI 原始文本永久保留于审计档案。
      </p>
    </div>
  );
};

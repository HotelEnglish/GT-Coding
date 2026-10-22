import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';

const STATUS_BADGE: Record<string, { label: string; variant: 'selective' | 'success' | 'neutral' | 'danger' }> = {
  suggested: { label: 'AI 草稿', variant: 'selective' },
  accepted: { label: '已采纳', variant: 'success' },
  edited: { label: '已采纳', variant: 'success' },
  deferred: { label: '已搁置', variant: 'neutral' },
  rejected: { label: '已拒绝', variant: 'danger' },
};

export const MemoPanel: React.FC = () => {
  const { overview, isActionPending, decideMemo, addMemo } = useWorkbenchStore();
  const memos = overview?.memos ?? [];
  const [draft, setDraft] = React.useState('');

  const submit = () => {
    const content = draft.trim();
    if (!content) return;
    void addMemo(content);
    setDraft('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>备忘录</CardTitle>
        <span className="text-[10px] text-gray-400">{memos.length} 条</span>
      </CardHeader>
      <CardBody className="space-y-2">
        {memos.length === 0 && (
          <p className="text-xs text-gray-500">分析运行会产生 AI 备忘录草稿；你也可以直接写下研究备忘录。</p>
        )}
        {memos.map((memo) => {
          const badge = STATUS_BADGE[memo.status] ?? { label: memo.status, variant: 'neutral' as const };
          return (
            <div
              key={memo.id}
              data-testid="memo-item"
              data-status={memo.status}
              className="border border-gray-200 rounded-xl p-2.5 text-[11px] text-gray-700 leading-relaxed"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <Badge variant={badge.variant}>{badge.label}</Badge>
                {memo.origin === 'ai' && (memo.status === 'suggested' || memo.status === 'deferred') && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" data-testid="memo-accept" disabled={isActionPending} onClick={() => void decideMemo(memo.id, 'accept')}>
                      转正
                    </Button>
                    <Button size="sm" variant="ghost" data-testid="memo-reject" disabled={isActionPending} onClick={() => void decideMemo(memo.id, 'reject')}>
                      舍弃
                    </Button>
                  </div>
                )}
              </div>
              <p>{memo.content}</p>
            </div>
          );
        })}

        <div className="pt-1 space-y-2">
          <textarea
            data-testid="memo-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="随分析而生的思考：理论敏感性备忘录会进入审计档案"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400">{draft.length}/2000</span>
            <Button
              size="sm"
              variant="secondary"
              data-testid="memo-submit"
              disabled={isActionPending || !draft.trim()}
              onClick={submit}
            >
              写入备忘录
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

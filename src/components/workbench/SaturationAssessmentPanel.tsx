import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { useWorkbenchStore, SaturationForm } from '../../store/useWorkbenchStore';

const DECISION_OPTIONS = ['尚未饱和', '类别层已饱和，理论编码待补', '理论层面饱和'] as const;

const EMPTY: SaturationForm = { scope: '', decision: '', undecidedQuestions: '', counterexamples: '', rationale: '' };

export const SaturationAssessmentPanel: React.FC = () => {
  const { overview, isActionPending, setSaturationDraft, saveSaturation } = useWorkbenchStore();
  const form = overview?.saturation ?? EMPTY;
  const update = (patch: Partial<SaturationForm>) => setSaturationDraft({ ...EMPTY, ...form, ...patch });

  return (
    <Card>
      <CardHeader>
        <CardTitle>饱和度评估 · 研究者自评</CardTitle>
      </CardHeader>
      <CardBody className="space-y-2.5">
        <p data-testid="no-percent-note" className="text-[10px] text-gray-500 border border-dashed border-gray-300 rounded-lg px-2.5 py-2">
          系统不计算、不展示任何“饱和度百分比”。“饱和”是研究者本人基于证据链的判断，本表单只是把判断连同理由写进档案。
        </p>
        <label className="block text-[11px] text-gray-600 space-y-1">
          <span className="font-semibold">评估范围</span>
          <textarea
            data-testid="saturation-scope"
            rows={2}
            value={form.scope}
            onChange={(e) => update({ scope: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="例如：初始编码覆盖 5 份访谈；已完成 3 个核心类别"
          />
        </label>
        <label className="block text-[11px] text-gray-600 space-y-1">
          <span className="font-semibold">我的判断</span>
          <select
            data-testid="saturation-decision"
            value={form.decision}
            onChange={(e) => update({ decision: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">请选择…</option>
            {DECISION_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] text-gray-600 space-y-1">
          <span className="font-semibold">尚未决的问题</span>
          <textarea
            data-testid="saturation-questions"
            rows={2}
            value={form.undecidedQuestions}
            onChange={(e) => update({ undecidedQuestions: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="留待下一步回答的问题（可留空）"
          />
        </label>
        <label className="block text-[11px] text-gray-600 space-y-1">
          <span className="font-semibold">反例 / 不一致证据</span>
          <textarea
            data-testid="saturation-counterexamples"
            rows={2}
            value={form.counterexamples}
            onChange={(e) => update({ counterexamples: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="与本判断相抵触的证据（可留空）"
          />
        </label>
        <label className="block text-[11px] text-gray-600 space-y-1">
          <span className="font-semibold">研究判断与理由</span>
          <textarea
            data-testid="saturation-rationale"
            rows={3}
            value={form.rationale}
            onChange={(e) => update({ rationale: e.target.value })}
            className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            placeholder="为什么此刻认为（或认为还没有）达到饱和"
          />
        </label>
        <Button
          size="sm"
          variant="primary"
          data-testid="saturation-save"
          disabled={isActionPending || !form.decision}
          onClick={() => void saveSaturation()}
        >
          保存评估记录
        </Button>
      </CardBody>
    </Card>
  );
};

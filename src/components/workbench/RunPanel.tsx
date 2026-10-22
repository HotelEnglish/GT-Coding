import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { WsDocument, WsRun } from '@/utils/workbenchApi';

interface RunPanelProps {
  documents: WsDocument[];
  run: WsRun | null;
  lastRequestKey: string | null;
  pending: boolean;
  onLaunch: (documentVersionId: string) => void;
}

const STATUS_LABEL: Record<string, { text: string; variant: 'selective' | 'warning' | 'success' | 'danger' | 'neutral' }> = {
  queued: { text: '排队中', variant: 'neutral' },
  running: { text: '运行中', variant: 'selective' },
  completed: { text: '已完成', variant: 'success' },
  failed: { text: '失败', variant: 'danger' },
  stalled: { text: '疑似停滞', variant: 'warning' },
};

const STEPS: Array<{ label: string; match: (run: WsRun | null) => boolean }> = [
  { label: '排队', match: (r) => Boolean(r) },
  { label: '模型生成建议', match: (r) => r?.progress === '调用模型生成建议' },
  { label: '校验证据引语', match: (r) => r?.progress === '校验证据引语' },
  { label: '落库建议', match: (r) => r?.progress === '落库建议' },
  { label: '完成', match: (r) => r?.status === 'completed' },
];

export const RunPanel: React.FC<RunPanelProps> = ({ documents, run, lastRequestKey, pending, onLaunch }) => {
  const [selectedVersionId, setSelectedVersionId] = React.useState<string>('');

  const options = React.useMemo(
    () =>
      documents.map((doc) => {
        const latest = doc.versions[0];
        return latest ? { id: latest.id, label: `${doc.title} · v${latest.version} · ${latest.contentHash.slice(0, 8)}` } : null;
      }),
    [documents]
  );

  React.useEffect(() => {
    if (!selectedVersionId && options.length > 0 && options[0]) {
      setSelectedVersionId(options[0].id);
    }
  }, [options, selectedVersionId]);

  const status = run ? STATUS_LABEL[run.status] : null;
  const active = run ? run.status === 'queued' || run.status === 'running' : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>分析运行</CardTitle>
        {status && <Badge variant={status.variant}>{status.text}</Badge>}
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            data-testid="version-select"
            value={selectedVersionId}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            disabled={options.length === 0}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:bg-gray-100"
          >
            {options.length === 0 && <option value="">尚无可分析版本</option>}
            {options.map((o) => o && <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <Button
            variant="primary"
            size="sm"
            data-testid="launch-run"
            disabled={pending || active || !selectedVersionId}
            onClick={() => selectedVersionId && onLaunch(selectedVersionId)}
          >
            {active ? '运行中…' : '▶ 运行分析'}
          </Button>
        </div>

        {(active || run?.status === 'completed') && (
          <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500" data-testid="run-steps">
            {STEPS.map((step, i) => {
              const done = run?.status === 'completed' || (i > 0 && STEPS[i - 1].match(run));
              const now = active && step.match(run);
              return (
                <React.Fragment key={step.label}>
                  {i > 0 && <span className="text-gray-300">›</span>}
                  <span className={`flex items-center gap-1 ${now ? 'text-indigo-700 font-semibold' : done ? 'text-emerald-700' : ''}`}>
                    <span className={`w-2 h-2 rounded-full border ${now ? 'border-indigo-500 bg-indigo-100 animate-pulse' : done ? 'bg-emerald-300 border-emerald-300' : 'border-gray-300 bg-white'}`} />
                    {step.label}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {run?.errorMessage && (
          <p className="text-[11px] text-red-700">失败原因：{run.errorMessage}</p>
        )}
        {lastRequestKey && (
          <p className="font-mono text-[10px] text-gray-400">Idempotency-Key: {lastRequestKey.slice(0, 18)}…</p>
        )}
        <p className="text-[10px] text-gray-400">
          每次点击都会生成新的幂等键；网络重试复用同一键，服务端保证同键不重复执行。
        </p>
      </CardBody>
    </Card>
  );
};

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { CodingResult, TheoryParadigm, MemoItem } from '@/types';
import { THEORY_CONFIGS } from '@/constants/theories';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { downloadFile } from '@/utils/api';

interface ResultPanelProps {
  result: CodingResult;
  theory: TheoryParadigm;
  memos: MemoItem[];
  onAddMemo: (text: string) => void;
  onNewAnalysis: () => void;
}

type ResultTab = 'table' | 'tree' | 'memo';

export const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  theory,
  memos,
  onAddMemo,
  onNewAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<ResultTab>('table');
  const [memoInput, setMemoInput] = useState('');
  const cfg = THEORY_CONFIGS[theory];

  // Count stats
  let scCount = 0, acCount = 0, ocCount = 0;
  result.selective_codes.forEach((s) => {
    scCount++;
    (s.axial_codes || []).forEach((a) => {
      acCount++;
      ocCount += (a.open_codes || []).length;
    });
  });

  // Build table rows
  interface TableRow {
    s: string; a: string; o: string; q: string; note: string;
    sr: number; ar: number;
  }
  const rows: TableRow[] = [];
  result.selective_codes.forEach((s) => {
    const sTotal = (s.axial_codes || []).reduce(
      (sum, a) => sum + Math.max((a.open_codes || []).length, 1), 0
    );
    let sFirst = true;
    if (!s.axial_codes?.length) {
      rows.push({ s: s.label, a: '—', o: '—', q: '', note: '', sr: 1, ar: 1 });
    } else {
      s.axial_codes.forEach((a) => {
        let aFirst = true;
        const aLen = Math.max((a.open_codes || []).length, 1);
        if (!a.open_codes?.length) {
          rows.push({ s: s.label, a: a.label, o: '—', q: '', note: '', sr: sFirst ? sTotal : 0, ar: 1 });
          sFirst = false;
        } else {
          a.open_codes.forEach((o) => {
            rows.push({
              s: s.label, a: a.label,
              o: o.label || '未命名',
              q: o.quote || '',
              note: o.note || '',
              sr: sFirst ? sTotal : 0,
              ar: aFirst ? aLen : 0,
            });
            sFirst = false; aFirst = false;
          });
        }
      });
    }
  });

  const TABS: { id: ResultTab; label: string }[] = [
    { id: 'table', label: '表格视图' },
    { id: 'tree', label: '树形视图' },
    { id: 'memo', label: `备忘录 (${memos.length})` },
  ];

  const handleExportCSV = () => {
    const headers = [cfg.codingLevels.level1, cfg.codingLevels.level2, cfg.codingLevels.level3, '典型引语'];
    const dataRows = rows.map((r) => [r.s, r.a, r.o, r.q.replace(/,/g, '，').replace(/\n/g, ' ')]);
    const csv = [headers, ...dataRows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    downloadFile('\uFEFF' + csv, `扎根理论编码结果_${cfg.name}.csv`, 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    downloadFile(JSON.stringify({ ...result, theory, theoryCfg: cfg.name }, null, 2), '扎根理论编码结果.json', 'application/json');
  };

  const handleCopyTable = () => {
    let text = [cfg.codingLevels.level1, cfg.codingLevels.level2, cfg.codingLevels.level3, '典型引语'].join('\t') + '\n';
    rows.forEach((r) => { text += [r.s, r.a, r.o, r.q.replace(/\n/g, ' ')].join('\t') + '\n'; });
    navigator.clipboard.writeText(text)
      .then(() => alert('已复制到剪贴板，可直接粘贴到 Excel/Word。'))
      .catch(() => alert('复制失败，请手动复制。'));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">编码结果</h3>
          <span className={cn('text-xs px-2 py-0.5 rounded-md border font-medium', cfg.bgColor, cfg.color, cfg.borderColor)}>
            {cfg.name}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onNewAnalysis}>↩ 重新分析</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: cfg.codingLevels.level1, count: scCount, variant: 'selective' as const },
          { label: cfg.codingLevels.level2, count: acCount, variant: 'axial' as const },
          { label: cfg.codingLevels.level3, count: ocCount, variant: 'open' as const },
        ].map(({ label, count, variant }) => (
          <div key={label} className="flex flex-col items-center py-3 px-2">
            <span className="text-xl font-bold text-gray-900">{count}</span>
            <Badge variant={variant} className="mt-1">{label}</Badge>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4 pt-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABLE VIEW */}
      {activeTab === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {[
                  { label: cfg.codingLevels.level1, w: '15%', variant: 'selective' },
                  { label: cfg.codingLevels.level2, w: '19%', variant: 'axial' },
                  { label: cfg.codingLevels.level3, w: '20%', variant: 'open' },
                  { label: '典型引语', w: '46%', variant: 'neutral' },
                ].map(({ label, w }) => (
                  <th key={label} style={{ width: w }} className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  {r.sr > 0 && (
                    <td rowSpan={r.sr} className="px-3 py-2.5 align-middle border-r border-gray-100">
                      <Badge variant="selective">{r.s}</Badge>
                    </td>
                  )}
                  {r.ar > 0 && (
                    <td rowSpan={r.ar} className="px-3 py-2.5 align-middle border-r border-gray-100">
                      <Badge variant="axial">{r.a}</Badge>
                    </td>
                  )}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <Badge variant="open">{r.o}</Badge>
                    {r.note && <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">{r.note}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-gray-700 leading-relaxed italic">
                      {r.q ? `"${r.q}"` : '—'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TREE VIEW */}
      {activeTab === 'tree' && (
        <div className="p-4 space-y-3">
          {result.selective_codes.map((s, si) => (
            <div key={si} className={cn('rounded-xl border p-4', cfg.borderColor, cfg.bgColor)}>
              <div className={cn('font-semibold text-sm mb-3', cfg.color)}>
                📌 {cfg.codingLevels.level1}：{s.label}
              </div>
              <div className="space-y-2 pl-3">
                {(s.axial_codes || []).map((a, ai) => (
                  <div key={ai} className="bg-white/70 rounded-lg border border-gray-200 p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">
                      🔹 {cfg.codingLevels.level2}：{a.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-2">
                      {(a.open_codes || []).map((o, oi) => (
                        <span
                          key={oi}
                          title={o.quote || ''}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-teal-50 text-teal-700 border border-teal-200 cursor-help"
                        >
                          {o.label || '未命名'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {result.core_category && (
            <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-4">
              <span className="text-xs font-bold text-indigo-800">🎯 核心范畴综合：</span>
              <span className="text-xs text-indigo-700 ml-1">{result.core_category}</span>
            </div>
          )}
        </div>
      )}

      {/* MEMO VIEW */}
      {activeTab === 'memo' && (
        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">添加备忘录</div>
            <textarea
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              placeholder="记录编码过程中的发现、疑问与理论思考..."
              className="w-full h-24 text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
            <div className="flex justify-end mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { if (memoInput.trim()) { onAddMemo(memoInput.trim()); setMemoInput(''); } }}
              >
                添加备忘
              </Button>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">备忘录列表</div>
            {memos.length === 0 ? (
              <p className="text-xs text-gray-400">暂无备忘录。</p>
            ) : (
              <div className="space-y-2">
                {memos.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'rounded-lg p-3 text-xs leading-relaxed',
                      m.isAI
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-800'
                        : 'bg-gray-50 border border-gray-200 text-gray-700'
                    )}
                  >
                    <div className="text-[10px] text-gray-400 mb-1">{m.isAI ? '🤖 AI建议 · ' : '📝 '}{m.timestamp}</div>
                    {m.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {result.memo_suggestions?.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="text-xs font-semibold text-indigo-800 mb-2">AI 理论要点提示（建议）</div>
              <ul className="space-y-1.5">
                {[...new Set(result.memo_suggestions)].map((m, i) => (
                  <li key={i} className="text-xs text-indigo-700 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Export Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 flex-wrap bg-gray-50">
        <span className="text-xs text-gray-500 mr-1">导出：</span>
        <Button variant="secondary" size="sm" onClick={handleExportCSV}>CSV</Button>
        <Button variant="secondary" size="sm" onClick={handleExportJSON}>JSON</Button>
        <Button variant="secondary" size="sm" onClick={handleCopyTable}>复制为表格</Button>
      </div>
    </div>
  );
};

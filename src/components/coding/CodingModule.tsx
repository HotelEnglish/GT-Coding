import React, { useState } from 'react';
import { TheoryParadigm, CodingResult, CodingDepth, ReferenceDoc, TerminologyConfig, ApiConfig } from '@/types';
import { TheorySelector } from './TheorySelector';
import { InputPanel } from './InputPanel';
import { ResultPanel } from './ResultPanel';

interface CodingModuleProps {
  selectedTheory: TheoryParadigm | null;
  onSelectTheory: (t: TheoryParadigm) => void;
  codingDepth: CodingDepth;
  onDepthChange: (d: CodingDepth) => void;
  domain: string;
  onDomainChange: (v: string) => void;
  codingResult: CodingResult | null;
  onCodingResult: (r: CodingResult) => void;
  referenceDocs: ReferenceDoc[];
  terminology: TerminologyConfig;
  apiConfig: ApiConfig;
  memos: MemoItem[];
  onAddMemo: (text: string, isAI?: boolean, theory?: TheoryParadigm) => void;
  onGoSettings: () => void;
}

type MemoItem = import('@/types').MemoItem;

type Progress = { current: number; total: number; msg: string };

export const CodingModule: React.FC<CodingModuleProps> = ({
  selectedTheory,
  onSelectTheory,
  codingDepth,
  onDepthChange,
  domain,
  onDomainChange,
  codingResult,
  onCodingResult,
  referenceDocs,
  terminology,
  apiConfig,
  memos,
  onAddMemo,
  onGoSettings,
}) => {
  const isRunning = false;
  const progress: Progress | null = null;
  const [errorMsg, setErrorMsg] = useState('');
  const [legacyRunBlocked, setLegacyRunBlocked] = useState(false);

  const handleRun = async () => {
    setErrorMsg('');
    setLegacyRunBlocked(true);
  };

  const handleNewAnalysis = () => {
    onCodingResult(null as unknown as CodingResult);
    setErrorMsg('');
    setLegacyRunBlocked(false);
  };

  return (
    <div>
      {/* Legacy banner */}
      <div className="mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
        <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>
          <strong>旧版快照</strong>：本页仅供回看历史编码结果，已停止新的运行。
          请使用侧边栏入口的"研究工作台"完成有证据溯源的编码分析（AI 建议 → 研究者决策 → 审计导出）。
        </span>
      </div>

      {/* Reference docs summary indicator */}
      {referenceDocs.filter((d) => d.summaryStatus === 'done').length > 0 && (
        <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            已加载 <strong>{referenceDocs.filter((d) => d.summaryStatus === 'done').length}</strong> 篇参考文献摘要，将作为领域知识注入 AI 编码系统。
          </span>
        </div>
      )}

      {/* Terminology indicator */}
      {(terminology.styleDescription || terminology.terms.length > 0) && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M7 7h10M7 12h7M7 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>
            已设置专业语言规范
            {terminology.terms.length > 0 && <span>（{terminology.terms.length} 条术语对照）</span>}，将用于规范编码术语。
          </span>
        </div>
      )}

      {!codingResult ? (
        <>
          <TheorySelector selected={selectedTheory} onSelect={onSelectTheory} />
          <InputPanel
            domain={domain}
            onDomainChange={onDomainChange}
            depth={codingDepth}
            onDepthChange={onDepthChange}
            selectedTheory={selectedTheory}
            onRun={handleRun}
            isRunning={isRunning}
            hasApiKey={!!apiConfig.apikey}
            onGoSettings={onGoSettings}
            progress={progress}
            errorMsg={legacyRunBlocked ? '旧版编码流程已停用：请改用侧边栏的"研究工作台"完成有证据溯源的编码分析。' : errorMsg}
          />
        </>
      ) : (
        <ResultPanel
          result={codingResult}
          theory={codingResult.theory || 'procedural'}
          memos={memos}
          onAddMemo={(text) => onAddMemo(text, false, selectedTheory || undefined)}
          onNewAnalysis={handleNewAnalysis}
        />
      )}
    </div>
  );
};

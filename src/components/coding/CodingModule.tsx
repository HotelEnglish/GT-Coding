import React, { useState, useCallback } from 'react';
import { TheoryParadigm, CodingResult, CodingDepth, ReferenceDoc, TerminologyConfig, ApiConfig } from '@/types';
import { THEORY_CONFIGS } from '@/constants/theories';
import { callAPI, extractText, chunkText, robustJSONParse, mergeCodingData } from '@/utils/api';
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
  memos: import('@/types').MemoItem[];
  onAddMemo: (text: string, isAI?: boolean, theory?: TheoryParadigm) => void;
  onGoSettings: () => void;
}

interface Progress {
  current: number;
  total: number;
  msg: string;
}

function buildSystemPrompt(
  theory: TheoryParadigm,
  domain: string,
  depth: CodingDepth,
  referenceDocs: ReferenceDoc[],
  terminology: TerminologyConfig
): string {
  const cfg = THEORY_CONFIGS[theory];
  const isDeep = depth === 'deep';

  // Reference library knowledge
  const refSection = referenceDocs
    .filter((d) => d.summaryStatus === 'done' && d.summary)
    .map((d, i) => `【参考文献 ${i + 1}：${d.name}】\n${d.summary}`)
    .join('\n\n');

  // Terminology section
  const termLines = terminology.terms
    .map((t) => `  - 用"${t.specific}"替代"${t.general}"`)
    .join('\n');
  const termSection =
    terminology.styleDescription || terminology.terms.length > 0
      ? `\n【专业术语与语言规范】\n${terminology.styleDescription ? terminology.styleDescription + '\n' : ''}${termLines ? '术语替换规则：\n' + termLines : ''}`
      : '';

  const refNote = refSection
    ? `\n【领域参考文献摘要（供学术规范参考）】\n${refSection}\n`
    : '';

  return `你是一位扎根理论研究专家，当前使用【${cfg.name}】进行编码分析。

${cfg.promptGuidance}
${domain ? `\n研究领域：${domain}` : ''}${termSection}${refNote}

【编码层级对应】
- 第一层：${cfg.codingLevels.level1}（最高抽象，统摄整体）
- 第二层：${cfg.codingLevels.level2}（中间范畴，归纳属性）
- 第三层：${cfg.codingLevels.level3}（贴近原文，具体可感）

【极其重要的输出要求】
1. 严格只输出合法的 JSON 格式，不要包含任何 Markdown 标记或代码块。
2. 引语中如果有双引号必须用反斜杠转义 (\\"）。
3. 禁止输出未转义换行符，全部替换为空格。
4. JSON 结构：
{
  "selective_codes": [
    {
      "label": "${cfg.codingLevels.level1}名称",
      "axial_codes": [
        {
          "label": "${cfg.codingLevels.level2}名称",
          "open_codes": [
            {
              "label": "${cfg.codingLevels.level3}名称",
              "quote": "原文典型引语20-50字"${isDeep ? ',\n              "note": "范畴说明1-2句"' : ''}
            }
          ]
        }
      ]
    }
  ],
  "core_category": "核心范畴或核心变量的简要描述",
  "memo_suggestions": ["理论备忘要点1", "理论备忘要点2"]
}`;
}

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
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRun = useCallback(
    async (text: string) => {
      if (!text) { setErrorMsg('请先粘贴文本或上传访谈文件。'); return; }
      if (!selectedTheory) { setErrorMsg('请先选择扎根理论范式。'); return; }

      setErrorMsg('');
      setIsRunning(true);
      setProgress({ current: 0, total: 1, msg: '正在准备分析…' });

      const systemPrompt = buildSystemPrompt(
        selectedTheory,
        domain,
        codingDepth,
        referenceDocs,
        terminology
      );

      try {
        const chunks = chunkText(text, 2500);
        const masterData: CodingResult = {
          selective_codes: [],
          core_category: '',
          memo_suggestions: [],
          theory: selectedTheory,
          timestamp: Date.now(),
        };

        for (let i = 0; i < chunks.length; i++) {
          setProgress({
            current: i,
            total: chunks.length,
            msg: `正在分析文本片段 ${i + 1} / ${chunks.length}…`,
          });

          const prompt = `请对以下访谈文本片段进行${THEORY_CONFIGS[selectedTheory].name}编码：\n\n${chunks[i]}`;
          const resp = await callAPI(prompt, systemPrompt, apiConfig, 4000);

          if (!resp.ok) {
            const e = await resp.json().catch(() => ({})) as { error?: { message?: string } };
            throw new Error(`片段 ${i + 1} 请求失败：` + (e.error?.message || `HTTP ${resp.status}`));
          }

          const raw = extractText(await resp.json(), apiConfig.mode);
          const chunk = robustJSONParse(raw);
          mergeCodingData(masterData, chunk);
        }

        setProgress({ current: chunks.length, total: chunks.length, msg: '分析完成，渲染视图中…' });

        // Clean empty
        masterData.selective_codes = masterData.selective_codes.filter((s) => s.label);

        // Add AI memos
        if (masterData.memo_suggestions?.length) {
          [...new Set(masterData.memo_suggestions)].forEach((m) => {
            onAddMemo('[AI建议] ' + m, true, selectedTheory);
          });
        }

        onCodingResult(masterData);
      } catch (e) {
        setErrorMsg('分析过程出错：' + String(e));
      } finally {
        setIsRunning(false);
        setProgress(null);
      }
    },
    [selectedTheory, domain, codingDepth, referenceDocs, terminology, apiConfig, onAddMemo, onCodingResult]
  );

  const handleNewAnalysis = () => {
    onCodingResult(null as unknown as CodingResult);
    setErrorMsg('');
  };

  return (
    <div>
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
            errorMsg={errorMsg}
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

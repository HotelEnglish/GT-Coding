import React, { useState, useRef } from 'react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { CodingDepth, TheoryParadigm } from '@/types';
import { THEORY_CONFIGS } from '@/constants/theories';

interface InputPanelProps {
  domain: string;
  onDomainChange: (v: string) => void;
  depth: CodingDepth;
  onDepthChange: (v: CodingDepth) => void;
  selectedTheory: TheoryParadigm | null;
  onRun: (text: string) => void;
  isRunning: boolean;
  hasApiKey: boolean;
  onGoSettings: () => void;
  progress: { current: number; total: number; msg: string } | null;
  errorMsg: string;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  domain,
  onDomainChange,
  depth,
  onDepthChange,
  selectedTheory,
  onRun,
  isRunning,
  hasApiKey,
  onGoSettings,
  progress,
  errorMsg,
}) => {
  const [inputTab, setInputTab] = useState<'paste' | 'upload'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [uploadedText, setUploadedText] = useState('');
  const [uploadedName, setUploadedName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theoryConfig = selectedTheory ? THEORY_CONFIGS[selectedTheory] : null;

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedText((e.target?.result as string) || '');
      setUploadedName(file.name);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  };

  const handleRun = () => {
    const text = inputTab === 'paste' ? pasteText : uploadedText;
    onRun(text.trim());
  };

  const canRun = !isRunning && !!selectedTheory && (inputTab === 'paste' ? pasteText.trim() : uploadedText.trim());

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">第二步：输入访谈文本</div>
      </div>

      {/* Tab Switch */}
      <div className="flex border-b border-gray-100 px-5 pt-1">
        {(['paste', 'upload'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setInputTab(tab)}
            className={cn(
              'px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
              inputTab === tab
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab === 'paste' ? '粘贴文本' : '上传访谈文件'}
          </button>
        ))}
      </div>

      {/* Paste Area */}
      {inputTab === 'paste' && (
        <div className="p-4">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="将访谈文本粘贴至此处。已支持无限长文本（超长文本会自动切片排队分析）。"
            className="w-full h-44 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
          />
          {pasteText && (
            <div className="flex justify-end mt-1">
              <span className="text-[11px] text-gray-400">{pasteText.length.toLocaleString()} 字符</span>
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      {inputTab === 'upload' && (
        <div className="p-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all',
              isDragOver
                ? 'border-indigo-400 bg-indigo-50'
                : uploadedName
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            )}
          >
            {uploadedName ? (
              <>
                <svg className="w-7 h-7 text-emerald-500" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-sm font-medium text-emerald-700">已加载：{uploadedName}</div>
                <div className="text-xs text-emerald-600">{uploadedText.length.toLocaleString()} 字符 · 点击重新上传</div>
              </>
            ) : (
              <>
                <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none">
                  <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 12l-4-4-4 4M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="text-sm text-gray-600">点击上传或将访谈文件拖入此处</div>
                <div className="text-xs text-gray-400">支持 .txt / .md 纯文本文件</div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
          />
        </div>
      )}

      {/* Options Row */}
      <div className="px-4 pb-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">研究领域</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => onDomainChange(e.target.value)}
            placeholder="例：治愈旅游体验（可选）"
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">编码深度</label>
          {(['std', 'deep'] as CodingDepth[]).map((d) => (
            <button
              key={d}
              onClick={() => onDepthChange(d)}
              className={cn(
                'text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                depth === d
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              {d === 'std' ? '标准（三级+引语）' : '深度（+范畴说明）'}
            </button>
          ))}
        </div>

        {/* Theory badge */}
        {theoryConfig && (
          <div className={cn('text-xs px-2.5 py-1.5 rounded-lg border font-medium', theoryConfig.bgColor, theoryConfig.color, theoryConfig.borderColor)}>
            {theoryConfig.name}
          </div>
        )}
      </div>

      {/* Run Button */}
      <div className="px-4 pb-4">
        {!hasApiKey ? (
          <div className="flex items-center gap-3">
            <Button variant="primary" size="lg" disabled>开始智能编码</Button>
            <span className="text-xs text-red-600 flex items-center gap-1">
              <span>⚠</span> 请先在
              <button onClick={onGoSettings} className="underline font-medium">API 配置</button>
              中填入 API Key
            </span>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={handleRun}
            disabled={!canRun}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                分析中…
              </>
            ) : !selectedTheory ? (
              '请先选择理论范式'
            ) : (
              '开始智能编码'
            )}
          </Button>
        )}
      </div>

      {/* Progress */}
      {isRunning && progress && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="animate-spin w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="text-xs text-gray-600">{progress.msg}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: progressPct + '%' }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="mx-4 mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

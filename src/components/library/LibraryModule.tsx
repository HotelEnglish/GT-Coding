import React, { useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { ReferenceDoc, ApiConfig } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { callAPI, extractText } from '@/utils/api';

interface LibraryModuleProps {
  docs: ReferenceDoc[];
  onDocsChange: (docs: ReferenceDoc[] | ((prev: ReferenceDoc[]) => ReferenceDoc[])) => void;
  apiConfig: ApiConfig;
}

const MAX_RAW_LEN = 8000; // chars to store & summarize
const SUMMARY_EXCERPT = 6000; // chars to send for summarization

export const LibraryModule: React.FC<LibraryModuleProps> = ({ docs, onDocsChange, apiConfig }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(txt|md|pdf)$/i)) {
      alert('目前仅支持 .txt / .md 文件');
      return;
    }

    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const rawText = ((e.target?.result as string) || '').slice(0, MAX_RAW_LEN);

      const newDoc: ReferenceDoc = {
        id,
        name: file.name,
        size: file.size,
        uploadedAt: Date.now(),
        rawText,
        summaryStatus: 'pending',
      };

      onDocsChange((prev) => [...prev, newDoc]);

      // Start summarization if API key is available
      if (!apiConfig.apikey) {
        onDocsChange((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, summaryStatus: 'error', summaryError: '请先配置 API Key 才能生成摘要' }
              : d
          )
        );
        return;
      }

      onDocsChange((prev) =>
        prev.map((d) => (d.id === id ? { ...d, summaryStatus: 'processing' } : d))
      );

      try {
        const resp = await callAPI(
          `请对以下学术论文/文献进行摘要，提取：\n1. 核心研究主题与研究问题\n2. 主要理论框架与关键概念\n3. 重要研究发现与结论\n4. 领域核心术语（列出10-15个）\n\n文献内容：\n\n${rawText.slice(0, SUMMARY_EXCERPT)}`,
          '你是一位学术文献分析专家。请对给定文献进行简洁的结构化摘要，重点提取对质性研究编码有参考价值的理论概念、核心术语和研究框架。摘要控制在300字以内，使用中文输出。',
          apiConfig,
          1000
        );

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const summary = extractText(data, apiConfig.mode);

        onDocsChange((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, summaryStatus: 'done', summary } : d
          )
        );
      } catch (err) {
        onDocsChange((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, summaryStatus: 'error', summaryError: String(err) }
              : d
          )
        );
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  };

  const handleDelete = (id: string) => {
    onDocsChange((prev) => prev.filter((d) => d.id !== id));
  };

  const handleRetry = async (doc: ReferenceDoc) => {
    if (!apiConfig.apikey) { alert('请先配置 API Key'); return; }
    onDocsChange((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, summaryStatus: 'processing', summaryError: undefined } : d))
    );

    try {
      const resp = await callAPI(
        `请对以下学术论文/文献进行摘要，提取：\n1. 核心研究主题与研究问题\n2. 主要理论框架与关键概念\n3. 重要研究发现与结论\n4. 领域核心术语（列出10-15个）\n\n文献内容：\n\n${doc.rawText.slice(0, SUMMARY_EXCERPT)}`,
        '你是一位学术文献分析专家。请对给定文献进行简洁的结构化摘要，重点提取对质性研究编码有参考价值的理论概念、核心术语和研究框架。摘要控制在300字以内，使用中文输出。',
        apiConfig,
        1000
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const summary = extractText(data, apiConfig.mode);
      onDocsChange((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, summaryStatus: 'done', summary } : d))
      );
    } catch (err) {
      onDocsChange((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, summaryStatus: 'error', summaryError: String(err) } : d
        )
      );
    }
  };

  const statusBadge = (doc: ReferenceDoc) => {
    switch (doc.summaryStatus) {
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            <svg className="animate-spin w-2.5 h-2.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            AI 摘要中…
          </span>
        );
      case 'done':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ 摘要完成</span>;
      case 'error':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">✗ 摘要失败</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">待处理</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>参考文献库</CardTitle>
          <span className="text-xs text-gray-500">{docs.length} 篇文献 · AI 将学习这些文献后再编码</span>
        </CardHeader>
        <CardBody>
          {/* Info Banner */}
          <div className="mb-4 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700 leading-relaxed">
            <strong>工作原理：</strong>上传专业论文后，AI 会先对每篇论文生成结构化摘要，提取核心概念与术语。在编码访谈数据时，这些摘要将作为学术背景知识注入 AI，使编码结果更符合您所在领域的学术规范。
          </div>

          {/* Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed cursor-pointer transition-all mb-4',
              isDragOver
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-white'
            )}
          >
            <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none">
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 12l-4-4-4 4M12 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-sm text-gray-600">点击上传或拖入专业论文</div>
            <div className="text-xs text-gray-400">支持 .txt / .md · 可批量上传 · 前 8000 字将被处理</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            multiple
            className="hidden"
            onChange={(e) => Array.from(e.target.files || []).forEach(processFile)}
          />

          {/* Docs List */}
          {docs.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400">
              尚未上传任何参考文献
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-gray-500 shrink-0" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12h6M9 16h4M7 3H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V7l-6-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                      <span className="text-xs font-medium text-gray-800 truncate">{doc.name}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatSize(doc.size)}</span>
                      {statusBadge(doc)}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.summaryStatus === 'error' && (
                        <Button variant="ghost" size="sm" onClick={() => handleRetry(doc)}>重试</Button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <path d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  {doc.summaryStatus === 'done' && doc.summary && (
                    <div className="px-3 py-2.5 text-xs text-gray-700 leading-relaxed border-t border-gray-100 bg-white">
                      <div className="font-medium text-gray-500 mb-1 text-[10px] uppercase tracking-wide">AI 摘要</div>
                      <div className="whitespace-pre-wrap">{doc.summary}</div>
                    </div>
                  )}
                  {doc.summaryStatus === 'error' && (
                    <div className="px-3 py-2 text-xs text-red-600 border-t border-red-100 bg-red-50">
                      错误：{doc.summaryError}
                    </div>
                  )}
                  {doc.summaryStatus === 'processing' && (
                    <div className="px-3 py-2 text-xs text-blue-600 border-t border-blue-100 bg-blue-50 flex items-center gap-1.5">
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                        <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      正在调用 AI 生成文献摘要，请稍候…
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

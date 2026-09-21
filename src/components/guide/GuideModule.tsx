import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { TheoryParadigm } from '@/types';
import { THEORY_LIST } from '@/constants/theories';
import { Card, CardBody } from '@/components/ui/Card';

export const GuideModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TheoryParadigm>('classical');
  const theory = THEORY_LIST.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-4">
      {/* Tab Row */}
      <div className="flex gap-2">
        {THEORY_LIST.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as TheoryParadigm)}
            className={cn(
              'flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
              activeTab === t.id
                ? `${t.bgColor} ${t.color} ${t.borderColor}`
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="space-y-5">
          {/* Header */}
          <div className={cn('rounded-xl p-4', theory.bgColor, theory.borderColor, 'border')}>
            <div className={cn('text-base font-bold mb-1', theory.color)}>{theory.name}</div>
            <div className="text-xs text-gray-600 mb-2">{theory.nameEn} · {theory.author}</div>
            <p className="text-sm text-gray-700 leading-relaxed">{theory.fullDesc}</p>
          </div>

          {/* Research Goals */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">核心研究目标</div>
            <ul className="space-y-2">
              {theory.goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className={cn('mt-0.5 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white',
                    theory.id === 'classical' ? 'bg-amber-500'
                      : theory.id === 'procedural' ? 'bg-blue-500'
                        : 'bg-emerald-500'
                  )}>
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{goal}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Coding Levels */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-3">编码层级对应</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '第一层（最高抽象）', code: theory.codingLevels.level1, variant: 'selective' },
                { label: '第二层（中间范畴）', code: theory.codingLevels.level2, variant: 'axial' },
                { label: '第三层（贴近原文）', code: theory.codingLevels.level3, variant: 'open' },
              ].map(({ label, code, variant }) => (
                <div key={code} className={cn(
                  'rounded-xl p-3 text-center border',
                  variant === 'selective' ? 'bg-indigo-50 border-indigo-200'
                    : variant === 'axial' ? 'bg-violet-50 border-violet-200'
                      : 'bg-teal-50 border-teal-200'
                )}>
                  <div className="text-[10px] text-gray-500 mb-1">{label}</div>
                  <div className={cn('text-sm font-bold',
                    variant === 'selective' ? 'text-indigo-700'
                      : variant === 'axial' ? 'text-violet-700'
                        : 'text-teal-700'
                  )}>
                    {code}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Prompt Strategy Preview */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">AI 编码策略（系统提示词预览）</div>
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">
                {theory.promptGuidance}
              </pre>
            </div>
          </div>

          {/* Comparison Table */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-2">三种范式快速对比</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {['维度', '经典（Glaser）', '程序化（Strauss & Corbin）', '建构式（Charmaz）'].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-600 border-b border-gray-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['理论立场', '客观主义，理论自然涌现', '后实证主义，系统化程序', '建构主义，反思研究者立场'],
                    ['编码风格', '简洁动名词，紧贴数据', '结构化三阶段，范式模型', '行动词，关注过程意义'],
                    ['核心产出', '核心变量 + 实质理论', '核心范畴 + 故事线', '核心范畴 + 参与者视角'],
                    ['适合场景', '理论创建，探索性研究', '系统建模，规范化分析', '意义研究，诠释性研究'],
                    ['文献综述', '编码前尽量避免', '编码前可广泛阅读', '可结合批判性审视'],
                  ].map(([dim, ...vals]) => (
                    <tr key={dim} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-3 py-2 font-semibold text-gray-700">{dim}</td>
                      {vals.map((v, i) => (
                        <td key={i} className="px-3 py-2 text-gray-600 leading-relaxed">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

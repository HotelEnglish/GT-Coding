import React, { useState } from 'react';
import { TerminologyConfig, TermEntry } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';

interface TerminologyModuleProps {
  config: TerminologyConfig;
  onChange: (cfg: TerminologyConfig) => void;
}

export const TerminologyModule: React.FC<TerminologyModuleProps> = ({ config, onChange }) => {
  const [saved, setSaved] = useState(false);
  const [newGeneral, setNewGeneral] = useState('');
  const [newSpecific, setNewSpecific] = useState('');

  const handleStyleChange = (val: string) => {
    onChange({ ...config, styleDescription: val });
  };

  const handleAddTerm = () => {
    if (!newGeneral.trim() || !newSpecific.trim()) return;
    const entry: TermEntry = {
      id: Date.now().toString(),
      general: newGeneral.trim(),
      specific: newSpecific.trim(),
    };
    onChange({ ...config, terms: [...config.terms, entry] });
    setNewGeneral('');
    setNewSpecific('');
  };

  const handleDeleteTerm = (id: string) => {
    onChange({ ...config, terms: config.terms.filter((t) => t.id !== id) });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const PRESET_STYLES = [
    { label: '护理学', text: '请使用护理学领域的专业术语，如"照护体验"、"护患关系"、"健康促进"，避免过度使用心理学词汇。' },
    { label: '治愈旅游', text: '请使用健康旅游与疗愈研究领域的术语，如"疗愈性景观"、"恢复性体验"、"身心整合"。' },
    { label: '教育研究', text: '请使用教育学领域专业术语，如"学习体验"、"教学互动"、"师生关系"、"课程参与"。' },
    { label: '组织管理', text: '请使用组织行为学与管理学术语，如"组织认同"、"工作投入"、"领导力"、"制度性压力"。' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>专业术语与语言习惯设置</CardTitle>
          <span className="text-xs text-gray-500">编码时 AI 将遵循这些术语规范</span>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* Info Banner */}
          <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
            <strong>工作原理：</strong>此处设置的语言风格和术语对照将直接注入 AI 的系统提示词，确保生成的编码标签使用您领域的专业词汇，而非通用社会科学语言。
          </div>

          {/* Style Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-800">语言风格说明</label>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {PRESET_STYLES.map((ps) => (
                  <button
                    key={ps.label}
                    onClick={() => handleStyleChange(ps.text)}
                    className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    {ps.label}预设
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={config.styleDescription}
              onChange={(e) => handleStyleChange(e.target.value)}
              placeholder="例：请使用护理学领域的专业术语，避免过度使用心理学词汇。编码标签应体现【照护】而非【关怀】，使用【医护关系】而非【人际关系】。"
              className="w-full h-28 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
          </div>

          {/* Term Table */}
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-1">专业术语对照表</div>
            <div className="text-xs text-gray-500 mb-3">
              设置"通用词 → 专业替换词"的映射关系，AI 编码时将优先使用右侧专业词汇。
            </div>

            {/* Add Row */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 mb-1">通用词（如：体验）</div>
                <input
                  type="text"
                  value={newGeneral}
                  onChange={(e) => setNewGeneral(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()}
                  placeholder="通用词"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div className="flex items-end pb-0">
                <span className="text-gray-400 pb-2 px-1">{'→'}</span>
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-gray-500 mb-1">专业替换词（如：疗愈性体验）</div>
                <input
                  type="text"
                  value={newSpecific}
                  onChange={(e) => setNewSpecific(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()}
                  placeholder="专业替换词"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <Button variant="primary" size="sm" onClick={handleAddTerm}>添加</Button>
              </div>
            </div>

            {/* Term List */}
            {config.terms.length === 0 ? (
              <div className="text-center py-5 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                尚未添加任何术语对照，在上方输入框中添加
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-600 font-medium">通用词</th>
                      <th className="text-left px-3 py-2 text-gray-400">→</th>
                      <th className="text-left px-3 py-2 text-gray-600 font-medium">专业替换词</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.terms.map((term, i) => (
                      <tr key={term.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="px-3 py-2 text-gray-600">{term.general}</td>
                        <td className="px-3 py-2 text-gray-400">→</td>
                        <td className="px-3 py-2 font-medium text-indigo-700">{term.specific}</td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => handleDeleteTerm(term.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="primary" onClick={handleSave}>
              {saved ? '✓ 已保存' : '保存设置'}
            </Button>
            <span className="text-xs text-gray-500">设置将在下次编码时自动生效</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

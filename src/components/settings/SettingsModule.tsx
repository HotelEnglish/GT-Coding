import React, { useState } from 'react';
import { ApiConfig, ApiMode } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { callAPI } from '@/utils/api';
import { cn } from '@/utils/cn';

interface SettingsModuleProps {
  config: ApiConfig;
  onSave: (cfg: ApiConfig) => void;
}

const PRESETS = [
  { provider: 'Anthropic', model: 'claude-sonnet-4-5', baseurl: 'https://api.anthropic.com', mode: 'anthropic' as ApiMode },
  { provider: 'Anthropic', model: 'claude-3-5-sonnet-20241022', baseurl: 'https://api.anthropic.com', mode: 'anthropic' as ApiMode },
  { provider: 'OpenAI', model: 'gpt-4o', baseurl: 'https://api.openai.com', mode: 'openai' as ApiMode },
  { provider: 'DeepSeek', model: 'deepseek-chat', baseurl: 'https://api.deepseek.com', mode: 'openai' as ApiMode },
  { provider: 'Gemini', model: 'gemini-1.5-pro', baseurl: 'https://generativelanguage.googleapis.com/v1beta/openai', mode: 'openai' as ApiMode },
];

export const SettingsModule: React.FC<SettingsModuleProps> = ({ config, onSave }) => {
  const [local, setLocal] = useState<ApiConfig>({ ...config });
  const [testMsg, setTestMsg] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [saved, setSaved] = useState(false);

  const update = (key: keyof ApiConfig, val: string) => {
    setLocal((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    const clean = { ...local, baseurl: local.baseurl.trim().replace(/\/$/, '') };
    onSave(clean);
    setLocal(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTest = async () => {
    if (!local.apikey) { setTestMsg('请先填入 API Key'); setTestStatus('error'); return; }
    const testCfg = { ...local, baseurl: local.baseurl.trim().replace(/\/$/, '') };
    setTestStatus('loading');
    setTestMsg('连接测试中…');
    try {
      const resp = await callAPI('请回复「连接正常」三个字', '你是助手', testCfg, 20);
      if (resp.ok) {
        setTestStatus('ok');
        setTestMsg('✓ 连接成功！API 配置正常。');
      } else {
        const e = await resp.json().catch(() => ({})) as { error?: { message?: string } };
        setTestStatus('error');
        setTestMsg('连接失败：' + (e.error?.message || `HTTP ${resp.status}`));
      }
    } catch (e) {
      setTestStatus('error');
      setTestMsg('连接失败：' + String(e));
    }
  };

  const fillPreset = (preset: typeof PRESETS[0]) => {
    setLocal((prev) => ({ ...prev, baseurl: preset.baseurl, model: preset.model, mode: preset.mode }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>大模型 API 配置</CardTitle>
          <span className="text-xs text-gray-500">配置后点击保存，数据存储在本地浏览器中</span>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">API Base URL</label>
              <input
                type="text"
                value={local.baseurl}
                onChange={(e) => update('baseurl', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">模型名称</label>
              <input
                type="text"
                value={local.model}
                onChange={(e) => update('model', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">API Key</label>
              <input
                type="password"
                value={local.apikey}
                onChange={(e) => update('apikey', e.target.value)}
                placeholder="sk-..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-mono"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">接口模式</label>
            <div className="flex gap-2">
              {(['anthropic', 'openai'] as ApiMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => update('mode', m)}
                  className={cn(
                    'text-sm px-3.5 py-2 rounded-lg border transition-colors',
                    local.mode === m
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {m === 'anthropic' ? 'Anthropic 原生' : 'OpenAI 兼容'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {local.mode === 'anthropic'
                ? '使用 Anthropic 官方接口格式（/v1/messages），适合 Claude 系列模型。'
                : '使用 OpenAI 兼容接口格式（/v1/chat/completions），适合 GPT、DeepSeek、Gemini 等模型。'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button variant="primary" onClick={handleSave}>{saved ? '✓ 已保存' : '保存配置'}</Button>
            <Button variant="secondary" onClick={handleTest} disabled={testStatus === 'loading'}>
              {testStatus === 'loading' ? '测试中…' : '测试连接'}
            </Button>
            {testMsg && (
              <span className={cn('text-xs', testStatus === 'ok' ? 'text-emerald-600' : 'text-red-600')}>
                {testMsg}
              </span>
            )}
          </div>

          {/* Security note */}
          <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 leading-relaxed">
            🔒 <strong>安全说明：</strong>API Key 仅存储在您的本地浏览器（localStorage）中，不会上传至任何服务器。所有 API 请求由您的浏览器直接发送至所配置的服务商。
          </div>
        </CardBody>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle>常用模型快速填入</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">提供商</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">模型</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">模式</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {PRESETS.map((p, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-3 text-gray-700 font-medium">{p.provider}</td>
                    <td className="py-2 px-3 font-mono text-gray-600">{p.model}</td>
                    <td className="py-2 px-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-medium',
                        p.mode === 'anthropic' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {p.mode === 'anthropic' ? 'Anthropic' : 'OpenAI 兼容'}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <Button variant="ghost" size="sm" onClick={() => fillPreset(p)}>填入</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

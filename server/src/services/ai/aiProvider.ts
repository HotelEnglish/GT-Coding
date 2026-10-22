import { SegmentDraft } from '../provenanceService';
import { parseProviderOutput } from '../../schemas/analysisOutput';

export interface ProviderResult {
  candidate: { codes: Array<{ label: string; quote: string; rationale: string }>; memoDrafts: string[] };
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AiProvider {
  analyze(segments: SegmentDraft[]): Promise<ProviderResult>;
}

export class DevelopmentProvider implements AiProvider {
  async analyze(segments: SegmentDraft[]): Promise<ProviderResult> {
    const first = segments.find((segment) => segment.text.trim());
    if (!first) {
      return { candidate: { codes: [], memoDrafts: [] }, provider: 'development', model: 'deterministic-fixture' };
    }
    const quote = first.text.trim().slice(0, Math.min(80, first.text.trim().length));
    return {
      candidate: {
        codes: [{ label: '待研究者命名的初始概念', quote, rationale: '开发 Provider 仅用于验证证据、建议和决策流程。' }],
        memoDrafts: ['AI 草稿：请由研究者检查此概念是否贴合资料语境，并记录保留、修改或拒绝的理由。'],
      },
      provider: 'development',
      model: 'deterministic-fixture',
    };
  }
}

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number = Number(process.env.AI_TIMEOUT_MS || 120_000),
  ) {}

  async analyze(segments: SegmentDraft[]): Promise<ProviderResult> {
    const source = segments.map((segment) => segment.text).join('\n');
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你是程序化扎根理论的分析助手。只返回 JSON：{"codes":[{"label":"...","quote":"原文连续引语","rationale":"..."}],"memoDrafts":["..."]}。每条 quote 必须逐字来自输入资料。所有结果都是待研究者审查的建议。' },
          { role: 'user', content: source },
        ],
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`模型服务请求失败：HTTP ${response.status}`);
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error('模型服务没有返回可解析内容。');
    const { candidate } = parseProviderOutput(raw);
    return {
      candidate,
      provider: 'openai-compatible',
      model: this.model,
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
    };
  }
}

export function createAiProvider(): AiProvider {
  const mode = process.env.AI_PROVIDER || 'development';
  if (mode === 'development') return new DevelopmentProvider();
  if (mode === 'openai-compatible') {
    const { AI_API_BASE_URL, AI_API_KEY, AI_MODEL } = process.env;
    if (!AI_API_BASE_URL || !AI_API_KEY || !AI_MODEL) throw new Error('真实模型调用需要 AI_API_BASE_URL、AI_API_KEY 和 AI_MODEL。');
    return new OpenAiCompatibleProvider(AI_API_BASE_URL, AI_API_KEY, AI_MODEL);
  }
  throw new Error(`不支持的 AI_PROVIDER：${mode}`);
}

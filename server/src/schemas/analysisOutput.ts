import { z } from 'zod';

const candidateCodeSchema = z.object({
  label: z.string().trim().min(1).max(200),
  quote: z.string().min(1).max(4000),
  rationale: z.string().trim().max(2000),
});

const analysisCandidateSchema = z.object({
  codes: z.array(candidateCodeSchema).max(200),
  memoDrafts: z.array(z.string().trim().min(1).max(2000)).max(50),
});

export const providerResponseSchema = z.object({
  candidate: analysisCandidateSchema,
  provider: z.string().min(1).max(100),
  model: z.string().min(1).max(200),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
});

export function parseProviderOutput(raw: string): {
  candidate: { codes: Array<{ label: string; quote: string; rationale: string }>; memoDrafts: string[] };
} {
  const trimmed = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  let jsonValue: unknown;
  try {
    jsonValue = JSON.parse(trimmed);
  } catch {
    throw new Error('模型输出不是可解析的 JSON。');
  }

  const candidate = analysisCandidateSchema.safeParse(jsonValue);
  if (!candidate.success) {
    throw new Error('模型输出不符合候选分析结构。');
  }
  return { candidate: candidate.data };
}

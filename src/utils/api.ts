import { ApiConfig, CodingResult } from '../types';

// ==========================================
// API CALL
// ==========================================
export async function callAPI(
  userMsg: string,
  systemMsg: string,
  cfg: ApiConfig,
  maxTokens = 4000
): Promise<Response> {
  if (cfg.mode === 'anthropic') {
    return fetch(cfg.baseurl + '/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apikey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens,
        system: systemMsg,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
  } else {
    return fetch(cfg.baseurl + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + cfg.apikey,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg },
        ],
      }),
    });
  }
}

export function extractText(data: Record<string, unknown>, mode: string): string {
  if (mode === 'anthropic') {
    const content = data.content as Array<{ type: string; text: string }> | undefined;
    return content?.find((b) => b.type === 'text')?.text || '';
  }
  const choices = data.choices as Array<{ message: { content: string } }> | undefined;
  return choices?.[0]?.message?.content || '';
}

// ==========================================
// TEXT CHUNKING
// ==========================================
export function chunkText(text: string, maxLen = 2500): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n+/);
  let currentChunk = '';

  for (const p of paragraphs) {
    if (currentChunk.length + p.length > maxLen && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += p + '\n';
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks;
}

// ==========================================
// ROBUST JSON PARSE
// ==========================================
export function robustJSONParse(rawString: string): CodingResult {
  let cleanStr = rawString.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleanStr.indexOf('{');
  if (firstBrace >= 0) cleanStr = cleanStr.slice(firstBrace);

  try { return JSON.parse(cleanStr); } catch (_) { /* continue */ }
  try { return JSON.parse(cleanStr.replace(/[\n\r\t]+/g, ' ')); } catch (_) { /* continue */ }

  // Patch truncated JSON
  let patched = cleanStr;
  const lastQuote = patched.lastIndexOf('"');
  const lastClose = Math.max(patched.lastIndexOf('}'), patched.lastIndexOf(']'));
  if (lastQuote > lastClose) patched = patched.substring(0, lastQuote) + '"';

  for (let i = 0; i < 5; i++) {
    try { return JSON.parse(patched); } catch (_) { /* continue */ }
    try { return JSON.parse(patched + '}'); } catch (_) { /* continue */ }
    try { return JSON.parse(patched + ']}'); } catch (_) { /* continue */ }
    try { return JSON.parse(patched + ']}]}'); } catch (_) { /* continue */ }
    patched += '}';
  }
  throw new Error('JSON 解析彻底失败，片段可能已严重损坏。');
}

// ==========================================
// MERGE CODING DATA
// ==========================================
export function mergeCodingData(mainData: CodingResult, newData: CodingResult): void {
  if (!mainData.selective_codes) mainData.selective_codes = [];

  if (newData.memo_suggestions?.length) {
    mainData.memo_suggestions = [
      ...(mainData.memo_suggestions || []),
      ...newData.memo_suggestions,
    ];
  }
  if (newData.core_category && !mainData.core_category) {
    mainData.core_category = newData.core_category;
  }

  (newData.selective_codes || []).forEach((newSc) => {
    let existSc = mainData.selective_codes.find((s) => s.label === newSc.label);
    if (!existSc) {
      mainData.selective_codes.push(newSc);
    } else {
      (newSc.axial_codes || []).forEach((newAc) => {
        if (!existSc!.axial_codes) existSc!.axial_codes = [];
        const existAc = existSc!.axial_codes.find((a) => a.label === newAc.label);
        if (!existAc) {
          existSc!.axial_codes.push(newAc);
        } else {
          if (!existAc.open_codes) existAc.open_codes = [];
          existAc.open_codes.push(...(newAc.open_codes || []));
        }
      });
    }
  });
}

// ==========================================
// EXPORT UTILITIES
// ==========================================
export function downloadFile(content: string, filename: string, type: string): void {
  const b = new Blob([content], { type });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(u);
}

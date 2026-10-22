import { createHash } from 'node:crypto';

export interface SegmentDraft {
  startOffset: number;
  endOffset: number;
  text: string;
  contentHash: string;
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Produces deterministic, non-overlapping character ranges. Offsets use
 * JavaScript UTF-16 string positions, which is also what the browser uses for
 * selection offsets.
 */
export function createSegments(content: string, maxLength = 1200): SegmentDraft[] {
  if (!content.trim()) return [];

  const segments: SegmentDraft[] = [];
  let start = 0;

  while (start < content.length) {
    let end = Math.min(start + maxLength, content.length);
    if (end < content.length) {
      const boundary = content.lastIndexOf('\n', end);
      if (boundary > start) end = boundary + 1;
    }

    const text = content.slice(start, end);
    if (text.length > 0) {
      segments.push({ startOffset: start, endOffset: end, text, contentHash: hashContent(text) });
    }
    start = end;
  }

  return segments;
}

export function assertEvidenceQuote(segment: SegmentDraft, quote: string): void {
  if (!quote || !segment.text.includes(quote)) {
    throw new Error('证据引语不属于指定的原始资料片段。');
  }
}

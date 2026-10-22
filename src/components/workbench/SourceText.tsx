import React from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { WsAssignment, WsDocument } from '@/utils/workbenchApi';

interface SourceTextProps {
  documents: WsDocument[];
  suggestedAssignments: WsAssignment[];
}

/**
 * Left column: the immutable source text with suggested evidence highlighted.
 * The text is rendered strictly from the fastest server version — editing and
 * re-uploading creates a new immutable version, it never mutates this one.
 */
export const SourceText: React.FC<SourceTextProps> = ({ documents, suggestedAssignments }) => {
  const versionOptions = React.useMemo(
    () =>
      documents.flatMap((doc) =>
        doc.versions.map((v) => ({ id: v.id, label: `${doc.title} · v${v.version} · ${v.contentHash.slice(0, 8)}` }))
      ),
    [documents]
  );

  const [versionId, setVersionId] = React.useState<string>('');
  React.useEffect(() => {
    if (!versionOptions.some((o) => o.id === versionId)) {
      setVersionId(versionOptions[0]?.id ?? '');
    }
  }, [versionOptions, versionId]);

  const { content, hash } = React.useMemo(() => {
    for (const doc of documents) {
      const version = doc.versions.find((v) => v.id === versionId);
      if (version) return { content: version.content, hash: version.contentHash };
    }
    return { content: '', hash: '' };
  }, [documents, versionId]);

  const adorned = React.useMemo(() => {
    if (!content) return null;
    const quotes = suggestedAssignments
      .filter((a) => a.sourceSegment.documentVersion.id === versionId)
      .map((a) => a.evidenceQuote);
    let pieces: Array<{ text: string; quote: boolean }> = [{ text: content, quote: false }];
    for (const quote of quotes) {
      const next: Array<{ text: string; quote: boolean }> = [];
      for (const piece of pieces) {
        if (piece.quote || !piece.text.includes(quote)) {
          next.push(piece);
          continue;
        }
        const rest = piece.text;
        let cursor = rest.indexOf(quote);
        if (cursor < 0) { next.push(piece); continue; }
        next.push({ text: rest.slice(0, cursor), quote: false });
        next.push({ text: quote, quote: true });
        next.push({ text: rest.slice(cursor + quote.length), quote: false });
      }
      pieces = next;
    }
    return pieces;
  }, [content, suggestedAssignments, versionId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>资料原文 🔒</CardTitle>
        <select
          data-testid="source-version-select"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          className="text-[11px] border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 max-w-36 truncate"
        >
          {versionOptions.length === 0 && <option value="">尚无资料</option>}
          {versionOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </CardHeader>
      <CardBody>
        {content ? (
          <>
            <div data-testid="source-text" className="text-xs leading-loose text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {adorned?.map((piece, i) =>
                piece.quote ? (
                  <mark key={i} className="bg-amber-200 rounded-sm">{piece.text}</mark>
                ) : (
                  <span key={i}>{piece.text}</span>
                )
              )}
            </div>
            <p className="mt-2 font-mono text-[10px] text-gray-400">SHA-256 前 12 位：{hash.slice(0, 12)}</p>
          </>
        ) : (
          <p className="text-xs text-gray-500">上传资料后，这里展示带版本标识的不可变原文，AI 引语自动高亮。</p>
        )}
      </CardBody>
    </Card>
  );
};

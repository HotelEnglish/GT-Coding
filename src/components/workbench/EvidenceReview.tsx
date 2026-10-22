import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { DecisionControls } from './DecisionControls';
import { WsAssignment, WsDocument, WsCode } from '@/utils/workbenchApi';

interface EvidenceReviewProps {
  codes: WsCode[];
  documents: WsDocument[];
  pending: boolean;
  onDecide: (assignmentId: string, action: 'accept' | 'reject' | 'defer') => void;
  onEdit: (assignmentId: string, quote: string, rationale: string) => void;
}

interface EnrichedAssignment {
  assignment: WsAssignment;
  verified: boolean;
  versionLabel: string;
  versionHash: string;
}

function documentTitle(documents: WsDocument[], versionId: string): { title: string; version: number; hash: string } | null {
  for (const doc of documents) {
    const v = doc.versions.find((item) => item.id === versionId);
    if (v) return { title: doc.title, version: v.version, hash: v.contentHash };
  }
  return null;
}

function useEnrich(codes: WsCode[], documents: WsDocument[]): EnrichedAssignment[] {
  return React.useMemo(() => {
    const enriched: EnrichedAssignment[] = [];
    for (const code of codes) {
      for (const assignment of code.assignments) {
        const ref = documentTitle(documents, assignment.sourceSegment.documentVersion.id);
        let verified = false;
        if (ref) {
          const doc = documents.find((d) => d.versions.some((v) => v.id === assignment.sourceSegment.documentVersion.id));
          const version = doc?.versions.find((v) => v.id === assignment.sourceSegment.documentVersion.id);
          verified = Boolean(
            version &&
              version.content.slice(
                assignment.sourceSegment.startOffset,
                assignment.sourceSegment.endOffset
              ).includes(assignment.evidenceQuote)
          );
        }
        enriched.push({
          assignment,
          verified,
          versionLabel: ref ? `${ref.title} · v${ref.version}` : '未知版本',
          versionHash: ref?.hash ?? '',
        });
      }
    }
    return enriched;
  }, [codes, documents]);
}

const STATUS_STYLE: Record<string, string> = {
  suggested: 'bg-indigo-50 border-indigo-200',
  deferred: 'bg-gray-50 border-gray-200',
  accepted: 'bg-emerald-50 border-emerald-200',
  edited: 'bg-violet-50 border-violet-200',
  rejected: 'bg-gray-50 border-gray-200 opacity-70',
};

/**
 * Middle column: AI-suggested code assignments awaiting researcher review.
 * Every card shows the provenance chain (document version + UTF-16 offsets +
 * content hash); cards that no longer verify against the immutable source
 * render fail-closed and cannot be accepted or edited.
 */
export const EvidenceReview: React.FC<EvidenceReviewProps> = ({ codes, documents, pending, onDecide, onEdit }) => {
  const enriched = useEnrich(codes, documents);

  if (enriched.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>AI 编码建议 → 研究者决策</CardTitle></CardHeader>
        <CardBody>
          <p className="text-xs text-gray-500">还没有可评审的建议。上传资料并运行一次分析后，这里会逐条出现带溯源标签的建议。</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-3" data-testid="evidence-review">
      {codes.map((code) => {
        const codeAssignments = enriched.filter((e) => e.assignment.id && code.assignments.includes(e.assignment));
        const finalized = codeAssignments.every((e) => ['accepted', 'edited'].includes(e.assignment.status));
        return (
          <Card key={code.id}>
            <CardHeader>
              <CardTitle>{code.label}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="selective">{code.origin === 'ai' ? 'AI 命名' : '研究者命名'}</Badge>
                {finalized && <Badge variant="success">已定稿</Badge>}
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {codeAssignments.map(({ assignment, verified, versionLabel, versionHash }) => (
                <div
                  key={assignment.id}
                  data-testid="assignment-card"
                  data-status={assignment.status}
                  className={`border rounded-xl p-3 ${STATUS_STYLE[assignment.status] ?? 'bg-white border-gray-200'}`}
                >
                  <blockquote className="text-[11px] leading-relaxed text-gray-700 border-l-2 border-amber-300 pl-2 italic">
                    “{assignment.evidenceQuote}”
                  </blockquote>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-gray-400">
                    <span data-testid="provenance">
                      {versionLabel} [{assignment.sourceSegment.startOffset},{assignment.sourceSegment.endOffset}]
                    </span>
                    <span className="truncate max-w-24">{versionHash.slice(0, 12)}</span>
                    {verified ? (
                      <span className="text-emerald-700">✓ 引语已核验</span>
                    ) : (
                      <span className="text-red-700">✗ 无法在原文核验</span>
                    )}
                  </div>
                  {assignment.rationale && (
                    <p className="mt-1.5 text-[11px] text-gray-600 leading-relaxed">{assignment.rationale}</p>
                  )}
                  <DecisionControls
                    assignment={assignment}
                    evidenceVerified={verified}
                    pending={pending}
                    onDecide={(action) => onDecide(assignment.id, action)}
                    onEdit={(quote, rationale) => onEdit(assignment.id, quote, rationale)}
                  />
                </div>
              ))}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
};

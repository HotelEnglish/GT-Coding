import prisma from '../utils/db';

export interface AuditArchiveFile {
  filename: string;
  contentType: string;
  body: string;
}

export type AuditFormat = 'json' | 'csv';

interface ProjectRef {
  id: string;
  title: string;
  researchQuestion: string | null;
  methodology: string;
  createdAt: Date;
  updatedAt: Date;
}

const LEGACY_WARNING = 'legacy: provenance incomplete';
const SCHEMA_VERSION = 1;

/**
 * Builds the researcher-facing audit archive for one project.
 * JSON variant is a full, self-contained capsule (documents + codes +
 * assignments + decisions + runs + model metadata). The CSV variant is a
 * flat spreadsheet of every code assignment with its provenance chain.
 * Only database-derived content is serialized: export never touches
 * provider configuration, so no credentials can leak into the archive.
 */
export async function buildAuditArchiveFile(
  project: ProjectRef,
  format: AuditFormat
): Promise<AuditArchiveFile> {
  const [documents, codes, memos, relationships, runs, saturationAssessment, legacyCodingTaskCount] =
    await Promise.all([
      prisma.sourceDocument.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'asc' },
        include: {
          versions: {
            orderBy: { version: 'asc' },
            include: { segments: { orderBy: { startOffset: 'asc' } } },
          },
        },
      }),
      prisma.researchCode.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'asc' },
        include: {
          assignments: {
            orderBy: { createdAt: 'asc' },
            include: {
              sourceSegment: true,
              decisions: { orderBy: { createdAt: 'asc' } },
            },
          },
        },
      }),
      prisma.analyticMemo.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'asc' },
        include: { decisions: true },
      }),
      prisma.categoryRelationship.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.analysisRun.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: 'asc' },
        include: { modelRun: true },
      }),
      prisma.saturationAssessment.findUnique({ where: { projectId: project.id } }),
      prisma.codingTask.count(),
    ]);

  const legacy =
    legacyCodingTaskCount > 0 ? { warnings: [LEGACY_WARNING], codingTaskCount: legacyCodingTaskCount } : { warnings: [], codingTaskCount: 0 };

  if (format === 'csv') {
    return {
      filename: `gt-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: buildAssignmentsCsv(codes, documents),
    };
  }

  const archive = {
    meta: {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      project: {
        id: project.id,
        title: project.title,
        researchQuestion: project.researchQuestion,
        methodology: project.methodology,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      legacy,
    },
    documents,
    codes,
    memos,
    relationships,
    analysisRuns: runs,
    saturationAssessment,
  };

  return {
    filename: `gt-audit-${new Date().toISOString().slice(0, 10)}.json`,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(archive, null, 2),
  };
}

function buildAssignmentsCsv(
  codes: Array<{
    label: string;
    definition: string | null;
    assignments: Array<{
      evidenceQuote: string;
      origin: string;
      status: string;
      rationale: string | null;
      originalQuote: string | null;
      originalRationale: string | null;
      createdAt: Date;
      sourceSegment: {
        documentVersionId: string;
        startOffset: number;
        endOffset: number;
        contentHash: string;
      };
      decisions: Array<{ action: string; createdAt: Date; rationale: string | null }>;
    }>;
  }>,
  documents: Array<{ title: string; versions: Array<{ id: string; version: number; contentHash: string }> }>
): string {
  const versionIndex = new Map<string, { title: string; version: number; hash: string }>();
  for (const doc of documents) {
    for (const v of doc.versions) {
      versionIndex.set(v.id, { title: doc.title, version: v.version, hash: v.contentHash });
    }
  }

  const header = [
    'code',
    'codeDefinition',
    'evidenceQuote',
    'evidenceOrigin',
    'document',
    'documentVersion',
    'documentContentHash',
    'startOffsetUTF16',
    'endOffsetUTF16',
    'segmentContentHash',
    'assignmentStatus',
    'rationale',
    'originalQuote',
    'originalRationale',
    'createdAt',
    'decisions',
  ];

  const rows: string[] = [csvRow(header)];
  for (const code of codes) {
    for (const assignment of code.assignments) {
      const seg = assignment.sourceSegment;
      const v = versionIndex.get(seg.documentVersionId);
      rows.push(
        csvRow([
          code.label,
          code.definition ?? '',
          assignment.evidenceQuote,
          assignment.origin,
          v?.title ?? '',
          v?.version !== undefined ? String(v.version) : '',
          v?.hash ?? '',
          String(seg.startOffset),
          String(seg.endOffset),
          seg.contentHash,
          assignment.status,
          assignment.rationale ?? '',
          assignment.originalQuote ?? '',
          assignment.originalRationale ?? '',
          assignment.createdAt.toISOString(),
          assignment.decisions
            .map((d) => `${d.action}@${d.createdAt.toISOString()}${d.rationale ? `(${d.rationale})` : ''}`)
            .join(' | '),
        ])
      );
    }
  }
  return rows.join('\n') + '\n';
}

function csvRow(cells: string[]): string {
  return cells.map((cell) => `"${cell.replace(/\r\n?/g, '\n').replace(/"/g, '""')}"`).join(',');
}

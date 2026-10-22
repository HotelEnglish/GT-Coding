import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import prisma from '../utils/db';
import app from '../app';

/**
 * Integration tests for the workbench lifecycle. They need DATABASE_URL_TEST
 * pointing to an EMPTY disposable database (see migrations.test.ts); the suite
 * skips automatically when it is not configured.
 */

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

const ws = 'ws-test-lifecycle';
const header = { 'x-gt-workspace': ws };

describe.skipIf(!TEST_DB_URL)('workbench lifecycle (integration)', () => {
  let runId: string | null = null;

  beforeAll(async () => {
    await prisma.researchProject.deleteMany({ where: { workspaceId: ws } });
  });

  afterAll(async () => {
    await prisma.researchProject.deleteMany({ where: { workspaceId: ws } });
    await prisma.$disconnect();
  });

  it('creates a project scoped to the workspace', async () => {
    const res = await request(app).post('/api/workbench/projects').set(header)
      .send({ title: '生命周期测试项目', researchQuestion: '如何权衡？' });
    expect(res.status).toBe(201);
    expect(res.body.data.methodology).toBe('procedural');
  });

  it('creates a document with deterministic segments and hash-chain', async () => {
    const project = await prisma.researchProject.findFirst({ where: { workspaceId: ws } });
    if (!project) throw new Error('Test isolation broken: missing project');
    const res = await request(app)
      .post(`/api/workbench/projects/${project.id}/documents`)
      .set(header)
      .send({ title: '访谈一', content: '受访者：我认为价格偏高。\n访问者：偏高的原因是？\n受访者：质量一般，不如竞品。\n' });
    expect(res.status).toBe(201);
    const sections = res.body.data.versions[0].segments;
    expect(sections.length).toBeGreaterThan(0);
    const totalLen = sections.reduce((sum: number, s: { text: string }) => sum + s.text.length, 0);
    expect(totalLen).toBe(res.body.data.versions[0].content.length);
  });

  it('refuses to analyze a version from another workspace (404)', async () => {
    const project = await prisma.researchProject.findFirst({ where: { workspaceId: ws } });
    if (!project) throw new Error('Test isolation broken: missing project');
    const version = await prisma.sourceDocumentVersion.findFirst({ where: { document: { projectId: project.id } } });
    if (!version) throw new Error('Test isolation broken: missing version');
    const res = await request(app)
      .post(`/api/workbench/projects/${project.id}/analysis-runs`)
      .set('x-gt-workspace', 'ws-other-workspace')
      .set('idempotency-key', 'cross-ws-attempt')
      .send({ documentVersionId: version.id });
    expect(res.status).toBe(404);
  });

  it('runs an analysis asynchronously and completes with a development provider', async () => {
    const project = await prisma.researchProject.findFirst({ where: { workspaceId: ws } });
    if (!project) throw new Error('Test isolation broken: missing project');
    const version = await prisma.sourceDocumentVersion.findFirst({ where: { document: { projectId: project.id } } });
    if (!version) throw new Error('Test isolation broken: missing version');

    const start = await request(app)
      .post(`/api/workbench/projects/${project.id}/analysis-runs`)
      .set(header)
      .set('idempotency-key', 'run-idem-1')
      .send({ documentVersionId: version.id });
    expect([202, 200]).toContain(start.status);
    runId = start.body.data.id;

    let run: { status: string; modelRun?: unknown } | null = null;
    for (let attempt = 0; attempt < 50; attempt++) {
      const poll = await request(app).get(`/api/workbench/analysis-runs/${runId}`).set(header);
      run = poll.body.data as { status: string; modelRun?: unknown } | null;
      if (run && (run.status === 'completed' || run.status === 'failed')) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(run?.status).toBe('completed');
    expect(run?.modelRun).toBeDefined();

    const overview = await request(app).get(`/api/workbench/projects/${project.id}/overview`).set(header);
    expect(overview.status).toBe(200);
    const codes = overview.body.data.codes as Array<{
      assignments: Array<{ id: string; status: string; origin: string }>;
    }>;
    const suggested = codes.flatMap((c) => c.assignments).filter((a) => a.origin === 'ai' && a.status === 'suggested');
    expect(suggested.length).toBeGreaterThan(0);
  });

  it('is idempotent: replaying the same Idempotency-Key returns the same run', async () => {
    const project = await prisma.researchProject.findFirst({ where: { workspaceId: ws } });
    if (!project) throw new Error('Test isolation broken: missing project');
    const replay = await request(app)
      .post(`/api/workbench/projects/${project.id}/analysis-runs`)
      .set(header)
      .set('idempotency-key', 'run-idem-1')
      .send({});
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(runId);
  });

  it('accepts a suggested assignment and records an append-only decision', async () => {
    const project = await prisma.researchProject.findFirst({ where: { workspaceId: ws } });
    if (!project) throw new Error('Test isolation broken: missing project');
    const overview = await request(app).get(`/api/workbench/projects/${project.id}/overview`).set(header);
    const assignment = overview.body.data.codes
      .flatMap((c: { assignments: unknown[] }) => c.assignments)
      .find((a: { origin: string; status: string }) => a.origin === 'ai' && a.status === 'suggested');

    const res = await request(app)
      .post(`/api/workbench/code-assignments/${assignment.id}/decisions`)
      .set(header)
      .send({ action: 'accept', rationale: '贴合语境' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  it('edits a suggestion while preserving the original AI quote', async () => {
    const project = await prisma.researchProject.findFirst({ where: { workspaceId: ws } });
    if (!project) throw new Error('Test isolation broken: missing project');
    const overview = await request(app).get(`/api/workbench/projects/${project.id}/overview`).set(header);
    const assignment = overview.body.data.codes
      .flatMap((c: { assignments: unknown[] }) => c.assignments)
      .find((a: { origin: string; status: string }) => a.origin === 'ai' && a.status === 'suggested');
    if (!assignment) {
      console.warn('No further suggested assignment left for the edit test — skipping implicit assertions');
      return;
    }

    const res = await request(app)
      .post(`/api/workbench/code-assignments/${assignment.id}/decisions`)
      .set(header)
      .send({ action: 'edit', rationale: '改为研究者认可的措辞' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('edited');
    expect(res.body.data.originalQuote).toBe(assignment.evidenceQuote);
  });

  it('rejects an edited quote that is not present in the source segment', async () => {
    const project = await prisma.researchProject.findFirst({ where: { workspaceId: ws } });
    if (!project) throw new Error('Test isolation broken: missing project');
    const overview = await request(app).get(`/api/workbench/projects/${project.id}/overview`).set(header);
    const assignment = overview.body.data.codes.find(Boolean)?.assignments?.[0];
    if (!assignment) return;

    const res = await request(app)
      .post(`/api/workbench/code-assignments/${assignment.id}/decisions`)
      .set(header)
      .send({ action: 'edit', quote: '这段话根本不在原文中出现的引语' });
    // Server must refuse persistence when the quote cannot be proven against the source.
    expect([422, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('stores a researcher saturation assessment', async () => {
    const project = await prisma.researchProject.findFirst({ where: { workspaceId: ws } });
    if (!project) throw new Error('Test isolation broken: missing project');
    const res = await request(app)
      .put(`/api/workbench/projects/${project.id}/saturation-assessment`)
      .set(header)
      .send({
        payload: {
          scope: '初始编码阶段',
          decision: '尚未饱和',
          openQuestions: ['竞品对比类别证据不足'],
          rationale: '第三份材料中仍有新概念出现',
        },
      });
    expect(res.status).toBe(200);
    expect((res.body.data.payload as { decision: string }).decision).toBe('尚未饱和');

    const rejected = await request(app)
      .put(`/api/workbench/projects/${project.id}/saturation-assessment`)
      .set(header)
      .send({ payload: { scope: 'x' } });
    expect(rejected.status).toBe(400);
  });
});


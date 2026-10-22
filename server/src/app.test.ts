import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from './app';

describe('GET /health', () => {
  it('returns ok without authentication', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/workbench/projects', () => {
  it('rejects an empty title with VALIDATION_ERROR without creating rows', async () => {
    const res = await request(app)
      .post('/api/workbench/projects')
      .send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-string title', async () => {
    const res = await request(app)
      .post('/api/workbench/projects')
      .send({ title: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/workbench/projects/:id/documents', () => {
  it('rejects empty content with VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/workbench/projects/some-nonexistent-id/documents')
      .send({ title: 'Doc', content: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects content over the 100,000 character limit', async () => {
    const res = await request(app)
      .post('/api/workbench/projects/some-nonexistent-id/documents')
      .send({ title: 'Doc', content: 'x'.repeat(100_001) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/workbench/projects/:id/analysis-runs contract', () => {
  it('requires an Idempotency-Key header', async () => {
    const res = await request(app)
      .post('/api/workbench/projects/p/analysis-runs')
      .send({ documentVersionId: 'v1' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('requires documentVersionId', async () => {
    const res = await request(app)
      .post('/api/workbench/projects/p/analysis-runs')
      .set('idempotency-key', 'k-test-1')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects an over-long idempotency key', async () => {
    const res = await request(app)
      .post('/api/workbench/projects/p/analysis-runs')
      .set('idempotency-key', 'k'.repeat(129))
      .send({ documentVersionId: 'v1' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/workbench/code-assignments/:id/decisions contract', () => {
  it('rejects an unknown decision action before any data access', async () => {
    const res = await request(app)
      .post('/api/workbench/code-assignments/a1/decisions')
      .send({ action: 'approve' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects non-string edited quote', async () => {
    const res = await request(app)
      .post('/api/workbench/code-assignments/a1/decisions')
      .send({ action: 'edit', quote: 42 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/workbench/memos contract', () => {
  it('rejects empty memo content', async () => {
    const res = await request(app)
      .post('/api/workbench/memos')
      .send({ projectId: 'p', content: ' ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/workbench/memos/:id/decisions contract', () => {
  it('rejects an unknown memo decision action', async () => {
    const res = await request(app)
      .post('/api/workbench/memos/m1/decisions')
      .send({ action: 'edit' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/workbench/projects/:id/saturation-assessment contract', () => {
  it('rejects an assessment without a researcher decision', async () => {
    const res = await request(app)
      .put('/api/workbench/projects/p/saturation-assessment')
      .send({ payload: { scope: 'x' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-object payload', async () => {
    const res = await request(app)
      .put('/api/workbench/projects/p/saturation-assessment')
      .send({ payload: 'reached' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

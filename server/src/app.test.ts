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

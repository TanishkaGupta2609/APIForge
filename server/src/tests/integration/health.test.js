import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('Server Health and Base Endpoints', () => {
  it('GET /api/health returns 200 with healthy status and database state', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.database).toBeDefined();
    expect(res.body.message).toBe('APIForge server is running');
  });

  it('GET /api/unknown-endpoint returns 404 with structured error envelope', async () => {
    const res = await request(app).get('/api/unknown-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('/api/unknown-endpoint');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('POST with malformed JSON triggers errorHandler returning 400 BAD_REQUEST', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"invalidJson": ');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toContain('Malformed JSON');
  });
});

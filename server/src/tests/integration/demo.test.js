import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import demoApp from '../../demoApp.js';
import { resetRateLimits } from '../../modules/demo/demo.controller.js';

describe('Built-in Demo API Integration Suite (/api/demo)', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it('GET /api/demo/ping returns instant 200 OK with pong payload', async () => {
    const res = await request(app).get('/api/demo/ping');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pong).toBe(true);
    expect(res.body.data.server).toBe('APIForge-Demo-Sandbox');
  });

  it('GET /api/demo/health returns demo status and scenario directory', async () => {
    const res = await request(app).get('/api/demo/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(Array.isArray(res.body.data.availableScenarios)).toBe(true);
    expect(res.body.data.availableScenarios.length).toBeGreaterThan(0);
  });

  it('GET /api/demo/delayed returns simulated artificial latency metadata', async () => {
    const start = Date.now();
    const res = await request(app).get('/api/demo/delayed?ms=100');
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.simulatedDelayMs).toBe(100);
    expect(res.body.data.actualDelayMs).toBeGreaterThanOrEqual(80);
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  it('GET /api/demo/error injects specified HTTP status code', async () => {
    const res = await request(app).get('/api/demo/error?status=503&rate=1.0');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DEMO_SIMULATED_HTTP_503');
    expect(res.body.error.statusCode).toBe(503);
  });

  it('GET /api/demo/error passes when rate is set to 0.0', async () => {
    const res = await request(app).get('/api/demo/error?status=500&rate=0.0');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.outcome).toBe('passed');
  });

  it('GET /api/demo/rate-limited enforces sliding window and returns 429 when cap hit', async () => {
    // Limit = 3 requests per 10s
    const query = '?limit=3&window=10';

    const res1 = await request(app).get(`/api/demo/rate-limited${query}`);
    expect(res1.status).toBe(200);
    expect(res1.body.data.remaining).toBe(2);

    const res2 = await request(app).get(`/api/demo/rate-limited${query}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.remaining).toBe(1);

    const res3 = await request(app).get(`/api/demo/rate-limited${query}`);
    expect(res3.status).toBe(200);
    expect(res3.body.data.remaining).toBe(0);

    // 4th request must be rate limited
    const res4 = await request(app).get(`/api/demo/rate-limited${query}`);
    expect(res4.status).toBe(429);
    expect(res4.body.success).toBe(false);
    expect(res4.body.error.code).toBe('DEMO_RATE_LIMIT_EXCEEDED');
    expect(res4.headers['retry-after']).toBeDefined();
  });

  it('isolated demoApp responds to root probe and routes correctly', async () => {
    const rootRes = await request(demoApp).get('/');
    expect(rootRes.status).toBe(200);
    expect(rootRes.body.name).toBe('APIForge Demo Sandbox API');

    const pingRes = await request(demoApp).get('/api/demo/ping');
    expect(pingRes.status).toBe(200);
    expect(pingRes.body.data.pong).toBe(true);
  });
});

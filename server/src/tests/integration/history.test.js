import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../modules/auth/user.model.js';
import Target from '../../modules/targets/target.model.js';
import TestRun, { TEST_RUN_STATUS } from '../../modules/tests/testRun.model.js';
import env from '../../config/env.js';
import { generateToken } from '../../modules/auth/jwt.service.js';

describe('Test History & Filtering Integration Suite (/api/history)', () => {
  let userA;
  let tokenA;
  let userB;
  let tokenB;
  let targetA;
  let targetB;
  let runCompletedA;
  let runFailedA;
  let runCancelledA;
  let runUserB;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }
  });

  afterAll(async () => {
    await TestRun.deleteMany({});
    await Target.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await TestRun.deleteMany({});
    await Target.deleteMany({});
    await User.deleteMany({});

    // Seed User A
    const passwordHashA = await User.hashPassword('Password123!');
    userA = await User.create({
      name: 'Alice Historian',
      email: 'alice.historian@apiforge.io',
      passwordHash: passwordHashA,
    });
    tokenA = generateToken({ id: userA._id, email: userA.email });

    // Seed User B
    const passwordHashB = await User.hashPassword('Password456!');
    userB = await User.create({
      name: 'Bob Benchmark',
      email: 'bob.benchmark@apiforge.io',
      passwordHash: passwordHashB,
    });
    tokenB = generateToken({ id: userB._id, email: userB.email });

    // Seed Targets
    targetA = await Target.create({
      name: 'Production Auth Gateway',
      baseUrl: 'http://localhost:5001',
      owner: userA._id,
    });

    targetB = await Target.create({
      name: 'Bob Staging API',
      baseUrl: 'http://localhost:5002',
      owner: userB._id,
    });

    // Seed User A Test Runs
    runCompletedA = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Alpha Benchmark Checkout',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'GET',
        endpoint: '/api/demo/ping',
        vus: 10,
        duration: 15,
      },
      status: TEST_RUN_STATUS.COMPLETED,
      metrics: {
        totalRequests: 500,
        successfulRequests: 500,
        failedRequests: 0,
        requestsPerSecond: 33.3,
        avgLatency: 25.4,
      },
      createdAt: new Date('2026-11-05T10:00:00.000Z'),
    });

    runFailedA = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Beta Fault Injection Spike',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'POST',
        endpoint: '/api/demo/error',
        vus: 20,
        duration: 30,
      },
      status: TEST_RUN_STATUS.FAILED,
      error: {
        category: 'EXECUTION_ERROR',
        message: 'HTTP 500 threshold breached',
      },
      createdAt: new Date('2026-11-06T12:00:00.000Z'),
    });

    runCancelledA = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Gamma Aborted Rampup',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'GET',
        endpoint: '/api/demo/delayed',
        vus: 50,
        duration: 120,
      },
      status: TEST_RUN_STATUS.CANCELLED,
      cancellation: {
        cancelledAt: new Date(),
        reason: 'User aborted execution manually',
      },
      createdAt: new Date('2026-11-07T08:00:00.000Z'),
    });

    // Seed User B Test Run (to verify tenant isolation)
    runUserB = await TestRun.create({
      owner: userB._id,
      target: targetB._id,
      name: 'Bob Secret Performance Run',
      configuration: {
        targetSnapshot: { name: targetB.name, baseUrl: targetB.baseUrl },
        method: 'GET',
        endpoint: '/api/internal/stats',
        vus: 5,
        duration: 10,
      },
      status: TEST_RUN_STATUS.COMPLETED,
    });
  });

  describe('GET /api/history', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/history');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns paginated test runs owned strictly by authenticated user', async () => {
      const res = await request(app)
        .get('/api/history?page=1&limit=2')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.testRuns).toHaveLength(2);
      expect(res.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      });

      // Assert Bob's run is NOT included in Alice's history
      const runIds = res.body.data.testRuns.map((r) => r._id || r.id);
      expect(runIds).not.toContain(String(runUserB._id));
    });

    it('filters test runs by execution status', async () => {
      const res = await request(app)
        .get('/api/history?status=failed')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.testRuns).toHaveLength(1);
      expect(res.body.data.testRuns[0]._id).toBe(String(runFailedA._id));
      expect(res.body.data.testRuns[0].name).toBe('Beta Fault Injection Spike');
      expect(res.body.data.testRuns[0].status).toBe('failed');
    });

    it('filters test runs by search keyword matching test name or endpoint', async () => {
      const res = await request(app)
        .get('/api/history?search=delayed')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.testRuns).toHaveLength(1);
      expect(res.body.data.testRuns[0].name).toBe('Gamma Aborted Rampup');
    });

    it('filters test runs by targetId', async () => {
      const res = await request(app)
        .get(`/api/history?targetId=${targetA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.testRuns).toHaveLength(3);
    });

    it('returns empty list when search yields no matches', async () => {
      const res = await request(app)
        .get('/api/history?search=NonExistentEndpoint123')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.testRuns).toHaveLength(0);
      expect(res.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/history/stats', () => {
    it('returns aggregated summary counts across all test execution statuses', async () => {
      const res = await request(app)
        .get('/api/history/stats')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        total: 3,
        completed: 1,
        failed: 1,
        cancelled: 1,
        running: 0,
        queued: 0,
      });
    });
  });

  describe('POST /api/history/:id/rerun', () => {
    it('successfully duplicates configuration and queues a new test run', async () => {
      const res = await request(app)
        .post(`/api/history/${runCompletedA._id}/rerun`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('queued');
      expect(res.body.data.name).toBe('Alpha Benchmark Checkout (Rerun)');
      expect(res.body.data.configuration.vus).toBe(10);
      expect(res.body.data.configuration.duration).toBe(15);
      expect(res.body.data.configuration.endpoint).toBe('/api/demo/ping');

      // Verify stored in DB
      const dbRun = await TestRun.findById(res.body.data._id || res.body.data.id);
      expect(dbRun).not.toBeNull();
      expect(dbRun.status).toBe('queued');
      expect(dbRun.owner.toString()).toBe(userA._id.toString());
    });

    it('enforces tenant isolation: prevents User B from rerunning User A test run', async () => {
      const res = await request(app)
        .post(`/api/history/${runCompletedA._id}/rerun`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 Bad Request for malformed test run ID', async () => {
      const res = await request(app)
        .post('/api/history/invalid-not-an-objectid/rerun')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 Not Found when attempting to rerun a test whose target was deleted', async () => {
      await Target.findByIdAndDelete(targetA._id);

      const res = await request(app)
        .post(`/api/history/${runCompletedA._id}/rerun`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('no longer exists');
    });
  });

  describe('DELETE /api/history/:id', () => {
    it('successfully deletes a test run from history', async () => {
      const res = await request(app)
        .delete(`/api/history/${runCancelledA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(true);

      const check = await TestRun.findById(runCancelledA._id);
      expect(check).toBeNull();
    });

    it('enforces tenant isolation: prevents User B from deleting User A test run', async () => {
      const res = await request(app)
        .delete(`/api/history/${runCancelledA._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents deletion of actively running tests', async () => {
      const runningRun = await TestRun.create({
        owner: userA._id,
        target: targetA._id,
        name: 'Active Test In Flight',
        status: TEST_RUN_STATUS.RUNNING,
        configuration: {
          targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
          method: 'GET',
          endpoint: '/active',
          vus: 5,
          duration: 10,
        },
      });

      const res = await request(app)
        .delete(`/api/history/${runningRun._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('actively running');
    });
  });
});

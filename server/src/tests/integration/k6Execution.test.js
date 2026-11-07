import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import demoApp from '../../demoApp.js';
import User from '../../modules/auth/user.model.js';
import Target from '../../modules/targets/target.model.js';
import TestRun, { TEST_RUN_STATUS } from '../../modules/tests/testRun.model.js';
import env from '../../config/env.js';
import { generateToken } from '../../modules/auth/jwt.service.js';
import { executeTestRun } from '../../load-testing/k6Runner.js';
import { reconcileInterruptedRuns } from '../../load-testing/reconciler.js';
import processManager from '../../load-testing/processManager.js';

describe('Real k6 Execution Engine Integration Suite', () => {
  let user;
  let token;
  let demoTarget;
  let demoServer;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_TEST_URI);
    }

    // Start demo server on port 5001 for live load test target
    await new Promise((resolve) => {
      demoServer = demoApp.listen(5001, () => {
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (demoServer) {
      await new Promise((resolve) => demoServer.close(resolve));
    }
    await TestRun.deleteMany({});
    await Target.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await TestRun.deleteMany({});
    await Target.deleteMany({});
    await User.deleteMany({});

    // Seed test user
    const passwordHash = await User.hashPassword('LoadTester123!');
    user = await User.create({
      name: 'Load Test Engineer',
      email: 'engineer@apiforge.io',
      passwordHash,
    });
    token = generateToken({ id: user._id, email: user.email });

    // Seed demo target API
    demoTarget = await Target.create({
      name: 'Built-in Demo API',
      baseUrl: 'http://localhost:5001',
      description: 'Internal benchmark sandbox',
      owner: user._id,
      headers: { 'X-Engine': 'APIForge' },
    });
  });

  it('GET /api/tests/engine/status returns k6 engine readiness and version', async () => {
    const res = await request(app)
      .get('/api/tests/engine/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.engine).toBe('k6');
    expect(res.body.data.available).toBe(true);
    expect(res.body.data.version).toMatch(/v?\d+\.\d+\.\d+/);
    expect(res.body.data.maxConcurrent).toBe(env.MAX_CONCURRENT_TESTS);
  });

  it('executes real k6 load test against built-in Demo API and records verified metrics', async () => {
    // 1. Create a 5-second test with 2 VUs against /api/demo/ping
    const createRes = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Live Demo Benchmark Run',
        targetId: demoTarget._id.toString(),
        method: 'GET',
        endpoint: '/api/demo/ping',
        vus: 2,
        duration: 5,
        rampUpDuration: 0,
      });

    expect(createRes.status).toBe(201);
    const testRunId = createRes.body.data._id;

    // 2. Execute test with k6Runner
    const completedRun = await executeTestRun(testRunId);

    // 3. Verify status and real metrics
    expect(completedRun.status).toBe(TEST_RUN_STATUS.COMPLETED);
    expect(completedRun.isSimulated).toBe(false);
    expect(completedRun.startTime).toBeDefined();
    expect(completedRun.endTime).toBeDefined();
    expect(completedRun.actualDurationMs).toBeGreaterThan(0);

    // Metrics validation
    const metrics = completedRun.metrics;
    expect(metrics).toBeDefined();
    expect(metrics.totalRequests).toBeGreaterThanOrEqual(1);
    expect(metrics.successfulRequests).toBeGreaterThanOrEqual(1);
    expect(metrics.failedRequests).toBe(0);
    expect(metrics.requestsPerSecond).toBeGreaterThan(0);
    expect(metrics.avgLatency).toBeTypeOf('number');
    expect(metrics.avgLatency).toBeGreaterThanOrEqual(0);
    expect(metrics.p95Latency).toBeTypeOf('number');
    expect(metrics.p95Latency).toBeGreaterThanOrEqual(0);
    expect(metrics.failureRate).toBe(0);
  }, 35000);

  it('handles unreachable target host and marks test as FAILED with TARGET_UNREACHABLE', async () => {
    // Point to an unallocated port where connection will be rejected
    const unreachableTarget = await Target.create({
      name: 'Unreachable Target',
      baseUrl: 'http://localhost:59999',
      owner: user._id,
    });

    const createRes = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Fault Target Test',
        targetId: unreachableTarget._id.toString(),
        method: 'GET',
        endpoint: '/fail',
        vus: 1,
        duration: 5,
      });

    const testRunId = createRes.body.data._id;
    const result = await executeTestRun(testRunId);

    expect(result.status).toBe(TEST_RUN_STATUS.FAILED);
    expect(result.error.category).toBe('TARGET_UNREACHABLE');
    expect(result.isSimulated).toBe(false);
  }, 30000);

  it('POST /api/tests/:id/start triggers execution and POST /api/tests/:id/cancel aborts running worker', async () => {
    const createRes = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cancellation Target Test',
        targetId: demoTarget._id.toString(),
        method: 'GET',
        endpoint: '/api/demo/ping',
        vus: 2,
        duration: 10,
      });

    const testRunId = createRes.body.data._id;

    // Start execution
    const startRes = await request(app)
      .post(`/api/tests/${testRunId}/start`)
      .set('Authorization', `Bearer ${token}`);

    expect(startRes.status).toBe(200);

    // Give process 500ms to spawn
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Cancel test run
    const cancelRes = await request(app)
      .post(`/api/tests/${testRunId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Integration test requested early cancellation' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe(TEST_RUN_STATUS.CANCELLED);
    expect(cancelRes.body.data.error.category).toBe('CANCELLED_BY_USER');

    // Confirm process is no longer active in processManager
    expect(processManager.isProcessRunning(testRunId)).toBe(false);
  }, 20000);

  it('reconcileInterruptedRuns() marks abandoned runs as FAILED after simulated server restart', async () => {
    // Seed an abandoned RUNNING test run
    const staleRun = await TestRun.create({
      owner: user._id,
      target: demoTarget._id,
      name: 'Interrupted Test Run',
      configuration: {
        targetSnapshot: { name: demoTarget.name, baseUrl: demoTarget.baseUrl },
        method: 'GET',
        endpoint: '/api/demo/ping',
        vus: 5,
        duration: 30,
      },
      status: TEST_RUN_STATUS.RUNNING,
      startTime: new Date(Date.now() - 60000),
    });

    // Execute startup reconciliation
    const reconciledCount = await reconcileInterruptedRuns();
    expect(reconciledCount).toBeGreaterThanOrEqual(1);

    const updated = await TestRun.findById(staleRun._id);
    expect(updated.status).toBe(TEST_RUN_STATUS.FAILED);
    expect(updated.error.category).toBe('INTERNAL_ERROR');
    expect(updated.error.message).toContain('Server was restarted');
  });
});


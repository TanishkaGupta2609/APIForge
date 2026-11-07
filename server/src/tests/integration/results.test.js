import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../modules/auth/user.model.js';
import Target from '../../modules/targets/target.model.js';
import TestRun, { TEST_RUN_STATUS } from '../../modules/tests/testRun.model.js';
import env from '../../config/env.js';
import { generateToken } from '../../modules/auth/jwt.service.js';

describe('Results & Metrics Analytics Integration Suite (/api/results)', () => {
  let userA;
  let tokenA;
  let userB;
  let tokenB;
  let targetA;
  let completedRunA;
  let failedRunA;

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
      name: 'Alice Analyst',
      email: 'alice.analyst@apiforge.io',
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

    // Seed Target
    targetA = await Target.create({
      name: 'Production Auth Gateway',
      baseUrl: 'http://localhost:5001',
      owner: userA._id,
    });

    // Seed completed test run with real metric structure
    completedRunA = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Peak Hour Checkout Benchmark',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'POST',
        endpoint: '/api/demo/ping',
        vus: 10,
        duration: 15,
        thresholds: {
          httpReqDurationP95: 100,
          httpReqFailedRate: 0.05,
        },
      },
      status: TEST_RUN_STATUS.COMPLETED,
      isSimulated: false,
      startTime: new Date(Date.now() - 20000),
      endTime: new Date(),
      actualDurationMs: 15200,
      metrics: {
        totalRequests: 450,
        successfulRequests: 440,
        failedRequests: 10,
        requestsPerSecond: 30.0,
        minLatency: 12.0,
        medianLatency: 38.5,
        avgLatency: 42.1,
        p90Latency: 60.0,
        p95Latency: 78.4,
        maxLatency: 145.0,
        failureRate: 0.0222,
        networkErrors: 0,
      },
    });

    // Seed failed test run
    failedRunA = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Unreachable Node Test',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: 'http://localhost:59999' },
        method: 'GET',
        endpoint: '/probe',
        vus: 5,
        duration: 10,
      },
      status: TEST_RUN_STATUS.FAILED,
      error: {
        category: 'TARGET_UNREACHABLE',
        message: 'Could not connect to target API. Check host and port accessibility.',
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        networkErrors: 5,
      },
    });
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get(`/api/results/${completedRunA._id}`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 Bad Request for malformed ObjectId parameter', async () => {
    const res = await request(app)
      .get('/api/results/invalid-id-format')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 Not Found for non-existent test run', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/results/${fakeId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Test run not found');
  });

  it('enforces tenant authorization: User B cannot access User A results (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/results/${completedRunA._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns comprehensive performance metrics and chart data for completed test run', async () => {
    const res = await request(app)
      .get(`/api/results/${completedRunA._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.testRun.id).toBe(completedRunA._id.toString());
    expect(data.testRun.name).toBe('Peak Hour Checkout Benchmark');
    expect(data.testRun.status).toBe('completed');
    expect(data.testRun.isSimulated).toBe(false);

    // Metrics structure
    expect(data.metrics.totalRequests).toBe(450);
    expect(data.metrics.successfulRequests).toBe(440);
    expect(data.metrics.failedRequests).toBe(10);
    expect(data.metrics.requestsPerSecond).toBe(30.0);
    expect(data.metrics.avgLatency).toBe(42.1);
    expect(data.metrics.p95Latency).toBe(78.4);

    // Chart datasets
    expect(data.charts.percentiles).toHaveLength(6);
    expect(data.charts.percentiles[0].name).toBe('Min');
    expect(data.charts.percentiles[4].name).toBe('p95');
    expect(data.charts.statusCodes).toHaveLength(2);
    expect(data.charts.timeline.length).toBeGreaterThanOrEqual(3);

    // Threshold evaluation
    expect(data.thresholds.hasThresholds).toBe(true);
    expect(data.thresholds.allPassed).toBe(true);
  });

  it('returns diagnostic details and error information for failed runs', async () => {
    const res = await request(app)
      .get(`/api/results/${failedRunA._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.testRun.status).toBe('failed');
    expect(data.testRun.error.category).toBe('TARGET_UNREACHABLE');
    expect(data.testRun.error.message).toContain('Could not connect to target API');
    expect(data.metrics.networkErrors).toBe(5);
  });

  it('GET /api/results/dashboard/summary aggregates performance statistics across user runs', async () => {
    const res = await request(app)
      .get('/api/results/dashboard/summary')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.data;
    expect(summary.overview.savedTargets).toBe(1);
    expect(summary.overview.totalTestRuns).toBe(2);
    expect(summary.overview.completedRuns).toBe(1);
    expect(summary.overview.totalRequestsGenerated).toBe(450);
    expect(summary.overview.avgResponseTime).toBe(42.1);
    expect(summary.recentRuns.length).toBeGreaterThanOrEqual(1);
  });

  describe('GET /api/results/:runId/export', () => {
    it('exports test results as sanitized JSON with redacted authorization headers', async () => {
      // Add sensitive authorization header to completedRunA configuration
      completedRunA.configuration.headers = new Map([
        ['Authorization', 'Bearer eyJhbGciOi...secret-jwt'],
        ['X-Api-Key', 'super-secret-key'],
        ['Content-Type', 'application/json'],
      ]);
      await completedRunA.save();

      const res = await request(app)
        .get(`/api/results/${completedRunA._id}/export?format=json`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-disposition']).toContain(`attachment; filename="apiforge-test-${completedRunA._id}.json"`);

      const exportData = JSON.parse(res.text);
      expect(exportData.test_run.id).toBe(String(completedRunA._id));
      expect(exportData.test_run.configuration.headers.Authorization).toBe('[REDACTED]');
      expect(exportData.test_run.configuration.headers['X-Api-Key']).toBe('[REDACTED]');
      expect(exportData.test_run.configuration.headers['Content-Type']).toBe('application/json');
      expect(exportData.test_run.metrics.totalRequests).toBe(450);
    });

    it('exports test results as well-structured CSV', async () => {
      const res = await request(app)
        .get(`/api/results/${completedRunA._id}/export?format=csv`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain(`attachment; filename="apiforge-test-${completedRunA._id}.csv"`);
      expect(res.text).toContain('# APIForge Load Test Performance Report');
      expect(res.text).toContain('Peak Hour Checkout Benchmark');
      expect(res.text).toContain('Total Requests,450,requests');
    });

    it('enforces tenant authorization: User B cannot export User A test results', async () => {
      const res = await request(app)
        .get(`/api/results/${completedRunA._id}/export?format=json`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/results/compare', () => {
    let secondRunA;

    beforeEach(async () => {
      secondRunA = await TestRun.create({
        owner: userA._id,
        target: targetA._id,
        name: 'Optimized Endpoint Run',
        configuration: {
          targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
          method: 'POST',
          endpoint: '/api/demo/ping',
          vus: 10,
          duration: 15,
        },
        status: TEST_RUN_STATUS.COMPLETED,
        metrics: {
          totalRequests: 550,
          successfulRequests: 550,
          failedRequests: 0,
          requestsPerSecond: 36.6,
          minLatency: 8.0,
          medianLatency: 28.0,
          avgLatency: 30.5,
          p90Latency: 45.0,
          p95Latency: 52.0,
          maxLatency: 95.0,
          failureRate: 0.0,
          networkErrors: 0,
        },
      });
    });

    it('returns side-by-side comparative analysis with calculated deltas and ratings', async () => {
      const res = await request(app)
        .get(`/api/results/compare?baseRunId=${completedRunA._id}&compareRunId=${secondRunA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const comparison = res.body.data;
      expect(comparison.compatibility.rating).toBe('HIGH');
      expect(comparison.compatibility.isSameTarget).toBe(true);
      expect(comparison.compatibility.isSameEndpoint).toBe(true);

      // Latency delta: 42.1ms -> 30.5ms (-11.6ms diff, isImprovement: true)
      expect(comparison.deltas.avgLatency.diff).toBe(-11.6);
      expect(comparison.deltas.avgLatency.isImprovement).toBe(true);

      // Throughput delta: 30.0 -> 36.6 (+6.6 req/s diff, isImprovement: true)
      expect(comparison.deltas.requestsPerSecond.diff).toBe(6.6);
      expect(comparison.deltas.requestsPerSecond.isImprovement).toBe(true);

      expect(comparison.summary).toContain('Average latency improved');
    });

    it('rejects comparison request when base and compare IDs are identical', async () => {
      const res = await request(app)
        .get(`/api/results/compare?baseRunId=${completedRunA._id}&compareRunId=${completedRunA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('enforces tenant authorization: User B cannot compare User A runs', async () => {
      const res = await request(app)
        .get(`/api/results/compare?baseRunId=${completedRunA._id}&compareRunId=${secondRunA._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

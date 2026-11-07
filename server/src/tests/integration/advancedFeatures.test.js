import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../modules/auth/user.model.js';
import Target from '../../modules/targets/target.model.js';
import TestRun, { TEST_RUN_STATUS } from '../../modules/tests/testRun.model.js';
import env from '../../config/env.js';
import { generateToken } from '../../modules/auth/jwt.service.js';

describe('Stage 12: Advanced Capabilities Integration Suite', () => {
  let userA;
  let tokenA;
  let userB;
  let tokenB;
  let targetA;

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
      name: 'Alice Architect',
      email: 'alice.architect@example.com',
      passwordHash: passwordHashA,
    });
    tokenA = generateToken({ id: userA._id, email: userA.email });

    // Seed User B (for tenant isolation)
    const passwordHashB = await User.hashPassword('Password456!');
    userB = await User.create({
      name: 'Bob Isolation User',
      email: 'bob.isolation@example.com',
      passwordHash: passwordHashB,
    });
    tokenB = generateToken({ id: userB._id, email: userB.email });

    // Seed Target for User A
    targetA = await Target.create({
      owner: userA._id,
      name: 'E-Commerce Benchmark Target',
      baseUrl: 'http://localhost:5001',
    });
  });

  describe('1. Workload Profiles & Multi-Stage Configuration', () => {
    it('creates test run with ramping workload profile', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetId: targetA._id,
          name: 'Ramping Load Benchmark',
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 20,
          duration: 30,
          workloadProfile: 'ramping',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.configuration.workloadProfile).toBe('ramping');

      const persisted = await TestRun.findById(res.body.data._id);
      expect(persisted.configuration.workloadProfile).toBe('ramping');
    });

    it('creates test run with spike workload profile', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetId: targetA._id,
          name: 'Spike Traffic Benchmark',
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 30,
          duration: 20,
          workloadProfile: 'spike',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.configuration.workloadProfile).toBe('spike');
    });

    it('creates test run with stress test profile and custom stages', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetId: targetA._id,
          name: 'Stepped Stress Benchmark',
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 40,
          duration: 30,
          workloadProfile: 'stress',
          stages: [
            { duration: 5, target: 10 },
            { duration: 15, target: 25 },
            { duration: 10, target: 40 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.configuration.workloadProfile).toBe('stress');
      expect(res.body.data.configuration.stages.length).toBe(3);
    });
  });

  describe('2. Standalone HTML Performance Report Export', () => {
    it('exports self-contained HTML report with headers and percentiles', async () => {
      const run = await TestRun.create({
        owner: userA._id,
        target: targetA._id,
        name: 'Report Export Run',
        status: TEST_RUN_STATUS.COMPLETED,
        configuration: {
          targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 10,
          duration: 15,
          headers: { Authorization: 'Bearer secret-key-token-999' },
          thresholds: { httpReqDurationP95: 100, httpReqFailedRate: 0.05 },
        },
        metrics: {
          totalRequests: 400,
          successfulRequests: 395,
          failedRequests: 5,
          requestsPerSecond: 26.6,
          avgLatency: 28.5,
          medianLatency: 25.0,
          p90Latency: 45.0,
          p95Latency: 52.0,
          maxLatency: 85.0,
          failureRate: 0.0125,
          thresholdsPassed: true,
          statusCodeCounts: { '200': 395, '500': 5 },
        },
      });

      const res = await request(app)
        .get(`/api/results/${run._id}/export?format=html`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-disposition']).toContain(`apiforge-test-${run._id}.html`);

      // Verify HTML content
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('APIForge');
      expect(res.text).toContain('Report Export Run');
      expect(res.text).toContain('SLA PASSED');
      expect(res.text).toContain('Response Time Percentiles');
      expect(res.text).toContain('HTTP Status Code Distribution');

      // Verify secret header is masked in the generated HTML
      expect(res.text).not.toContain('secret-key-token-999');
    });

    it('denies User B from exporting User A HTML report (403 Forbidden)', async () => {
      const run = await TestRun.create({
        owner: userA._id,
        target: targetA._id,
        name: 'Alice Private Benchmark',
        status: TEST_RUN_STATUS.COMPLETED,
        configuration: {
          targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 5,
          duration: 10,
        },
        metrics: { totalRequests: 100 },
      });

      const res = await request(app)
        .get(`/api/results/${run._id}/export?format=html`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Historical Performance Trends API (/api/results/trends)', () => {
    it('returns chronological performance progression and calculates trends', async () => {
      // Seed 3 completed runs over time for User A
      await TestRun.create({
        owner: userA._id,
        target: targetA._id,
        name: 'Build 101 Test',
        status: TEST_RUN_STATUS.COMPLETED,
        createdAt: new Date('2026-11-01T10:00:00Z'),
        configuration: {
          targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 10,
          duration: 10,
        },
        metrics: {
          totalRequests: 200,
          requestsPerSecond: 20.0,
          avgLatency: 50.0,
          p95Latency: 65.0,
          failureRate: 0.02,
        },
      });

      await TestRun.create({
        owner: userA._id,
        target: targetA._id,
        name: 'Build 102 Test',
        status: TEST_RUN_STATUS.COMPLETED,
        createdAt: new Date('2026-11-02T10:00:00Z'),
        configuration: {
          targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 10,
          duration: 10,
        },
        metrics: {
          totalRequests: 250,
          requestsPerSecond: 25.0,
          avgLatency: 45.0,
          p95Latency: 55.0,
          failureRate: 0.01,
        },
      });

      await TestRun.create({
        owner: userA._id,
        target: targetA._id,
        name: 'Build 103 Test',
        status: TEST_RUN_STATUS.COMPLETED,
        createdAt: new Date('2026-11-03T10:00:00Z'),
        configuration: {
          targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 10,
          duration: 10,
        },
        metrics: {
          totalRequests: 300,
          requestsPerSecond: 30.0,
          avgLatency: 35.0,
          p95Latency: 45.0,
          failureRate: 0.0,
        },
      });

      const res = await request(app)
        .get('/api/results/trends')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trends.length).toBe(3);

      // Verify chronological order (oldest to newest)
      expect(res.body.data.trends[0].name).toBe('Build 101 Test');
      expect(res.body.data.trends[1].name).toBe('Build 102 Test');
      expect(res.body.data.trends[2].name).toBe('Build 103 Test');

      // Verify trend summaries
      expect(res.body.data.summary.totalRunsAnalyzed).toBe(3);
      expect(res.body.data.summary.avgThroughput).toBe(25.0);
      expect(res.body.data.summary.avgLatency).toBe(43.33);

      // Throughput increased from 20 to 30 -> +50%
      expect(res.body.data.summary.throughputDeltaPct).toBe(50.0);
      // Latency decreased from 50 to 35 -> -30%
      expect(res.body.data.summary.latencyDeltaPct).toBe(-30.0);
    });

    it('enforces tenant isolation on trends (User B cannot see User A runs)', async () => {
      const res = await request(app)
        .get('/api/results/trends')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.trends).toEqual([]);
      expect(res.body.data.summary.totalRunsAnalyzed).toBe(0);
    });
  });
});


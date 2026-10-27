import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../modules/auth/user.model.js';
import Target from '../../modules/targets/target.model.js';
import TestRun, { TEST_RUN_STATUS } from '../../modules/tests/testRun.model.js';
import env from '../../config/env.js';
import { generateToken } from '../../modules/auth/jwt.service.js';

describe('Test Configuration and Lifecycle Integration Suite (/api/tests)', () => {
  let userA;
  let tokenA;
  let userB;
  let tokenB;
  let targetA;
  let targetB;

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
      name: 'Developer Alice',
      email: 'alice@testforge.io',
      passwordHash: passwordHashA,
    });
    tokenA = generateToken({ id: userA._id, email: userA.email });

    // Seed User B (for tenant cross-authorization testing)
    const passwordHashB = await User.hashPassword('Password456!');
    userB = await User.create({
      name: 'Developer Bob',
      email: 'bob@testforge.io',
      passwordHash: passwordHashB,
    });
    tokenB = generateToken({ id: userB._id, email: userB.email });

    // Seed Target for User A
    targetA = await Target.create({
      owner: userA._id,
      name: 'Alice Payment Service',
      baseUrl: 'https://api.payment.example.com',
    });

    // Seed Target for User B
    targetB = await Target.create({
      owner: userB._id,
      name: 'Bob Auth Service',
      baseUrl: 'https://api.auth.example.com',
    });
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/tests');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('creates and queues a new test run with target snapshot', async () => {
    const payload = {
      targetId: targetA._id.toString(),
      name: 'Checkout Peak Load Test',
      method: 'POST',
      endpoint: '/v1/charge',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 }),
      vus: 15,
      duration: 30,
      rampUpDuration: 5,
      thresholds: { httpReqDurationP95: 500 },
    };

    const res = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(TEST_RUN_STATUS.QUEUED);
    expect(res.body.data.name).toBe('Checkout Peak Load Test');
    expect(res.body.data.configuration.targetSnapshot.name).toBe(targetA.name);
    expect(res.body.data.configuration.targetSnapshot.baseUrl).toBe(targetA.baseUrl);
    expect(res.body.data.progress.percent).toBe(0);
  });

  it('prevents cross-user target testing (User B cannot create a test against User A target)', async () => {
    const payload = {
      targetId: targetA._id.toString(), // Belongs to User A
      name: 'Unauthorized Intrusion Attempt',
      method: 'GET',
      endpoint: '/health',
      vus: 5,
      duration: 10,
    };

    const res = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${tokenB}`) // User B
      .send(payload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('do not have permission');
  });

  it('enforces concurrency limits per user (max 2 active runs)', async () => {
    const basePayload = {
      targetId: targetA._id.toString(),
      method: 'GET',
      endpoint: '/health',
      vus: 5,
      duration: 20,
    };

    // Run 1
    const res1 = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...basePayload, name: 'Active Run 1' });
    expect(res1.status).toBe(201);

    // Run 2
    const res2 = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...basePayload, name: 'Active Run 2' });
    expect(res2.status).toBe(201);

    // Run 3: Exceeds limit of 2 active runs
    const res3 = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...basePayload, name: 'Active Run 3 - Should Reject' });

    expect(res3.status).toBe(409);
    expect(res3.body.success).toBe(false);
    expect(res3.body.error.message).toContain('Concurrency limit reached');
  });

  it('lists only tests owned by authenticated user with status filtering', async () => {
    // Seed test for User A
    await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Alice Test 1',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'GET',
        endpoint: '/ping',
        vus: 5,
        duration: 10,
      },
      status: TEST_RUN_STATUS.QUEUED,
    });

    // Seed test for User B
    await TestRun.create({
      owner: userB._id,
      target: targetB._id,
      name: 'Bob Test 1',
      configuration: {
        targetSnapshot: { name: targetB.name, baseUrl: targetB.baseUrl },
        method: 'GET',
        endpoint: '/ping',
        vus: 5,
        duration: 10,
      },
      status: TEST_RUN_STATUS.QUEUED,
    });

    const resA = await request(app)
      .get('/api/tests')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data.testRuns.length).toBe(1);
    expect(resA.body.data.testRuns[0].name).toBe('Alice Test 1');
    expect(resA.body.data.pagination.total).toBe(1);
  });

  it('allows user to cancel an active test run and records cancellation metadata', async () => {
    const testRun = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Long Running Test',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'GET',
        endpoint: '/ping',
        vus: 10,
        duration: 60,
      },
      status: TEST_RUN_STATUS.QUEUED,
    });

    const res = await request(app)
      .post(`/api/tests/${testRun._id}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ reason: 'Target API undergoing maintenance' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(TEST_RUN_STATUS.CANCELLED);
    expect(res.body.data.error.category).toBe('CANCELLED_BY_USER');
    expect(res.body.data.error.message).toBe('Target API undergoing maintenance');
    expect(res.body.data.endTime).toBeDefined();
  });

  it('rejects cancellation attempt by non-owner (User B attempting to cancel User A run)', async () => {
    const testRun = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Alice Critical Test',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'GET',
        endpoint: '/ping',
        vus: 5,
        duration: 15,
      },
      status: TEST_RUN_STATUS.QUEUED,
    });

    const res = await request(app)
      .post(`/api/tests/${testRun._id}/cancel`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('do not have permission');
  });

  it('rejects cancellation on an already cancelled test run (terminal status invariant)', async () => {
    const testRun = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Already Cancelled Test',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'GET',
        endpoint: '/ping',
        vus: 5,
        duration: 15,
      },
      status: TEST_RUN_STATUS.CANCELLED,
    });

    const res = await request(app)
      .post(`/api/tests/${testRun._id}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already in terminal status');
  });

  it('executes controlled lifecycle simulation and records verified completion metrics', async () => {
    const testRun = await TestRun.create({
      owner: userA._id,
      target: targetA._id,
      name: 'Stage 6 Lifecycle Verification',
      configuration: {
        targetSnapshot: { name: targetA.name, baseUrl: targetA.baseUrl },
        method: 'GET',
        endpoint: '/api/demo/ping',
        vus: 10,
        duration: 10,
      },
      status: TEST_RUN_STATUS.QUEUED,
    });

    const res = await request(app)
      .post(`/api/tests/${testRun._id}/simulate`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(TEST_RUN_STATUS.COMPLETED);
    expect(res.body.data.isSimulated).toBe(true);
    expect(res.body.data.progress.percent).toBe(100);
    expect(res.body.data.metrics.totalRequests).toBeGreaterThan(0);
    expect(res.body.data.metrics.requestsPerSecond).toBeGreaterThan(0);
    expect(res.body.data.metrics.p95Latency).toBeDefined();
  });
});

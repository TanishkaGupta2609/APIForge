import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import User from '../../modules/auth/user.model.js';
import Target from '../../modules/targets/target.model.js';
import TestRun, { TEST_RUN_STATUS } from '../../modules/tests/testRun.model.js';
import env from '../../config/env.js';
import { generateToken } from '../../modules/auth/jwt.service.js';
import { buildK6Script } from '../../load-testing/scriptBuilder.js';
import { reconcileInterruptedRuns } from '../../load-testing/reconciler.js';

describe('Security and Reliability Hardening Suite (Stage 11)', () => {
  let userA;
  let tokenA;
  let userB;
  let tokenB;

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
    const passwordHashA = await User.hashPassword('AlicePassword123!');
    userA = await User.create({
      name: 'Alice Security Lead',
      email: 'alice.security@example.com',
      passwordHash: passwordHashA,
    });
    tokenA = generateToken({ id: userA._id, email: userA.email });

    // Seed User B (adversary / isolation testing)
    const passwordHashB = await User.hashPassword('BobPassword456!');
    userB = await User.create({
      name: 'Bob Untrusted User',
      email: 'bob.untrusted@example.com',
      passwordHash: passwordHashB,
    });
    tokenB = generateToken({ id: userB._id, email: userB.email });
  });

  describe('1. Authentication Hardening & Token Defense', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/targets');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Authentication required/i);
    });

    it('rejects malformed Bearer tokens with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/api/targets')
        .set('Authorization', 'Bearer invalid-garbage-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid.*token/i);
    });

    it('rejects tokens forged with an incorrect secret key with 401 Unauthorized', async () => {
      const forgedToken = jwt.sign(
        { id: userA._id.toString(), email: userA.email },
        'wrong-secret-key-attacker-attempt',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/targets')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid.*token/i);
    });

    it('rejects expired tokens with 401 Unauthorized', async () => {
      const expiredToken = jwt.sign(
        { id: userA._id.toString(), email: userA.email },
        env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/targets')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Token has expired/i);
    });

    it('never exposes password hashes in auth endpoints (/me, register, login)', async () => {
      // 1. GET /api/auth/me
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.passwordHash).toBeUndefined();
      expect(meRes.body.data.user.password).toBeUndefined();

      // 2. POST /api/auth/login
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'alice.security@example.com',
        password: 'AlicePassword123!',
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.passwordHash).toBeUndefined();

      // 3. POST /api/auth/register
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Charlie New User',
        email: 'charlie@example.com',
        password: 'CharliePassword123!',
      });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('2. BOLA / IDOR Defense & Multi-Tenant Isolation', () => {
    let aliceTarget;
    let aliceRun;

    beforeEach(async () => {
      aliceTarget = await Target.create({
        owner: userA._id,
        name: "Alice's Target",
        baseUrl: 'http://localhost:5001',
      });

      aliceRun = await TestRun.create({
        owner: userA._id,
        target: aliceTarget._id,
        name: "Alice's Production Benchmark",
        status: TEST_RUN_STATUS.COMPLETED,
        configuration: {
          targetSnapshot: { name: aliceTarget.name, baseUrl: aliceTarget.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 5,
          duration: 10,
          headers: { Authorization: 'Bearer super-secret-alice-token' },
        },
        metrics: {
          totalRequests: 100,
          successfulRequests: 100,
          failedRequests: 0,
          avgLatency: 15.2,
        },
      });
    });

    it('prevents Bob from viewing, modifying, deleting, or probing Alice targets (returns 404)', async () => {
      // View
      const getRes = await request(app)
        .get(`/api/targets/${aliceTarget._id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(getRes.status).toBe(404);

      // Modify
      const putRes = await request(app)
        .put(`/api/targets/${aliceTarget._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Tampered by Bob' });
      expect(putRes.status).toBe(404);

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/targets/${aliceTarget._id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(deleteRes.status).toBe(404);

      // Health Probe
      const probeRes = await request(app)
        .post(`/api/targets/${aliceTarget._id}/health`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(probeRes.status).toBe(404);
    });

    it('prevents Bob from viewing, starting, cancelling, or deleting Alice test runs', async () => {
      // View
      const getRes = await request(app)
        .get(`/api/tests/${aliceRun._id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect([403, 404]).toContain(getRes.status);

      // Start
      const startRes = await request(app)
        .post(`/api/tests/${aliceRun._id}/start`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect([403, 404]).toContain(startRes.status);

      // Cancel
      const cancelRes = await request(app)
        .post(`/api/tests/${aliceRun._id}/cancel`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect([403, 404]).toContain(cancelRes.status);

      // Delete
      const deleteRes = await request(app)
        .delete(`/api/tests/${aliceRun._id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect([403, 404]).toContain(deleteRes.status);
    });

    it('prevents Bob from rerunning Alice test run via rerun endpoints (returns 403 Forbidden)', async () => {
      const rerunRes = await request(app)
        .post(`/api/history/${aliceRun._id}/rerun`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(rerunRes.status).toBe(403);
      expect(rerunRes.body.success).toBe(false);
      expect(rerunRes.body.error.message).toMatch(/permission/i);
    });

    it('prevents Bob from viewing or exporting Alice test results (returns 403 Forbidden)', async () => {
      // Results view
      const resultsRes = await request(app)
        .get(`/api/results/${aliceRun._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(resultsRes.status).toBe(403);
      expect(resultsRes.body.success).toBe(false);

      // Export JSON
      const exportJsonRes = await request(app)
        .get(`/api/results/${aliceRun._id}/export?format=json`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(exportJsonRes.status).toBe(403);

      // Export CSV
      const exportCsvRes = await request(app)
        .get(`/api/results/${aliceRun._id}/export?format=csv`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(exportCsvRes.status).toBe(403);
    });

    it('prevents Bob from comparing Alice test run in comparative analytics (returns 403 Forbidden)', async () => {
      const bobTarget = await Target.create({
        owner: userB._id,
        name: "Bob's Target",
        baseUrl: 'http://localhost:5001',
      });

      const bobRun = await TestRun.create({
        owner: userB._id,
        target: bobTarget._id,
        name: "Bob's Run",
        status: TEST_RUN_STATUS.COMPLETED,
        configuration: {
          targetSnapshot: { name: bobTarget.name, baseUrl: bobTarget.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 5,
          duration: 10,
        },
        metrics: { totalRequests: 50 },
      });

      // Bob tries to compare his run against Alice's run
      const compareRes = await request(app)
        .get(`/api/results/compare?baseRunId=${aliceRun._id}&compareRunId=${bobRun._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(compareRes.status).toBe(403);
      expect(compareRes.body.success).toBe(false);
    });
  });

  describe('3. Multi-Layer SSRF Defenses', () => {
    it('blocks AWS/GCP cloud metadata IP (169.254.169.254)', async () => {
      const res = await request(app)
        .post('/api/targets')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Cloud Metadata Exploit',
          baseUrl: 'http://169.254.169.254/latest/meta-data',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/SSRF protection|private|loopback/i);
    });

    it('blocks private RFC 1918 Class A, B, and C address spaces', async () => {
      const privateTargets = [
        'http://10.0.0.1:8080/admin',
        'http://172.16.0.5/api',
        'http://192.168.1.100:3000',
      ];

      for (const url of privateTargets) {
        const res = await request(app)
          .post('/api/targets')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ name: 'Private IP Attempt', baseUrl: url });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('blocks loopback IP addresses when not pointing to the whitelisted Demo API port', async () => {
      const loopbacks = [
        'http://127.0.0.1:8080',
        'http://127.0.0.1:27017',
        'http://127.0.0.1:22',
      ];

      for (const url of loopbacks) {
        const res = await request(app)
          .post('/api/targets')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ name: 'Loopback Probe', baseUrl: url });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('blocks non-HTTP/HTTPS protocol schemes (e.g. file://, ftp://, gopher://)', async () => {
      const maliciousProtocols = [
        'file:///etc/passwd',
        'ftp://malicious.org/data',
        'gopher://evil.com',
      ];

      for (const url of maliciousProtocols) {
        const res = await request(app)
          .post('/api/targets')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ name: 'Protocol Injection', baseUrl: url });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('safely permits the authorized built-in Demo API (http://localhost:5001)', async () => {
      const res = await request(app)
        .post('/api/targets')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Built-in Demo API',
          baseUrl: 'http://localhost:5001/api/demo/ping',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.target.baseUrl).toBe('http://localhost:5001');
    });
  });

  describe('4. Injection Defense & Input Sanitization', () => {
    it('escapes dangerous input sequences preventing k6 script injection', () => {
      const maliciousConfig = {
        targetSnapshot: { baseUrl: 'http://localhost:5001' },
        method: 'GET',
        endpoint: "/users?name=test'); process.exit(1); //",
        headers: {
          'X-Custom': 'header"; throw new Error("hacked"); //',
        },
        body: '{"evil": "\' + (function(){ return 42; })() + \'"}',
        vus: 2,
        duration: 5,
        thresholds: {},
      };

      const generatedScript = buildK6Script(maliciousConfig);

      // Verify the script is a valid string and escaped safely with JSON.stringify
      expect(generatedScript).toContain('export default function ()');
      expect(generatedScript).toContain('http.get(');
      // Malicious sequences should be safely embedded inside string literals, not bare code
      expect(generatedScript).toContain(JSON.stringify(maliciousConfig.headers['X-Custom']));
      expect(generatedScript).not.toMatch(/process\.exit\(1\); \/\//);
    });

    it('defends against regex ReDoS attacks in search queries', async () => {
      const reDosPayloads = [
        '((((((a+)+)+)+)+)+)+$',
        '([a-zA-Z]+)*$',
        '??????????',
        '[[[[[[[[[[',
        '\\\\\\\\\\\\\\\\',
      ];

      for (const payload of reDosPayloads) {
        const res = await request(app)
          .get(`/api/history?search=${encodeURIComponent(payload)}`)
          .set('Authorization', `Bearer ${tokenA}`);

        // Must respond cleanly with 200 without regex parse crashes or hanging
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.testRuns)).toBe(true);
      }
    });
  });

  describe('5. Secret Redaction Across All Data Layers', () => {
    let testTarget;
    let testRun;

    beforeEach(async () => {
      testTarget = await Target.create({
        owner: userA._id,
        name: 'Target With Secrets',
        baseUrl: 'http://localhost:5001',
        defaultHeaders: [
          { key: 'Authorization', value: 'Bearer target-secret-token', isSecret: true },
          { key: 'X-Api-Key', value: 'secret-api-key-9988', isSecret: true },
          { key: 'Accept', value: 'application/json', isSecret: false },
        ],
      });

      testRun = await TestRun.create({
        owner: userA._id,
        target: testTarget._id,
        name: 'Secrets Benchmark',
        status: TEST_RUN_STATUS.COMPLETED,
        configuration: {
          targetSnapshot: { name: testTarget.name, baseUrl: testTarget.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 5,
          duration: 10,
          headers: {
            Authorization: 'Bearer test-run-super-secret',
            'X-Api-Key': 'key-run-12345',
            'X-Normal-Header': 'public-value',
          },
        },
        metrics: {
          totalRequests: 50,
          successfulRequests: 50,
          failedRequests: 0,
          avgLatency: 22.5,
        },
      });
    });

    it('masks secret headers in target responses', async () => {
      const res = await request(app)
        .get(`/api/targets/${testTarget._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const headers = res.body.data.target.defaultHeaders;
      const authHeader = headers.find((h) => h.key === 'Authorization');
      const apiKeyHeader = headers.find((h) => h.key === 'X-Api-Key');
      const acceptHeader = headers.find((h) => h.key === 'Accept');

      expect(authHeader.value).toBe('[REDACTED]');
      expect(apiKeyHeader.value).toBe('[REDACTED]');
      expect(acceptHeader.value).toBe('application/json');
    });

    it('masks sensitive headers in test run creation and retrieval', async () => {
      const createRes = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetId: testTarget._id,
          name: 'Created Run With Secrets',
          method: 'POST',
          endpoint: '/api/demo/echo',
          vus: 1,
          duration: 5,
          headers: {
            Authorization: 'Bearer newly-created-secret',
            'X-Api-Key': 'top-secret',
            'Content-Type': 'application/json',
          },
        });

      expect(createRes.status).toBe(201);
      const createdHeaders = createRes.body.data.configuration.headers;
      expect(createdHeaders.Authorization).toBe('[REDACTED]');
      expect(createdHeaders['X-Api-Key']).toBe('[REDACTED]');
      expect(createdHeaders['Content-Type']).toBe('application/json');
    });

    it('masks sensitive headers in results response (GET /api/results/:runId)', async () => {
      const res = await request(app)
        .get(`/api/results/${testRun._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const headers = res.body.data.configuration.headers;
      expect(headers.Authorization).toBe('[REDACTED]');
      expect(headers['X-Api-Key']).toBe('[REDACTED]');
      expect(headers['X-Normal-Header']).toBe('public-value');
    });

    it('masks sensitive headers in history listing (GET /api/history)', async () => {
      const res = await request(app)
        .get('/api/history')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const runItem = res.body.data.testRuns.find(
        (r) => String(r._id) === String(testRun._id) || String(r.id) === String(testRun._id)
      );
      expect(runItem).toBeDefined();
      expect(runItem.configuration.headers.Authorization).toBe('[REDACTED]');
      expect(runItem.configuration.headers['X-Api-Key']).toBe('[REDACTED]');
    });

    it('masks sensitive headers in JSON and CSV export endpoints', async () => {
      // JSON export
      const jsonRes = await request(app)
        .get(`/api/results/${testRun._id}/export?format=json`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(jsonRes.status).toBe(200);
      const jsonBody = JSON.parse(jsonRes.text);
      expect(jsonBody.test_run.configuration.headers.Authorization).toBe('[REDACTED]');
      expect(jsonBody.test_run.configuration.headers['X-Api-Key']).toBe('[REDACTED]');
      expect(jsonBody.test_run.configuration.headers['X-Normal-Header']).toBe('public-value');

      // Raw password/token string should never appear anywhere in the export payload
      expect(jsonRes.text).not.toContain('test-run-super-secret');
      expect(jsonRes.text).not.toContain('key-run-12345');
    });
  });

  describe('6. Concurrency Limits & Resource Quotas', () => {
    it('enforces maximum 2 concurrent active tests per user and returns 409 Conflict', async () => {
      const target = await Target.create({
        owner: userA._id,
        name: 'Concurrency Test Target',
        baseUrl: 'http://localhost:5001',
      });

      // Seed 2 active runs for User A
      await TestRun.create({
        owner: userA._id,
        target: target._id,
        name: 'Active Run 1',
        status: TEST_RUN_STATUS.RUNNING,
        configuration: {
          targetSnapshot: { name: target.name, baseUrl: target.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 5,
          duration: 10,
        },
      });

      await TestRun.create({
        owner: userA._id,
        target: target._id,
        name: 'Active Run 2',
        status: TEST_RUN_STATUS.QUEUED,
        configuration: {
          targetSnapshot: { name: target.name, baseUrl: target.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 5,
          duration: 10,
        },
      });

      // Attempt to create a 3rd active test run
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          targetId: target._id,
          name: 'Active Run 3 (Exceeds Limit)',
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 1,
          duration: 5,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Concurrency limit reached/i);
    });
  });

  describe('7. Process Lifecycle & Crash Recovery Reconciler', () => {
    it('reconciles interrupted RUNNING or QUEUED runs on server restart without data corruption', async () => {
      const target = await Target.create({
        owner: userA._id,
        name: 'Recovery Target',
        baseUrl: 'http://localhost:5001',
      });

      // Simulate a run left in RUNNING state prior to sudden server shutdown
      const orphanedRun = await TestRun.create({
        owner: userA._id,
        target: target._id,
        name: 'Crash Abandoned Run',
        status: TEST_RUN_STATUS.RUNNING,
        configuration: {
          targetSnapshot: { name: target.name, baseUrl: target.baseUrl },
          method: 'GET',
          endpoint: '/api/demo/ping',
          vus: 5,
          duration: 10,
        },
      });

      // Run reconciler (simulates boot-time recovery hook)
      const reconciledCount = await reconcileInterruptedRuns();

      expect(reconciledCount).toBeGreaterThanOrEqual(1);

      // Verify the orphaned run was safely transitioned to FAILED
      const recovered = await TestRun.findById(orphanedRun._id);
      expect(recovered.status).toBe(TEST_RUN_STATUS.FAILED);
      expect(recovered.error.category).toBe('INTERNAL_ERROR');
      expect(recovered.error.message).toMatch(/restarted/i);
      expect(recovered.endTime).toBeDefined();
    });
  });
});

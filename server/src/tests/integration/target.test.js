import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../modules/auth/user.model.js';
import Target from '../../modules/targets/target.model.js';
import env from '../../config/env.js';
import { generateToken } from '../../modules/auth/jwt.service.js';

describe('Target Management Integration Suite (/api/targets)', () => {
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
    await Target.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Target.deleteMany({});
    await User.deleteMany({});

    // Seed User A
    const passwordHashA = await User.hashPassword('Password123!');
    userA = await User.create({
      name: 'Developer Alice',
      email: 'alice@example.com',
      passwordHash: passwordHashA,
    });
    tokenA = generateToken({ id: userA._id, email: userA.email });

    // Seed User B (for isolation testing)
    const passwordHashB = await User.hashPassword('Password456!');
    userB = await User.create({
      name: 'Developer Bob',
      email: 'bob@example.com',
      passwordHash: passwordHashB,
    });
    tokenB = generateToken({ id: userB._id, email: userB.email });
  });

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/targets');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('creates a target for authenticated user and normalizes URL', async () => {
    const res = await request(app)
      .post('/api/targets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Demo Sandbox Target',
        baseUrl: 'http://localhost:5001/api/demo/ping',
        description: 'Controlled testing endpoint',
        defaultHeaders: [{ key: 'X-Test', value: 'APIForge-Test', isSecret: false }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.target.name).toBe('Demo Sandbox Target');
    expect(res.body.data.target.baseUrl).toBe('http://localhost:5001');
    expect(res.body.data.target.defaultHeaders.length).toBe(1);

    // Verify persisted in DB
    const persisted = await Target.findById(res.body.data.target.id);
    expect(persisted).toBeDefined();
    expect(persisted.owner.toString()).toBe(userA._id.toString());
  });

  it('rejects SSRF exploit attempt targeting cloud metadata', async () => {
    const res = await request(app)
      .post('/api/targets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Malicious Target',
        baseUrl: 'http://169.254.169.254/latest/meta-data',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/SSRF protection|private|loopback/i);
  });

  it('enforces tenant isolation: User A only sees their own targets', async () => {
    // Create target for User A
    await Target.create({
      owner: userA._id,
      name: "Alice's Target",
      baseUrl: 'http://localhost:5001',
    });

    // Create target for User B
    await Target.create({
      owner: userB._id,
      name: "Bob's Target",
      baseUrl: 'http://localhost:5001',
    });

    // Request as User A
    const resA = await request(app)
      .get('/api/targets')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.data.targets.length).toBe(1);
    expect(resA.body.data.targets[0].name).toBe("Alice's Target");

    // Request as User B
    const resB = await request(app)
      .get('/api/targets')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data.targets.length).toBe(1);
    expect(resB.body.data.targets[0].name).toBe("Bob's Target");
  });

  it('prevents cross-user modification and deletion (404/Forbidden isolation)', async () => {
    const aliceTarget = await Target.create({
      owner: userA._id,
      name: 'Sensitive Target',
      baseUrl: 'http://localhost:5001',
    });

    // Bob tries to update Alice's target
    const updateRes = await request(app)
      .put(`/api/targets/${aliceTarget._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hacked by Bob' });

    expect(updateRes.status).toBe(404);

    // Bob tries to delete Alice's target
    const deleteRes = await request(app)
      .delete(`/api/targets/${aliceTarget._id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(deleteRes.status).toBe(404);

    // Verify Alice's target remains unmodified
    const untouched = await Target.findById(aliceTarget._id);
    expect(untouched.name).toBe('Sensitive Target');
  });

  it('executes target health probe endpoint and returns status metadata', async () => {
    const target = await Target.create({
      owner: userA._id,
      name: 'Probe Target',
      baseUrl: 'http://localhost:5001',
    });

    const res = await request(app)
      .post(`/api/targets/${target._id}/health`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBeDefined();
    expect(typeof res.body.data.latencyMs).toBe('number');
  });
});

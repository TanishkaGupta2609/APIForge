import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import User from '../../modules/auth/user.model.js';
import env from '../../config/env.js';

describe('Authentication API Integration Tests', () => {
  let isDbAvailable = false;

  beforeAll(async () => {
    try {
      await connectDatabase(env.MONGODB_TEST_URI);
      isDbAvailable = true;
    } catch {
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (isDbAvailable) {
      try {
        await User.deleteMany({ email: /@testauth\.com$/ });
      } catch {
        // cleanup ignore
      }
      await disconnectDatabase();
    }
  });

  beforeEach(async () => {
    if (isDbAvailable) {
      await User.deleteMany({ email: /@testauth\.com$/ });
    }
  });

  const testUser = {
    name: 'Ada Lovelace',
    email: 'ada@testauth.com',
    password: 'SecurePassword123!',
  };

  it('POST /api/auth/register successfully creates user and returns token without passwordHash', async () => {
    if (!isDbAvailable) return;

    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('POST /api/auth/register rejects duplicate email with 409 Conflict', async () => {
    if (!isDbAvailable) return;

    await request(app).post('/api/auth/register').send(testUser);
    const duplicateRes = await request(app).post('/api/auth/register').send(testUser);

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error.code).toBe('CONFLICT');
    expect(duplicateRes.body.error.message).toContain('already exists');
  });

  it('POST /api/auth/register rejects weak password under 8 characters with 400 Validation Error', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak Password User',
      email: 'weak@testauth.com',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('POST /api/auth/login authenticates valid credentials and returns JWT', async () => {
    if (!isDbAvailable) return;

    await request(app).post('/api/auth/register').send(testUser);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.token).toBeDefined();
    expect(loginRes.body.data.user.email).toBe(testUser.email);
    expect(loginRes.body.data.user.passwordHash).toBeUndefined();
  });

  it('POST /api/auth/login rejects incorrect password with 401 Unauthorized', async () => {
    if (!isDbAvailable) return;

    await request(app).post('/api/auth/register').send(testUser);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword999!',
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me returns profile for authenticated user and rejects unauthenticated request', async () => {
    if (!isDbAvailable) return;

    const regRes = await request(app).post('/api/auth/register').send(testUser);
    const token = regRes.body.data.token;

    // Authorized request
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(testUser.email);
    expect(meRes.body.data.user.passwordHash).toBeUndefined();

    // Unauthorized request without token
    const unauthRes = await request(app).get('/api/auth/me');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.success).toBe(false);
  });
});

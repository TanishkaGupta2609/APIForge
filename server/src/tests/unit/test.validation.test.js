import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { createTestSchema, TEST_CONSTRAINTS } from '../../modules/tests/test.validation.js';

describe('Test Configuration Validation Schemas Unit Tests', () => {
  const validTargetId = new mongoose.Types.ObjectId().toString();

  it('accepts valid load test configuration', () => {
    const payload = {
      body: {
        targetId: validTargetId,
        name: 'Standard Stress Test',
        method: 'POST',
        endpoint: '/api/v1/checkout',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: 'widget', quantity: 2 }),
        vus: 20,
        duration: 60,
        rampUpDuration: 10,
        thresholds: { httpReqDurationP95: 450, httpReqFailedRate: 0.02 },
      },
    };

    const result = createTestSchema.safeParse(payload);
    expect(result.success).toBe(true);
    expect(result.data.body.vus).toBe(20);
    expect(result.data.body.duration).toBe(60);
  });

  it('rejects invalid MongoDB ObjectId for targetId', () => {
    const payload = {
      body: {
        targetId: 'invalid-not-an-objectid',
        name: 'Smoke Test',
        method: 'GET',
        endpoint: '/api/ping',
      },
    };

    const result = createTestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toContain('Invalid MongoDB ObjectId');
  });

  it('rejects endpoints missing leading slash or containing protocol schemes', () => {
    // Missing leading slash
    const res1 = createTestSchema.safeParse({
      body: { targetId: validTargetId, name: 'T1', method: 'GET', endpoint: 'api/ping' },
    });
    expect(res1.success).toBe(false);
    expect(res1.error.errors[0].message).toContain('must start with a forward slash');

    // Protocol scheme injection
    const res2 = createTestSchema.safeParse({
      body: { targetId: validTargetId, name: 'T2', method: 'GET', endpoint: '/http://evil.com/leak' },
    });
    expect(res2.success).toBe(false);
    expect(res2.error.errors[0].message).toContain('cannot contain URL protocols');

    // Protocol-relative double slash
    const res3 = createTestSchema.safeParse({
      body: { targetId: validTargetId, name: 'T3', method: 'GET', endpoint: '//evil.com/leak' },
    });
    expect(res3.success).toBe(false);
    expect(res3.error.errors[0].message).toContain('cannot start with protocol-relative');
  });

  it('enforces VUs bounds: min 1 and max authoritative limit (50)', () => {
    // Below minimum
    const resLow = createTestSchema.safeParse({
      body: { targetId: validTargetId, name: 'T1', method: 'GET', endpoint: '/test', vus: 0 },
    });
    expect(resLow.success).toBe(false);
    expect(resLow.error.errors[0].message).toContain('VUs must be at least 1');

    // Above maximum
    const resHigh = createTestSchema.safeParse({
      body: {
        targetId: validTargetId,
        name: 'T2',
        method: 'GET',
        endpoint: '/test',
        vus: TEST_CONSTRAINTS.MAX_VUS + 1,
      },
    });
    expect(resHigh.success).toBe(false);
    expect(resHigh.error.errors[0].message).toContain('cannot exceed authoritative limit');
  });

  it('enforces duration bounds: min 5s and max 300s', () => {
    // Below 5s
    const resLow = createTestSchema.safeParse({
      body: { targetId: validTargetId, name: 'T1', method: 'GET', endpoint: '/test', duration: 2 },
    });
    expect(resLow.success).toBe(false);
    expect(resLow.error.errors[0].message).toContain('Duration must be at least 5s');

    // Above 300s
    const resHigh = createTestSchema.safeParse({
      body: { targetId: validTargetId, name: 'T2', method: 'GET', endpoint: '/test', duration: 400 },
    });
    expect(resHigh.success).toBe(false);
    expect(resHigh.error.errors[0].message).toContain('Duration cannot exceed 300s');
  });

  it('rejects rampUpDuration that is greater than or equal to total duration', () => {
    const payload = {
      body: {
        targetId: validTargetId,
        name: 'Ramp Test',
        method: 'GET',
        endpoint: '/test',
        duration: 30,
        rampUpDuration: 30, // equal to duration
      },
    };

    const result = createTestSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toContain('must be strictly less than the total test duration');
  });

  it('enforces thresholds bounds: failure rate between 0.0 and 1.0', () => {
    const res = createTestSchema.safeParse({
      body: {
        targetId: validTargetId,
        name: 'Threshold Test',
        method: 'GET',
        endpoint: '/test',
        thresholds: { httpReqFailedRate: 1.5 }, // invalid > 1.0
      },
    });

    expect(res.success).toBe(false);
    expect(res.error.errors[0].message).toContain('must be between 0.0 and 1.0');
  });
});

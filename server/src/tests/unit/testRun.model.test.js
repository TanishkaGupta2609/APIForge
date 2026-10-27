import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import TestRun, { TEST_RUN_STATUS } from '../../modules/tests/testRun.model.js';
import { BadRequestError } from '../../shared/errors/AppError.js';

describe('TestRun Model & Lifecycle State Machine Unit Tests', () => {
  const dummyOwnerId = new mongoose.Types.ObjectId();
  const dummyTargetId = new mongoose.Types.ObjectId();

  const validConfig = {
    targetSnapshot: { name: 'Demo API', baseUrl: 'http://localhost:5001' },
    method: 'GET',
    endpoint: '/api/demo/ping',
    headers: { 'Content-Type': 'application/json' },
    vus: 10,
    duration: 30,
    rampUpDuration: 5,
    thresholds: { httpReqDurationP95: 500, httpReqFailedRate: 0.05 },
  };

  it('fails validation when required fields are missing', () => {
    const testRun = new TestRun({});
    const error = testRun.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.owner).toBeDefined();
    expect(error.errors.target).toBeDefined();
    expect(error.errors.name).toBeDefined();
  });

  it('initializes with default status QUEUED, 0% progress, and null metrics', () => {
    const testRun = new TestRun({
      owner: dummyOwnerId,
      target: dummyTargetId,
      name: 'Baseline Benchmark',
      configuration: validConfig,
    });

    expect(testRun.status).toBe(TEST_RUN_STATUS.QUEUED);
    expect(testRun.progress.percent).toBe(0);
    expect(testRun.progress.stage).toBe('Pending execution');
    expect(testRun.startTime).toBeNull();
    expect(testRun.endTime).toBeNull();
    expect(testRun.metrics.totalRequests).toBeNull();
    expect(testRun.isSimulated).toBe(false);
  });

  it('allows valid transition from QUEUED to RUNNING and sets startTime', () => {
    const testRun = new TestRun({
      owner: dummyOwnerId,
      target: dummyTargetId,
      name: 'Smoke Test',
      configuration: validConfig,
    });

    expect(testRun.canTransitionTo(TEST_RUN_STATUS.RUNNING)).toBe(true);
    testRun.transitionTo(TEST_RUN_STATUS.RUNNING, {
      percent: 25,
      stage: 'Workload Executing',
      message: 'Generating synthetic requests',
    });

    expect(testRun.status).toBe(TEST_RUN_STATUS.RUNNING);
    expect(testRun.startTime).toBeInstanceOf(Date);
    expect(testRun.progress.percent).toBe(25);
  });

  it('allows valid transition from RUNNING to COMPLETED and sets duration + metrics', () => {
    const testRun = new TestRun({
      owner: dummyOwnerId,
      target: dummyTargetId,
      name: 'Peak Load Test',
      configuration: validConfig,
    });

    testRun.transitionTo(TEST_RUN_STATUS.RUNNING);
    expect(testRun.canTransitionTo(TEST_RUN_STATUS.COMPLETED)).toBe(true);

    const metricsPayload = {
      totalRequests: 1000,
      successfulRequests: 990,
      failedRequests: 10,
      requestsPerSecond: 33.3,
      avgLatency: 45.0,
      medianLatency: 42.0,
      p90Latency: 60.0,
      p95Latency: 75.0,
      maxLatency: 120.0,
      failureRate: 0.01,
      networkErrors: 0,
      statusCodeCounts: { '200': 990, '500': 10 },
    };

    testRun.transitionTo(TEST_RUN_STATUS.COMPLETED, { metrics: metricsPayload });

    expect(testRun.status).toBe(TEST_RUN_STATUS.COMPLETED);
    expect(testRun.endTime).toBeInstanceOf(Date);
    expect(testRun.actualDurationMs).toBeGreaterThanOrEqual(0);
    expect(testRun.progress.percent).toBe(100);
    expect(testRun.metrics.totalRequests).toBe(1000);
    expect(testRun.metrics.failureRate).toBe(0.01);
  });

  it('allows transition from RUNNING to CANCELLED and assigns error category', () => {
    const testRun = new TestRun({
      owner: dummyOwnerId,
      target: dummyTargetId,
      name: 'Aborted Test',
      configuration: validConfig,
    });

    testRun.transitionTo(TEST_RUN_STATUS.RUNNING);
    testRun.transitionTo(TEST_RUN_STATUS.CANCELLED, { reason: 'User initiated abort' });

    expect(testRun.status).toBe(TEST_RUN_STATUS.CANCELLED);
    expect(testRun.error.category).toBe('CANCELLED_BY_USER');
    expect(testRun.error.message).toBe('User initiated abort');
    expect(testRun.endTime).toBeInstanceOf(Date);
  });

  it('rejects invalid state transition from COMPLETED to RUNNING (terminal invariant)', () => {
    const testRun = new TestRun({
      owner: dummyOwnerId,
      target: dummyTargetId,
      name: 'Completed Run',
      configuration: validConfig,
    });

    testRun.transitionTo(TEST_RUN_STATUS.RUNNING);
    testRun.transitionTo(TEST_RUN_STATUS.COMPLETED);

    expect(testRun.canTransitionTo(TEST_RUN_STATUS.RUNNING)).toBe(false);
    expect(() => testRun.transitionTo(TEST_RUN_STATUS.RUNNING)).toThrow(BadRequestError);
  });

  it('rejects invalid state transition from CANCELLED to COMPLETED (late worker race prevention)', () => {
    const testRun = new TestRun({
      owner: dummyOwnerId,
      target: dummyTargetId,
      name: 'Cancelled Run',
      configuration: validConfig,
    });

    testRun.transitionTo(TEST_RUN_STATUS.CANCELLED);

    expect(testRun.canTransitionTo(TEST_RUN_STATUS.COMPLETED)).toBe(false);
    expect(() => testRun.transitionTo(TEST_RUN_STATUS.COMPLETED)).toThrow(BadRequestError);
  });

  it('rejects invalid state transition from FAILED to RUNNING', () => {
    const testRun = new TestRun({
      owner: dummyOwnerId,
      target: dummyTargetId,
      name: 'Failed Run',
      configuration: validConfig,
    });

    testRun.transitionTo(TEST_RUN_STATUS.FAILED, { message: 'Connection refused' });

    expect(testRun.canTransitionTo(TEST_RUN_STATUS.RUNNING)).toBe(false);
    expect(() => testRun.transitionTo(TEST_RUN_STATUS.RUNNING)).toThrow(BadRequestError);
  });
});

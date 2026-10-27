import TestRun, { TEST_RUN_STATUS, TERMINAL_STATUSES } from './testRun.model.js';
import Target from '../targets/target.model.js';
import { TEST_CONSTRAINTS } from './test.validation.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../shared/errors/AppError.js';

/**
 * Creates and queues a new test run after enforcing tenant authorization,
 * target existence, and user concurrency limits.
 *
 * @param {string} userId - Authenticated user ID
 * @param {object} input - Validated test configuration input
 * @returns {Promise<object>} Created TestRun
 */
export async function createTestRun(userId, input) {
  // 1. Verify target existence and tenant ownership
  const target = await Target.findById(input.targetId);
  if (!target) {
    throw new NotFoundError('Target API not found.');
  }
  if (target.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to launch tests against this target API.');
  }

  // 2. Enforce concurrency limit (max active runs per user)
  const activeCount = await TestRun.countDocuments({
    owner: userId,
    status: { $in: [TEST_RUN_STATUS.QUEUED, TEST_RUN_STATUS.RUNNING] },
  });

  if (activeCount >= TEST_CONSTRAINTS.MAX_CONCURRENT_RUNS_PER_USER) {
    throw new ConflictError(
      `Concurrency limit reached: You currently have ${activeCount} active test run(s). Maximum allowed is ${TEST_CONSTRAINTS.MAX_CONCURRENT_RUNS_PER_USER}. Wait for active runs to complete or cancel them.`
    );
  }

  // 3. Take immutable target snapshot
  const targetSnapshot = {
    name: target.name,
    baseUrl: target.baseUrl,
  };

  // 4. Create TestRun record in initial QUEUED status
  const testRun = await TestRun.create({
    owner: userId,
    target: target._id,
    name: input.name.trim(),
    configuration: {
      targetSnapshot,
      method: input.method,
      endpoint: input.endpoint.trim(),
      headers: input.headers || {},
      body: input.body || null,
      vus: input.vus,
      duration: input.duration,
      rampUpDuration: input.rampUpDuration || 0,
      thresholds: input.thresholds || {},
    },
    status: TEST_RUN_STATUS.QUEUED,
    progress: {
      percent: 0,
      stage: 'Queued',
      message: 'Test run scheduled and awaiting worker allocation',
    },
  });

  return testRun.toJSON();
}

/**
 * Lists test runs for an authenticated user with pagination and optional filters.
 *
 * @param {string} userId - Authenticated user ID
 * @param {object} options - Query filters and pagination
 * @returns {Promise<{ testRuns: Array<object>, pagination: object }>}
 */
export async function listTestRuns(userId, { page = 1, limit = 10, status, targetId } = {}) {
  const query = { owner: userId };

  if (status) {
    query.status = status;
  }
  if (targetId) {
    query.target = targetId;
  }

  const total = await TestRun.countDocuments(query);
  const totalPages = Math.ceil(total / limit) || 1;

  const testRuns = await TestRun.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('target', 'name baseUrl');

  return {
    testRuns: testRuns.map((r) => r.toJSON()),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Fetches a single test run by ID, strictly verifying tenant ownership.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} testRunId - Test run ID
 * @returns {Promise<object>} TestRun details
 */
export async function getTestRunById(userId, testRunId) {
  const testRun = await TestRun.findById(testRunId).populate('target', 'name baseUrl');

  if (!testRun) {
    throw new NotFoundError('Test run not found.');
  }

  if (testRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access this test run.');
  }

  return testRun.toJSON();
}

/**
 * Cancels an active or queued test run.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} testRunId - Test run ID
 * @param {string} [reason] - Optional cancellation reason
 * @returns {Promise<object>} Updated TestRun
 */
export async function cancelTestRun(userId, testRunId, reason) {
  const testRun = await TestRun.findById(testRunId);

  if (!testRun) {
    throw new NotFoundError('Test run not found.');
  }

  if (testRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to cancel this test run.');
  }

  if (TERMINAL_STATUSES.includes(testRun.status)) {
    throw new BadRequestError(
      `Cannot cancel test run because it is already in terminal status: '${testRun.status}'.`
    );
  }

  testRun.transitionTo(TEST_RUN_STATUS.CANCELLED, {
    reason: reason || 'Test run cancelled by user request',
  });

  await testRun.save();
  return testRun.toJSON();
}

/**
 * Deletes a test run, verifying ownership and preventing deletion of active tests.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} testRunId - Test run ID
 * @returns {Promise<{ id: string, deleted: boolean }>}
 */
export async function deleteTestRun(userId, testRunId) {
  const testRun = await TestRun.findById(testRunId);

  if (!testRun) {
    throw new NotFoundError('Test run not found.');
  }

  if (testRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to delete this test run.');
  }

  if (testRun.status === TEST_RUN_STATUS.RUNNING) {
    throw new BadRequestError('Cannot delete an actively running test. Cancel it first.');
  }

  await TestRun.findByIdAndDelete(testRunId);
  return { id: testRunId, deleted: true };
}

/**
 * Controlled lifecycle simulator for Stage 6 verification.
 * Clearly labels the execution as `isSimulated: true`.
 * In Stage 7, real k6 child process runner will execute actual load tests.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} testRunId - Test run ID
 * @returns {Promise<object>}
 */
export async function simulateLifecycleRun(userId, testRunId) {
  const testRun = await TestRun.findById(testRunId);

  if (!testRun) {
    throw new NotFoundError('Test run not found.');
  }

  if (testRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to execute this test run.');
  }

  if (testRun.status !== TEST_RUN_STATUS.QUEUED) {
    throw new BadRequestError(
      `Only queued test runs can be simulated. Current status is '${testRun.status}'.`
    );
  }

  // 1. Transition: QUEUED -> RUNNING
  testRun.transitionTo(TEST_RUN_STATUS.RUNNING, {
    isSimulated: true,
    percent: 30,
    stage: 'Simulating Traffic',
    message: 'Controlled synthetic traffic simulation for Stage 6 verification',
  });
  await testRun.save();

  // 2. Calculate simulated deterministic metrics for verification
  const durationSec = testRun.configuration.duration || 10;
  const vus = testRun.configuration.vus || 5;
  const requestsPerSec = vus * 4;
  const totalRequests = Math.round(requestsPerSec * durationSec);

  const simulatedMetrics = {
    totalRequests,
    successfulRequests: totalRequests,
    failedRequests: 0,
    requestsPerSecond: requestsPerSec,
    avgLatency: 38.4,
    medianLatency: 35.1,
    p90Latency: 52.8,
    p95Latency: 64.2,
    maxLatency: 118.0,
    failureRate: 0.0,
    networkErrors: 0,
    statusCodeCounts: {
      '200': totalRequests,
    },
  };

  // 3. Transition: RUNNING -> COMPLETED (clearly marked as simulated)
  testRun.transitionTo(TEST_RUN_STATUS.COMPLETED, {
    metrics: simulatedMetrics,
    isSimulated: true,
  });

  await testRun.save();
  return testRun.toJSON();
}

import * as testService from './test.service.js';
import { rerunTest } from '../history/history.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

/**
 * Create and queue a new test run.
 * POST /api/tests
 */
export async function createTestRun(req, res, next) {
  try {
    const testRun = await testService.createTestRun(req.user._id, req.body);
    return sendSuccess(res, testRun, 'Test run created and queued successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * List paginated test runs for authenticated user with optional filters.
 * GET /api/tests
 */
export async function listTestRuns(req, res, next) {
  try {
    const result = await testService.listTestRuns(req.user._id, req.query);
    return sendSuccess(res, result, 'Test runs retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get details of a specific test run by ID.
 * GET /api/tests/:id
 */
export async function getTestRunById(req, res, next) {
  try {
    const testRun = await testService.getTestRunById(req.user._id, req.params.id);
    return sendSuccess(res, testRun, 'Test run details retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel an active or queued test run.
 * POST /api/tests/:id/cancel
 */
export async function cancelTestRun(req, res, next) {
  try {
    const testRun = await testService.cancelTestRun(
      req.user._id,
      req.params.id,
      req.body?.reason
    );
    return sendSuccess(res, testRun, 'Test run cancelled successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a test run.
 * DELETE /api/tests/:id
 */
export async function deleteTestRun(req, res, next) {
  try {
    const result = await testService.deleteTestRun(req.user._id, req.params.id);
    return sendSuccess(res, result, 'Test run deleted successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Start real k6 load test execution.
 * POST /api/tests/:id/start
 */
export async function startTestRun(req, res, next) {
  try {
    const testRun = await testService.startRealTestRun(req.user._id, req.params.id);
    return sendSuccess(res, testRun, 'k6 load test execution started successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get k6 load-testing engine diagnostic status.
 * GET /api/tests/engine/status
 */
export async function getEngineStatus(req, res, next) {
  try {
    const status = await testService.getEngineStatus();
    return sendSuccess(res, status, 'k6 engine status retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Controlled lifecycle simulation for Stage 6 verification.
 * POST /api/tests/:id/simulate
 */
export async function simulateLifecycleRun(req, res, next) {
  try {
    const testRun = await testService.simulateLifecycleRun(req.user._id, req.params.id);
    return sendSuccess(res, testRun, 'Test run lifecycle simulated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Safely duplicate and rerun an existing test run.
 * POST /api/tests/:id/rerun
 */
export async function rerunTestRun(req, res, next) {
  try {
    const testRun = await rerunTest(req.user._id, req.params.id);
    return sendSuccess(res, testRun, 'Test run cloned and queued successfully for execution', 201);
  } catch (error) {
    next(error);
  }
}

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import validateRequest from '../../middleware/validateRequest.js';
import {
  createTestSchema,
  listTestsQuerySchema,
  testIdParamSchema,
} from './test.validation.js';
import * as testController from './test.controller.js';

const router = Router();

// All test run routes require valid JWT authentication
router.use(authenticate);

// Create and queue a new test run
router.post(
  '/',
  validateRequest(createTestSchema),
  testController.createTestRun
);

// List test runs for authenticated user with pagination and filters
router.get(
  '/',
  validateRequest(listTestsQuerySchema),
  testController.listTestRuns
);

// Diagnostic status of k6 load-testing engine (placed before /:id)
router.get(
  '/engine/status',
  testController.getEngineStatus
);

// Get specific test run details
router.get(
  '/:id',
  validateRequest(testIdParamSchema),
  testController.getTestRunById
);

// Start real k6 load test execution
router.post(
  '/:id/start',
  validateRequest(testIdParamSchema),
  testController.startTestRun
);

// Cancel an active or queued test run
router.post(
  '/:id/cancel',
  validateRequest(testIdParamSchema),
  testController.cancelTestRun
);

// Delete a test run
router.delete(
  '/:id',
  validateRequest(testIdParamSchema),
  testController.deleteTestRun
);

// Controlled lifecycle simulation for Stage 6 verification
router.post(
  '/:id/simulate',
  validateRequest(testIdParamSchema),
  testController.simulateLifecycleRun
);

// Safe rerun of an existing test run
router.post(
  '/:id/rerun',
  validateRequest(testIdParamSchema),
  testController.rerunTestRun
);

export default router;

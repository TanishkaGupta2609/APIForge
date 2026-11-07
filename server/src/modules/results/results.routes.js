import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import validateRequest from '../../middleware/validateRequest.js';
import {
  runIdParamSchema,
  exportQuerySchema,
  compareQuerySchema,
} from './results.validation.js';
import * as resultsController from './results.controller.js';

const router = Router();

// All results endpoints require user authentication
router.use(authenticate);

// Aggregated dashboard performance metrics across runs
router.get('/dashboard/summary', resultsController.getDashboardSummary);

// Compare two test runs side-by-side (placed before /:runId)
router.get(
  '/compare',
  validateRequest(compareQuerySchema),
  resultsController.compareTestRuns
);

// Export test run results as CSV or JSON
router.get(
  '/:runId/export',
  validateRequest(exportQuerySchema),
  resultsController.exportResult
);

// Detailed metrics and chart data for a specific test run
router.get(
  '/:runId',
  validateRequest(runIdParamSchema),
  resultsController.getResultByRunId
);

export default router;

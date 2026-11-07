import { Router } from 'express';
import authenticate from '../../middleware/authenticate.js';
import validateRequest from '../../middleware/validateRequest.js';
import {
  historyQuerySchema,
  historyIdParamSchema,
} from './history.validation.js';
import {
  getHistoryHandler,
  getHistoryStatsHandler,
  rerunTestHandler,
  deleteHistoryItemHandler,
} from './history.controller.js';

const router = Router();

// All history endpoints require authentication
router.use(authenticate);

// Aggregated summary statistics
router.get('/stats', getHistoryStatsHandler);

// Paginated test history with search and filters
router.get('/', validateRequest(historyQuerySchema), getHistoryHandler);

// Safe rerun of a completed or failed test run
router.post('/:id/rerun', validateRequest(historyIdParamSchema), rerunTestHandler);

// Delete test run from history
router.delete('/:id', validateRequest(historyIdParamSchema), deleteHistoryItemHandler);

export default router;


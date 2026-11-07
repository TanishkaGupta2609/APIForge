import * as historyService from './history.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

/**
 * Controller to fetch paginated test history with filters and search.
 */
export async function getHistoryHandler(req, res, next) {
  try {
    const data = await historyService.getTestHistory(req.user.id, req.query);
    sendSuccess(res, data, 'Test history retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Controller to fetch user test history counts and summary stats.
 */
export async function getHistoryStatsHandler(req, res, next) {
  try {
    const data = await historyService.getHistoryStats(req.user.id);
    sendSuccess(res, data, 'History statistics retrieved successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Controller to safely rerun a prior test run.
 */
export async function rerunTestHandler(req, res, next) {
  try {
    const data = await historyService.rerunTest(req.user.id, req.params.id);
    sendSuccess(res, data, 'Test run cloned and queued successfully for execution', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller to delete a test run from history.
 */
export async function deleteHistoryItemHandler(req, res, next) {
  try {
    const data = await historyService.deleteHistoryItem(req.user.id, req.params.id);
    sendSuccess(res, data, 'Test run removed from history successfully');
  } catch (err) {
    next(err);
  }
}


import * as resultsService from './results.service.js';
import { sendSuccess } from '../../shared/utils/response.js';

/**
 * Retrieve detailed performance results and chart distributions for a test run.
 * GET /api/results/:runId
 */
export async function getResultByRunId(req, res, next) {
  try {
    const result = await resultsService.getResultByRunId(req.user._id, req.params.runId);
    return sendSuccess(res, result, 'Test results and performance metrics retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve high-level dashboard performance summary across user test runs.
 * GET /api/results/dashboard/summary
 */
export async function getDashboardSummary(req, res, next) {
  try {
    const summary = await resultsService.getDashboardSummary(req.user._id);
    return sendSuccess(res, summary, 'Dashboard performance overview retrieved successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Export test run results as CSV or JSON format.
 * GET /api/results/:runId/export
 */
export async function exportResult(req, res, next) {
  try {
    const format = req.query.format || 'json';
    const { contentType, filename, data } = await resultsService.exportResult(
      req.user._id,
      req.params.runId,
      format
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(data);
  } catch (error) {
    next(error);
  }
}

/**
 * Compare two test runs side-by-side with metric deltas.
 * GET /api/results/compare
 */
export async function compareTestRuns(req, res, next) {
  try {
    const { baseRunId, compareRunId } = req.query;
    const comparison = await resultsService.compareTestRuns(
      req.user._id,
      baseRunId,
      compareRunId
    );
    return sendSuccess(
      res,
      comparison,
      'Comparative test performance analysis generated successfully'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve historical performance trends across test runs.
 * GET /api/results/trends
 */
export async function getPerformanceTrends(req, res, next) {
  try {
    const trends = await resultsService.getPerformanceTrends(req.user._id, req.query);
    return sendSuccess(
      res,
      trends,
      'Historical performance trends retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
}

export default {
  getResultByRunId,
  getDashboardSummary,
  exportResult,
  compareTestRuns,
  getPerformanceTrends,
};

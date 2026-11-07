import apiClient from './apiClient.js';

/**
 * Fetch paginated test execution history with filters and search.
 *
 * @param {object} params - Query parameters (page, limit, status, targetId, search, startDate, endDate, sortBy, sortOrder)
 * @returns {Promise<{ testRuns: Array<object>, pagination: object, filters: object }>}
 */
export async function getTestHistory(params = {}) {
  const cleanParams = {};
  Object.keys(params).forEach((key) => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      cleanParams[key] = params[key];
    }
  });

  const response = await apiClient.get('/history', { params: cleanParams });
  return response?.data;
}

/**
 * Fetch high-level status count statistics for the user's test history.
 *
 * @returns {Promise<object>} Status totals
 */
export async function getHistoryStats() {
  const response = await apiClient.get('/history/stats');
  return response?.data;
}

/**
 * Safely rerun an existing test run by cloning its configuration and queuing a new run.
 *
 * @param {string} testRunId - ID of the test run to duplicate
 * @returns {Promise<object>} Newly created queued test run
 */
export async function rerunTest(testRunId) {
  const response = await apiClient.post(`/history/${testRunId}/rerun`);
  return response?.data;
}

/**
 * Remove a test run from history.
 *
 * @param {string} testRunId - ID of the test run to delete
 * @returns {Promise<object>} Deletion confirmation
 */
export async function deleteHistoryItem(testRunId) {
  const response = await apiClient.delete(`/history/${testRunId}`);
  return response?.data;
}

export default {
  getTestHistory,
  getHistoryStats,
  rerunTest,
  deleteHistoryItem,
};


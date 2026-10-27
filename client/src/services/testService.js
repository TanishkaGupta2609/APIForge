import apiClient from './apiClient.js';

/**
 * Fetch all test runs for the authenticated user with optional status filter and pagination.
 *
 * @param {object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.status]
 * @param {string} [params.targetId]
 * @returns {Promise<{ testRuns: Array<object>, pagination: object }>}
 */
export async function getTestRuns(params = {}) {
  const response = await apiClient.get('/tests', { params });
  return response?.data || { testRuns: [], pagination: {} };
}

/**
 * Fetch details of a single test run by ID.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getTestRunById(id) {
  const response = await apiClient.get(`/tests/${id}`);
  return response?.data;
}

/**
 * Create and queue a new load test run.
 *
 * @param {object} config
 * @returns {Promise<object>}
 */
export async function createTestRun(config) {
  const response = await apiClient.post('/tests', config);
  return response?.data;
}

/**
 * Cancel an active or queued test run.
 *
 * @param {string} id
 * @param {string} [reason]
 * @returns {Promise<object>}
 */
export async function cancelTestRun(id, reason) {
  const response = await apiClient.post(`/tests/${id}/cancel`, { reason });
  return response?.data;
}

/**
 * Delete a test run.
 *
 * @param {string} id
 * @returns {Promise<{ id: string, deleted: boolean }>}
 */
export async function deleteTestRun(id) {
  const response = await apiClient.delete(`/tests/${id}`);
  return response?.data;
}

/**
 * Trigger controlled lifecycle simulation for Stage 6 verification.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function simulateLifecycleRun(id) {
  const response = await apiClient.post(`/tests/${id}/simulate`);
  return response?.data;
}

export default {
  getTestRuns,
  getTestRunById,
  createTestRun,
  cancelTestRun,
  deleteTestRun,
  simulateLifecycleRun,
};

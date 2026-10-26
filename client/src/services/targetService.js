import apiClient from './apiClient.js';

/**
 * Fetch all targets owned by the authenticated user.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getTargets() {
  const response = await apiClient.get('/targets');
  return response?.data?.targets || [];
}

/**
 * Fetch details of a single target by ID.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getTargetById(id) {
  const response = await apiClient.get(`/targets/${id}`);
  return response?.data?.target;
}

/**
 * Create a new target API.
 *
 * @param {object} targetData
 * @param {string} targetData.name
 * @param {string} targetData.baseUrl
 * @param {string} [targetData.description]
 * @param {Array<object>} [targetData.defaultHeaders]
 * @returns {Promise<object>}
 */
export async function createTarget(targetData) {
  const response = await apiClient.post('/targets', targetData);
  return response?.data?.target;
}

/**
 * Update an existing target.
 *
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<object>}
 */
export async function updateTarget(id, updates) {
  const response = await apiClient.put(`/targets/${id}`, updates);
  return response?.data?.target;
}

/**
 * Delete a target.
 *
 * @param {string} id
 * @returns {Promise<{ id: string, deleted: boolean }>}
 */
export async function deleteTarget(id) {
  const response = await apiClient.delete(`/targets/${id}`);
  return response?.data;
}

/**
 * Execute a live health probe against a target.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function probeTargetHealth(id) {
  const response = await apiClient.post(`/targets/${id}/health`);
  return response?.data;
}

export default {
  getTargets,
  getTargetById,
  createTarget,
  updateTarget,
  deleteTarget,
  probeTargetHealth,
};

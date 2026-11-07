import apiClient from './apiClient.js';

/**
 * Retrieve detailed performance results and chart distributions for a test run.
 *
 * @param {string} runId - Test run ID
 * @returns {Promise<object>} Complete formatted test result
 */
export async function getResultByRunId(runId) {
  const response = await apiClient.get(`/results/${runId}`);
  return response?.data;
}

/**
 * Retrieve aggregated dashboard performance summary across user test runs.
 *
 * @returns {Promise<object>}
 */
export async function getDashboardSummary() {
  const response = await apiClient.get('/results/dashboard/summary');
  return response?.data;
}

/**
 * Compare two test runs side-by-side with metric deltas.
 *
 * @param {string} baseRunId - Base test run ID
 * @param {string} compareRunId - Comparison test run ID
 * @returns {Promise<object>} Comparative analysis
 */
export async function compareRuns(baseRunId, compareRunId) {
  const response = await apiClient.get('/results/compare', {
    params: { baseRunId, compareRunId },
  });
  return response?.data;
}

/**
 * Export test run results as CSV or JSON and trigger client-side download.
 *
 * @param {string} runId - Test run ID
 * @param {'json'|'csv'} format - Export format
 * @returns {Promise<boolean>}
 */
export async function exportResult(runId, format = 'json') {
  const response = await apiClient.get(`/results/${runId}/export`, {
    params: { format },
    responseType: 'blob',
  });

  const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json';
  const BlobClass = window.Blob || globalThis.Blob;
  const blob = new BlobClass([response.data || response], { type: mimeType });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', `apiforge-test-${runId}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);

  return true;
}

export default {
  getResultByRunId,
  getDashboardSummary,
  compareRuns,
  exportResult,
};

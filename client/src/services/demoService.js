import apiClient from './apiClient.js';

/**
 * Send an instant baseline ping to the demo sandbox.
 *
 * @returns {Promise<object>}
 */
export async function ping() {
  const startTime = Date.now();
  const response = await apiClient.get('/demo/ping');
  const latencyMs = Date.now() - startTime;
  return {
    ...response.data,
    latencyMs,
  };
}

/**
 * Fetch status and scenario directory of the demo sandbox.
 *
 * @returns {Promise<object>}
 */
export async function getHealth() {
  const response = await apiClient.get('/demo/health');
  return response.data;
}

/**
 * Execute simulated artificial latency scenario.
 *
 * @param {number} [ms=250]
 * @returns {Promise<object>}
 */
export async function testDelayed(ms = 250) {
  const startTime = Date.now();
  const response = await apiClient.get(`/demo/delayed?ms=${ms}`);
  const latencyMs = Date.now() - startTime;
  return {
    ...response.data,
    latencyMs,
  };
}

/**
 * Trigger simulated fault injection.
 *
 * @param {number} [status=500]
 * @param {number} [rate=1.0]
 * @returns {Promise<object>}
 */
export async function testError(status = 500, rate = 1.0) {
  const startTime = Date.now();
  try {
    const response = await apiClient.get(`/demo/error?status=${status}&rate=${rate}`);
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      data: response.data,
      statusCode: 200,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      statusCode: err.status || status,
      error: err,
      latencyMs,
    };
  }
}

/**
 * Send request to the sliding-window rate-limited scenario.
 *
 * @param {number} [limit=10]
 * @param {number} [windowSec=10]
 * @returns {Promise<object>}
 */
export async function testRateLimit(limit = 10, windowSec = 10) {
  const startTime = Date.now();
  try {
    const response = await apiClient.get(`/demo/rate-limited?limit=${limit}&window=${windowSec}`);
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      statusCode: 200,
      data: response.data,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      statusCode: err.status || 429,
      error: err,
      latencyMs,
    };
  }
}

export default {
  ping,
  getHealth,
  testDelayed,
  testError,
  testRateLimit,
};

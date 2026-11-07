import { ExecutionError } from '../shared/errors/AppError.js';

/**
 * Parses and normalizes raw k6 summary JSON into APIForge's stable metrics schema.
 *
 * Guaranteed metric mapping:
 * - totalRequests: number
 * - successfulRequests: number
 * - failedRequests: number
 * - requestsPerSecond: number
 * - avgLatency: number (ms) | null
 * - medianLatency: number (ms) | null
 * - p90Latency: number (ms) | null
 * - p95Latency: number (ms) | null
 * - maxLatency: number (ms) | null
 * - failureRate: number (0.0 to 1.0)
 * - networkErrors: number
 * - statusCodeCounts: Object<string, number>
 *
 * @param {string|object} rawInput - Raw summary JSON string or parsed object
 * @returns {object} Normalized metrics structure
 */
export function parseK6Summary(rawInput) {
  if (!rawInput) {
    throw new ExecutionError('Cannot parse k6 summary: Summary input is empty or null.');
  }

  let summary;
  if (typeof rawInput === 'string') {
    try {
      summary = JSON.parse(rawInput);
    } catch (err) {
      throw new ExecutionError(`Malformed k6 summary JSON: ${err.message}`);
    }
  } else if (typeof rawInput === 'object') {
    summary = rawInput;
  } else {
    throw new ExecutionError('Invalid summary input type: expected JSON string or object.');
  }

  if (!summary || typeof summary !== 'object' || !summary.metrics) {
    throw new ExecutionError('Invalid k6 summary structure: Missing top-level "metrics" property.');
  }

  const metrics = summary.metrics;

  // 1. Total and rate of HTTP requests
  const httpReqs = metrics.http_reqs || {};
  const totalRequests = Number(
    typeof httpReqs.count === 'number'
      ? httpReqs.count
      : httpReqs.values?.count ?? 0
  );

  const rawRps = typeof httpReqs.rate === 'number'
    ? httpReqs.rate
    : httpReqs.values?.rate ?? 0;
  const requestsPerSecond = Number(Number(rawRps).toFixed(2));

  // 2. Failed and successful requests
  const httpReqFailed = metrics.http_req_failed || {};
  const failedRequests = Number(
    typeof httpReqFailed.passes === 'number'
      ? httpReqFailed.passes
      : httpReqFailed.values?.passes ?? 0
  );

  // In k6, http_req_failed fails count is successful requests
  const successfulRequests = Number(
    typeof httpReqFailed.fails === 'number'
      ? httpReqFailed.fails
      : Math.max(0, totalRequests - failedRequests)
  );

  // 3. Failure rate calculation (0.0 to 1.0)
  let rawFailureRate = 0;
  if (typeof httpReqFailed.value === 'number') {
    rawFailureRate = httpReqFailed.value;
  } else if (typeof httpReqFailed.rate === 'number') {
    rawFailureRate = httpReqFailed.rate;
  } else if (typeof httpReqFailed.values?.rate === 'number') {
    rawFailureRate = httpReqFailed.values.rate;
  } else if (totalRequests > 0) {
    rawFailureRate = failedRequests / totalRequests;
  }
  const failureRate = Number(Number(rawFailureRate).toFixed(4));

  // 4. Latency percentiles and averages
  const duration = metrics.http_req_duration || {};

  const getMetricVal = (prop) => {
    let val = duration[prop];
    if (val === undefined && duration.values) {
      val = duration.values[prop];
    }
    return typeof val === 'number' ? Number(Number(val).toFixed(2)) : null;
  };

  const avgLatency = totalRequests > 0 ? getMetricVal('avg') : null;
  const medianLatency = totalRequests > 0 ? getMetricVal('med') : null;
  const p90Latency = totalRequests > 0 ? getMetricVal('p(90)') : null;
  const p95Latency = totalRequests > 0 ? getMetricVal('p(95)') : null;
  const maxLatency = totalRequests > 0 ? getMetricVal('max') : null;

  // 5. Network / Transport errors
  let networkErrors = 0;
  // If http_reqs was 0 or all iterations failed without any successful connection
  if (totalRequests === 0) {
    const iters = metrics.iterations?.count ?? metrics.iterations?.values?.count ?? 0;
    networkErrors = iters > 0 ? iters : 1;
  } else if (failedRequests > 0 && avgLatency === 0) {
    // When connection is rejected before any HTTP duration is measured, it's a socket/transport error
    networkErrors = failedRequests;
  }

  // 6. HTTP Status Code distribution
  const statusCodeCounts = {};
  if (totalRequests > 0) {
    if (successfulRequests > 0) {
      statusCodeCounts['200'] = successfulRequests;
    }
    if (failedRequests > 0) {
      // If we don't have explicit granular status tags from k6, record 5xx/error bucket
      statusCodeCounts['500'] = failedRequests;
    }
  }

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    requestsPerSecond,
    avgLatency,
    medianLatency,
    p90Latency,
    p95Latency,
    maxLatency,
    failureRate,
    networkErrors,
    statusCodeCounts,
  };
}

export default {
  parseK6Summary,
};


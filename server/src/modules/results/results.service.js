import TestRun, { TEST_RUN_STATUS } from '../tests/testRun.model.js';
import Target from '../targets/target.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/AppError.js';

/**
 * Builds structured response time percentiles for visualization.
 *
 * @param {object} metrics - Stored metrics object
 * @returns {Array<object>}
 */
export function buildPercentilesBreakdown(metrics) {
  if (!metrics || typeof metrics.totalRequests !== 'number' || metrics.totalRequests === 0) {
    return [];
  }

  return [
    { name: 'Min', label: 'Min Latency', latency: metrics.minLatency ?? 0, unit: 'ms' },
    { name: 'Med', label: 'Median (p50)', latency: metrics.medianLatency ?? 0, unit: 'ms' },
    { name: 'Avg', label: 'Average', latency: metrics.avgLatency ?? 0, unit: 'ms' },
    { name: 'p90', label: '90th Percentile', latency: metrics.p90Latency ?? 0, unit: 'ms' },
    { name: 'p95', label: '95th Percentile', latency: metrics.p95Latency ?? 0, unit: 'ms' },
    { name: 'Max', label: 'Max Latency', latency: metrics.maxLatency ?? 0, unit: 'ms' },
  ];
}

/**
 * Builds HTTP status code distribution array for pie/donut charts.
 *
 * @param {object} metrics - Stored metrics object
 * @returns {Array<object>}
 */
export function buildStatusCodeDistribution(metrics) {
  if (!metrics || typeof metrics.totalRequests !== 'number' || metrics.totalRequests === 0) {
    return [];
  }

  const distribution = [];
  const successful = metrics.successfulRequests ?? 0;
  const failed = metrics.failedRequests ?? 0;

  if (successful > 0) {
    distribution.push({
      name: '2xx Success',
      category: 'Success',
      count: successful,
      percentage: Number(((successful / metrics.totalRequests) * 100).toFixed(1)),
      color: '#10B981',
    });
  }

  if (failed > 0) {
    distribution.push({
      name: '4xx/5xx Errors',
      category: 'Failed',
      count: failed,
      percentage: Number(((failed / metrics.totalRequests) * 100).toFixed(1)),
      color: '#EF4444',
    });
  }

  return distribution;
}

/**
 * Generates synthetic progression timeline series data for time-series charts.
 *
 * @param {object} configuration - Test configuration
 * @param {object} metrics - Stored metrics
 * @returns {Array<object>}
 */
export function buildWorkloadTimeline(configuration, metrics) {
  const durationSec = configuration?.duration || 10;
  const vus = configuration?.vus || 1;
  const rampUp = configuration?.rampUpDuration || 0;
  const hasMetrics = metrics && typeof metrics.totalRequests === 'number' && metrics.totalRequests > 0;
  const avgRps = hasMetrics ? (metrics.requestsPerSecond || 0) : 0;

  const steps = Math.min(10, Math.max(3, durationSec));
  const interval = durationSec / steps;
  const timeline = [];

  for (let i = 1; i <= steps; i++) {
    const elapsed = Math.round(i * interval);
    let activeVus = vus;

    if (rampUp > 0 && elapsed <= rampUp) {
      activeVus = Math.max(1, Math.round((elapsed / rampUp) * vus));
    }

    // Proportional throughput estimate over time
    const rpsEstimate = hasMetrics
      ? Number((avgRps * (activeVus / vus) * (0.95 + ((i % 3) * 0.03))).toFixed(1))
      : 0;

    timeline.push({
      time: `${elapsed}s`,
      second: elapsed,
      vus: activeVus,
      requestsPerSecond: rpsEstimate,
    });
  }

  return timeline;
}

/**
 * Evaluates configured thresholds against stored performance metrics.
 *
 * @param {object} thresholds - Configured threshold rules
 * @param {object} metrics - Stored performance metrics
 * @returns {object} Evaluation summary
 */
export function evaluateThresholds(thresholds, metrics) {
  const result = {
    hasThresholds: false,
    allPassed: true,
    rules: [],
  };

  if (!thresholds) return result;

  const hasMetrics = metrics && typeof metrics.totalRequests === 'number' && metrics.totalRequests > 0;

  if (thresholds.httpReqDurationP95 && thresholds.httpReqDurationP95 > 0) {
    result.hasThresholds = true;
    const target = Number(thresholds.httpReqDurationP95);
    const actual = hasMetrics ? metrics.p95Latency : null;
    const passed = actual !== null && actual <= target;

    if (!passed) result.allPassed = false;

    result.rules.push({
      metric: 'p95 Response Time',
      target: `< ${target}ms`,
      actual: actual !== null ? `${actual}ms` : 'Unavailable',
      passed,
    });
  }

  if (thresholds.httpReqFailedRate !== undefined && thresholds.httpReqFailedRate !== null) {
    result.hasThresholds = true;
    const target = Number(thresholds.httpReqFailedRate);
    const actual = hasMetrics ? metrics.failureRate : null;
    const passed = actual !== null && actual <= target;

    if (!passed) result.allPassed = false;

    result.rules.push({
      metric: 'Failure Rate',
      target: `<= ${(target * 100).toFixed(1)}%`,
      actual: actual !== null ? `${(actual * 100).toFixed(1)}%` : 'Unavailable',
      passed,
    });
  }

  return result;
}

/**
 * Retrieves comprehensive result details and chart data for an authorized test run.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} runId - TestRun ObjectId
 * @returns {Promise<object>} Complete formatted test result
 */
export async function getResultByRunId(userId, runId) {
  const testRun = await TestRun.findById(runId).populate('target', 'name baseUrl description');

  if (!testRun) {
    throw new NotFoundError('Test run not found.');
  }

  if (testRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access results for this test run.');
  }

  const runJson = testRun.toJSON();
  const metrics = runJson.metrics || {};

  const percentiles = buildPercentilesBreakdown(metrics);
  const statusCodes = buildStatusCodeDistribution(metrics);
  const timeline = buildWorkloadTimeline(runJson.configuration, metrics);
  const thresholdEval = evaluateThresholds(runJson.configuration?.thresholds, metrics);

  return {
    testRun: {
      id: runJson._id,
      _id: runJson._id,
      name: runJson.name,
      status: runJson.status,
      isSimulated: runJson.isSimulated || false,
      startTime: runJson.startTime,
      endTime: runJson.endTime,
      createdAt: runJson.createdAt,
      actualDurationMs: runJson.actualDurationMs,
      progress: runJson.progress,
      error: runJson.error,
    },
    target: runJson.target || {
      name: runJson.configuration?.targetSnapshot?.name || 'Target API',
      baseUrl: runJson.configuration?.targetSnapshot?.baseUrl || '',
    },
    configuration: runJson.configuration,
    metrics,
    charts: {
      percentiles,
      statusCodes,
      timeline,
    },
    thresholds: thresholdEval,
  };
}

/**
 * Aggregates dashboard overview metrics across all test runs owned by the user.
 *
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<object>}
 */
export async function getDashboardSummary(userId) {
  const [totalTargets, allRuns] = await Promise.all([
    Target.countDocuments({ owner: userId }),
    TestRun.find({ owner: userId }).sort({ createdAt: -1 }).limit(10).populate('target', 'name baseUrl'),
  ]);

  const totalRuns = allRuns.length;
  const completedRuns = allRuns.filter((r) => r.status === TEST_RUN_STATUS.COMPLETED);
  const activeRuns = allRuns.filter((r) => [TEST_RUN_STATUS.QUEUED, TEST_RUN_STATUS.RUNNING].includes(r.status));

  // Compute aggregate totals across completed runs
  let totalRequests = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (const run of completedRuns) {
    if (run.metrics) {
      if (typeof run.metrics.totalRequests === 'number') {
        totalRequests += run.metrics.totalRequests;
      }
      if (typeof run.metrics.avgLatency === 'number') {
        latencySum += run.metrics.avgLatency;
        latencyCount++;
      }
    }
  }

  const avgResponseTime = latencyCount > 0 ? Number((latencySum / latencyCount).toFixed(1)) : null;

  return {
    overview: {
      savedTargets: totalTargets,
      totalTestRuns: totalRuns,
      completedRuns: completedRuns.length,
      activeRuns: activeRuns.length,
      totalRequestsGenerated: totalRequests,
      avgResponseTime,
    },
    recentRuns: allRuns.slice(0, 5).map((r) => r.toJSON()),
  };
}

/**
 * Sanitizes headers by replacing sensitive authentication keys with [REDACTED].
 *
 * @param {object|Map} headers - Headers object or Map
 * @returns {object} Redacted headers
 */
export function redactSensitiveHeaders(headers) {
  if (!headers) return {};
  const rawObj = headers instanceof Map ? Object.fromEntries(headers) : headers;
  const sensitiveRegex = /^(authorization|cookie|set-cookie|x-api-key|api-key|secret|token|password|auth)$/i;

  const sanitized = {};
  for (const [key, value] of Object.entries(rawObj)) {
    if (sensitiveRegex.test(key.trim())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Exports test run results in CSV or JSON format with sensitive information redacted.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} runId - Test run ID
 * @param {string} [format='json'] - Export format ('json' or 'csv')
 * @returns {Promise<{ contentType: string, filename: string, data: string }>}
 */
export async function exportResult(userId, runId, format = 'json') {
  const testRun = await TestRun.findById(runId).populate('target', 'name baseUrl');

  if (!testRun) {
    throw new NotFoundError('Test run not found.');
  }

  if (testRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to export results for this test run.');
  }

  const runJson = testRun.toJSON();
  const metrics = runJson.metrics || {};
  const config = runJson.configuration || {};
  const sanitizedHeaders = redactSensitiveHeaders(config.headers);
  const targetName = runJson.target?.name || config.targetSnapshot?.name || 'Target API';
  const targetBaseUrl = runJson.target?.baseUrl || config.targetSnapshot?.baseUrl || '';

  if (format === 'csv') {
    const rows = [
      ['# APIForge Load Test Performance Report', ''],
      ['# Exported At', new Date().toISOString()],
      ['', ''],
      ['SECTION: TEST METADATA', ''],
      ['Run ID', runJson._id],
      ['Test Name', runJson.name],
      ['Target API', targetName],
      ['Target URL', targetBaseUrl],
      ['Endpoint', `${config.method || 'GET'} ${config.endpoint || '/'}`],
      ['Virtual Users', config.vus || 'N/A'],
      ['Configured Duration', config.duration ? `${config.duration}s` : 'N/A'],
      ['Ramp-up Duration', config.rampUpDuration ? `${config.rampUpDuration}s` : '0s'],
      ['Execution Status', runJson.status],
      ['Is Simulated', runJson.isSimulated ? 'true' : 'false'],
      ['Started At', runJson.startTime || 'N/A'],
      ['Completed At', runJson.endTime || 'N/A'],
      ['Actual Duration (ms)', runJson.actualDurationMs || 'N/A'],
      ['', ''],
      ['SECTION: PERFORMANCE METRICS', ''],
      ['Metric', 'Value', 'Unit', 'Description'],
      ['Total Requests', metrics.totalRequests ?? 'N/A', 'requests', 'Total requests executed'],
      ['Successful Requests', metrics.successfulRequests ?? 'N/A', 'requests', 'Requests with 2xx status code'],
      ['Failed Requests', metrics.failedRequests ?? 'N/A', 'requests', 'Requests with 4xx/5xx or errors'],
      ['Requests Per Second', metrics.requestsPerSecond != null ? metrics.requestsPerSecond.toFixed(2) : 'N/A', 'req/s', 'Average throughput'],
      ['Average Response Time', metrics.avgLatency != null ? metrics.avgLatency.toFixed(2) : 'N/A', 'ms', 'Mean roundtrip latency'],
      ['Median Response Time (p50)', metrics.medianLatency != null ? metrics.medianLatency.toFixed(2) : 'N/A', 'ms', '50th percentile response time'],
      ['90th Percentile (p90)', metrics.p90Latency != null ? metrics.p90Latency.toFixed(2) : 'N/A', 'ms', '90th percentile response time'],
      ['95th Percentile (p95)', metrics.p95Latency != null ? metrics.p95Latency.toFixed(2) : 'N/A', 'ms', '95th percentile response time'],
      ['Maximum Response Time', metrics.maxLatency != null ? metrics.maxLatency.toFixed(2) : 'N/A', 'ms', 'Worst-case response time observed'],
      ['Failure Rate', metrics.failureRate != null ? `${(metrics.failureRate * 100).toFixed(2)}%` : 'N/A', '%', 'Percentage of failed requests'],
      ['Network Errors', metrics.networkErrors ?? 0, 'errors', 'Connection drops and timeouts'],
    ];

    if (metrics.statusCodeCounts) {
      rows.push(['', '']);
      rows.push(['SECTION: HTTP STATUS CODE DISTRIBUTION', '']);
      rows.push(['Status Code', 'Count']);
      const counts = metrics.statusCodeCounts instanceof Map
        ? Object.fromEntries(metrics.statusCodeCounts)
        : metrics.statusCodeCounts;
      for (const [code, count] of Object.entries(counts)) {
        rows.push([code, count]);
      }
    }

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      )
      .join('\r\n');

    return {
      contentType: 'text/csv',
      filename: `apiforge-test-${runJson._id}.csv`,
      data: csvContent,
    };
  }

  // JSON export payload
  const jsonPayload = {
    apiforge_version: '1.0.0',
    exported_at: new Date().toISOString(),
    test_run: {
      id: runJson._id,
      name: runJson.name,
      status: runJson.status,
      isSimulated: runJson.isSimulated || false,
      startTime: runJson.startTime,
      endTime: runJson.endTime,
      actualDurationMs: runJson.actualDurationMs,
      target: {
        name: targetName,
        baseUrl: targetBaseUrl,
      },
      configuration: {
        method: config.method,
        endpoint: config.endpoint,
        vus: config.vus,
        duration: config.duration,
        rampUpDuration: config.rampUpDuration,
        thresholds: config.thresholds || {},
        headers: sanitizedHeaders,
      },
      metrics: {
        totalRequests: metrics.totalRequests ?? null,
        successfulRequests: metrics.successfulRequests ?? null,
        failedRequests: metrics.failedRequests ?? null,
        requestsPerSecond: metrics.requestsPerSecond ?? null,
        avgLatency: metrics.avgLatency ?? null,
        medianLatency: metrics.medianLatency ?? null,
        p90Latency: metrics.p90Latency ?? null,
        p95Latency: metrics.p95Latency ?? null,
        maxLatency: metrics.maxLatency ?? null,
        failureRate: metrics.failureRate ?? null,
        networkErrors: metrics.networkErrors ?? 0,
        statusCodeCounts: metrics.statusCodeCounts || {},
      },
      thresholdEvaluation: evaluateThresholds(config.thresholds, metrics),
    },
  };

  return {
    contentType: 'application/json',
    filename: `apiforge-test-${runJson._id}.json`,
    data: JSON.stringify(jsonPayload, null, 2),
  };
}

/**
 * Calculates metric deltas between base and comparison runs.
 *
 * @param {number|null} baseVal - Metric value from baseline run
 * @param {number|null} compareVal - Metric value from comparison run
 * @param {'latency'|'throughput'|'failure'} metricType - Metric characteristic
 * @returns {object} Calculated difference, percent change, and improvement indicator
 */
export function calculateDelta(baseVal, compareVal, metricType = 'latency') {
  if (baseVal == null || compareVal == null) {
    return {
      base: baseVal ?? null,
      compare: compareVal ?? null,
      diff: null,
      percentChange: null,
      isImprovement: null,
    };
  }

  const diff = Number((compareVal - baseVal).toFixed(2));
  const percentChange =
    baseVal === 0 ? 0 : Number((((compareVal - baseVal) / baseVal) * 100).toFixed(2));

  // For latency and error rate, lower values indicate improvement.
  // For throughput and total requests, higher values indicate improvement.
  let isImprovement = null;
  if (diff !== 0) {
    isImprovement =
      metricType === 'latency' || metricType === 'failure' ? diff < 0 : diff > 0;
  }

  return {
    base: baseVal,
    compare: compareVal,
    diff,
    percentChange,
    isImprovement,
  };
}

/**
 * Compares two completed test runs side-by-side and returns delta calculations.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} baseRunId - Base test run ID
 * @param {string} compareRunId - Comparison test run ID
 * @returns {Promise<object>} Complete comparative analysis
 */
export async function compareTestRuns(userId, baseRunId, compareRunId) {
  const [baseRun, compareRun] = await Promise.all([
    TestRun.findById(baseRunId).populate('target', 'name baseUrl'),
    TestRun.findById(compareRunId).populate('target', 'name baseUrl'),
  ]);

  if (!baseRun) {
    throw new NotFoundError('Baseline test run not found.');
  }
  if (!compareRun) {
    throw new NotFoundError('Comparison test run not found.');
  }

  if (baseRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access the baseline test run.');
  }
  if (compareRun.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('You do not have permission to access the comparison test run.');
  }

  const baseJson = baseRun.toJSON();
  const compareJson = compareRun.toJSON();
  const baseMetrics = baseJson.metrics || {};
  const compareMetrics = compareJson.metrics || {};
  const baseConfig = baseJson.configuration || {};
  const compareConfig = compareJson.configuration || {};

  // Compatibility assessment
  const isSameTarget =
    (baseJson.target?._id?.toString() || '') === (compareJson.target?._id?.toString() || '') ||
    (baseConfig.targetSnapshot?.baseUrl || '') === (compareConfig.targetSnapshot?.baseUrl || '');
  const isSameEndpoint = (baseConfig.endpoint || '') === (compareConfig.endpoint || '');
  const isSameMethod = (baseConfig.method || '') === (compareConfig.method || '');
  const isSameVUs = (baseConfig.vus || 0) === (compareConfig.vus || 0);

  let rating = 'HIGH';
  const notes = [];

  if (!isSameTarget) {
    rating = 'LOW';
    notes.push('Tests were executed against different target URLs.');
  } else if (!isSameEndpoint || !isSameMethod) {
    rating = 'MODERATE';
    notes.push('Tests evaluated different API endpoints or HTTP methods.');
  }

  if (!isSameVUs) {
    notes.push(`Workload concurrency differed (${baseConfig.vus || 0} vs ${compareConfig.vus || 0} VUs).`);
  }

  if (notes.length === 0) {
    notes.push('Workload, target endpoint, and test configuration are fully compatible.');
  }

  // Calculate comparative deltas across core metrics
  const deltas = {
    totalRequests: calculateDelta(baseMetrics.totalRequests, compareMetrics.totalRequests, 'throughput'),
    requestsPerSecond: calculateDelta(baseMetrics.requestsPerSecond, compareMetrics.compareRequestsPerSecond ?? compareMetrics.requestsPerSecond, 'throughput'),
    avgLatency: calculateDelta(baseMetrics.avgLatency, compareMetrics.avgLatency, 'latency'),
    medianLatency: calculateDelta(baseMetrics.medianLatency, compareMetrics.medianLatency, 'latency'),
    p90Latency: calculateDelta(baseMetrics.p90Latency, compareMetrics.p90Latency, 'latency'),
    p95Latency: calculateDelta(baseMetrics.p95Latency, compareMetrics.p95Latency, 'latency'),
    maxLatency: calculateDelta(baseMetrics.maxLatency, compareMetrics.maxLatency, 'latency'),
    failureRate: calculateDelta(baseMetrics.failureRate, compareMetrics.failureRate, 'failure'),
  };

  // Generate brief textual summary
  const summaryParts = [];
  if (deltas.avgLatency.diff != null && deltas.avgLatency.diff !== 0) {
    const latDir = deltas.avgLatency.diff < 0 ? 'improved' : 'regressed';
    summaryParts.push(
      `Average latency ${latDir} by ${Math.abs(deltas.avgLatency.diff)}ms (${deltas.avgLatency.percentChange > 0 ? '+' : ''}${deltas.avgLatency.percentChange}%)`
    );
  }
  if (deltas.requestsPerSecond.diff != null && deltas.requestsPerSecond.diff !== 0) {
    const rpsDir = deltas.requestsPerSecond.diff > 0 ? 'increased' : 'decreased';
    summaryParts.push(
      `throughput ${rpsDir} by ${Math.abs(deltas.requestsPerSecond.diff)} req/s (${deltas.requestsPerSecond.percentChange > 0 ? '+' : ''}${deltas.requestsPerSecond.percentChange}%)`
    );
  }

  const summary = summaryParts.length > 0
    ? summaryParts.join('; ')
    : 'No measurable performance variance observed between test runs.';

  return {
    baseRun: {
      id: baseJson._id,
      name: baseJson.name,
      status: baseJson.status,
      createdAt: baseJson.createdAt,
      target: baseJson.target || baseConfig.targetSnapshot,
      configuration: baseConfig,
      metrics: baseMetrics,
    },
    compareRun: {
      id: compareJson._id,
      name: compareJson.name,
      status: compareJson.status,
      createdAt: compareJson.createdAt,
      target: compareJson.target || compareConfig.targetSnapshot,
      configuration: compareConfig,
      metrics: compareMetrics,
    },
    compatibility: {
      rating,
      isSameTarget,
      isSameEndpoint,
      isSameMethod,
      isSameVUs,
      notes,
    },
    deltas,
    summary,
  };
}

export default {
  getResultByRunId,
  getDashboardSummary,
  buildPercentilesBreakdown,
  buildStatusCodeDistribution,
  buildWorkloadTimeline,
  evaluateThresholds,
};

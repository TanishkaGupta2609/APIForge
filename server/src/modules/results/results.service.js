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
  const profile = configuration?.workloadProfile || 'fixed';
  const hasMetrics = metrics && typeof metrics.totalRequests === 'number' && metrics.totalRequests > 0;
  const avgRps = hasMetrics ? (metrics.requestsPerSecond || 0) : 0;

  const steps = Math.min(10, Math.max(3, durationSec));
  const interval = durationSec / steps;
  const timeline = [];

  for (let i = 1; i <= steps; i++) {
    const elapsed = Math.round(i * interval);
    const progressPct = elapsed / durationSec;
    let activeVus = vus;

    if (profile === 'ramping') {
      if (progressPct <= 0.25) {
        activeVus = Math.max(1, Math.round((progressPct / 0.25) * vus));
      } else if (progressPct >= 0.75) {
        activeVus = Math.max(1, Math.round((1 - (progressPct - 0.75) / 0.25) * vus));
      } else {
        activeVus = vus;
      }
    } else if (profile === 'spike') {
      if (progressPct >= 0.2 && progressPct <= 0.6) {
        activeVus = vus;
      } else {
        activeVus = Math.max(1, Math.round(vus * 0.2));
      }
    } else if (profile === 'stress') {
      const stepIndex = Math.min(4, Math.floor(progressPct * 4) + 1);
      activeVus = Math.max(1, Math.round((stepIndex / 4) * vus));
    } else if (rampUp > 0 && elapsed <= rampUp) {
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
    configuration: {
      ...runJson.configuration,
      headers: redactSensitiveHeaders(runJson.configuration?.headers),
    },
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
 * Escapes HTML entities to prevent XSS in generated HTML reports.
 *
 * @param {string} str - Raw string
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a self-contained, print-ready HTML performance benchmark report.
 *
 * @param {object} params
 * @returns {string} Standalone HTML document string
 */
export function generateHtmlReport({ runJson, metrics, config, targetName, targetBaseUrl }) {
  const thresholdEval = evaluateThresholds(config.thresholds, metrics);
  const percentiles = buildPercentilesBreakdown(metrics);
  const statusCodes = metrics.statusCodeCounts instanceof Map
    ? Object.fromEntries(metrics.statusCodeCounts)
    : metrics.statusCodeCounts || {};

  const statusBadgeColor = runJson.status === 'completed' ? '#10B981' : runJson.status === 'failed' ? '#EF4444' : '#F59E0B';
  const thresholdsBadge = thresholdEval.hasThresholds
    ? (thresholdEval.allPassed
        ? '<span style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;">SLA PASSED</span>'
        : '<span style="background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;">SLA BREACHED</span>')
    : '<span style="background: rgba(148, 163, 184, 0.15); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.3); padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;">NO SLA RULES</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APIForge Performance Report — ${escapeHtml(runJson.name)}</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #6366f1;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 32px 20px;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    .brand { font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .brand span { color: var(--primary); }
    .title { font-size: 20px; font-weight: 700; margin-top: 6px; }
    .subtitle { font-size: 13px; color: var(--text-muted); margin-top: 4px; font-family: monospace; }
    .badges { display: flex; gap: 8px; margin-top: 12px; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 16px;
    }
    .kpi-label { font-size: 12px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #fff; margin-top: 6px; }
    .kpi-unit { font-size: 12px; color: var(--text-muted); font-weight: 400; margin-left: 2px; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--card-bg); border-radius: 8px; overflow: hidden; border: 1px solid var(--card-border); }
    th, td { padding: 10px 14px; text-align: left; }
    th { background: #1a2234; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--card-border); }
    tr:not(:last-child) td { border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .table-cell-bold { font-weight: 600; color: #fff; }
    .pass-tag { color: var(--success); font-weight: 600; }
    .fail-tag { color: var(--danger); font-weight: 600; }
    .config-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 20px; font-size: 13px; }
    .config-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .config-item { display: flex; flex-direction: column; gap: 4px; }
    .config-label { color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; }
    .config-val { font-family: monospace; color: #e2e8f0; }
    footer { border-top: 1px solid var(--card-border); padding-top: 20px; margin-top: 40px; font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; }
    @media print {
      body { background: #fff !important; color: #111827 !important; padding: 0 !important; }
      .brand span { color: #4338ca !important; }
      .kpi-card, .config-card, table { background: #fff !important; border-color: #e5e7eb !important; color: #111827 !important; }
      th { background: #f3f4f6 !important; color: #374151 !important; border-color: #e5e7eb !important; }
      .kpi-value, .table-cell-bold, .config-val { color: #111827 !important; }
      tr:not(:last-child) td { border-bottom: 1px solid #e5e7eb !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="brand">API<span>Forge</span></div>
        <h1 class="title">${escapeHtml(runJson.name)}</h1>
        <div class="subtitle">${escapeHtml(config.method || 'GET')} ${escapeHtml(targetBaseUrl)}${escapeHtml(config.endpoint || '/')}</div>
        <div class="badges">
          <span class="badge" style="background: ${statusBadgeColor}22; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor}55;">
            ${escapeHtml(runJson.status)}
          </span>
          ${thresholdsBadge}
          ${runJson.isSimulated ? '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3);">Simulated</span>' : '<span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);">k6 Engine</span>'}
        </div>
      </div>
      <div style="text-align: right; font-size: 12px; color: var(--text-muted);">
        <div>Report Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</div>
        <div style="margin-top: 4px; font-family: monospace;">Run ID: ${escapeHtml(String(runJson._id))}</div>
      </div>
    </header>

    <!-- Key Performance Indicators -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Requests</div>
        <div class="kpi-value">${metrics.totalRequests?.toLocaleString() ?? '—'}<span class="kpi-unit">reqs</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Throughput</div>
        <div class="kpi-value">${metrics.requestsPerSecond != null ? metrics.requestsPerSecond.toFixed(1) : '—'}<span class="kpi-unit">req/s</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Avg Latency</div>
        <div class="kpi-value">${metrics.avgLatency != null ? metrics.avgLatency.toFixed(1) : '—'}<span class="kpi-unit">ms</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">p95 Latency</div>
        <div class="kpi-value">${metrics.p95Latency != null ? metrics.p95Latency.toFixed(1) : '—'}<span class="kpi-unit">ms</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Max Latency</div>
        <div class="kpi-value">${metrics.maxLatency != null ? metrics.maxLatency.toFixed(1) : '—'}<span class="kpi-unit">ms</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Failure Rate</div>
        <div class="kpi-value" style="color: ${(metrics.failureRate || 0) > 0 ? 'var(--danger)' : 'var(--success)'};">
          ${metrics.failureRate != null ? (metrics.failureRate * 100).toFixed(2) : '0.00'}<span class="kpi-unit">%</span>
        </div>
      </div>
    </div>

    <!-- Percentiles Breakdown -->
    <div class="section">
      <div class="section-title">📊 Response Time Percentiles</div>
      <table>
        <thead>
          <tr>
            <th>Percentile</th>
            <th>Description</th>
            <th>Latency</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          ${percentiles.map((p) => `<tr>
            <td class="table-cell-bold">${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.label)}</td>
            <td class="table-cell-bold">${p.latency != null ? p.latency.toFixed(2) : '—'}</td>
            <td>ms</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- SLA Threshold Evaluation -->
    ${thresholdEval.hasThresholds ? `
    <div class="section">
      <div class="section-title">🎯 SLA Threshold Audit</div>
      <table>
        <thead>
          <tr>
            <th>Metric Rule</th>
            <th>Target Threshold</th>
            <th>Observed Result</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          ${thresholdEval.rules.map((r) => `<tr>
            <td class="table-cell-bold">${escapeHtml(r.metric)}</td>
            <td style="font-family: monospace;">${escapeHtml(r.target)}</td>
            <td style="font-family: monospace;">${escapeHtml(r.actual)}</td>
            <td class="${r.passed ? 'pass-tag' : 'fail-tag'}">${r.passed ? 'PASSED' : 'BREACHED'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <!-- HTTP Status Code Breakdown -->
    <div class="section">
      <div class="section-title">📈 HTTP Status Code Distribution</div>
      <table>
        <thead>
          <tr>
            <th>HTTP Status</th>
            <th>Total Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(statusCodes).map(([code, count]) => {
            const pct = metrics.totalRequests > 0 ? ((count / metrics.totalRequests) * 100).toFixed(1) : '0.0';
            return `<tr>
              <td class="table-cell-bold">${escapeHtml(code)}</td>
              <td>${count.toLocaleString()}</td>
              <td>${pct}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Workload & Target Configuration -->
    <div class="section">
      <div class="section-title">⚙️ Test Configuration & Execution Profile</div>
      <div class="config-card">
        <div class="config-grid">
          <div class="config-item">
            <span class="config-label">Target Name</span>
            <span class="config-val">${escapeHtml(targetName)}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Target Base URL</span>
            <span class="config-val">${escapeHtml(targetBaseUrl)}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Virtual Users (VUs)</span>
            <span class="config-val">${config.vus || 'N/A'}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Configured Duration</span>
            <span class="config-val">${config.duration ? `${config.duration}s` : 'N/A'}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Workload Profile</span>
            <span class="config-val">${escapeHtml(config.workloadProfile || 'fixed')}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Started At</span>
            <span class="config-val">${runJson.startTime ? new Date(runJson.startTime).toISOString() : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>

    <footer>
      <div>APIForge Load Testing Engine v1.0.0 — Automated Performance Benchmark</div>
      <div style="font-size: 11px;">Sensitive authentication headers were automatically redacted.</div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Exports test run results in CSV, JSON, or HTML format with sensitive information redacted.
 *
 * @param {string} userId - Authenticated user ID
 * @param {string} runId - Test run ID
 * @param {string} [format='json'] - Export format ('json', 'csv', or 'html')
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

  if (format === 'html') {
    const htmlContent = generateHtmlReport({
      runJson,
      metrics,
      config,
      targetName,
      targetBaseUrl,
      sanitizedHeaders,
    });

    return {
      contentType: 'text/html; charset=utf-8',
      filename: `apiforge-test-${runJson._id}.html`,
      data: htmlContent,
    };
  }

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
      configuration: {
        ...baseConfig,
        headers: redactSensitiveHeaders(baseConfig.headers),
      },
      metrics: baseMetrics,
    },
    compareRun: {
      id: compareJson._id,
      name: compareJson.name,
      status: compareJson.status,
      createdAt: compareJson.createdAt,
      target: compareJson.target || compareConfig.targetSnapshot,
      configuration: {
        ...compareConfig,
        headers: redactSensitiveHeaders(compareConfig.headers),
      },
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

/**
 * Aggregates historical performance trends across completed test runs.
 *
 * @param {string} userId - Authenticated user ID
 * @param {object} options - Query filters and limit
 * @param {string} [options.targetId] - Optional Target API ID filter
 * @param {number} [options.limit=10] - Number of runs to evaluate (2 to 50)
 * @returns {Promise<object>}
 */
export async function getPerformanceTrends(userId, { targetId, limit = 10 } = {}) {
  const query = {
    owner: userId,
    status: TEST_RUN_STATUS.COMPLETED,
  };

  if (targetId) {
    query.target = targetId;
  }

  const safeLimit = Math.min(50, Math.max(2, limit || 10));

  // Retrieve runs newest first, then reverse to chronological order for charts
  const runs = await TestRun.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .populate('target', 'name baseUrl');

  if (runs.length === 0) {
    return {
      trends: [],
      summary: {
        totalRunsAnalyzed: 0,
        avgThroughput: null,
        avgLatency: null,
        avgP95Latency: null,
        throughputDeltaPct: null,
        latencyDeltaPct: null,
        message: 'No completed test runs found to compute performance trends.',
      },
    };
  }

  // Reverse to chronological ascending order
  const chronologicalRuns = [...runs].reverse();

  let throughputSum = 0;
  let latencySum = 0;
  let p95Sum = 0;
  let validCount = 0;

  const dataPoints = chronologicalRuns.map((r) => {
    const rJson = r.toJSON();
    const m = rJson.metrics || {};
    const rps = m.requestsPerSecond != null ? m.requestsPerSecond : 0;
    const avgLat = m.avgLatency != null ? m.avgLatency : 0;
    const p95 = m.p95Latency != null ? m.p95Latency : 0;

    if (m.totalRequests && m.totalRequests > 0) {
      throughputSum += rps;
      latencySum += avgLat;
      p95Sum += p95;
      validCount++;
    }

    return {
      runId: rJson._id,
      name: rJson.name,
      createdAt: rJson.createdAt,
      targetName: rJson.target?.name || rJson.configuration?.targetSnapshot?.name || 'Target API',
      vus: rJson.configuration?.vus || 1,
      duration: rJson.configuration?.duration || 10,
      totalRequests: m.totalRequests ?? 0,
      requestsPerSecond: rps,
      avgLatency: avgLat,
      p95Latency: p95,
      failureRate: m.failureRate != null ? Number((m.failureRate * 100).toFixed(2)) : 0,
      thresholdsPassed: m.thresholdsPassed ?? null,
    };
  });

  const oldest = dataPoints[0];
  const newest = dataPoints[dataPoints.length - 1];

  let throughputDeltaPct = null;
  let latencyDeltaPct = null;

  if (oldest.requestsPerSecond > 0 && newest.requestsPerSecond != null) {
    throughputDeltaPct = Number(
      (((newest.requestsPerSecond - oldest.requestsPerSecond) / oldest.requestsPerSecond) * 100).toFixed(2)
    );
  }

  if (oldest.avgLatency > 0 && newest.avgLatency != null) {
    latencyDeltaPct = Number(
      (((newest.avgLatency - oldest.avgLatency) / oldest.avgLatency) * 100).toFixed(2)
    );
  }

  return {
    trends: dataPoints,
    summary: {
      totalRunsAnalyzed: dataPoints.length,
      avgThroughput: validCount > 0 ? Number((throughputSum / validCount).toFixed(2)) : null,
      avgLatency: validCount > 0 ? Number((latencySum / validCount).toFixed(2)) : null,
      avgP95Latency: validCount > 0 ? Number((p95Sum / validCount).toFixed(2)) : null,
      throughputDeltaPct,
      latencyDeltaPct,
    },
  };
}

export default {
  getResultByRunId,
  getDashboardSummary,
  buildPercentilesBreakdown,
  buildStatusCodeDistribution,
  buildWorkloadTimeline,
  evaluateThresholds,
  exportResult,
  generateHtmlReport,
  getPerformanceTrends,
  compareTestRuns,
};

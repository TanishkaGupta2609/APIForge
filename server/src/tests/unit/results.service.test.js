import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildPercentilesBreakdown,
  buildStatusCodeDistribution,
  buildWorkloadTimeline,
  evaluateThresholds,
  redactSensitiveHeaders,
  calculateDelta,
  exportResult,
  compareTestRuns,
  getPerformanceTrends,
} from '../../modules/results/results.service.js';
import TestRun from '../../modules/tests/testRun.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/AppError.js';

vi.mock('../../modules/tests/testRun.model.js');

describe('Results Analytics & Chart Formatting Service Suite', () => {
  const sampleMetrics = {
    totalRequests: 500,
    successfulRequests: 485,
    failedRequests: 15,
    requestsPerSecond: 50.0,
    minLatency: 8.5,
    medianLatency: 35.0,
    avgLatency: 38.4,
    p90Latency: 52.0,
    p95Latency: 64.0,
    maxLatency: 110.0,
    failureRate: 0.03,
    networkErrors: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildPercentilesBreakdown()', () => {
    it('structures all 6 percentiles with names and latencies', () => {
      const result = buildPercentilesBreakdown(sampleMetrics);

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({ name: 'Min', label: 'Min Latency', latency: 8.5, unit: 'ms' });
      expect(result[1].name).toBe('Med');
      expect(result[1].latency).toBe(35.0);
      expect(result[2].name).toBe('Avg');
      expect(result[3].name).toBe('p90');
      expect(result[4].name).toBe('p95');
      expect(result[4].latency).toBe(64.0);
      expect(result[5].name).toBe('Max');
      expect(result[5].latency).toBe(110.0);
    });

    it('returns empty array when metrics are empty or null', () => {
      expect(buildPercentilesBreakdown(null)).toEqual([]);
      expect(buildPercentilesBreakdown({})).toEqual([]);
      expect(buildPercentilesBreakdown({ totalRequests: 0 })).toEqual([]);
    });
  });

  describe('buildStatusCodeDistribution()', () => {
    it('structures 2xx success and error slices with counts and percentages', () => {
      const result = buildStatusCodeDistribution(sampleMetrics);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('2xx Success');
      expect(result[0].count).toBe(485);
      expect(result[0].percentage).toBe(97.0);
      expect(result[0].color).toBe('#10B981');

      expect(result[1].name).toBe('4xx/5xx Errors');
      expect(result[1].count).toBe(15);
      expect(result[1].percentage).toBe(3.0);
      expect(result[1].color).toBe('#EF4444');
    });

    it('omits 0-count categories cleanly', () => {
      const perfectMetrics = {
        totalRequests: 100,
        successfulRequests: 100,
        failedRequests: 0,
      };

      const result = buildStatusCodeDistribution(perfectMetrics);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('2xx Success');
      expect(result[0].percentage).toBe(100.0);
    });

    it('returns empty array when totalRequests is 0', () => {
      expect(buildStatusCodeDistribution({ totalRequests: 0 })).toEqual([]);
    });
  });

  describe('buildWorkloadTimeline()', () => {
    it('generates timeline series with steps matching duration', () => {
      const config = { duration: 20, vus: 10, rampUpDuration: 5 };
      const timeline = buildWorkloadTimeline(config, sampleMetrics);

      expect(timeline.length).toBeGreaterThanOrEqual(3);
      expect(timeline[0]).toHaveProperty('time');
      expect(timeline[0]).toHaveProperty('vus');
      expect(timeline[0]).toHaveProperty('requestsPerSecond');
      expect(timeline[timeline.length - 1].vus).toBe(10);
    });
  });

  describe('evaluateThresholds()', () => {
    it('returns allPassed: true when metrics meet latency and failure rate thresholds', () => {
      const thresholds = {
        httpReqDurationP95: 100, // actual is 64.0 -> pass
        httpReqFailedRate: 0.05, // actual is 0.03 -> pass
      };

      const evaluation = evaluateThresholds(thresholds, sampleMetrics);

      expect(evaluation.hasThresholds).toBe(true);
      expect(evaluation.allPassed).toBe(true);
      expect(evaluation.rules).toHaveLength(2);
      expect(evaluation.rules[0].passed).toBe(true);
      expect(evaluation.rules[1].passed).toBe(true);
    });

    it('returns allPassed: false when any threshold is breached', () => {
      const strictThresholds = {
        httpReqDurationP95: 50, // actual is 64.0 -> breach!
        httpReqFailedRate: 0.05,
      };

      const evaluation = evaluateThresholds(strictThresholds, sampleMetrics);

      expect(evaluation.hasThresholds).toBe(true);
      expect(evaluation.allPassed).toBe(false);
      expect(evaluation.rules[0].passed).toBe(false);
      expect(evaluation.rules[1].passed).toBe(true);
    });

    it('returns hasThresholds: false when no thresholds configured', () => {
      const evaluation = evaluateThresholds({}, sampleMetrics);
      expect(evaluation.hasThresholds).toBe(false);
      expect(evaluation.rules).toHaveLength(0);
    });
  });

  describe('redactSensitiveHeaders()', () => {
    it('redacts Authorization, Token, Password, Cookie, and API Key headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer super-secret-jwt-token',
        'X-Api-Key': 'secret-12345',
        Cookie: 'session=abcde',
        'X-Custom-Header': 'safe-value',
      };

      const redacted = redactSensitiveHeaders(headers);

      expect(redacted['Content-Type']).toBe('application/json');
      expect(redacted['Authorization']).toBe('[REDACTED]');
      expect(redacted['X-Api-Key']).toBe('[REDACTED]');
      expect(redacted['Cookie']).toBe('[REDACTED]');
      expect(redacted['X-Custom-Header']).toBe('safe-value');
    });

    it('handles Map instances and empty headers gracefully', () => {
      const headerMap = new Map([
        ['Authorization', 'Bearer token'],
        ['Accept', 'application/json'],
      ]);
      const redacted = redactSensitiveHeaders(headerMap);

      expect(redacted['Authorization']).toBe('[REDACTED]');
      expect(redacted['Accept']).toBe('application/json');
      expect(redactSensitiveHeaders(null)).toEqual({});
    });
  });

  describe('calculateDelta()', () => {
    it('calculates latency delta and marks reduction as improvement', () => {
      // Baseline 50ms, Comparison 40ms -> diff -10ms (-20%), improved!
      const delta = calculateDelta(50, 40, 'latency');
      expect(delta.diff).toBe(-10);
      expect(delta.percentChange).toBe(-20);
      expect(delta.isImprovement).toBe(true);
    });

    it('calculates latency regression correctly', () => {
      // Baseline 50ms, Comparison 65ms -> diff +15ms (+30%), regressed!
      const delta = calculateDelta(50, 65, 'latency');
      expect(delta.diff).toBe(15);
      expect(delta.percentChange).toBe(30);
      expect(delta.isImprovement).toBe(false);
    });

    it('calculates throughput delta and marks increase as improvement', () => {
      // Baseline 100 RPS, Comparison 120 RPS -> diff +20 RPS (+20%), improved!
      const delta = calculateDelta(100, 120, 'throughput');
      expect(delta.diff).toBe(20);
      expect(delta.percentChange).toBe(20);
      expect(delta.isImprovement).toBe(true);
    });

    it('handles null values and zero division safely', () => {
      expect(calculateDelta(null, 50).diff).toBeNull();
      expect(calculateDelta(0, 10, 'throughput').percentChange).toBe(0);
      expect(calculateDelta(50, 50).diff).toBe(0);
      expect(calculateDelta(50, 50).isImprovement).toBeNull();
    });
  });

  describe('exportResult()', () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const mockRunId = '507f1f77bcf86cd799439022';

    const mockRun = {
      _id: mockRunId,
      owner: mockUserId,
      name: 'API Stress Test',
      status: 'completed',
      configuration: {
        method: 'POST',
        endpoint: '/api/v1/checkout',
        vus: 10,
        duration: 15,
        headers: { Authorization: 'Bearer secret-token', 'Content-Type': 'application/json' },
      },
      metrics: sampleMetrics,
      toJSON: function () {
        return { ...this };
      },
    };

    it('exports sanitized JSON payload with redacted headers', async () => {
      TestRun.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockRun),
      });

      const result = await exportResult(mockUserId, mockRunId, 'json');

      expect(result.contentType).toBe('application/json');
      expect(result.filename).toBe(`apiforge-test-${mockRunId}.json`);

      const parsed = JSON.parse(result.data);
      expect(parsed.test_run.name).toBe('API Stress Test');
      expect(parsed.test_run.configuration.headers.Authorization).toBe('[REDACTED]');
      expect(parsed.test_run.configuration.headers['Content-Type']).toBe('application/json');
      expect(parsed.test_run.metrics.totalRequests).toBe(500);
    });

    it('exports well-formatted CSV report', async () => {
      TestRun.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockRun),
      });

      const result = await exportResult(mockUserId, mockRunId, 'csv');

      expect(result.contentType).toBe('text/csv');
      expect(result.filename).toBe(`apiforge-test-${mockRunId}.csv`);
      expect(result.data).toContain('# APIForge Load Test Performance Report');
      expect(result.data).toContain('Total Requests,500,requests');
      expect(result.data).toContain('Average Response Time,38.40,ms');
    });

    it('exports standalone, self-contained HTML performance report', async () => {
      TestRun.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockRun),
      });

      const result = await exportResult(mockUserId, mockRunId, 'html');

      expect(result.contentType).toBe('text/html; charset=utf-8');
      expect(result.filename).toBe(`apiforge-test-${mockRunId}.html`);
      expect(result.data).toContain('<!DOCTYPE html>');
      expect(result.data).toContain('APIForge');
      expect(result.data).toContain('API Stress Test');
      expect(result.data).toContain('500'); // total requests
      expect(result.data).toContain('Response Time Percentiles');
    });

    it('rejects export if user does not own test run', async () => {
      TestRun.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          ...mockRun,
          owner: 'foreign-user-id',
        }),
      });

      await expect(exportResult(mockUserId, mockRunId, 'json')).rejects.toThrow(ForbiddenError);
    });

    it('rejects export if test run does not exist', async () => {
      TestRun.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });

      await expect(exportResult(mockUserId, mockRunId, 'json')).rejects.toThrow(NotFoundError);
    });
  });

  describe('compareTestRuns()', () => {
    const mockUserId = '507f1f77bcf86cd799439011';
    const baseId = '507f1f77bcf86cd799439022';
    const compId = '507f1f77bcf86cd799439033';

    const baseRun = {
      _id: baseId,
      owner: mockUserId,
      name: 'Baseline Run',
      status: 'completed',
      configuration: {
        method: 'GET',
        endpoint: '/api/demo/ping',
        vus: 10,
        duration: 15,
        targetSnapshot: { baseUrl: 'http://localhost:5001' },
      },
      metrics: {
        totalRequests: 500,
        requestsPerSecond: 33.3,
        avgLatency: 30.0,
        medianLatency: 28.0,
        p90Latency: 45.0,
        p95Latency: 50.0,
        maxLatency: 80.0,
        failureRate: 0.02,
      },
      toJSON: function () {
        return { ...this };
      },
    };

    const compRun = {
      _id: compId,
      owner: mockUserId,
      name: 'Optimized Run',
      status: 'completed',
      configuration: {
        method: 'GET',
        endpoint: '/api/demo/ping',
        vus: 10,
        duration: 15,
        targetSnapshot: { baseUrl: 'http://localhost:5001' },
      },
      metrics: {
        totalRequests: 600,
        requestsPerSecond: 40.0,
        avgLatency: 22.0,
        medianLatency: 20.0,
        p90Latency: 32.0,
        p95Latency: 38.0,
        maxLatency: 60.0,
        failureRate: 0.0,
      },
      toJSON: function () {
        return { ...this };
      },
    };

    it('performs side-by-side comparison with high compatibility and correct deltas', async () => {
      TestRun.findById = vi
        .fn()
        .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(baseRun) })
        .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(compRun) });

      const comparison = await compareTestRuns(mockUserId, baseId, compId);

      expect(comparison.compatibility.rating).toBe('HIGH');
      expect(comparison.compatibility.isSameTarget).toBe(true);
      expect(comparison.compatibility.isSameEndpoint).toBe(true);

      // Latency improved from 30ms to 22ms -> diff -8.0, improvement true
      expect(comparison.deltas.avgLatency.diff).toBe(-8.0);
      expect(comparison.deltas.avgLatency.isImprovement).toBe(true);

      // Throughput increased from 33.3 to 40 -> diff 6.7, improvement true
      expect(comparison.deltas.requestsPerSecond.diff).toBe(6.7);
      expect(comparison.deltas.requestsPerSecond.isImprovement).toBe(true);

      // Summary text is generated
      expect(comparison.summary).toContain('Average latency improved by 8ms');
      expect(comparison.summary).toContain('throughput increased by 6.7 req/s');
    });

    it('detects moderate/low compatibility when targets or endpoints differ', async () => {
      const differentComp = {
        ...compRun,
        configuration: {
          ...compRun.configuration,
          endpoint: '/api/demo/delayed',
        },
        toJSON: function () {
          return { ...this };
        },
      };

      TestRun.findById = vi
        .fn()
        .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(baseRun) })
        .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(differentComp) });

      const comparison = await compareTestRuns(mockUserId, baseId, compId);

      expect(comparison.compatibility.rating).toBe('MODERATE');
      expect(comparison.compatibility.notes[0]).toContain('different API endpoints');
    });

    it('denies comparison if user does not own either run', async () => {
      const foreignRun = { ...compRun, owner: 'other-user' };

      TestRun.findById = vi
        .fn()
        .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(baseRun) })
        .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(foreignRun) });

      await expect(compareTestRuns(mockUserId, baseId, compId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getPerformanceTrends()', () => {
    const mockUserId = '507f1f77bcf86cd799439011';

    it('returns empty trends response when no completed runs exist', async () => {
      TestRun.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const trends = await getPerformanceTrends(mockUserId);
      expect(trends.trends).toEqual([]);
      expect(trends.summary.totalRunsAnalyzed).toBe(0);
      expect(trends.summary.avgThroughput).toBeNull();
    });

    it('aggregates trends and calculates throughput and latency deltas', async () => {
      const run1 = {
        _id: 'run-1',
        name: 'Benchmark 1',
        createdAt: new Date('2026-11-01T10:00:00Z'),
        configuration: { vus: 10, duration: 10, targetSnapshot: { name: 'Demo API' } },
        metrics: { totalRequests: 200, requestsPerSecond: 20.0, avgLatency: 50.0, p95Latency: 60.0, failureRate: 0.01 },
        toJSON: function () { return { ...this }; },
      };
      const run2 = {
        _id: 'run-2',
        name: 'Benchmark 2',
        createdAt: new Date('2026-11-02T10:00:00Z'),
        configuration: { vus: 10, duration: 10, targetSnapshot: { name: 'Demo API' } },
        metrics: { totalRequests: 300, requestsPerSecond: 30.0, avgLatency: 40.0, p95Latency: 48.0, failureRate: 0.0 },
        toJSON: function () { return { ...this }; },
      };

      // Mock returns newest first (run2, then run1)
      TestRun.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockResolvedValue([run2, run1]),
          }),
        }),
      });

      const res = await getPerformanceTrends(mockUserId, { limit: 10 });

      expect(res.trends.length).toBe(2);
      // Chronological ascending order
      expect(res.trends[0].runId).toBe('run-1');
      expect(res.trends[1].runId).toBe('run-2');

      expect(res.summary.totalRunsAnalyzed).toBe(2);
      expect(res.summary.avgThroughput).toBe(25.0);
      expect(res.summary.avgLatency).toBe(45.0);
      expect(res.summary.avgP95Latency).toBe(54.0);

      // Throughput increased from 20 to 30 -> +50%
      expect(res.summary.throughputDeltaPct).toBe(50.0);
      // Latency decreased from 50 to 40 -> -20%
      expect(res.summary.latencyDeltaPct).toBe(-20.0);
    });
  });
});

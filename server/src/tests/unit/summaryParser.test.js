import { describe, it, expect } from 'vitest';
import { parseK6Summary } from '../../load-testing/summaryParser.js';
import { ExecutionError } from '../../shared/errors/AppError.js';

describe('k6 Summary Metrics Parser Suite', () => {
  const sampleK6Summary = {
    metrics: {
      iterations: { count: 120, rate: 12.0 },
      http_reqs: { count: 120, rate: 12.0 },
      http_req_failed: { passes: 6, fails: 114, value: 0.05 },
      http_req_duration: {
        avg: 45.2,
        min: 12.1,
        med: 42.0,
        max: 130.5,
        'p(90)': 65.4,
        'p(95)': 82.1,
      },
      data_sent: { count: 15420, rate: 1542.0 },
      data_received: { count: 85400, rate: 8540.0 },
    },
  };

  it('correctly normalizes valid k6 summary object', () => {
    const result = parseK6Summary(sampleK6Summary);

    expect(result.totalRequests).toBe(120);
    expect(result.successfulRequests).toBe(114);
    expect(result.failedRequests).toBe(6);
    expect(result.requestsPerSecond).toBe(12.0);
    expect(result.avgLatency).toBe(45.2);
    expect(result.medianLatency).toBe(42.0);
    expect(result.p90Latency).toBe(65.4);
    expect(result.p95Latency).toBe(82.1);
    expect(result.maxLatency).toBe(130.5);
    expect(result.failureRate).toBe(0.05);
    expect(result.networkErrors).toBe(0);
    expect(result.statusCodeCounts).toEqual({
      '200': 114,
      '500': 6,
    });
  });

  it('correctly parses valid JSON string input', () => {
    const jsonStr = JSON.stringify(sampleK6Summary);
    const result = parseK6Summary(jsonStr);

    expect(result.totalRequests).toBe(120);
    expect(result.avgLatency).toBe(45.2);
  });

  it('handles summary where 0 requests were executed (immediate connection failure)', () => {
    const zeroReqSummary = {
      metrics: {
        iterations: { count: 1, rate: 1.0 },
        http_reqs: { count: 0, rate: 0 },
        http_req_failed: { passes: 0, fails: 0, value: 0 },
        http_req_duration: { avg: 0, min: 0, med: 0, max: 0, 'p(90)': 0, 'p(95)': 0 },
      },
    };

    const result = parseK6Summary(zeroReqSummary);

    expect(result.totalRequests).toBe(0);
    expect(result.successfulRequests).toBe(0);
    expect(result.avgLatency).toBeNull();
    expect(result.medianLatency).toBeNull();
    expect(result.p95Latency).toBeNull();
    expect(result.networkErrors).toBeGreaterThanOrEqual(1);
  });

  it('throws ExecutionError when rawInput is empty or null', () => {
    expect(() => parseK6Summary('')).toThrow(ExecutionError);
    expect(() => parseK6Summary(null)).toThrow(ExecutionError);
  });

  it('throws ExecutionError on malformed JSON string', () => {
    expect(() => parseK6Summary('{ invalid: json')).toThrow(ExecutionError);
  });

  it('throws ExecutionError when summary is missing metrics object', () => {
    expect(() => parseK6Summary({})).toThrow(ExecutionError);
    expect(() => parseK6Summary({ other: true })).toThrow(ExecutionError);
  });
});


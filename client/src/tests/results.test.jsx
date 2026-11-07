import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ResultsPage from '../features/results/ResultsPage.jsx';
import resultService from '../services/resultService.js';
import { AuthProvider } from '../context/AuthContext.jsx';

// Mock Recharts ResponsiveContainer for jsdom test environment
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div className="recharts-responsive-container" style={{ width: '100%', height: 300 }}>
        {children}
      </div>
    ),
  };
});

describe('Frontend ResultsPage Component & Visualizations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCompletedResult = {
    testRun: {
      id: 'r_mock_1',
      _id: 'r_mock_1',
      name: 'Auth Gateway Stress Test',
      status: 'completed',
      isSimulated: false,
      startTime: '2026-11-07T10:00:00.000Z',
      endTime: '2026-11-07T10:00:15.000Z',
      actualDurationMs: 15000,
      createdAt: '2026-11-07T10:00:00.000Z',
    },
    target: {
      name: 'Production Auth Gateway',
      baseUrl: 'http://localhost:5001',
    },
    configuration: {
      method: 'POST',
      endpoint: '/api/demo/ping',
      vus: 10,
      duration: 15,
      rampUpDuration: 5,
      headers: { 'X-Test': 'Suite' },
      body: '{"action":"login"}',
      thresholds: {
        httpReqDurationP95: 100,
        httpReqFailedRate: 0.05,
      },
    },
    metrics: {
      totalRequests: 800,
      successfulRequests: 792,
      failedRequests: 8,
      requestsPerSecond: 53.3,
      avgLatency: 35.4,
      medianLatency: 32.1,
      p90Latency: 55.0,
      p95Latency: 72.8,
      maxLatency: 120.0,
      failureRate: 0.01,
      networkErrors: 0,
    },
    charts: {
      percentiles: [
        { name: 'Min', latency: 10.0 },
        { name: 'Med', latency: 32.1 },
        { name: 'Avg', latency: 35.4 },
        { name: 'p90', latency: 55.0 },
        { name: 'p95', latency: 72.8 },
        { name: 'Max', latency: 120.0 },
      ],
      statusCodes: [
        { name: '2xx Success', count: 792, percentage: 99.0, color: '#10B981' },
        { name: '4xx/5xx Errors', count: 8, percentage: 1.0, color: '#EF4444' },
      ],
      timeline: [
        { time: '5s', vus: 10, requestsPerSecond: 50.0 },
        { time: '10s', vus: 10, requestsPerSecond: 55.0 },
        { time: '15s', vus: 10, requestsPerSecond: 53.3 },
      ],
    },
    thresholds: {
      hasThresholds: true,
      allPassed: true,
      rules: [
        { metric: 'p95 Response Time', target: '< 100ms', actual: '72.8ms', passed: true },
        { metric: 'Failure Rate', target: '<= 5.0%', actual: '1.0%', passed: true },
      ],
    },
  };

  it('renders complete results dashboard with metric cards and badges for completed test', async () => {
    vi.spyOn(resultService, 'getResultByRunId').mockResolvedValueOnce(mockCompletedResult);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/results/r_mock_1']}>
          <Routes>
            <Route path="/results/:runId" element={<ResultsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Auth Gateway Stress Test')).toBeInTheDocument();
      expect(screen.getByText('Real k6 Engine')).toBeInTheDocument();
      expect(screen.getByText('http://localhost:5001/api/demo/ping')).toBeInTheDocument();
      expect(screen.getByText('800')).toBeInTheDocument(); // Total requests
      expect(screen.getByText('53.3')).toBeInTheDocument(); // Throughput
      expect(screen.getByText('35.4ms')).toBeInTheDocument(); // Avg latency
      expect(screen.getByText('72.8ms')).toBeInTheDocument(); // P95 latency
      expect(screen.getByText('1.00%')).toBeInTheDocument(); // Failure rate
      expect(screen.getByText('Threshold SLA Validation')).toBeInTheDocument();
      expect(screen.getByText('All Thresholds Passed')).toBeInTheDocument();
    });
  });

  it('renders failure alert when test run has failed status', async () => {
    const mockFailedResult = {
      testRun: {
        id: 'r_fail_1',
        name: 'Unreachable Node Test',
        status: 'failed',
        error: {
          category: 'TARGET_UNREACHABLE',
          message: 'Could not connect to target API. Check host and port accessibility.',
        },
      },
      target: { name: 'Dead Endpoint', baseUrl: 'http://localhost:59999' },
      configuration: { method: 'GET', endpoint: '/probe', vus: 1, duration: 5 },
      metrics: { totalRequests: 0, networkErrors: 1 },
      charts: { percentiles: [], statusCodes: [], timeline: [] },
      thresholds: { hasThresholds: false, rules: [] },
    };

    vi.spyOn(resultService, 'getResultByRunId').mockResolvedValueOnce(mockFailedResult);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/results/r_fail_1']}>
          <Routes>
            <Route path="/results/:runId" element={<ResultsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Unreachable Node Test')).toBeInTheDocument();
      expect(screen.getByText(/Execution Aborted: TARGET_UNREACHABLE/i)).toBeInTheDocument();
      expect(screen.getByText(/Could not connect to target API/i)).toBeInTheDocument();
    });
  });

  it('renders error state and back button when result retrieval fails', async () => {
    vi.spyOn(resultService, 'getResultByRunId').mockRejectedValueOnce(
      new Error('Test run results not found.')
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/results/non_existent']}>
          <Routes>
            <Route path="/results/:runId" element={<ResultsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test run results not found.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to load tests/i })).toBeInTheDocument();
    });
  });
});

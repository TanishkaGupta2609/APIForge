import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ComparePage from '../features/results/ComparePage.jsx';
import resultService from '../services/resultService.js';
import historyService from '../services/historyService.js';
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

describe('Frontend ComparePage Component & Delta Analytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCompletedRuns = [
    {
      _id: 'run_base_1',
      id: 'run_base_1',
      name: 'Baseline V1 Test',
      status: 'completed',
      createdAt: '2026-11-05T10:00:00.000Z',
      configuration: { vus: 10, duration: 15 },
    },
    {
      _id: 'run_comp_2',
      id: 'run_comp_2',
      name: 'Optimized V2 Test',
      status: 'completed',
      createdAt: '2026-11-06T12:00:00.000Z',
      configuration: { vus: 10, duration: 15 },
    },
  ];

  const mockComparisonResult = {
    baseRun: {
      id: 'run_base_1',
      name: 'Baseline V1 Test',
      status: 'completed',
      createdAt: '2026-11-05T10:00:00.000Z',
      target: { name: 'Demo API', baseUrl: 'http://localhost:5001' },
      configuration: { method: 'GET', endpoint: '/api/demo/ping', vus: 10, duration: 15 },
      metrics: {
        totalRequests: 400,
        requestsPerSecond: 26.6,
        avgLatency: 35.0,
        p95Latency: 55.0,
        failureRate: 0.02,
      },
    },
    compareRun: {
      id: 'run_comp_2',
      name: 'Optimized V2 Test',
      status: 'completed',
      createdAt: '2026-11-06T12:00:00.000Z',
      target: { name: 'Demo API', baseUrl: 'http://localhost:5001' },
      configuration: { method: 'GET', endpoint: '/api/demo/ping', vus: 10, duration: 15 },
      metrics: {
        totalRequests: 500,
        requestsPerSecond: 33.3,
        avgLatency: 28.0,
        p95Latency: 42.0,
        failureRate: 0.0,
      },
    },
    compatibility: {
      rating: 'HIGH',
      isSameTarget: true,
      isSameEndpoint: true,
      isSameMethod: true,
      notes: ['Workload, target endpoint, and test configuration are fully compatible.'],
    },
    deltas: {
      avgLatency: { base: 35.0, compare: 28.0, diff: -7.0, percentChange: -20.0, isImprovement: true },
      p95Latency: { base: 55.0, compare: 42.0, diff: -13.0, percentChange: -23.6, isImprovement: true },
      requestsPerSecond: { base: 26.6, compare: 33.3, diff: 6.7, percentChange: 25.1, isImprovement: true },
      failureRate: { base: 0.02, compare: 0.0, diff: -0.02, percentChange: -100.0, isImprovement: true },
    },
    summary: 'Average latency improved by 7ms (-20%); throughput increased by 6.7 req/s (+25.1%)',
  };

  const renderWithProviders = (ui, initialEntries = ['/compare']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders comparison page, selects runs, and displays comparative metrics', async () => {
    vi.spyOn(historyService, 'getTestHistory').mockResolvedValue({
      testRuns: mockCompletedRuns,
    });
    const compareSpy = vi.spyOn(resultService, 'compareRuns').mockResolvedValue(mockComparisonResult);

    renderWithProviders(<ComparePage />, ['/compare?baseRunId=run_base_1&compareRunId=run_comp_2']);

    expect(screen.getByRole('heading', { name: 'Test Run Comparison', level: 1 })).toBeInTheDocument();

    await waitFor(() => {
      expect(compareSpy).toHaveBeenCalledWith('run_base_1', 'run_comp_2');
      expect(screen.getByText('HIGH Compatibility')).toBeInTheDocument();
      expect(screen.getByText(/Average latency improved by 7ms/i)).toBeInTheDocument();
    });

    // Check delta pills
    expect(screen.getByText('-7ms (-20%)')).toBeInTheDocument();
    expect(screen.getByText('+6.7 req/s (+25.1%)')).toBeInTheDocument();

    // Check baseline and comparison cards
    expect(screen.getByText('Baseline: Baseline V1 Test')).toBeInTheDocument();
    expect(screen.getByText('Comparison: Optimized V2 Test')).toBeInTheDocument();
  });

  it('swaps baseline and comparison runs when swap button is clicked', async () => {
    vi.spyOn(historyService, 'getTestHistory').mockResolvedValue({
      testRuns: mockCompletedRuns,
    });
    const compareSpy = vi.spyOn(resultService, 'compareRuns').mockResolvedValue(mockComparisonResult);

    renderWithProviders(<ComparePage />, ['/compare?baseRunId=run_base_1&compareRunId=run_comp_2']);

    await waitFor(() => {
      expect(compareSpy).toHaveBeenCalledWith('run_base_1', 'run_comp_2');
    });

    const swapButton = screen.getByTitle('Swap baseline and comparison');
    fireEvent.click(swapButton);

    await waitFor(() => {
      expect(compareSpy).toHaveBeenCalledWith('run_comp_2', 'run_base_1');
    });
  });

  it('displays helpful prompt when no runs are selected', async () => {
    vi.spyOn(historyService, 'getTestHistory').mockResolvedValue({
      testRuns: [],
    });

    renderWithProviders(<ComparePage />, ['/compare']);

    await waitFor(() => {
      expect(screen.getByText('Select two test runs to compare')).toBeInTheDocument();
    });
  });
});


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TestRunsPage from '../features/tests/TestRunsPage.jsx';
import testService from '../services/testService.js';
import targetService from '../services/targetService.js';
import { AuthProvider } from '../context/AuthContext.jsx';

describe('Frontend TestRunsPage Component & Lifecycle Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(targetService, 'getTargets').mockResolvedValue([
      {
        id: 't1',
        _id: 't1',
        name: 'Demo Benchmark API',
        baseUrl: 'http://localhost:5001',
      },
    ]);
  });

  it('renders test run cards and metrics when test runs are loaded', async () => {
    vi.spyOn(testService, 'getTestRuns').mockResolvedValue({
      testRuns: [
        {
          _id: 'r1',
          name: 'Checkout Peak Spike Test',
          status: 'completed',
          configuration: {
            method: 'POST',
            endpoint: '/v1/charge',
            vus: 20,
            duration: 30,
            rampUpDuration: 5,
            targetSnapshot: { name: 'Demo Benchmark API', baseUrl: 'http://localhost:5001' },
          },
          progress: { percent: 100, stage: 'Completed', message: 'Test run finished successfully' },
          metrics: {
            totalRequests: 2400,
            requestsPerSecond: 80,
            avgLatency: 42.5,
            p95Latency: 75.0,
          },
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1 },
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <TestRunsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getAllByText(/Load Tests & Execution Lifecycle/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('Checkout Peak Spike Test')).toBeInTheDocument();
      expect(screen.getByText(/http:\/\/localhost:5001\/v1\/charge/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Completed/i).length).toBeGreaterThan(0);
      expect(screen.getByText('2,400')).toBeInTheDocument();
      expect(screen.getByText(/80 req\/s/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no test runs exist', async () => {
    vi.spyOn(testService, 'getTestRuns').mockResolvedValueOnce({
      testRuns: [],
      pagination: { total: 0 },
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <TestRunsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Load Tests Found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /configure first test/i })).toBeInTheDocument();
    });
  });

  it('opens test configuration modal with inputs and workload sliders', async () => {
    vi.spyOn(testService, 'getTestRuns').mockResolvedValueOnce({
      testRuns: [],
      pagination: { total: 0 },
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <TestRunsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Load Tests Found')).toBeInTheDocument();
    });

    const configBtn = screen.getByRole('button', { name: /configure new test/i });
    fireEvent.click(configBtn);

    expect(screen.getByText('Configure New Load Test')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Checkout Peak Spike')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /queue & launch test/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fill demo preset/i })).toBeInTheDocument();
  });

  it('triggers simulation execution when Simulate Lifecycle Run is clicked on queued run', async () => {
    vi.spyOn(testService, 'getTestRuns').mockResolvedValueOnce({
      testRuns: [
        {
          _id: 'r_sim',
          name: 'Stage 6 Lifecycle Verify',
          status: 'queued',
          configuration: {
            method: 'GET',
            endpoint: '/api/demo/ping',
            vus: 10,
            duration: 15,
            rampUpDuration: 0,
            targetSnapshot: { name: 'Demo API', baseUrl: 'http://localhost:5001' },
          },
          progress: { percent: 0, stage: 'Queued', message: 'Test scheduled' },
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1 },
    });

    const simSpy = vi.spyOn(testService, 'simulateLifecycleRun').mockResolvedValueOnce({
      _id: 'r_sim',
      status: 'completed',
      isSimulated: true,
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <TestRunsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Stage 6 Lifecycle Verify')).toBeInTheDocument();
    });

    const simBtn = screen.getByRole('button', { name: /simulate lifecycle run/i });
    fireEvent.click(simBtn);

    expect(simSpy).toHaveBeenCalledWith('r_sim');
  });

  it('opens cancellation dialog and permits user abort', async () => {
    vi.spyOn(testService, 'getTestRuns').mockResolvedValueOnce({
      testRuns: [
        {
          _id: 'r_cancel',
          name: 'Running Workload',
          status: 'running',
          configuration: {
            method: 'GET',
            endpoint: '/api/demo/ping',
            vus: 15,
            duration: 60,
            targetSnapshot: { name: 'Demo API', baseUrl: 'http://localhost:5001' },
          },
          progress: { percent: 40, stage: 'Workload Executing', message: 'Generating traffic' },
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { total: 1 },
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <TestRunsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Running Workload')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /cancel run/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByText('Confirm Test Run Cancellation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm abort/i })).toBeInTheDocument();
  });
});

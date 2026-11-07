import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HistoryPage from '../features/history/HistoryPage.jsx';
import historyService from '../services/historyService.js';
import targetService from '../services/targetService.js';
import { AuthProvider } from '../context/AuthContext.jsx';

describe('Frontend HistoryPage Component & Filtering Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockStats = {
    total: 3,
    completed: 2,
    failed: 1,
    cancelled: 0,
    running: 0,
    queued: 0,
  };

  const mockTestRuns = [
    {
      _id: 'run_101',
      id: 'run_101',
      name: 'Alpha Checkout Test',
      status: 'completed',
      isSimulated: false,
      createdAt: '2026-11-05T10:00:00.000Z',
      target: { name: 'Demo API', baseUrl: 'http://localhost:5001' },
      configuration: {
        method: 'GET',
        endpoint: '/api/demo/ping',
        vus: 10,
        duration: 15,
      },
      metrics: {
        totalRequests: 500,
        requestsPerSecond: 33.3,
        avgLatency: 24.5,
        failureRate: 0,
      },
    },
    {
      _id: 'run_102',
      id: 'run_102',
      name: 'Beta Fault Spike',
      status: 'failed',
      isSimulated: false,
      createdAt: '2026-11-06T12:00:00.000Z',
      target: { name: 'Demo API', baseUrl: 'http://localhost:5001' },
      configuration: {
        method: 'POST',
        endpoint: '/api/demo/error',
        vus: 20,
        duration: 30,
      },
      metrics: {
        totalRequests: 200,
        requestsPerSecond: 10.0,
        avgLatency: 45.2,
        failureRate: 0.8,
      },
    },
  ];

  const mockTargets = [
    { _id: 'target_1', id: 'target_1', name: 'Demo API', baseUrl: 'http://localhost:5001' },
  ];

  const renderWithProviders = (ui) => {
    return render(
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders history overview with summary cards and test execution rows', async () => {
    vi.spyOn(historyService, 'getTestHistory').mockResolvedValue({
      testRuns: mockTestRuns,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    vi.spyOn(historyService, 'getHistoryStats').mockResolvedValue(mockStats);
    vi.spyOn(targetService, 'getTargets').mockResolvedValue({ targets: mockTargets });

    renderWithProviders(<HistoryPage />);

    expect(screen.getByRole('heading', { name: 'Test History', level: 1 })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Total Executions')).toBeInTheDocument();
      expect(screen.getByText('Alpha Checkout Test')).toBeInTheDocument();
      expect(screen.getByText('Beta Fault Spike')).toBeInTheDocument();
    });

    // Verify metrics rendered
    expect(screen.getByText('24.5ms')).toBeInTheDocument();
    expect(screen.getByText('33.3 req/s')).toBeInTheDocument();
  });

  it('filters test runs when typing in search input', async () => {
    const getTestHistorySpy = vi.spyOn(historyService, 'getTestHistory').mockResolvedValue({
      testRuns: [mockTestRuns[0]],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
    vi.spyOn(historyService, 'getHistoryStats').mockResolvedValue(mockStats);
    vi.spyOn(targetService, 'getTargets').mockResolvedValue({ targets: mockTargets });

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Checkout Test')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by test name or endpoint...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    await waitFor(
      () => {
        expect(getTestHistorySpy).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Alpha',
          })
        );
      },
      { timeout: 1000 }
    );
  });

  it('triggers safe rerun modal and executes rerun action successfully', async () => {
    vi.spyOn(historyService, 'getTestHistory').mockResolvedValue({
      testRuns: mockTestRuns,
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });
    vi.spyOn(historyService, 'getHistoryStats').mockResolvedValue(mockStats);
    vi.spyOn(targetService, 'getTargets').mockResolvedValue({ targets: mockTargets });
    const rerunSpy = vi.spyOn(historyService, 'rerunTest').mockResolvedValue({
      _id: 'run_new_1',
      name: 'Alpha Checkout Test (Rerun)',
      status: 'queued',
    });

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Alpha Checkout Test')).toBeInTheDocument();
    });

    // Click safe re-run button (title="Clone and re-run this configuration")
    const rerunButtons = screen.getAllByTitle('Clone and re-run this configuration');
    fireEvent.click(rerunButtons[0]);

    // Modal opens
    expect(screen.getByText('Confirm Safe Re-run')).toBeInTheDocument();
    expect(screen.getByText('Queue Rerun')).toBeInTheDocument();

    // Confirm rerun
    fireEvent.click(screen.getByText('Queue Rerun'));

    await waitFor(() => {
      expect(rerunSpy).toHaveBeenCalledWith('run_101');
      expect(screen.getByText(/Successfully cloned test run!/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no test runs match filter criteria', async () => {
    vi.spyOn(historyService, 'getTestHistory').mockResolvedValue({
      testRuns: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    vi.spyOn(historyService, 'getHistoryStats').mockResolvedValue({ total: 0 });
    vi.spyOn(targetService, 'getTargets').mockResolvedValue({ targets: [] });

    renderWithProviders(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('No execution history yet')).toBeInTheDocument();
      expect(screen.getByText('Configure New Test')).toBeInTheDocument();
    });
  });
});


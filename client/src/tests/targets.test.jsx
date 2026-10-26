import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TargetsPage from '../features/targets/TargetsPage.jsx';
import targetService from '../services/targetService.js';
import { AuthProvider } from '../context/AuthContext.jsx';

describe('Frontend TargetsPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders target cards when targets are loaded', async () => {
    vi.spyOn(targetService, 'getTargets').mockResolvedValueOnce([
      {
        id: 't1',
        name: 'Stripe Gateway Microservice',
        baseUrl: 'https://api.stripe.com',
        description: 'Primary billing API',
        defaultHeaders: [{ key: 'X-App', value: 'APIForge', isSecret: false }],
        lastHealthCheck: { status: 'online', latencyMs: 38, statusCode: 200 },
      },
    ]);

    render(
      <AuthProvider>
        <MemoryRouter>
          <TargetsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getAllByText('Target APIs').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('Stripe Gateway Microservice')).toBeInTheDocument();
      expect(screen.getByText('https://api.stripe.com')).toBeInTheDocument();
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no targets exist', async () => {
    vi.spyOn(targetService, 'getTargets').mockResolvedValueOnce([]);

    render(
      <AuthProvider>
        <MemoryRouter>
          <TargetsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No targets registered')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register new target/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /load demo api target/i })).toBeInTheDocument();
    });
  });

  it('opens registration modal when Register Target button is clicked', async () => {
    vi.spyOn(targetService, 'getTargets').mockResolvedValueOnce([]);

    render(
      <AuthProvider>
        <MemoryRouter>
          <TargetsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No targets registered')).toBeInTheDocument();
    });

    const registerBtn = screen.getByRole('button', { name: /register target/i });
    fireEvent.click(registerBtn);

    expect(screen.getByPlaceholderText('e.g. Payments Gateway Microservice')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://api.yourdomain.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save target/i })).toBeInTheDocument();
  });

  it('invokes target health probe when Check Health is clicked', async () => {
    vi.spyOn(targetService, 'getTargets').mockResolvedValueOnce([
      {
        id: 't1',
        name: 'Demo API',
        baseUrl: 'http://localhost:5001',
        description: 'Sandbox API',
        lastHealthCheck: { status: 'unknown' },
      },
    ]);

    const probeSpy = vi.spyOn(targetService, 'probeTargetHealth').mockResolvedValueOnce({
      status: 'online',
      statusCode: 200,
      latencyMs: 15,
      checkedAt: new Date().toISOString(),
      message: 'HTTP 200 OK',
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <TargetsPage />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Demo API')).toBeInTheDocument();
    });

    const checkHealthBtn = screen.getByRole('button', { name: /check health/i });
    fireEvent.click(checkHealthBtn);

    expect(probeSpy).toHaveBeenCalledWith('t1');

    await waitFor(() => {
      expect(screen.getByText(/Online \(15ms\)/i)).toBeInTheDocument();
    });
  });
});

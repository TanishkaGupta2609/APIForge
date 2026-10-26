import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DemoPage from '../features/demo/DemoPage.jsx';
import demoService from '../services/demoService.js';
import { AuthProvider } from '../context/AuthContext.jsx';

describe('Frontend DemoPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all 4 demo scenario cards and port banner', async () => {
    vi.spyOn(demoService, 'ping').mockResolvedValue({
      pong: true,
      latencyMs: 12,
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <DemoPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getAllByText('Demo API Sandbox').length).toBeGreaterThan(0);
    expect(screen.getByText('Baseline Benchmark')).toBeInTheDocument();
    expect(screen.getByText('Simulated Server Latency')).toBeInTheDocument();
    expect(screen.getByText('Controlled Fault Injection')).toBeInTheDocument();
    expect(screen.getByText('Rate Limit Throttling')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
    });
  });

  it('executes baseline ping and displays response latency', async () => {
    vi.spyOn(demoService, 'ping').mockResolvedValue({
      pong: true,
      server: 'APIForge-Demo-Sandbox',
      latencyMs: 8,
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <DemoPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const pingBtn = screen.getByRole('button', { name: /send baseline request/i });
    fireEvent.click(pingBtn);

    await waitFor(() => {
      expect(screen.getByText(/STATUS: 200 OK/i)).toBeInTheDocument();
      expect(screen.getByText(/8ms roundtrip/i)).toBeInTheDocument();
    });
  });

  it('triggers artificial latency scenario and displays observed delay', async () => {
    vi.spyOn(demoService, 'ping').mockResolvedValue({ pong: true, latencyMs: 5 });
    const delaySpy = vi.spyOn(demoService, 'testDelayed').mockResolvedValueOnce({
      simulatedDelayMs: 250,
      actualDelayMs: 254,
      latencyMs: 260,
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <DemoPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const delayedBtn = screen.getByRole('button', { name: /send delayed request/i });
    fireEvent.click(delayedBtn);

    expect(delaySpy).toHaveBeenCalledWith(250);

    await waitFor(() => {
      expect(screen.getByText(/DELAYED RESPONSE/i)).toBeInTheDocument();
      expect(screen.getByText(/260ms elapsed/i)).toBeInTheDocument();
    });
  });

  it('triggers error injection scenario and shows formatted status', async () => {
    vi.spyOn(demoService, 'ping').mockResolvedValue({ pong: true, latencyMs: 5 });
    vi.spyOn(demoService, 'testError').mockResolvedValueOnce({
      success: false,
      statusCode: 500,
      error: { code: 'DEMO_SIMULATED_HTTP_500', message: 'Simulated error' },
      latencyMs: 14,
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <DemoPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const errorBtn = screen.getByRole('button', { name: /trigger injected error/i });
    fireEvent.click(errorBtn);

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument();
    });
  });
});

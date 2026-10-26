import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App.jsx';

describe('App Component', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: { status: 'healthy' } }),
      })
    ));
  });

  it('renders the brand title and product tagline', async () => {
    render(<App />);
    expect(screen.getByText('APIForge')).toBeInTheDocument();
    expect(screen.getByText(/Real Load Testing/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/ONLINE/i)).toBeInTheDocument();
    });
  });

  it('renders stage 0 indicator badge', async () => {
    render(<App />);
    expect(screen.getByText(/Stage 0 Verified/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/ONLINE/i)).toBeInTheDocument();
    });
  });
});

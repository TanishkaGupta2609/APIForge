import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App.jsx';

describe('App Component and Main Entry', () => {
  it('renders landing page with platform branding and hero content', async () => {
    render(<App />);

    expect(screen.getAllByText('APIForge').length).toBeGreaterThan(0);
    expect(screen.getByText(/Stress-Test APIs with/i)).toBeInTheDocument();
    expect(screen.getByText(/Real Workloads/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/online/i).length).toBeGreaterThan(0);
    });
  });

  it('renders primary call to action button to launch dashboard', async () => {
    render(<App />);
    const ctaButtons = screen.getAllByRole('link', { name: /launch dashboard/i });
    expect(ctaButtons.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByText(/online/i).length).toBeGreaterThan(0);
    });
  });
});

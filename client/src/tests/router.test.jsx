import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../app/router.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';

const createTestRouter = (initialEntries) =>
  createMemoryRouter(routes, {
    initialEntries,
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  });

const renderWithAuth = (router) =>
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );

describe('Client Router Navigation Behavior', () => {
  it('navigates to /dashboard and renders performance overview', async () => {
    const memoryRouter = createTestRouter(['/dashboard']);
    renderWithAuth(memoryRouter);

    expect(screen.getByText('Performance Overview')).toBeInTheDocument();
    expect(screen.getByText('Saved Targets')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/online/i).length).toBeGreaterThan(0);
    });
  });

  it('navigates to /targets and renders target management view', async () => {
    const memoryRouter = createTestRouter(['/targets']);
    renderWithAuth(memoryRouter);

    expect(screen.getByText('Registered Targets')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/online/i).length).toBeGreaterThan(0);
    });
  });

  it('navigates to /demo and renders demo sandbox', async () => {
    const memoryRouter = createTestRouter(['/demo']);
    renderWithAuth(memoryRouter);

    expect(screen.getAllByText('Demo API Sandbox').length).toBeGreaterThan(0);
    expect(screen.getByText('/api/demo/ping')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/online/i).length).toBeGreaterThan(0);
    });
  });

  it('navigates to /login and renders authentication form', () => {
    const memoryRouter = createTestRouter(['/login']);
    renderWithAuth(memoryRouter);

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('navigates to unknown route and renders 404 page', () => {
    const memoryRouter = createTestRouter(['/non-existent-route']);
    renderWithAuth(memoryRouter);

    expect(screen.getByText(/404 — Page Not Found/i)).toBeInTheDocument();
    expect(screen.getByText(/Route Does Not Exist/i)).toBeInTheDocument();
  });
});

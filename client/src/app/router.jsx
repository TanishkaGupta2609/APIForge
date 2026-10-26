import { createBrowserRouter } from 'react-router-dom';
import LandingPage from '../features/landing/LandingPage.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import TargetsPage from '../features/targets/TargetsPage.jsx';
import TestRunsPage from '../features/tests/TestRunsPage.jsx';
import HistoryPage from '../features/history/HistoryPage.jsx';
import DemoPage from '../features/demo/DemoPage.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import RegisterPage from '../features/auth/RegisterPage.jsx';
import NotFoundPage from '../features/NotFoundPage.jsx';

export const routes = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/targets',
    element: <TargetsPage />,
  },
  {
    path: '/tests',
    element: <TestRunsPage />,
  },
  {
    path: '/history',
    element: <HistoryPage />,
  },
  {
    path: '/demo',
    element: <DemoPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

export default router;

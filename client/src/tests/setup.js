import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock apiClient default GET responses for health check in tests
vi.mock('../services/apiClient.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn().mockImplementation((url) => {
        if (url === '/health') {
          return Promise.resolve({
            success: true,
            data: { status: 'healthy', database: 'connected' },
            message: 'Mock health check',
          });
        }
        return Promise.resolve({ success: true, data: {} });
      }),
      post: vi.fn().mockResolvedValue({ success: true, data: {} }),
      put: vi.fn().mockResolvedValue({ success: true, data: {} }),
      delete: vi.fn().mockResolvedValue({ success: true, data: {} }),
      interceptors: actual.default.interceptors,
      defaults: actual.default.defaults,
    },
  };
});

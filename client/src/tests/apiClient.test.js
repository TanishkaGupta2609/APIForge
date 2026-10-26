import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import apiClient from '../services/apiClient.js';

describe('Centralized apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('has configured baseURL pointing to API', () => {
    expect(apiClient.defaults.baseURL).toContain('/api');
  });

  it('intercepts request to inject Bearer token from localStorage', async () => {
    localStorage.setItem('apiforge_token', 'test_jwt_token_sample');

    // Run the request interceptor manually
    const config = { headers: {} };
    const interceptedConfig = await apiClient.interceptors.request.handlers[0].fulfilled(config);

    expect(interceptedConfig.headers.Authorization).toBe('Bearer test_jwt_token_sample');
  });

  it('normalizes API error responses into clean structured payloads', async () => {
    const mockAxiosError = {
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid target URL',
            details: [{ field: 'url', message: 'Must be a valid URL' }],
          },
        },
      },
    };

    const errorHandler = apiClient.interceptors.response.handlers[0].rejected;

    await expect(errorHandler(mockAxiosError)).rejects.toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Invalid target URL',
      details: [{ field: 'url', message: 'Must be a valid URL' }],
      status: 400,
    });
  });

  it('normalizes network failure into structured payload with status 0', async () => {
    const mockNetworkError = {
      code: 'ERR_NETWORK',
      message: 'Network Error',
    };

    const errorHandler = apiClient.interceptors.response.handlers[0].rejected;

    await expect(errorHandler(mockNetworkError)).rejects.toEqual({
      code: 'ERR_NETWORK',
      message: 'Network Error',
      details: [],
      status: 0,
    });
  });
});

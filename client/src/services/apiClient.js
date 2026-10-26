import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('apiforge_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // In SSR or restricted environments, localStorage may not be available
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standardize API responses & errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorPayload = error.response?.data?.error || {
      code: error.code || 'NETWORK_ERROR',
      message: error.message || 'Network request failed. Is the API server running?',
      details: [],
    };

    // Attach HTTP status code if available
    errorPayload.status = error.response?.status || 0;

    return Promise.reject(errorPayload);
  }
);

export default apiClient;

import apiClient from './apiClient.js';

export const TOKEN_KEY = 'apiforge_token';

/**
 * Register a new user account.
 *
 * @param {object} credentials
 * @param {string} credentials.name
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function register(credentials) {
  const response = await apiClient.post('/auth/register', credentials);
  if (response?.data?.token) {
    localStorage.setItem(TOKEN_KEY, response.data.token);
  }
  return response.data;
}

/**
 * Sign in with email and password.
 *
 * @param {object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function login(credentials) {
  const response = await apiClient.post('/auth/login', credentials);
  if (response?.data?.token) {
    localStorage.setItem(TOKEN_KEY, response.data.token);
  }
  return response.data;
}

/**
 * Fetch current authenticated user profile.
 *
 * @returns {Promise<object>}
 */
export async function getMe() {
  const response = await apiClient.get('/auth/me');
  return response?.data?.user;
}

/**
 * Clear stored token and end session.
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Retrieve current token from localStorage.
 *
 * @returns {string|null}
 */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export default {
  register,
  login,
  getMe,
  logout,
  getToken,
  TOKEN_KEY,
};

import { apiClient, clearCsrfToken, fetchCsrfToken } from './client.js';

/**
 * Authentication API Service
 * Handles user authentication, registration, session checks, and CSRF negotiation.
 */

/**
 * Obtain a CSRF token for state-changing operations
 */
export const getCsrfToken = async () => {
  return fetchCsrfToken();
};

/**
 * Register a new user account
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ success: boolean, data: { message: string, user: Object } }>}
 */
export const registerUser = async ({ email, password }) => {
  return apiClient('/api/v1/auth/register', {
    method: 'POST',
    body: { email, password }
  });
};

/**
 * Authenticate existing user and establish persistent session
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ success: boolean, data: { message: string, user: Object } }>}
 */
export const loginUser = async ({ email, password }) => {
  const result = await apiClient('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password }
  });

  // After session regeneration on server, ensure any subsequent POST gets a fresh CSRF token
  clearCsrfToken();

  return result;
};

/**
 * Invalidate session on server and clear local CSRF state
 * @returns {Promise<{ success: boolean, data: { message: string } }>}
 */
export const logoutUser = async () => {
  try {
    return await apiClient('/api/v1/auth/logout', {
      method: 'POST'
    });
  } finally {
    clearCsrfToken();
  }
};

/**
 * Retrieve currently authenticated user's profile and session status
 * Returns user if authenticated; throws 401 if not authenticated.
 * @returns {Promise<{ success: boolean, data: { user: Object } }>}
 */
export const getCurrentUser = async () => {
  return apiClient('/api/v1/auth/me', {
    method: 'GET'
  });
};

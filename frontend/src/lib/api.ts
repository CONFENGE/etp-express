import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from './constants';
import { getNavigate } from './navigation';
import { logger } from './logger';
import { getApiErrorMessage, HTTP_ERROR_MESSAGES } from './api-errors';

/**
 * Storage key for auth persistence.
 * Must match the key used in authStore persist middleware.
 *
 * @internal Exported for testing purposes
 */
export const AUTH_STORAGE_KEY = 'auth-storage';

/**
 * Axios instance configured for httpOnly cookie-based authentication.
 *
 * @security
 * - withCredentials: true - enables browser to send/receive httpOnly cookies
 * - NO Authorization header - token is handled via cookies
 * - NO localStorage access - eliminates XSS token theft vulnerability
 *
 * The JWT token is stored in an httpOnly cookie by the backend and is
 * automatically sent with every request by the browser.
 */
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  // Enable cookies to be sent with cross-origin requests
  withCredentials: true,
});

/**
 * Fallback auth cleanup when dynamic import fails.
 * Clears localStorage and redirects to login page.
 *
 * @security This ensures auth state is always cleared on 401,
 * preventing auth loops even if dynamic import fails.
 *
 * @internal Exported for testing purposes
 */
export function fallbackAuthCleanup(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (storageError) {
    logger.error('Failed to clear localStorage', storageError);
  }
  // Force redirect to login
  window.location.href = '/login';
}

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Import dynamically to avoid circular dependency
      // Added .catch() to handle import failures and prevent auth loops
      import('../store/authStore')
        .then(({ useAuthStore }) => {
          useAuthStore.getState().clearAuth();
        })
        .catch((importError) => {
          // Fallback: clear localStorage directly and redirect
          logger.error('Failed to import authStore', importError);
          fallbackAuthCleanup();
        });
      const navigate = getNavigate();
      navigate('/login', { replace: true });
    }

    // Handle network errors
    if (!error.response) {
      logger.error('Network error', error, { url: error.config?.url });
      return Promise.reject({
        message: getApiErrorMessage(error),
      });
    }

    // Get user-friendly error message based on status code
    const statusCode = error.response.status;
    const friendlyMessage = HTTP_ERROR_MESSAGES[statusCode];

    // Extract original error data
    const errorData = error.response?.data || {};

    // Enhance error with friendly message if available
    if (friendlyMessage && typeof errorData === 'object') {
      return Promise.reject({
        ...errorData,
        message: friendlyMessage,
        originalMessage: (errorData as Record<string, unknown>).message,
      });
    }

    // Return error response
    return Promise.reject(errorData);
  },
);

export default api;

// API helper functions
export const apiHelpers = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<T>(url, { params }).then((res) => res.data),

  post: <T>(url: string, data?: unknown) =>
    api.post<T>(url, data).then((res) => res.data),

  put: <T>(url: string, data?: unknown) =>
    api.put<T>(url, data).then((res) => res.data),

  patch: <T>(url: string, data?: unknown) =>
    api.patch<T>(url, data).then((res) => res.data),

  delete: <T>(url: string) => api.delete<T>(url).then((res) => res.data),
};

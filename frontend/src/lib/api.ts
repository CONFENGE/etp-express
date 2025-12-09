import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_URL } from './constants';
import { getNavigate } from './navigation';
import { logger } from './logger';

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

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Import dynamically to avoid circular dependency
      import('../store/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().clearAuth();
      });
      const navigate = getNavigate();
      navigate('/login', { replace: true });
    }

    // Handle network errors
    if (!error.response) {
      logger.error('Network error', error, { url: error.config?.url });
      return Promise.reject({
        message: 'Erro de conexão. Verifique sua internet e tente novamente.',
      });
    }

    // Return error response
    return Promise.reject(error.response?.data || error);
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

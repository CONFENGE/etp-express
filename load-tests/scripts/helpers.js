/**
 * k6 Helper Functions
 *
 * Shared utilities for load test scripts.
 */

import http from 'k6/http';
import { check, fail } from 'k6';
import { CONFIG, ENDPOINTS } from '../config.js';

/**
 * Performs login and returns the response with session cookies.
 *
 * @param {Object} credentials - Optional custom credentials
 * @returns {Object} Login response
 */
export function login(credentials = null) {
  const creds = credentials || CONFIG.testUser;

  const payload = JSON.stringify({
    email: creds.email,
    password: creds.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(
    `${CONFIG.baseUrl}${ENDPOINTS.auth.login}`,
    payload,
    params,
  );

  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.id;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.error(`Login failed: ${response.status} - ${response.body}`);
  }

  return response;
}

/**
 * Makes an authenticated GET request.
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} jar - Cookie jar from login
 * @returns {Object} Response
 */
export function authGet(endpoint, jar) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    jar: jar,
  };

  return http.get(`${CONFIG.baseUrl}${endpoint}`, params);
}

/**
 * Makes an authenticated POST request.
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @param {Object} jar - Cookie jar from login
 * @returns {Object} Response
 */
export function authPost(endpoint, body, jar) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    jar: jar,
  };

  return http.post(
    `${CONFIG.baseUrl}${endpoint}`,
    JSON.stringify(body),
    params,
  );
}

/**
 * Makes an authenticated PATCH request.
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @param {Object} jar - Cookie jar from login
 * @returns {Object} Response
 */
export function authPatch(endpoint, body, jar) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    jar: jar,
  };

  return http.patch(
    `${CONFIG.baseUrl}${endpoint}`,
    JSON.stringify(body),
    params,
  );
}

/**
 * Makes an authenticated DELETE request.
 *
 * @param {string} endpoint - API endpoint
 * @param {Object} jar - Cookie jar from login
 * @returns {Object} Response
 */
export function authDelete(endpoint, jar) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    jar: jar,
  };

  return http.del(`${CONFIG.baseUrl}${endpoint}`, null, params);
}

/**
 * Generates a random ETP payload for testing.
 *
 * @returns {Object} ETP creation payload
 */
export function generateEtpPayload() {
  const timestamp = Date.now();
  return {
    title: `ETP Load Test ${timestamp}`,
    description: `ETP criado durante load testing - ${timestamp}`,
    objectDescription: 'Objeto de teste para validação de carga',
  };
}

/**
 * Parses response body safely.
 *
 * @param {Object} response - HTTP response
 * @returns {Object|null} Parsed body or null
 */
export function parseBody(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}

/**
 * Standard response checks.
 */
export const checks = {
  is200: (r) => r.status === 200,
  is201: (r) => r.status === 201,
  is2xx: (r) => r.status >= 200 && r.status < 300,
  hasData: (r) => {
    const body = parseBody(r);
    return body && body.data;
  },
  noError: (r) => r.status < 400,
};

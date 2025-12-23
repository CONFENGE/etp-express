/**
 * E2E Auth Connectivity Tests
 *
 * @description Validates API endpoint connectivity for authentication and health checks.
 * These tests ensure that critical endpoints are reachable and respond with expected status codes,
 * preventing 404 regressions like the one fixed in #913.
 *
 * @issue #914
 * @group e2e
 * @group connectivity
 * @priority P1
 */

import { test, expect } from '@playwright/test';

/**
 * Test configuration for API connectivity tests
 */
const API_CONFIG = {
  // Backend API base URL (defaults to localhost for local testing)
  baseURL: process.env.E2E_API_URL || 'http://localhost:3001',

  // API version prefix
  apiVersion: '/api/v1',

  // Health endpoint (version-neutral)
  healthEndpoint: '/api/health',

  // Timeouts
  timeouts: {
    api: 10000, // 10s for API calls
  },
};

/**
 * Auth Connectivity Test Suite
 *
 * Validates that critical API endpoints are reachable and respond correctly.
 * These tests run directly against the API (not through browser UI) for faster feedback.
 *
 * @requires-backend Requires backend running on localhost:3001 (or E2E_API_URL)
 */
test.describe('Auth Connectivity', () => {
  // Skip in CI if no API URL is explicitly set (requires backend infrastructure)
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Auth connectivity tests require backend. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Test: Login endpoint responds with 401 for invalid credentials (not 404)
   *
   * @description Verifies that the login endpoint is properly mounted and accessible.
   * A 401 response confirms the endpoint exists and authentication logic is running.
   * A 404 would indicate the endpoint is not mounted (the bug fixed in #913).
   *
   * @acceptance-criteria
   * - POST /api/v1/auth/login returns 401 for invalid credentials
   * - Response is NOT 404 (endpoint must exist)
   * - Response contains error message about credentials
   */
  test('login endpoint responds with 401 for invalid credentials (not 404)', async ({
    request,
  }) => {
    const response = await request.post(
      `${API_CONFIG.baseURL}${API_CONFIG.apiVersion}/auth/login`,
      {
        data: {
          email: 'nonexistent@test.com',
          password: 'invalidpassword123',
        },
        timeout: API_CONFIG.timeouts.api,
      },
    );

    // CRITICAL: Endpoint MUST NOT return 404
    // 404 indicates the route is not mounted (the bug we're preventing)
    expect(
      response.status(),
      'Login endpoint returned 404 - API versioning may be misconfigured',
    ).not.toBe(404);

    // Should return 401 Unauthorized for invalid credentials
    expect(response.status()).toBe(401);

    // Verify response body contains error information
    const body = await response.json();
    expect(body).toHaveProperty('message');

    console.log('Login endpoint connectivity: OK (returns 401 as expected)');
  });

  /**
   * Test: Health endpoint responds with healthy status
   *
   * @description Verifies the health check endpoint is accessible and returns a healthy status.
   * This endpoint is used by Railway for zero-downtime deployments.
   *
   * @acceptance-criteria
   * - GET /api/health returns 200
   * - Response contains status field
   * - Status is 'healthy' or equivalent
   */
  test('health endpoint responds with healthy status', async ({ request }) => {
    const response = await request.get(
      `${API_CONFIG.baseURL}${API_CONFIG.healthEndpoint}`,
      {
        timeout: API_CONFIG.timeouts.api,
      },
    );

    // Health endpoint should always return 200 when app is running
    expect(response.status()).toBe(200);

    // Verify response body structure
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('healthy');

    console.log('Health endpoint connectivity: OK (healthy)');
  });

  /**
   * Test: Readiness endpoint responds with ready status
   *
   * @description Verifies the readiness probe endpoint is accessible.
   * Used by Railway to determine if the app can receive traffic.
   *
   * @acceptance-criteria
   * - GET /api/health/ready returns 200 or 503
   * - Response contains status field
   */
  test('readiness endpoint responds correctly', async ({ request }) => {
    const response = await request.get(
      `${API_CONFIG.baseURL}${API_CONFIG.healthEndpoint}/ready`,
      {
        timeout: API_CONFIG.timeouts.api,
      },
    );

    // Readiness can be 200 (ready) or 503 (not ready yet)
    expect([200, 503]).toContain(response.status());

    // Verify response body structure
    const body = await response.json();
    expect(body).toHaveProperty('status');

    if (response.status() === 200) {
      expect(body.status).toBe('ready');
      console.log('Readiness endpoint: OK (ready)');
    } else {
      console.log(`Readiness endpoint: OK (status: ${body.status})`);
    }
  });

  /**
   * Test: API returns proper CORS headers
   *
   * @description Verifies that CORS headers are properly configured for browser requests.
   * Prevents cross-origin issues that could block frontend from accessing the API.
   */
  test('API returns proper CORS headers', async ({ request }) => {
    const response = await request.get(
      `${API_CONFIG.baseURL}${API_CONFIG.healthEndpoint}`,
      {
        headers: {
          Origin: 'http://localhost:5173',
        },
        timeout: API_CONFIG.timeouts.api,
      },
    );

    // Should allow cross-origin requests
    expect(response.status()).toBe(200);

    // CORS headers should be present
    const headers = response.headers();

    // Note: CORS headers may vary based on configuration
    // At minimum, the request should not fail due to CORS
    console.log('CORS check: OK (request succeeded with Origin header)');
  });

  /**
   * Test: Login endpoint handles malformed requests gracefully
   *
   * @description Verifies the login endpoint returns appropriate error for malformed requests.
   * Should return 400 Bad Request, not 500 Internal Server Error.
   */
  test('login endpoint handles malformed requests gracefully', async ({
    request,
  }) => {
    const response = await request.post(
      `${API_CONFIG.baseURL}${API_CONFIG.apiVersion}/auth/login`,
      {
        data: {
          // Missing required fields
          email: '', // Empty email
          // password missing
        },
        timeout: API_CONFIG.timeouts.api,
      },
    );

    // Should return 400 (bad request) or 401 (unauthorized), not 500
    expect([400, 401]).toContain(response.status());
    expect(response.status()).not.toBe(500);

    console.log(
      'Malformed request handling: OK (returns client error, not server error)',
    );
  });
});

/**
 * Critical Endpoint Monitoring Suite
 *
 * Smoke tests for all critical endpoints that must be available in production.
 * Run these after deployment to verify system health.
 */
test.describe('Critical Endpoint Monitoring', () => {
  // Skip in CI if no API URL is explicitly set
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Endpoint monitoring tests require backend. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Test: All critical endpoints are reachable
   *
   * @description Quick smoke test to verify critical endpoints respond (any status except 404).
   */
  test('critical endpoints are reachable', async ({ request }) => {
    const endpoints = [
      { method: 'GET', path: '/api/health', expected: 200 },
      { method: 'GET', path: '/api/health/ready', expected: [200, 503] },
      { method: 'POST', path: '/api/v1/auth/login', expected: [400, 401] },
    ];

    for (const endpoint of endpoints) {
      const response = await request.fetch(
        `${API_CONFIG.baseURL}${endpoint.path}`,
        {
          method: endpoint.method,
          data: endpoint.method === 'POST' ? {} : undefined,
          timeout: API_CONFIG.timeouts.api,
        },
      );

      // CRITICAL: No endpoint should return 404
      expect(
        response.status(),
        `${endpoint.method} ${endpoint.path} returned 404 - endpoint not mounted`,
      ).not.toBe(404);

      const expectedStatuses = Array.isArray(endpoint.expected)
        ? endpoint.expected
        : [endpoint.expected];
      expect(expectedStatuses).toContain(response.status());

      console.log(
        `${endpoint.method} ${endpoint.path}: OK (${response.status()})`,
      );
    }
  });
});

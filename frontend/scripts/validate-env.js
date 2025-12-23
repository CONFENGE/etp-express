#!/usr/bin/env node

/**
 * Pre-build validation script for environment variables.
 *
 * Ensures VITE_API_URL includes the /v1 version prefix to prevent
 * deployment issues where the frontend calls unversioned API endpoints.
 *
 * @see Issue #915 - Validar VITE_API_URL no build do frontend
 * @see Issue #913 - Fix that added /v1 prefix to API_URL
 */

const apiUrl = process.env.VITE_API_URL;

if (apiUrl) {
  if (!apiUrl.includes('/v1')) {
    console.error('');
    console.error('ERROR: VITE_API_URL must include /v1 version prefix');
    console.error('');
    console.error('Current value:', apiUrl);
    console.error('Expected format: https://your-backend-url/api/v1');
    console.error('');
    console.error(
      'The backend uses URI versioning and all endpoints require the /v1 prefix.',
    );
    console.error('Without it, API calls will return 404 errors.');
    console.error('');
    process.exit(1);
  }
  console.log('[validate-env] VITE_API_URL validation passed:', apiUrl);
} else {
  console.log(
    '[validate-env] VITE_API_URL not set, will use fallback from vite.config.ts',
  );
}

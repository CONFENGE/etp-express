/**
 * k6 Smoke Test
 *
 * Quick validation that the system is working.
 * Run this before running full load tests.
 *
 * Usage:
 *   k6 run load-tests/scripts/smoke.js
 *   k6 run --env BASE_URL=https://etp-express-backend.railway.app load-tests/scripts/smoke.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { CONFIG, ENDPOINTS } from '../config.js';
import {
  login,
  authGet,
  authPost,
  generateEtpPayload,
  parseBody,
  checks,
} from './helpers.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  let jar = http.cookieJar();

  group('Health Check', function () {
    const healthRes = http.get(`${CONFIG.baseUrl}${ENDPOINTS.health.check}`);
    check(healthRes, {
      'health check returns 200': checks.is200,
    });
  });

  group('Authentication', function () {
    const loginRes = login();
    jar = loginRes.cookies;

    check(loginRes, {
      'login successful': checks.is200,
      'has user data': (r) => {
        const body = parseBody(r);
        return body && body.user;
      },
    });

    sleep(1);

    // Validate session
    const meRes = authGet(ENDPOINTS.auth.me, jar);
    check(meRes, {
      'me endpoint returns 200': checks.is200,
      'me returns user': (r) => {
        const body = parseBody(r);
        return body && body.user;
      },
    });
  });

  group('ETPs List', function () {
    const listRes = authGet(ENDPOINTS.etps.list, jar);
    check(listRes, {
      'list ETPs returns 200': checks.is200,
      'list has data array': (r) => {
        const body = parseBody(r);
        return body && Array.isArray(body.data);
      },
    });

    sleep(1);

    // Get statistics
    const statsRes = authGet(ENDPOINTS.etps.statistics, jar);
    check(statsRes, {
      'statistics returns 200': checks.is200,
    });
  });

  group('ETP Create', function () {
    const payload = generateEtpPayload();
    const createRes = authPost(ENDPOINTS.etps.create, payload, jar);

    check(createRes, {
      'create ETP returns 201': checks.is201,
      'created ETP has id': (r) => {
        const body = parseBody(r);
        return body && body.data && body.data.id;
      },
    });

    // Clean up - get the created ETP id for potential deletion
    const body = parseBody(createRes);
    if (body && body.data && body.data.id) {
      console.log(`Created test ETP: ${body.data.id}`);
    }
  });

  sleep(2);
}

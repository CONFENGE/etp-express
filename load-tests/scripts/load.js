/**
 * k6 Load Test - 100 Virtual Users
 *
 * Main load test scenario simulating 100 concurrent users.
 * Target: B2G scenario with 10 contracts x 10 users each.
 *
 * Usage:
 *   k6 run load-tests/scripts/load.js
 *   k6 run --env BASE_URL=https://etp-express-backend.railway.app load-tests/scripts/load.js
 *
 * With custom thresholds:
 *   k6 run --env BASE_URL=https://etp-express-backend.railway.app \
 *          --env TEST_USER_EMAIL=test@example.com \
 *          --env TEST_USER_PASSWORD=TestPass123 \
 *          load-tests/scripts/load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { CONFIG, ENDPOINTS } from '../config.js';
import {
  login,
  authGet,
  authPost,
  generateEtpPayload,
  parseBody,
  checks,
} from './helpers.js';

// Custom metrics
const loginDuration = new Trend('login_duration');
const etpListDuration = new Trend('etp_list_duration');
const etpCreateDuration = new Trend('etp_create_duration');
const failedLogins = new Counter('failed_logins');
const successfulOperations = new Rate('successful_operations');

export const options = {
  scenarios: {
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 }, // Ramp up to 100 VUs
        { duration: '5m', target: 100 }, // Stay at 100 VUs
        { duration: '1m', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests < 3s
    http_req_failed: ['rate<0.01'], // < 1% failure rate
    login_duration: ['p(95)<2000'], // Login should be fast
    etp_list_duration: ['p(95)<2500'], // List should be responsive
    etp_create_duration: ['p(95)<3000'], // Create within threshold
    failed_logins: ['count<10'], // Max 10 failed logins
    successful_operations: ['rate>0.95'], // 95% success rate
  },
};

export function setup() {
  // Verify system is healthy before starting load test
  const healthRes = http.get(`${CONFIG.baseUrl}${ENDPOINTS.health.check}`);

  if (healthRes.status !== 200) {
    throw new Error(`System health check failed: ${healthRes.status}`);
  }

  console.log('System health check passed, starting load test...');
  console.log(`Target: ${CONFIG.baseUrl}`);
  console.log(`Test user: ${CONFIG.testUser.email}`);

  return {
    startTime: new Date().toISOString(),
  };
}

export default function (data) {
  let jar = http.cookieJar();
  let authenticated = false;

  // Each VU simulates a user session
  group('User Session', function () {
    // Step 1: Login
    group('Login', function () {
      const startTime = Date.now();
      const loginRes = login();
      const duration = Date.now() - startTime;

      loginDuration.add(duration);

      if (loginRes.status === 200) {
        jar = loginRes.cookies;
        authenticated = true;
        successfulOperations.add(1);
      } else {
        failedLogins.add(1);
        successfulOperations.add(0);
        console.error(
          `VU ${__VU}: Login failed with status ${loginRes.status}`,
        );
        return; // Skip rest of session if login fails
      }

      sleep(randomSleep(1, 3));
    });

    if (!authenticated) {
      return;
    }

    // Step 2: Browse ETPs (most common operation)
    group('Browse ETPs', function () {
      const startTime = Date.now();
      const listRes = authGet(ENDPOINTS.etps.list, jar);
      const duration = Date.now() - startTime;

      etpListDuration.add(duration);

      const listSuccess = check(listRes, {
        'list ETPs success': checks.is200,
        'list has data': (r) => {
          const body = parseBody(r);
          return body && Array.isArray(body.data);
        },
      });

      successfulOperations.add(listSuccess ? 1 : 0);

      // Randomly view statistics (30% of users)
      if (Math.random() < 0.3) {
        const statsRes = authGet(ENDPOINTS.etps.statistics, jar);
        check(statsRes, {
          'statistics success': checks.is200,
        });
      }

      sleep(randomSleep(2, 5));
    });

    // Step 3: Create ETP (20% of users create new ETPs)
    if (Math.random() < 0.2) {
      group('Create ETP', function () {
        const payload = generateEtpPayload();
        const startTime = Date.now();
        const createRes = authPost(ENDPOINTS.etps.create, payload, jar);
        const duration = Date.now() - startTime;

        etpCreateDuration.add(duration);

        const createSuccess = check(createRes, {
          'create ETP success': checks.is201,
          'created has id': (r) => {
            const body = parseBody(r);
            return body && body.data && body.data.id;
          },
        });

        successfulOperations.add(createSuccess ? 1 : 0);

        if (createSuccess) {
          const body = parseBody(createRes);
          const etpId = body.data.id;

          // View the created ETP
          sleep(randomSleep(1, 2));
          const viewRes = authGet(ENDPOINTS.etps.get(etpId), jar);
          check(viewRes, {
            'view created ETP success': checks.is200,
          });
        }

        sleep(randomSleep(2, 4));
      });
    }

    // Step 4: Validate session (10% of users)
    if (Math.random() < 0.1) {
      group('Validate Session', function () {
        const validateRes = http.post(
          `${CONFIG.baseUrl}${ENDPOINTS.auth.validate}`,
          null,
          { jar },
        );
        check(validateRes, {
          'validate session success': checks.is200,
        });
      });
    }

    // Simulate user thinking time before next action
    sleep(randomSleep(3, 8));
  });
}

export function teardown(data) {
  console.log('\n=== Load Test Complete ===');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('\nCheck the k6 output above for detailed metrics.');
  console.log('\nKey metrics to verify:');
  console.log('- http_req_duration p(95) < 3000ms');
  console.log('- http_req_failed < 1%');
  console.log('- successful_operations > 95%');
}

/**
 * Returns a random sleep duration between min and max seconds.
 */
function randomSleep(min, max) {
  return min + Math.random() * (max - min);
}

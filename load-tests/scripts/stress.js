/**
 * k6 Stress Test
 *
 * Finds the breaking point of the system by gradually increasing load.
 * Use this to determine maximum capacity and identify bottlenecks.
 *
 * WARNING: This test can significantly impact the target system.
 * Do not run against production without proper authorization.
 *
 * Usage:
 *   k6 run load-tests/scripts/stress.js
 *   k6 run --env BASE_URL=https://staging.example.com load-tests/scripts/stress.js
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

// Custom metrics for stress analysis
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');
const requestsPerSecond = new Counter('requests_per_second');

export const options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 }, // Warm up
        { duration: '3m', target: 100 }, // Normal load
        { duration: '3m', target: 150 }, // Above normal
        { duration: '3m', target: 200 }, // Stress
        { duration: '3m', target: 250 }, // Breaking point discovery
        { duration: '2m', target: 0 }, // Recovery
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'], // Allow higher latency during stress
    http_req_failed: ['rate<0.10'], // Allow up to 10% failures
    error_rate: ['rate<0.15'], // Track overall error rate
  },
};

export function setup() {
  // Verify system is healthy before stress test
  const healthRes = http.get(`${CONFIG.baseUrl}${ENDPOINTS.health.check}`);

  if (healthRes.status !== 200) {
    throw new Error(`System health check failed: ${healthRes.status}`);
  }

  console.log('=== STRESS TEST STARTING ===');
  console.log(`Target: ${CONFIG.baseUrl}`);
  console.log(
    'This test will gradually increase load to find breaking points.',
  );
  console.log('Monitor your infrastructure during this test.\n');

  return {
    startTime: new Date().toISOString(),
  };
}

export default function () {
  let jar = http.cookieJar();

  group('Stress Session', function () {
    // Login
    const loginStart = Date.now();
    const loginRes = login();
    responseTime.add(Date.now() - loginStart);
    requestsPerSecond.add(1);

    if (loginRes.status !== 200) {
      errorRate.add(1);
      return;
    }

    errorRate.add(0);
    jar = loginRes.cookies;

    sleep(0.5);

    // Heavy operation: List ETPs
    const listStart = Date.now();
    const listRes = authGet(ENDPOINTS.etps.list, jar);
    responseTime.add(Date.now() - listStart);
    requestsPerSecond.add(1);

    if (!check(listRes, { 'list success': checks.is200 })) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    sleep(0.5);

    // Heavy operation: Create ETP (50% of iterations)
    if (Math.random() < 0.5) {
      const payload = generateEtpPayload();
      const createStart = Date.now();
      const createRes = authPost(ENDPOINTS.etps.create, payload, jar);
      responseTime.add(Date.now() - createStart);
      requestsPerSecond.add(1);

      if (!check(createRes, { 'create success': checks.is201 })) {
        errorRate.add(1);
      } else {
        errorRate.add(0);
      }
    }

    // Statistics endpoint (adds DB load)
    const statsStart = Date.now();
    const statsRes = authGet(ENDPOINTS.etps.statistics, jar);
    responseTime.add(Date.now() - statsStart);
    requestsPerSecond.add(1);

    if (!check(statsRes, { 'stats success': checks.is200 })) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    // Minimal sleep to maximize pressure
    sleep(0.3);
  });
}

export function teardown(data) {
  console.log('\n=== STRESS TEST COMPLETE ===');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log('\nAnalysis points:');
  console.log('1. At what VU count did response times degrade?');
  console.log('2. At what VU count did errors start appearing?');
  console.log('3. Did the system recover after load decreased?');
  console.log(
    '\nRecommendation: Use results to set realistic capacity limits.',
  );
}

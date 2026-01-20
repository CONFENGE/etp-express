import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const concurrencyConflicts = new Rate('concurrency_conflicts');

// Test configuration - focuses on concurrent updates to same resource
export const options = {
  scenarios: {
    concurrent_approval: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 25 }, // Ramp up to 25 users
        { duration: '2m', target: 50 }, // Stay at 50 users
        { duration: '30s', target: 0 }, // Ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    errors: ['rate<0.001'], // Error rate < 0.1%
    concurrency_conflicts: ['rate<0.05'], // Concurrency conflicts < 5%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'loadtest@etp-express.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'LoadTest123!';
const SHARED_ETP_ID = __ENV.SHARED_ETP_ID || null; // ID of ETP to stress test

// Setup function
export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const token = loginRes.json('accessToken');

  // Create a shared ETP for concurrent testing if not provided
  let etpId = SHARED_ETP_ID;
  if (!etpId) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const etpRes = http.post(`${BASE_URL}/api/etps`, JSON.stringify({
      objeto: 'Load Test - Concurrent Section Approval',
      justificativa: 'Testing race conditions on section approval',
      orgaoId: 1,
      status: 'rascunho',
      tipo: 'Servico',
      prazoEstimado: 6,
      valorEstimado: 50000,
    }), { headers });

    etpId = etpRes.json('id');
  }

  return { token, etpId };
}

// Main test function
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Fetch ETP sections
  const sectionsRes = http.get(
    `${BASE_URL}/api/etps/${data.etpId}/sections`,
    { headers }
  );

  const sectionsSuccess = check(sectionsRes, {
    'sections fetch status is 200': (r) => r.status === 200,
  });

  if (!sectionsSuccess) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const sections = sectionsRes.json();
  if (!sections || sections.length === 0) {
    console.log('No sections available for concurrent testing');
    errorRate.add(1);
    sleep(1);
    return;
  }

  // Pick a random section
  const section = sections[Math.floor(Math.random() * sections.length)];

  // Update section content concurrently
  const updatePayload = {
    content: `Concurrent update at ${Date.now()} by VU ${__VU}`,
    status: Math.random() > 0.5 ? 'revisao' : 'aprovado',
  };

  const updateRes = http.patch(
    `${BASE_URL}/api/sections/${section.id}`,
    JSON.stringify(updatePayload),
    { headers }
  );

  const updateSuccess = check(updateRes, {
    'section update status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'no 409 conflict': (r) => r.status !== 409,
  });

  if (!updateSuccess) {
    errorRate.add(1);
    if (updateRes.status === 409) {
      concurrencyConflicts.add(1);
    }
  } else {
    errorRate.add(0);
    concurrencyConflicts.add(0);
  }

  sleep(0.5); // Short think time for aggressive concurrency
}

// Teardown function
export function teardown(data) {
  console.log(`Concurrent load test completed for ETP ${data.etpId}`);
}

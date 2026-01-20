import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    errors: ['rate<0.001'], // Error rate must be below 0.1%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'loadtest@etp-express.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'LoadTest123!';

let authToken = null;

// Setup function - runs once before test
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
  return { token };
}

// Main test function
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Create ETP payload
  const etpPayload = {
    objeto: `Load Test ETP - ${Date.now()}`,
    justificativa: 'Load testing scenario for concurrent ETP creation',
    orgaoId: 1, // Assuming demo org
    status: 'rascunho',
    tipo: 'Obra',
    prazoEstimado: 12,
    valorEstimado: 100000,
  };

  // Create ETP
  const createRes = http.post(
    `${BASE_URL}/api/etps`,
    JSON.stringify(etpPayload),
    { headers }
  );

  const createSuccess = check(createRes, {
    'ETP creation status is 201': (r) => r.status === 201,
    'ETP has ID': (r) => r.json('id') !== undefined,
  });

  if (!createSuccess) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
    const etpId = createRes.json('id');

    // Fetch created ETP
    const getRes = http.get(`${BASE_URL}/api/etps/${etpId}`, { headers });

    const getSuccess = check(getRes, {
      'ETP fetch status is 200': (r) => r.status === 200,
      'ETP data matches': (r) => r.json('objeto') === etpPayload.objeto,
    });

    if (!getSuccess) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }

  sleep(1); // Think time between iterations
}

// Teardown function - runs once after test
export function teardown(data) {
  // Optional: cleanup test data
  console.log('Load test completed');
}

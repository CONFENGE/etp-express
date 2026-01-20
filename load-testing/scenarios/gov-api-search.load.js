import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const govApiLatency = new Trend('gov_api_latency');

// Test configuration - high concurrency for external API stress
export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 200 }, // Stay at 200 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests must complete below 10s
    gov_api_latency: ['p(95)<10000'], // Gov API calls under 10s
    errors: ['rate<0.001'], // Error rate < 0.1%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = __ENV.TEST_USER_EMAIL || 'loadtest@etp-express.com';
const TEST_USER_PASSWORD = __ENV.TEST_USER_PASSWORD || 'LoadTest123!';

// Search queries for gov APIs
const SEARCH_QUERIES = [
  'computador',
  'notebook',
  'impressora',
  'mesa',
  'cadeira',
  'ar condicionado',
  'veículo',
  'construção',
  'manutenção',
  'consultoria',
];

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
  return { token };
}

// Main test function
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // Pick random search query
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  // Search PNCP (most common gov API)
  const pncpStart = Date.now();
  const pncpRes = http.get(
    `${BASE_URL}/api/gov-api/pncp/search?query=${encodeURIComponent(query)}&limit=10`,
    { headers, timeout: '30s' }
  );
  const pncpDuration = Date.now() - pncpStart;

  const pncpSuccess = check(pncpRes, {
    'PNCP search status is 200': (r) => r.status === 200,
    'PNCP returns results': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body) || (body && Array.isArray(body.data));
      } catch (e) {
        return false;
      }
    },
  });

  if (pncpSuccess) {
    govApiLatency.add(pncpDuration);
    errorRate.add(0);
  } else {
    errorRate.add(1);
    console.log(`PNCP search failed: ${pncpRes.status} - ${pncpRes.body.substring(0, 100)}`);
  }

  sleep(1); // Think time

  // Search SINAPI prices (if available)
  const sinapiStart = Date.now();
  const sinapiRes = http.get(
    `${BASE_URL}/api/prices/sinapi/search?query=${encodeURIComponent(query)}&limit=5`,
    { headers, timeout: '30s' }
  );
  const sinapiDuration = Date.now() - sinapiStart;

  const sinapiSuccess = check(sinapiRes, {
    'SINAPI search status is 200': (r) => r.status === 200,
    'SINAPI returns data': (r) => {
      try {
        const body = r.json();
        return body !== null && body !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (sinapiSuccess) {
    govApiLatency.add(sinapiDuration);
    errorRate.add(0);
  } else if (sinapiRes.status === 404 || sinapiRes.status === 501) {
    // Endpoint might not exist yet - not a critical error
    errorRate.add(0);
  } else {
    errorRate.add(1);
  }

  sleep(2); // Longer think time for search operations
}

// Teardown function
export function teardown(data) {
  console.log('Gov API load test completed');
}

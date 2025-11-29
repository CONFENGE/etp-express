/**
 * Load Test: POST /auth/login
 *
 * Testa autenticação de usuários sob carga.
 *
 * Execução:
 * k6 run tests/load/auth-login.js
 *
 * Execução com parâmetros:
 * k6 run --vus 10 --duration 30s tests/load/auth-login.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const loginErrorRate = new Rate('login_errors');
const loginDuration = new Trend('login_duration');

// Configuração do teste
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp-up: 0 → 10 usuários em 30s
    { duration: '1m', target: 10 }, // Sustentação: 10 usuários por 1min
    { duration: '20s', target: 0 }, // Ramp-down: 10 → 0 usuários em 20s
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% das requests < 500ms
    http_req_failed: ['rate<0.05'], // Taxa de erro < 5%
    login_errors: ['rate<0.05'], // Taxa de erro de login < 5%
    login_duration: ['p(95)<600'], // 95% dos logins < 600ms
  },
};

// URL base (pode ser sobrescrita via env var)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Credenciais de teste
const TEST_USER = {
  email: __ENV.TEST_EMAIL || 'testuser@example.com',
  password: __ENV.TEST_PASSWORD || 'Test@1234',
};

export default function () {
  const payload = JSON.stringify(TEST_USER);

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const startTime = new Date().getTime();
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  const duration = new Date().getTime() - startTime;

  // Validações
  const success = check(res, {
    'status é 200': (r) => r.status === 200,
    'resposta tem token': (r) => r.json('access_token') !== undefined,
    'resposta tem userId': (r) => r.json('userId') !== undefined,
    'tempo de resposta < 1s': () => duration < 1000,
  });

  // Atualizar métricas customizadas
  loginErrorRate.add(!success);
  loginDuration.add(duration);

  // Simular think time do usuário (1-2s)
  sleep(Math.random() * 1 + 1);
}

/**
 * Métricas reportadas automaticamente:
 *
 * - http_reqs: Total de requests
 * - http_req_duration: Latência (p50, p95, p99)
 * - http_req_failed: Taxa de falha
 * - http_req_waiting: Time to first byte (TTFB)
 * - iterations: Iterações completadas
 * - vus: Virtual users ativos
 * - vus_max: VUs máximos
 * - login_errors: Taxa de erro de login (custom)
 * - login_duration: Duração do login (custom)
 */

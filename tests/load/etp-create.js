/**
 * Load Test: POST /etps (Criar ETP)
 *
 * Testa criação de ETPs sob carga.
 *
 * Execução:
 * k6 run tests/load/etp-create.js
 *
 * IMPORTANTE: Requer autenticação prévia.
 * Use K6_ACCESS_TOKEN env var ou execute auth-login.js primeiro.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const etpCreateErrorRate = new Rate('etp_create_errors');
const etpCreateDuration = new Trend('etp_create_duration');

// Configuração do teste
export const options = {
  stages: [
    { duration: '20s', target: 5 }, // Ramp-up: 0 → 5 usuários
    { duration: '40s', target: 5 }, // Sustentação: 5 usuários
    { duration: '20s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% < 1.5s (criação é mais lenta)
    http_req_failed: ['rate<0.05'], // Taxa de erro < 5%
    etp_create_errors: ['rate<0.05'], // Taxa de erro de criação < 5%
    etp_create_duration: ['p(95)<2000'], // 95% < 2s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.K6_ACCESS_TOKEN || '';

// Template de ETP para teste
function generateETPPayload(iteration) {
  return {
    title: `ETP Load Test - ${iteration} - ${Date.now()}`,
    description: 'ETP criado por load test k6',
    status: 'draft',
    context: {
      necessidade: 'Teste de carga automatizado',
      justificativa: 'Validar performance do sistema',
      objetivos: ['Criar ETP sob carga', 'Validar throughput'],
    },
  };
}

export default function () {
  const payload = JSON.stringify(generateETPPayload(__ITER));

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  };

  const startTime = new Date().getTime();
  const res = http.post(`${BASE_URL}/api/etps`, payload, params);
  const duration = new Date().getTime() - startTime;

  // Validações
  const success = check(res, {
    'status é 201': (r) => r.status === 201,
    'resposta tem id': (r) => r.json('id') !== undefined,
    'resposta tem title': (r) => r.json('title') !== undefined,
    'status é draft': (r) => r.json('status') === 'draft',
    'tempo de resposta < 3s': () => duration < 3000,
  });

  // Atualizar métricas
  etpCreateErrorRate.add(!success);
  etpCreateDuration.add(duration);

  // Think time: 2-3s (criação de ETP é operação mais espaçada)
  sleep(Math.random() * 1 + 2);
}

/**
 * Setup: Como obter ACCESS_TOKEN
 *
 * 1. Via login manual:
 *    curl -X POST http://localhost:3000/api/auth/login \
 *      -H "Content-Type: application/json" \
 *      -d '{"email":"test@example.com","password":"Test@1234"}'
 *
 * 2. Copiar access_token da resposta
 *
 * 3. Executar teste:
 *    K6_ACCESS_TOKEN="<token>" k6 run tests/load/etp-create.js
 */

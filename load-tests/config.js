/**
 * k6 Load Testing Configuration
 *
 * Shared configuration for all load test scenarios.
 * Update BASE_URL to target different environments.
 *
 * @see https://k6.io/docs/
 */

// Environment configuration
export const CONFIG = {
  // Base URL - change for different environments
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',

  // Test credentials (use test user in staging/production)
  testUser: {
    email: __ENV.TEST_USER_EMAIL || 'admin@confenge.com.br',
    password: __ENV.TEST_USER_PASSWORD || 'Admin@123',
  },

  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
  },

  // Virtual User configurations
  scenarios: {
    smoke: {
      vus: 1,
      duration: '30s',
    },
    load: {
      // Ramp up to 100 VUs over 2 minutes
      // Stay at 100 VUs for 5 minutes
      // Ramp down over 1 minute
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '1m', target: 0 },
      ],
    },
    stress: {
      // Ramp up to 200 VUs to find breaking point
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '3m', target: 150 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 0 },
      ],
    },
  },
};

// API Endpoints
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    validate: '/auth/validate',
  },
  etps: {
    list: '/etps',
    create: '/etps',
    get: (id) => `/etps/${id}`,
    statistics: '/etps/statistics',
  },
  sections: {
    generate: (etpId) => `/sections/etp/${etpId}/generate`,
    list: (etpId) => `/sections/etp/${etpId}`,
  },
  health: {
    check: '/health',
  },
};

// Section keys for generation tests
export const SECTION_KEYS = [
  'descricao_necessidade',
  'area_requisitante',
  'requisitos_contratacao',
  'levantamento_mercado',
  'descricao_solucao',
  'justificativa_solucao',
  'estimativa_quantidades',
  'estimativa_valor',
  'justificativa_parcelamento',
  'resultados_esperados',
  'providencias_previas',
  'declaracao_viabilidade',
];

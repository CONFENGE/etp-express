/**
 * Configuração Global para Testes de Load (k6)
 *
 * Este arquivo define métricas customizadas, thresholds padrão,
 * e opções reutilizáveis para todos os testes de carga.
 */

// Configurações de ambientes
export const environments = {
  local: {
    baseUrl: 'http://localhost:3000',
    description: 'Desenvolvimento local',
  },
  staging: {
    baseUrl: process.env.STAGING_URL || 'https://staging.etp-express.com',
    description: 'Ambiente de staging',
  },
  production: {
    baseUrl: process.env.PROD_URL || 'https://etp-express.com',
    description: 'Produção (USE COM CUIDADO!)',
  },
};

// Configurações de carga predefinidas
export const loadProfiles = {
  smoke: {
    description: 'Smoke test - validação básica',
    stages: [{ duration: '30s', target: 1 }],
  },
  load: {
    description: 'Load test - carga normal esperada',
    stages: [
      { duration: '1m', target: 10 },
      { duration: '3m', target: 10 },
      { duration: '1m', target: 0 },
    ],
  },
  stress: {
    description: 'Stress test - carga acima do normal',
    stages: [
      { duration: '2m', target: 20 },
      { duration: '5m', target: 20 },
      { duration: '2m', target: 50 },
      { duration: '3m', target: 50 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    description: 'Spike test - picos súbitos',
    stages: [
      { duration: '10s', target: 10 },
      { duration: '10s', target: 100 },
      { duration: '3m', target: 100 },
      { duration: '10s', target: 10 },
      { duration: '3m', target: 10 },
      { duration: '10s', target: 0 },
    ],
  },
  soak: {
    description: 'Soak test - carga prolongada (memory leaks)',
    stages: [
      { duration: '2m', target: 10 },
      { duration: '3h', target: 10 },
      { duration: '2m', target: 0 },
    ],
  },
};

// Thresholds padrão (SLAs)
export const defaultThresholds = {
  http_req_duration: [
    'p(95)<1000', // 95% das requests < 1s
    'p(99)<2000', // 99% das requests < 2s
  ],
  http_req_failed: ['rate<0.05'], // Taxa de erro < 5%
  http_reqs: ['rate>10'], // Throughput mínimo: 10 req/s
};

// Thresholds para endpoints LLM (mais lentos)
export const llmThresholds = {
  http_req_duration: [
    'p(95)<15000', // 95% < 15s
    'p(99)<30000', // 99% < 30s
  ],
  http_req_failed: ['rate<0.10'], // Taxa de erro < 10%
  http_reqs: ['rate>0.5'], // Throughput mínimo: 0.5 req/s
};

// Formato de output padrão
export const outputFormats = {
  json: {
    description: 'JSON para CI/CD',
    path: 'tests/load/results/result.json',
  },
  csv: {
    description: 'CSV para análise',
    path: 'tests/load/results/metrics.csv',
  },
  influxdb: {
    description: 'InfluxDB para Grafana',
    url: process.env.INFLUX_URL || 'http://localhost:8086',
    database: 'k6',
  },
};

/**
 * Retorna configuração de ambiente baseado em ENV var
 */
export function getEnvironment() {
  const env = process.env.K6_ENV || 'local';
  return environments[env] || environments.local;
}

/**
 * Retorna profile de carga baseado em ENV var
 */
export function getLoadProfile() {
  const profile = process.env.K6_PROFILE || 'smoke';
  return loadProfiles[profile] || loadProfiles.smoke;
}

/**
 * Gera opções completas para k6
 */
export function generateOptions(customOptions = {}) {
  const env = getEnvironment();
  const profile = getLoadProfile();

  return {
    stages: profile.stages,
    thresholds: defaultThresholds,
    ...customOptions,
  };
}

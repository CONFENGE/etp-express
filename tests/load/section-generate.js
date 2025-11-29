/**
 * Load Test: POST /sections/etp/:id/generate (Geração de Seções com LLM)
 *
 * Testa geração de seções ETP com OpenAI sob carga.
 *
 * IMPORTANTE:
 * - Endpoint mais lento (LLM processing)
 * - Requer ETP pré-existente
 * - Requer autenticação
 * - Custos de API OpenAI se acumulam!
 *
 * Execução:
 * K6_ACCESS_TOKEN="<token>" K6_ETP_ID="<id>" k6 run tests/load/section-generate.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Métricas customizadas
const sectionGenerateErrorRate = new Rate('section_generate_errors');
const sectionGenerateDuration = new Trend('section_generate_duration');
const llmCallsCounter = new Counter('llm_calls_total');

// Configuração do teste - CARGA LEVE (LLM é caro!)
export const options = {
  stages: [
    { duration: '15s', target: 2 }, // Ramp-up: 0 → 2 usuários
    { duration: '30s', target: 2 }, // Sustentação: 2 usuários
    { duration: '15s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<15000'], // 95% < 15s (LLM é lento!)
    http_req_failed: ['rate<0.10'], // Taxa de erro < 10% (mais permissivo)
    section_generate_errors: ['rate<0.10'],
    section_generate_duration: ['p(95)<20000'], // 95% < 20s
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = __ENV.K6_ACCESS_TOKEN || '';
const ETP_ID = __ENV.K6_ETP_ID || ''; // ID do ETP pré-existente

// Seções disponíveis para gerar
const SECTIONS = [
  'identificacao',
  'contexto',
  'problema',
  'objetivos',
  'justificativa',
  'beneficiarios',
  'orcamento',
  'metodologia',
  'cronograma',
  'indicadores',
  'riscos',
  'sustentabilidade',
  'anexos',
];

export default function () {
  if (!ACCESS_TOKEN || !ETP_ID) {
    throw new Error('K6_ACCESS_TOKEN e K6_ETP_ID são obrigatórios');
  }

  // Escolher seção aleatória
  const section = SECTIONS[Math.floor(Math.random() * SECTIONS.length)];

  const payload = JSON.stringify({
    sectionName: section,
    customPrompt: `Gerar seção ${section} para teste de carga k6`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    timeout: '60s', // Timeout generoso para LLM
  };

  const startTime = new Date().getTime();
  const res = http.post(
    `${BASE_URL}/api/sections/etp/${ETP_ID}/generate`,
    payload,
    params,
  );
  const duration = new Date().getTime() - startTime;

  // Incrementar contador de chamadas LLM
  llmCallsCounter.add(1);

  // Validações
  const success = check(res, {
    'status é 201': (r) => r.status === 201,
    'resposta tem id': (r) => r.json('id') !== undefined,
    'resposta tem content': (r) => r.json('content') !== undefined,
    'resposta tem sectionName': (r) => r.json('sectionName') === section,
    'tempo de resposta < 30s': () => duration < 30000,
  });

  // Atualizar métricas
  sectionGenerateErrorRate.add(!success);
  sectionGenerateDuration.add(duration);

  // Think time: 5-10s (geração é operação espaçada)
  sleep(Math.random() * 5 + 5);
}

/**
 * ⚠️ AVISOS IMPORTANTES:
 *
 * 1. CUSTO: Cada request gera custo OpenAI (~$0.01-0.05)
 *    - 2 VUs x 30s x 1 req/10s = ~12 requests = ~$0.50
 *
 * 2. RATE LIMITING:
 *    - Backend tem rate limit de 5 req/min
 *    - Use VUs baixos (1-2) para não estourar limite
 *
 * 3. PREPARAÇÃO:
 *    - Criar ETP de teste primeiro
 *    - Obter ID do ETP
 *    - Obter access_token válido
 *
 * 4. EXECUÇÃO RECOMENDADA:
 *    # Executar apenas 1 VU por 1 minuto (teste smoke)
 *    K6_ACCESS_TOKEN="<token>" K6_ETP_ID="<id>" \
 *      k6 run --vus 1 --duration 1m tests/load/section-generate.js
 */

import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthService } from './health.service';
import { OpenAIService } from '../modules/orchestrator/llm/openai.service';
import { ExaService } from '../modules/search/exa/exa.service';
import { Public } from '../common/decorators/public.decorator';
import CircuitBreaker from 'opossum';

/**
 * Provider Health Status
 * Represents the health status of an external API provider
 */
export interface ProviderHealth {
  /** Current status: 'healthy' or 'degraded' */
  status: 'healthy' | 'degraded';
  /** Latency in milliseconds (undefined if degraded) */
  latency?: number;
  /** Circuit breaker state */
  circuitState: {
    opened: boolean;
    halfOpen: boolean;
    closed: boolean;
    stats: CircuitBreaker.Stats;
  };
  /** Timestamp of last health check */
  lastCheck: Date;
  /** Error message if degraded */
  error?: string;
}

/**
 * Providers Health Response
 * Aggregated health status of all external API providers
 */
export interface ProvidersHealthResponse {
  openai: ProviderHealth;
  exa: ProviderHealth;
}

/**
 * Health Check Controller
 *
 * Expõe endpoints de health check para validação de prontidão do serviço.
 * Utilizado por Railway para zero-downtime deployment.
 *
 * @endpoint GET /api/health - Health geral do serviço
 * @endpoint GET /api/health/providers - Health de todos os provedores externos
 * @endpoint GET /api/health/providers/openai - Status do circuit breaker OpenAI
 * @endpoint GET /api/health/providers/exa - Status do circuit breaker Exa
 *
 * @public All endpoints in this controller are public (no authentication required)
 * @see https://github.com/CONFENGE/etp-express/issues/777
 */
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly openaiService: OpenAIService,
    private readonly exaService: ExaService,
  ) {}

  /**
   * Liveness Probe Endpoint
   *
   * Verifica se a aplicação está viva (não crashou).
   * Retorna 200 mesmo durante initialization/migrations.
   * Usado pelo Railway para detectar crashes e reiniciar containers.
   *
   * @returns {Promise<object>} Status liveness do serviço
   * @example
   * // Response quando saudável:
   * {
   *   "status": "healthy",
   *   "timestamp": "2025-11-29T12:00:00.000Z",
   *   "database": "connected"
   * }
   */
  @Get()
  async check() {
    return this.healthService.check();
  }

  /**
   * Readiness Probe Endpoint
   *
   * Verifica se a aplicação está pronta para receber tráfego.
   * Retorna 503 durante migrations/initialization.
   * Usado pelo deploy.sh para decisão de switch de tráfego.
   *
   * @returns {Promise<object>} Status de prontidão do serviço
   * @example
   * // Response quando pronto:
   * {
   *   "status": "ready",
   *   "timestamp": "2025-11-29T12:00:00.000Z",
   *   "database": "connected",
   *   "migrations": "completed"
   * }
   *
   * @example
   * // Response durante migrations:
   * {
   *   "status": "starting",
   *   "reason": "migrations_in_progress",
   *   "database": "connected",
   *   "timestamp": "2025-11-29T12:00:00.000Z"
   * }
   */
  @Get('ready')
  async ready() {
    return this.healthService.checkReadiness();
  }

  /**
   * Providers Health Check Endpoint
   *
   * Verifica a saúde de todos os provedores externos (OpenAI e Exa)
   * fazendo ping em cada API e retornando métricas de latência e estado dos circuit breakers.
   *
   * @returns {Promise<ProvidersHealthResponse>} Status de cada provedor
   * @example
   * // Response quando todos saudáveis:
   * {
   *   "openai": {
   *     "status": "healthy",
   *     "latency": 245,
   *     "circuitState": { "opened": false, "halfOpen": false, "closed": true, "stats": {...} },
   *     "lastCheck": "2025-11-24T12:00:00.000Z"
   *   },
   *   "exa": {
   *     "status": "healthy",
   *     "latency": 892,
   *     "circuitState": { "opened": false, "halfOpen": false, "closed": true, "stats": {...} },
   *     "lastCheck": "2025-11-24T12:00:00.000Z"
   *   }
   * }
   *
   * @example
   * // Response quando OpenAI degradado:
   * {
   *   "openai": {
   *     "status": "degraded",
   *     "circuitState": { "opened": true, "halfOpen": false, "closed": false, "stats": {...} },
   *     "lastCheck": "2025-11-24T12:00:00.000Z",
   *     "error": "Connection timeout"
   *   },
   *   "exa": {
   *     "status": "healthy",
   *     "latency": 723,
   *     "circuitState": { "opened": false, "halfOpen": false, "closed": true, "stats": {...} },
   *     "lastCheck": "2025-11-24T12:00:00.000Z"
   *   }
   * }
   */
  @Get('providers')
  async getProvidersHealth(): Promise<ProvidersHealthResponse> {
    const [openai, exa] = await Promise.allSettled([
      this.checkOpenAI(),
      this.checkExa(),
    ]);

    return {
      openai:
        openai.status === 'fulfilled'
          ? openai.value
          : {
              status: 'degraded',
              circuitState: this.openaiService.getCircuitState(),
              lastCheck: new Date(),
              error: openai.reason?.message || 'Unknown error',
            },
      exa:
        exa.status === 'fulfilled'
          ? exa.value
          : {
              status: 'degraded',
              circuitState: this.exaService.getCircuitState(),
              lastCheck: new Date(),
              error: exa.reason?.message || 'Unknown error',
            },
    };
  }

  /**
   * Check OpenAI health by pinging the API
   * @private
   * @returns {Promise<ProviderHealth>} OpenAI health status
   */
  private async checkOpenAI(): Promise<ProviderHealth> {
    const { latency } = await this.openaiService.ping();

    return {
      status: 'healthy',
      latency,
      circuitState: this.openaiService.getCircuitState(),
      lastCheck: new Date(),
    };
  }

  /**
   * Check Exa health by pinging the API
   * @private
   * @returns {Promise<ProviderHealth>} Exa health status
   */
  private async checkExa(): Promise<ProviderHealth> {
    const { latency } = await this.exaService.ping();

    return {
      status: 'healthy',
      latency,
      circuitState: this.exaService.getCircuitState(),
      lastCheck: new Date(),
    };
  }

  /**
   * OpenAI Circuit Breaker Status Endpoint
   *
   * Retorna o estado atual do circuit breaker da OpenAI.
   * Útil para monitoramento e debugging de problemas de integração.
   *
   * @returns {object} Estado do circuit breaker
   * @example
   * // Response quando circuit fechado (saudável):
   * {
   *   "opened": false,
   *   "halfOpen": false,
   *   "closed": true,
   *   "stats": {
   *     "fires": 10,
   *     "successes": 10,
   *     "failures": 0,
   *     "timeouts": 0
   *   }
   * }
   */
  @Get('providers/openai')
  getOpenAIHealth() {
    return this.openaiService.getCircuitState();
  }

  /**
   * Exa Circuit Breaker Status Endpoint
   *
   * Retorna o estado atual do circuit breaker da Exa API.
   * Útil para monitoramento e debugging de problemas de busca externa.
   *
   * @returns {object} Estado do circuit breaker
   * @example
   * // Response quando circuit fechado (saudável):
   * {
   *   "opened": false,
   *   "halfOpen": false,
   *   "closed": true,
   *   "stats": {
   *     "fires": 5,
   *     "successes": 5,
   *     "failures": 0,
   *     "timeouts": 0
   *   }
   * }
   */
  @Get('providers/exa')
  getExaHealth() {
    return this.exaService.getCircuitState();
  }

  /**
   * System Metrics Endpoint
   *
   * Retorna métricas de sistema do processo Node.js para monitoramento.
   * Complementa o Railway Observability com dados internos da aplicação.
   *
   * @returns {object} Métricas de CPU, memória e uptime
   * @example
   * // Response:
   * {
   *   "uptime": 86400,
   *   "uptimeFormatted": "1d 0h 0m 0s",
   *   "memory": {
   *     "heapUsed": 150000000,
   *     "heapTotal": 250000000,
   *     "heapUsedMB": 143,
   *     "heapTotalMB": 238,
   *     "external": 5000000,
   *     "rss": 300000000,
   *     "rssMB": 286
   *   },
   *   "cpu": {
   *     "user": 1234567,
   *     "system": 234567,
   *     "userMs": 1234,
   *     "systemMs": 234
   *   },
   *   "process": {
   *     "pid": 12345,
   *     "nodeVersion": "v20.10.0",
   *     "platform": "linux",
   *     "arch": "x64"
   *   },
   *   "timestamp": "2025-12-14T10:30:00.000Z"
   * }
   */
  @Get('metrics')
  getMetrics() {
    return this.healthService.getSystemMetrics();
  }
}

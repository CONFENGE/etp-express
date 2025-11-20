import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { OpenAIService } from '../modules/orchestrator/llm/openai.service';

/**
 * Health Check Controller
 *
 * Expõe endpoints de health check para validação de prontidão do serviço.
 * Utilizado por Railway para zero-downtime deployment.
 *
 * @endpoint GET /api/health - Health geral do serviço
 * @endpoint GET /api/health/providers/openai - Status do circuit breaker OpenAI
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly openaiService: OpenAIService,
  ) {}

  /**
   * Health Check Endpoint
   *
   * Retorna status de saúde do serviço incluindo conectividade com banco de dados.
   *
   * @returns {Promise<object>} Status do serviço
   * @example
   * // Response quando saudável:
   * {
   *   "status": "healthy",
   *   "timestamp": "2025-11-14T12:00:00.000Z",
   *   "database": "connected"
   * }
   */
  @Get()
  async check() {
    return this.healthService.check();
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
}

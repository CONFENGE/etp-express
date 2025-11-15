import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Health Check Controller
 *
 * Expõe endpoint de health check para validação de prontidão do serviço.
 * Utilizado por Railway para zero-downtime deployment.
 *
 * @endpoint GET /api/health
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

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
}

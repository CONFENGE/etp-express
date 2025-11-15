import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * Health Check Service
 *
 * Valida conectividade com recursos externos (database) para determinar
 * se o serviço está saudável e pronto para receber tráfego.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Executa health check completo
   *
   * Valida conectividade com PostgreSQL e retorna status agregado.
   *
   * @returns {Promise<object>} Status de saúde do serviço
   */
  async check() {
    const dbHealth = await this.checkDatabase();

    const status = dbHealth ? 'healthy' : 'unhealthy';

    // Log apenas quando unhealthy (evitar poluir logs em produção)
    if (!dbHealth) {
      this.logger.error('Health check failed: Database not connected');
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      database: dbHealth ? 'connected' : 'disconnected',
    };
  }

  /**
   * Valida conectividade com PostgreSQL
   *
   * Executa query simples (SELECT 1) para verificar se database está acessível.
   *
   * @returns {Promise<boolean>} true se database está conectado
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      await this.userRepository.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database connectivity check failed', error);
      return false;
    }
  }
}

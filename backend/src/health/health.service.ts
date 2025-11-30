import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../entities/user.entity';
import { OpenAIService } from '../modules/orchestrator/llm/openai.service';
import { PerplexityService } from '../modules/search/perplexity/perplexity.service';

/**
 * Health Check Service
 *
 * Valida conectividade com recursos externos (database e APIs externas)
 * para determinar se o serviço está saudável e pronto para receber tráfego.
 *
 * Executa verificações periódicas de provedores externos a cada 5 minutos.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly openaiService: OpenAIService,
    private readonly perplexityService: PerplexityService,
    private readonly dataSource: DataSource,
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

  /**
   * Verifica se a aplicação está pronta para receber tráfego
   *
   * Diferente de liveness: valida que migrations completaram.
   * Retorna status "starting" durante migrations para evitar falsos-positivos.
   *
   * @returns {Promise<object>} Status de readiness
   */
  async checkReadiness() {
    const dbHealth = await this.checkDatabase();

    if (!dbHealth) {
      return {
        status: 'not_ready',
        reason: 'database_disconnected',
        timestamp: new Date().toISOString(),
      };
    }

    // Verificar se há migrations pendentes
    const migrationsPending = await this.checkPendingMigrations();

    if (migrationsPending) {
      return {
        status: 'starting',
        reason: 'migrations_in_progress',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
      migrations: 'completed',
    };
  }

  /**
   * Verifica se há migrations pendentes (TypeORM)
   *
   * Usa TypeORM DataSource.showMigrations() para detectar migrations não executadas.
   * Durante boot, TypeORM executa migrations síncronas - este método detecta esse estado.
   *
   * @returns {Promise<boolean>} true se há migrations pendentes
   */
  private async checkPendingMigrations(): Promise<boolean> {
    try {
      const pendingMigrations = await this.dataSource.showMigrations();
      return pendingMigrations; // true se há pendentes
    } catch (error) {
      this.logger.warn('Could not check migrations status', error);
      return false; // Assume não há pendentes em caso de erro
    }
  }

  /**
   * Cron Job - Verificação periódica de provedores externos
   *
   * Executa a cada 5 minutos para monitorar proativamente a saúde das APIs externas.
   * Loga warnings quando detecta problemas, permitindo ação preventiva antes
   * de afetar os usuários.
   *
   * @cron Executa a cada 5 minutos (CronExpression.EVERY_5_MINUTES)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkProvidersHealth() {
    this.logger.debug('Running scheduled providers health check...');

    // Check OpenAI
    try {
      const { latency } = await this.openaiService.ping();
      const circuitState = this.openaiService.getCircuitState();

      if (circuitState.opened) {
        this.logger.warn('OpenAI circuit breaker is OPEN - service degraded', {
          stats: circuitState.stats,
        });
      } else {
        this.logger.debug(`OpenAI health check OK - latency: ${latency}ms`);
      }
    } catch (error) {
      this.logger.error('OpenAI health check failed', {
        error: error.message,
        stack: error.stack,
      });
    }

    // Check Perplexity
    try {
      const { latency } = await this.perplexityService.ping();
      const circuitState = this.perplexityService.getCircuitState();

      if (circuitState.opened) {
        this.logger.warn(
          'Perplexity circuit breaker is OPEN - service degraded',
          {
            stats: circuitState.stats,
          },
        );
      } else {
        this.logger.debug(`Perplexity health check OK - latency: ${latency}ms`);
      }
    } catch (error) {
      this.logger.error('Perplexity health check failed', {
        error: error.message,
        stack: error.stack,
      });
    }

    this.logger.debug('Scheduled providers health check completed');
  }
}

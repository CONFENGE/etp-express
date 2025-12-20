import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { User } from '../entities/user.entity';
import { OpenAIService } from '../modules/orchestrator/llm/openai.service';
import { ExaService } from '../modules/search/exa/exa.service';

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
    private readonly exaService: ExaService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Executa health check completo
   *
   * Valida conectividade com PostgreSQL e Redis (se configurado),
   * retornando status agregado.
   *
   * @returns {Promise<object>} Status de saúde do serviço
   */
  async check() {
    const dbHealth = await this.checkDatabase();
    const redisHealth = await this.checkRedis();

    const status = dbHealth && redisHealth ? 'healthy' : 'unhealthy';

    // Log apenas quando unhealthy (evitar poluir logs em produção)
    if (!dbHealth) {
      this.logger.error('Health check failed: Database not connected');
    }
    if (!redisHealth) {
      this.logger.warn('Health check warning: Redis not available');
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      database: dbHealth ? 'connected' : 'disconnected',
      redis: redisHealth ? 'connected' : 'not_configured',
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
   * Valida conectividade com Redis
   *
   * Executa PING para verificar se Redis está acessível.
   * Retorna true se Redis não está configurado (REDIS_URL ausente),
   * permitindo que a aplicação funcione sem Redis.
   *
   * @returns {Promise<boolean>} true se Redis está conectado ou não configurado
   */
  private async checkRedis(): Promise<boolean> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    // Se Redis não está configurado, não é um erro
    if (!redisUrl) {
      this.logger.debug('Redis not configured - skipping health check');
      return true; // Não bloqueia health check se Redis não está configurado
    }

    let client: Redis | null = null;
    try {
      client = new Redis(redisUrl);
      await client.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis connectivity check failed', {
        error: error.message,
      });
      return false;
    } finally {
      if (client) {
        client.disconnect();
      }
    }
  }

  /**
   * Verifica se a aplicação está pronta para receber tráfego
   *
   * Executa verificações completas de todas as dependências:
   * - Database: Conectividade PostgreSQL
   * - Migrations: Status de migrations TypeORM
   * - Redis: Conectividade (se configurado)
   * - Providers: Estado dos circuit breakers (OpenAI, Exa)
   *
   * @returns {Promise<object>} Status de readiness detalhado
   */
  async checkReadiness() {
    const timestamp = new Date().toISOString();

    // Verificar database
    const dbHealth = await this.checkDatabase();
    if (!dbHealth) {
      return {
        status: 'not_ready',
        reason: 'database_disconnected',
        timestamp,
        components: {
          database: { status: 'unhealthy' },
          migrations: { status: 'unknown' },
          redis: { status: 'unknown' },
          providers: {
            openai: { status: 'unknown' },
            exa: { status: 'unknown' },
          },
        },
      };
    }

    // Verificar migrations
    const migrationsPending = await this.checkPendingMigrations();
    if (migrationsPending) {
      return {
        status: 'starting',
        reason: 'migrations_in_progress',
        timestamp,
        components: {
          database: { status: 'healthy' },
          migrations: { status: 'pending' },
          redis: { status: 'unknown' },
          providers: {
            openai: { status: 'unknown' },
            exa: { status: 'unknown' },
          },
        },
      };
    }

    // Verificar Redis
    const redisHealth = await this.checkRedis();
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisStatus = !redisUrl
      ? { status: 'not_configured' as const }
      : redisHealth
        ? { status: 'healthy' as const }
        : { status: 'unhealthy' as const };

    // Se Redis está configurado e offline, retornar not_ready
    if (redisUrl && !redisHealth) {
      return {
        status: 'not_ready',
        reason: 'redis_disconnected',
        timestamp,
        components: {
          database: { status: 'healthy' },
          migrations: { status: 'completed' },
          redis: redisStatus,
          providers: {
            openai: { status: 'unknown' },
            exa: { status: 'unknown' },
          },
        },
      };
    }

    // Verificar circuit breakers (não fazemos ping, apenas verificamos estado)
    const openaiCircuit = this.openaiService.getCircuitState();
    const exaCircuit = this.exaService.getCircuitState();

    const openaiStatus = {
      status: openaiCircuit.opened
        ? ('degraded' as const)
        : ('healthy' as const),
      circuitOpen: openaiCircuit.opened,
    };

    const exaStatus = {
      status: exaCircuit.opened ? ('degraded' as const) : ('healthy' as const),
      circuitOpen: exaCircuit.opened,
    };

    // Determinar status geral
    const hasDegradedProvider = openaiCircuit.opened || exaCircuit.opened;
    const overallStatus = hasDegradedProvider ? 'degraded' : 'ready';

    return {
      status: overallStatus,
      timestamp,
      components: {
        database: { status: 'healthy' },
        migrations: { status: 'completed' },
        redis: redisStatus,
        providers: {
          openai: openaiStatus,
          exa: exaStatus,
        },
      },
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
   * Retorna métricas de sistema para monitoramento
   *
   * Expõe CPU, memória e uptime do processo Node.js.
   * Utilizado para monitoramento complementar ao Railway Observability.
   *
   * @returns {object} Métricas de sistema
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    return {
      uptime: Math.floor(uptime),
      uptimeFormatted: this.formatUptime(uptime),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: memUsage.external,
        rss: memUsage.rss,
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        userMs: Math.round(cpuUsage.user / 1000),
        systemMs: Math.round(cpuUsage.system / 1000),
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Formata uptime em formato legível (d:h:m:s)
   * @private
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
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

    // Check Exa
    try {
      const { latency } = await this.exaService.ping();
      const circuitState = this.exaService.getCircuitState();

      if (circuitState.opened) {
        this.logger.warn('Exa circuit breaker is OPEN - service degraded', {
          stats: circuitState.stats,
        });
      } else {
        this.logger.debug(`Exa health check OK - latency: ${latency}ms`);
      }
    } catch (error) {
      this.logger.error('Exa health check failed', {
        error: error.message,
        stack: error.stack,
      });
    }

    this.logger.debug('Scheduled providers health check completed');
  }
}

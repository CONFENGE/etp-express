import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';

// Middleware
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestMetricsMiddleware } from './common/middleware/request-metrics.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';

// Configuration
import redisConfig from './config/redis.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EtpsModule } from './modules/etps/etps.module';
import { SectionsModule } from './modules/sections/sections.module';
import { VersionsModule } from './modules/versions/versions.module';
import { ExportModule } from './modules/export/export.module';
import { SearchModule } from './modules/search/search.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { AuditModule } from './modules/audit/audit.module';
import { RAGModule } from './modules/rag/rag.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SystemAdminModule } from './modules/system-admin/system-admin.module';
import { DomainManagerModule } from './modules/domain-manager/domain-manager.module';
import { DemoModule } from './modules/demo/demo.module';
import { DocumentExtractionModule } from './modules/document-extraction/document-extraction.module';
import { GovDataSyncModule } from './modules/gov-data-sync/gov-data-sync.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { SemanticCacheModule } from './modules/cache/semantic-cache.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ChatModule } from './modules/chat/chat.module';
import { TermoReferenciaModule } from './modules/termo-referencia/termo-referencia.module';
import { PesquisaPrecosModule } from './modules/pesquisa-precos/pesquisa-precos.module';

// Health Check
import { HealthModule } from './health/health.module';

// Common
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Guards (MT-04)
import { TenantGuard } from './common/guards/tenant.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Subscribers (#813)
import { SlowQuerySubscriber } from './common/subscribers/slow-query.subscriber';

/**
 * AppModule - Root module of the application
 *
 * Implements NestModule to configure middleware (#653)
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [redisConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required().messages({
          'string.min':
            'JWT_SECRET must be at least 32 characters for security. Generate with: openssl rand -hex 32',
        }),
        JWT_EXPIRATION: Joi.string().default('7d'),
        OPENAI_API_KEY: Joi.string().required(),
        OPENAI_MODEL: Joi.string().default('gpt-4.1-nano'),
        // Exa API Configuration (#707)
        EXA_API_KEY: Joi.string().required(),
        EXA_TYPE: Joi.string()
          .valid('auto', 'neural', 'keyword')
          .default('auto'),
        EXA_NUM_RESULTS: Joi.number().min(1).max(100).default(10),
        EXA_FALLBACK_ENABLED: Joi.boolean().default(true),
        FRONTEND_URL: Joi.string().default('http://localhost:5173'),
        // CORS_ORIGINS is required in production to prevent silent fallback to localhost (#599)
        CORS_ORIGINS: Joi.when('NODE_ENV', {
          is: 'production',
          then: Joi.string().required().messages({
            'any.required':
              'CORS_ORIGINS must be defined in production. Example: CORS_ORIGINS=https://your-frontend.railway.app',
          }),
          otherwise: Joi.string().default('http://localhost:5173'),
        }),

        // Database connection pooling (#108, #343)
        // Railway Postgres Starter: max 20 connections
        DB_POOL_MAX: Joi.number().default(20),
        DB_POOL_MIN: Joi.number().default(5),
        DB_IDLE_TIMEOUT: Joi.number().default(30000),
        DB_CONNECTION_TIMEOUT: Joi.number().default(5000),
        DB_RETRY_ATTEMPTS: Joi.number().default(3),
        DB_RETRY_DELAY: Joi.number().default(1000),
        DB_SYNCHRONIZE: Joi.boolean().default(false),
        DB_LOGGING: Joi.boolean().default(false),
        DB_MIGRATIONS_RUN: Joi.boolean().default(true),
      }),
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: configService.get('DB_MIGRATIONS_RUN', true), // Auto-run migrations on startup
        synchronize: configService.get('DB_SYNCHRONIZE', false),
        logging: configService.get('DB_LOGGING', false),
        // SSL Configuration (#394, #598)
        // Railway PostgreSQL supports SSL with managed certificates
        // Use ssl: true to enable SSL with proper certificate validation
        ssl:
          configService.get('PGSSLMODE') === 'disable'
            ? false
            : configService.get('NODE_ENV') === 'production'
              ? true
              : false,

        // Connection pooling optimization (#108, #343)
        // Configuração otimizada para Railway PostgreSQL Starter (max_connections=20)
        extra: {
          // Pool size: Railway Postgres Starter max 20 connections
          // Configuração conservadora para evitar connection exhaustion
          max: parseInt(configService.get('DB_POOL_MAX', '20')),

          // Minimum pool size (mantém 5 connections sempre ativas)
          min: parseInt(configService.get('DB_POOL_MIN', '5')),

          // Timeout para conexões idle serem fechadas (30 segundos)
          idleTimeoutMillis: parseInt(
            configService.get('DB_IDLE_TIMEOUT', '30000'),
          ),

          // Timeout para adquirir conexão do pool (5 segundos)
          // Se todas as 20 conexões estiverem ocupadas, falha após 5s
          connectionTimeoutMillis: parseInt(
            configService.get('DB_CONNECTION_TIMEOUT', '5000'),
          ),
        },

        // Slow query logging (#343, #813) - Log queries > 1s
        maxQueryExecutionTime: 1000,

        // Retry logic para reconnections
        retryAttempts: parseInt(configService.get('DB_RETRY_ATTEMPTS', '3')),
        retryDelay: parseInt(configService.get('DB_RETRY_DELAY', '1000')), // 1 segundo
        autoLoadEntities: true,

        // Subscribers (#813) - Slow query monitoring
        subscribers: [SlowQuerySubscriber],
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('RATE_LIMIT_TTL', 60),
          limit: configService.get('RATE_LIMIT_MAX', 100),
        },
      ],
    }),

    // Scheduled tasks (cron jobs)
    ScheduleModule.forRoot(),

    // Job Queue (BullMQ) - Issue #220
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // Use the redis configuration that handles REDIS_URL from Railway
        const redisConf = configService.get('redis');
        return {
          connection: {
            host: redisConf.host,
            port: redisConf.port,
            password: redisConf.password,
            db: redisConf.db,
            // BullMQ-specific options
            maxRetriesPerRequest: redisConf.maxRetriesPerRequest,
            enableReadyCheck: redisConf.enableReadyCheck,
            retryStrategy: (times: number) => {
              const delay = Math.min(times * 1000, 5000);
              return delay;
            },
          },
        };
      },
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    EtpsModule,
    SectionsModule,
    VersionsModule,
    ExportModule,
    SearchModule,
    AnalyticsModule,
    OrchestratorModule,
    AuditModule,
    RAGModule,
    OrganizationsModule,
    SystemAdminModule,
    DomainManagerModule,
    DemoModule,
    DocumentExtractionModule,
    GovDataSyncModule,
    FeatureFlagsModule,
    SemanticCacheModule,
    TemplatesModule,
    ComplianceModule,
    ChatModule,
    TermoReferenciaModule,
    PesquisaPrecosModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards (MT-04)
    // Execution order: JwtAuthGuard (in AuthModule) → TenantGuard → RolesGuard
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Configure middleware for request processing (#653, #802, #815)
   *
   * Middleware execution order:
   * 1. SecurityMiddleware - WAF-like protection (blocks malicious requests early)
   * 2. RequestIdMiddleware - Establish request context with unique ID
   * 3. RequestMetricsMiddleware - Collect performance metrics
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(SecurityMiddleware, RequestIdMiddleware, RequestMetricsMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}

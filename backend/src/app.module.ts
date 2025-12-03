import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';

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

// Health Check
import { HealthModule } from './health/health.module';

// Common
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Guards (MT-04)
import { TenantGuard } from './common/guards/tenant.guard';
import { RolesGuard } from './common/guards/roles.guard';

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
        OPENAI_MODEL: Joi.string().default('gpt-4-turbo-preview'),
        PERPLEXITY_API_KEY: Joi.string().required(),
        FRONTEND_URL: Joi.string().default('http://localhost:5173'),
        CORS_ORIGINS: Joi.string().default('http://localhost:5173'),

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
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
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

        // Slow query logging (#343) - Log queries > 3s
        maxQueryExecutionTime: 3000,

        // Retry logic para reconnections
        retryAttempts: parseInt(configService.get('DB_RETRY_ATTEMPTS', '3')),
        retryDelay: parseInt(configService.get('DB_RETRY_DELAY', '1000')), // 1 segundo
        autoLoadEntities: true,
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
export class AppModule {}

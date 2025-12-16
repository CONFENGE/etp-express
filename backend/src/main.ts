import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  INestApplication,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { initSentry } from './config/sentry.config';
import { createWinstonLogger } from './config/logger.config';
import { DISCLAIMER } from './common/constants/messages';
import { WinstonLoggerService } from './common/services/winston-logger.service';

// Create Winston logger for bootstrap (#652)
const logger = new WinstonLoggerService();
logger.setContext('Bootstrap');

// Track application instance for graceful shutdown
let app: INestApplication;

async function bootstrap() {
  // Initialize Sentry FIRST (before creating NestJS app)
  initSentry();

  // Use Winston logger for structured JSON logging (#652)
  const winstonLogger = createWinstonLogger();
  app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  logger.log(
    `📋 Logger configured: ${isProduction ? 'JSON (production)' : 'Pretty (development)'} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`,
  );

  // Enable graceful shutdown hooks (#607)
  // This ensures NestJS lifecycle hooks (OnApplicationShutdown) are called
  // when the process receives SIGTERM/SIGINT signals
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // Cookie parser for httpOnly JWT cookie authentication
  app.use(cookieParser());

  // CORS - Defense in depth validation (#599)
  // Joi schema already enforces CORS_ORIGINS in production, but we add explicit check here
  const nodeEnv = configService.get('NODE_ENV');
  const corsOriginsRaw = configService.get('CORS_ORIGINS');

  if (nodeEnv === 'production' && !corsOriginsRaw) {
    logger.error(
      '❌ CORS_ORIGINS must be defined in production environment. ' +
        'Set CORS_ORIGINS=https://your-frontend-url.railway.app in Railway variables.',
    );
    throw new Error(
      'CORS_ORIGINS environment variable is required in production',
    );
  }

  const corsOrigins = corsOriginsRaw?.split(',') || ['http://localhost:5173'];

  if (nodeEnv !== 'production') {
    logger.log(`🔧 CORS configured for development: ${corsOrigins.join(', ')}`);
  } else {
    logger.log(`🔒 CORS configured for production: ${corsOrigins.join(', ')}`);
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  // IMPORTANTE: Sentry filter DEVE ser primeiro para capturar todas as exceptions
  app.useGlobalFilters(new SentryExceptionFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('ETP Express API')
    .setDescription(
      `
      🚨 **${DISCLAIMER}**

      API para o sistema ETP Express - Wrapper de LLM para elaboração assistida de Estudos Técnicos Preliminares (Lei 14.133/2021).

      ## Características
      - Geração de conteúdo via OpenAI GPT-4
      - Busca de contratações similares via Exa AI
      - Sistema de subagentes especializados
      - Versionamento e auditoria completos
      - Export para PDF, JSON e XML

      ## Autenticação
      Utilize JWT Bearer token no header: \`Authorization: Bearer <token>\`
    `,
    )
    .setVersion('1.0.0')
    .addTag('auth', 'Autenticação e gestão de usuários')
    .addTag('etps', 'Gestão de ETPs')
    .addTag('sections', 'Seções dos ETPs')
    .addTag('versions', 'Versionamento')
    .addTag('export', 'Exportação (PDF, JSON, XML)')
    .addTag('search', 'Busca de contratações similares')
    .addTag('analytics', 'Telemetria e analytics')
    .addBearerAuth()
    .build();

  // Only expose Swagger in non-production environments for security
  if (nodeEnv !== 'production') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'ETP Express API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(
      `📚 Swagger documentation available at http://localhost:${configService.get('PORT') || 3001}/api/docs`,
    );
  } else {
    logger.log('🔒 Swagger documentation disabled in production for security');
  }

  const port = configService.get('PORT') || 3001;

  await app.listen(port);

  logger.log(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                             ║
    ║   🚀 ETP EXPRESS BACKEND                                   ║
    ║                                                             ║
    ║   ⚠️  Sistema assistivo - Não substitui responsabilidade  ║
    ║      administrativa. Validação humana obrigatória.         ║
    ║                                                             ║
    ║   📡 Server: http://localhost:${port}                      ║
    ║   📚 Docs:   http://localhost:${port}/api/docs             ║
    ║   🌍 Env:    ${configService.get('NODE_ENV')}             ║
    ║                                                             ║
    ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();

// Graceful Shutdown Handlers (#607)
// These handlers ensure clean shutdown when Railway or other orchestrators
// send termination signals during deploys or scaling events

const gracefulShutdown = async (signal: string) => {
  logger.log(`${signal} received, initiating graceful shutdown...`);

  // Give active requests time to complete (Railway default: 10s)
  const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10);

  const timeoutHandle = setTimeout(() => {
    logger.warn(
      `Graceful shutdown timeout (${shutdownTimeout}ms) exceeded, forcing exit`,
    );
    process.exit(1);
  }, shutdownTimeout);

  try {
    if (app) {
      // NestJS app.close() triggers OnApplicationShutdown in all providers
      await app.close();
      logger.log('Application closed gracefully');
    }
    clearTimeout(timeoutHandle);
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    clearTimeout(timeoutHandle);
    process.exit(1);
  }
};

// SIGTERM: Sent by Railway/Docker/Kubernetes for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// SIGINT: Sent by Ctrl+C in terminal (development)
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections (#607)
// Prevents silent failures and ensures proper logging
process.on(
  'unhandledRejection',
  (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
    // Note: Not exiting process here to allow recovery, but logging for debugging
  },
);

// Handle uncaught exceptions (#607)
// Last resort - log and exit to prevent undefined state
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.message, error.stack);
  // Give time for logs to flush before exit
  setTimeout(() => process.exit(1), 1000);
});

// Trigger Railway auto-deploy after husky prepare script removal (#389)

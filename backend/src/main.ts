import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { initSentry } from './config/sentry.config';
import { DISCLAIMER } from './common/constants/messages';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // Initialize Sentry FIRST (before creating NestJS app)
  initSentry();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // Cookie parser for httpOnly JWT cookie authentication
  app.use(cookieParser());

  // CORS
  const corsOrigins = configService.get('CORS_ORIGINS')?.split(',') || [
    'http://localhost:5173',
  ];
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
      - Busca de contratações similares via Perplexity
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
  const nodeEnv = configService.get('NODE_ENV');
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

// Trigger Railway auto-deploy after husky prepare script removal (#389)

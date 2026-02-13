import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

/**
 * Generate OpenAPI spec for public API documentation.
 *
 * This script boots the NestJS app in silent mode, generates the OpenAPI spec
 * using SwaggerModule, filters to only public endpoints, and writes to docs/api/openapi.json.
 *
 * Usage: npm run generate:api-docs
 *
 * Note: This script does NOT require database connection. It only generates
 * API documentation from decorators.
 */
async function bootstrap() {
  try {
    // Set minimal environment to avoid DB connection
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';

    // Create app in silent mode (no logs)
    const app = await NestFactory.create(AppModule, {
      logger: ['error'], // Only log errors during startup
    });

  // Configure Swagger document
  const config = new DocumentBuilder()
    .setTitle('ETP Express Public API')
    .setDescription(`
**ETP Express - Public API Documentation**

API pública para consulta de benchmarks de preços de contratações públicas.

## Autenticação

Utilize API Key no header: \`X-API-Key: <your-api-key>\`

## Base URL

- **Produção:** https://etp-express-api.up.railway.app/api/v1
- **Desenvolvimento:** http://localhost:3001/api/v1

## Endpoints Públicos

- \`/api/v1/prices\` - Benchmarks de preços públicos
`)
    .setVersion('1.0.0')
    .addTag('Public API - Prices', 'API pública de preços para terceiros (requer API Key)')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for public price endpoints (/api/v1/prices)',
      },
      'X-API-Key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Filter to only include public endpoints (under /api/v1/public/ or /api/v1/prices)
  const publicDocument = {
    ...document,
    paths: Object.keys(document.paths)
      .filter((path) => path.includes('/public/') || path.includes('/prices'))
      .reduce((acc, path) => {
        acc[path] = document.paths[path];
        return acc;
      }, {} as typeof document.paths),
  };

  // Ensure docs/api directory exists
  const docsDir = join(__dirname, '..', '..', 'docs', 'api');
  mkdirSync(docsDir, { recursive: true });

  // Write OpenAPI spec to file
  const outputPath = join(docsDir, 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(publicDocument, null, 2));

    console.log(`✅ OpenAPI spec generated at: ${outputPath}`);
    console.log(`📊 Public endpoints found: ${Object.keys(publicDocument.paths).length}`);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during OpenAPI generation:');
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to generate OpenAPI spec:', error);
  process.exit(1);
});

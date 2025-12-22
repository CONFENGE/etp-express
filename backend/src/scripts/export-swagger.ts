/**
 * Script to export OpenAPI/Swagger documentation to JSON file.
 *
 * This script fetches the Swagger document from a running development server
 * and saves it to docs/swagger.json for version control.
 *
 * Usage:
 * 1. Start the backend server: npm run start:dev
 * 2. Run the export: npm run swagger:export
 *
 * Alternative: Use during CI/CD with a running test server.
 *
 * The exported swagger.json should be committed to the repository and updated
 * whenever API changes are made (controllers, DTOs, decorators).
 *
 * @see Issue #800 - Exportar documentacao OpenAPI/Swagger
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

const DEFAULT_PORT = 3001;
const SWAGGER_ENDPOINT = '/api/docs-json';

interface SwaggerDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, unknown>;
}

async function fetchSwaggerJson(port: number): Promise<SwaggerDocument> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${port}${SWAGGER_ENDPOINT}`;
    console.log(`📡 Fetching Swagger document from ${url}...`);

    http
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(
            new Error(
              `Failed to fetch Swagger: HTTP ${res.statusCode}. Make sure the backend server is running (npm run start:dev)`,
            ),
          );
          return;
        }

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse Swagger JSON: ${e}`));
          }
        });
      })
      .on('error', (err) => {
        if (err.message.includes('ECONNREFUSED')) {
          reject(
            new Error(
              `Cannot connect to backend server at localhost:${port}. ` +
                'Please start the server first with: npm run start:dev',
            ),
          );
        } else {
          reject(err);
        }
      });
  });
}

async function exportSwagger(): Promise<void> {
  const port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);

  console.log('🔧 ETP Express Swagger Export');
  console.log('============================');

  // Fetch Swagger document from running server
  const document = await fetchSwaggerJson(port);

  // Ensure docs directory exists
  const docsDir = path.resolve(__dirname, '../../../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
    console.log(`📁 Created docs directory: ${docsDir}`);
  }

  // Export to JSON file
  const outputPath = path.join(docsDir, 'swagger.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  console.log('');
  console.log(`✅ Swagger JSON exported successfully!`);
  console.log(`📄 Output: ${outputPath}`);
  console.log(`📊 API Version: ${document.info.version}`);
  console.log(
    `📋 Endpoints documented: ${Object.keys(document.paths || {}).length}`,
  );
  console.log('');
  console.log(
    '💡 Remember to commit this file when API documentation changes.',
  );
}

exportSwagger().catch((error) => {
  console.error('');
  console.error('❌ Failed to export Swagger documentation:');
  console.error(`   ${error.message}`);
  console.error('');
  console.error('📌 To export Swagger documentation:');
  console.error('   1. Start the backend server: npm run start:dev');
  console.error('   2. Wait for server to be ready');
  console.error('   3. Run export: npm run swagger:export');
  console.error('');
  process.exit(1);
});

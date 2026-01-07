/**
 * E2E Test Runner
 *
 * @description Script customizado para executar testes E2E com Puppeteer.
 * Executa todos os arquivos .spec.ts em e2e/ e gera relatório de execução.
 *
 * @usage npm run test:e2e
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Cores para output no terminal
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Log com cor
 */
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Header do test runner
 */
function printHeader() {
  log('\n========================================', 'cyan');
  log(' ETP Express - E2E Test Runner', 'cyan');
  log('========================================\n', 'cyan');
}

/**
 * Verifica se servidor está rodando na porta configurada
 */
async function checkServerRunning(baseUrl: string): Promise<boolean> {
  try {
    const http = require('http');
    const url = new URL(baseUrl);

    return new Promise((resolve) => {
      const request = http.get(
        {
          hostname: url.hostname,
          port: url.port || 80,
          path: '/',
          timeout: 5000,
        },
        (res: any) => {
          resolve(res.statusCode === 200 || res.statusCode === 302);
        },
      );

      request.on('error', () => {
        resolve(false);
      });

      request.on('timeout', () => {
        request.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

/**
 * Busca todos os arquivos .spec.ts em e2e/
 */
function findSpecFiles(): string[] {
  const e2eDir = path.resolve(__dirname);
  const files = fs.readdirSync(e2eDir);

  return files
    .filter((file) => file.endsWith('.spec.ts'))
    .map((file) => path.join(e2eDir, file));
}

/**
 * Executa testes com Jest
 */
function runTests(specFiles: string[]): { success: boolean; output: string } {
  try {
    log(`\n Executando ${specFiles.length} suite(s) de teste...\n`, 'blue');

    // Executar Jest com os arquivos spec encontrados
    const jestConfig = {
      testMatch: specFiles,
      verbose: true,
      testTimeout: 60000,
      detectOpenHandles: true,
      forceExit: true,
    };

    const jestConfigPath = path.resolve(__dirname, 'jest.config.temp.json');
    fs.writeFileSync(jestConfigPath, JSON.stringify(jestConfig, null, 2));

    // Executar Jest
    const output = execSync(`npx jest --config=${jestConfigPath} --colors`, {
      encoding: 'utf-8',
      stdio: 'inherit',
      cwd: path.resolve(__dirname),
    });

    // Limpar arquivo temporário
    if (fs.existsSync(jestConfigPath)) {
      fs.unlinkSync(jestConfigPath);
    }

    return { success: true, output: output?.toString() || '' };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout?.toString() || error.message,
    };
  }
}

/**
 * Executa testes E2E
 */
async function main() {
  printHeader();

  // Carregar configuração
  const config = require('./puppeteer.config.js');

  // 1. Verificar se servidor está rodando
  log(' Verificando servidor...', 'yellow');
  const serverRunning = await checkServerRunning(config.baseUrl);

  if (!serverRunning) {
    log(`\n❌ ERRO: Servidor não está rodando em ${config.baseUrl}`, 'red');
    log('\n Certifique-se de que o frontend está rodando:', 'yellow');
    log(' cd frontend && npm run dev\n', 'cyan');
    process.exit(1);
  }

  log(`✅ Servidor rodando em ${config.baseUrl}\n`, 'green');

  // 2. Buscar arquivos de teste
  log(' Buscando arquivos .spec.ts...', 'yellow');
  const specFiles = findSpecFiles();

  if (specFiles.length === 0) {
    log('\n⚠ AVISO: Nenhum arquivo .spec.ts encontrado em e2e/', 'yellow');
    process.exit(0);
  }

  log(`✅ ${specFiles.length} arquivo(s) encontrado(s):\n`, 'green');
  specFiles.forEach((file) => {
    log(` - ${path.basename(file)}`, 'cyan');
  });

  // 3. Executar testes
  const result = runTests(specFiles);

  // 4. Relatório final
  log('\n========================================', 'cyan');
  if (result.success) {
    log(' ✅ TESTES CONCLUÍDOS COM SUCESSO', 'green');
  } else {
    log(' ❌ TESTES FALHARAM', 'red');
  }
  log('========================================\n', 'cyan');

  process.exit(result.success ? 0 : 1);
}

// Executar
main().catch((error) => {
  log(`\n❌ ERRO FATAL: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

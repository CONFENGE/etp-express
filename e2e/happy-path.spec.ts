/**
 * E2E Happy Path Test - Complete User Flow
 *
 * @description Testa o fluxo completo de um usuário do ETP Express, desde login
 * até export final, validando funcionamento end-to-end antes do go-live.
 *
 * @issue #736
 * @group e2e
 * @group go-live
 * @priority P1
 */

import { test, expect } from '@playwright/test';

/**
 * Configuração de teste E2E
 */
const TEST_CONFIG = {
  // Credenciais de usuário admin para teste
  // TODO: Mover para environment variables ou fixtures
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },

  // Timeouts específicos
  timeouts: {
    navigation: 5000,
    aiGeneration: 30000, // 30s para geração de seção com AI
    standardAction: 3000,
  },

  // Dados de teste
  testData: {
    etpTitle: `ETP Teste E2E - ${new Date().toISOString()}`,
    etpDescription: 'Descrição de teste para validação E2E do fluxo completo',
    sectionContent: 'Texto editado manualmente para teste E2E',
  },
};

/**
 * Suite de teste do fluxo completo (Happy Path)
 *
 * @requires-backend Requer backend rodando em localhost:3001
 * @skip-ci Estes testes são skipped no CI pois requerem infraestrutura completa
 *
 * Para rodar localmente:
 * 1. Inicie o backend: cd backend && npm run start:dev
 * 2. Inicie o frontend: cd frontend && npm run dev
 * 3. Execute: npx playwright test e2e/happy-path.spec.ts
 */
test.describe('Happy Path - Complete User Flow', () => {
  // Skip no CI - requer backend completo rodando
  test.skip(
    !!process.env.CI,
    'E2E Happy Path tests require full backend infrastructure (backend + database). Run locally or in staging.',
  );

  /**
   * Setup antes de cada teste
   *
   * @description Prepara o ambiente de teste limpando dados anteriores
   * e garantindo estado inicial consistente
   */
  test.beforeEach(async ({ page }) => {
    // Capturar erros do console
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Browser console error: ${msg.text()}`);
      }
    });

    // Capturar erros de página
    page.on('pageerror', (error) => {
      console.error(`Page error: ${error.message}`);
    });
  });

  /**
   * Teardown após cada teste
   *
   * @description Captura screenshot em caso de falha e limpa recursos
   */
  test.afterEach(async ({ page }, testInfo) => {
    // Capturar screenshot se teste falhou
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot();
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  });

  /**
   * Teste principal do fluxo completo de criação de ETP
   *
   * @description Executa os 6 passos principais do fluxo de usuário:
   * 1. Login com usuário admin
   * 2. Criar novo ETP com dados mínimos
   * 3. Gerar seção com AI (sync)
   * 4. Editar seção manualmente
   * 5. Marcar ETP como 100% completo
   * 6. Exportar para PDF e DOCX
   *
   * @acceptance-criteria
   * - Teste E2E passa sem erros (100% green)
   * - Tempo total do fluxo <3 minutos (excluindo geração AI)
   * - Arquivos PDF e DOCX exportados são válidos (>10KB)
   * - Zero erros no console durante execução
   */
  test('fluxo completo de criação de ETP', async ({ page }) => {
    const startTime = Date.now();
    let consoleErrors: string[] = [];

    // Capturar erros do console durante o teste
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ========================================
    // PASSO 1: Login com usuário admin
    // ========================================
    console.log(' Passo 1/6: Login com usuário admin');
    await test.step('Login com usuário admin', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Preencher formulário de login
      await page.fill('[name="email"]', TEST_CONFIG.admin.email);
      await page.fill('[name="password"]', TEST_CONFIG.admin.password);

      // Submeter formulário
      await page.click('button[type="submit"]');

      // Validar redirecionamento para dashboard
      await expect(page).toHaveURL(/\/dashboard/, {
        timeout: TEST_CONFIG.timeouts.navigation,
      });

      console.log('✅ Login realizado com sucesso');
    });

    // ========================================
    // PASSO 2: Criar novo ETP com dados mínimos
    // ========================================
    console.log(' Passo 2/6: Criar novo ETP');
    let etpId: string;

    await test.step('Criar novo ETP com dados mínimos', async () => {
      // Clicar em "Novo ETP" ou similar
      await page.click('text=Novo ETP', {
        timeout: TEST_CONFIG.timeouts.standardAction,
      });

      // Preencher dados mínimos do ETP
      await page.fill('[name="title"]', TEST_CONFIG.testData.etpTitle);
      await page.fill(
        '[name="description"]',
        TEST_CONFIG.testData.etpDescription,
      );

      // Criar ETP - use .first() to avoid strict mode violation
      await page.locator('button:has-text("Criar")').first().click();

      // Aguardar criação e redirecionamento
      await page.waitForURL(/\/etps\/.*/, {
        timeout: TEST_CONFIG.timeouts.standardAction,
      });

      // Validar que estamos na página do ETP
      await expect(page.locator('h1')).toContainText(
        TEST_CONFIG.testData.etpTitle,
        {
          timeout: TEST_CONFIG.timeouts.standardAction,
        },
      );

      // Extrair ID do ETP da URL
      const url = page.url();
      const match = url.match(/\/etps\/([^/]+)/);
      if (match) {
        etpId = match[1];
        console.log(`✅ ETP criado com sucesso (ID: ${etpId})`);
      } else {
        throw new Error('Não foi possível extrair ID do ETP da URL');
      }
    });

    // ========================================
    // PASSO 3: Gerar seção com AI (sync)
    // ========================================
    console.log(' Passo 3/6: Gerar seção com AI');

    await test.step('Gerar seção com AI (sync)', async () => {
      // Clicar em "Gerar Seção" ou botão similar
      await page.click('text=Gerar Seção', {
        timeout: TEST_CONFIG.timeouts.standardAction,
      });

      // Selecionar tipo de seção
      await page.selectOption(
        'select[name="sectionType"]',
        'fundamentacao-legal',
      );

      // Clicar em "Gerar com AI"
      await page.click('button:has-text("Gerar com AI")');

      // Aguardar geração (até 30s)
      await expect(page.locator('.section-content')).toBeVisible({
        timeout: TEST_CONFIG.timeouts.aiGeneration,
      });

      console.log('✅ Seção gerada com AI com sucesso');
    });

    // ========================================
    // PASSO 4: Editar seção manualmente
    // ========================================
    console.log(' Passo 4/6: Editar seção manualmente');

    await test.step('Editar seção manualmente', async () => {
      // Clicar no botão de editar
      await page.click('button[aria-label="Editar seção"]', {
        timeout: TEST_CONFIG.timeouts.standardAction,
      });

      // Editar conteúdo da seção
      await page.fill(
        'textarea[name="content"]',
        TEST_CONFIG.testData.sectionContent,
      );

      // Salvar edição
      await page.click('button:has-text("Salvar")');

      // Validar que edição foi salva
      await expect(page.locator('.section-content')).toContainText(
        TEST_CONFIG.testData.sectionContent,
        { timeout: TEST_CONFIG.timeouts.standardAction },
      );

      console.log('✅ Seção editada manualmente com sucesso');
    });

    // ========================================
    // PASSO 5: Marcar ETP como 100% completo
    // ========================================
    console.log(' Passo 5/6: Marcar ETP como completo');

    await test.step('Marcar ETP como 100% completo', async () => {
      // Marcar checkbox de completo
      await page.click(
        'input[type="checkbox"][aria-label="Marcar como completo"]',
        {
          timeout: TEST_CONFIG.timeouts.standardAction,
        },
      );

      // Validar animação de confetti (opcional - wow factor)
      const confettiVisible = await page
        .locator('.confetti-container')
        .isVisible({
          timeout: 2000,
        })
        .catch(() => false);

      if (confettiVisible) {
        console.log(' Confetti animation detectada!');
      }

      console.log('✅ ETP marcado como completo');
    });

    // ========================================
    // PASSO 6: Exportar para PDF e DOCX
    // ========================================
    console.log(' Passo 6/6: Exportar PDF e DOCX');

    await test.step('Exportar para PDF e DOCX', async () => {
      // Exportar PDF
      const [downloadPdf] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Exportar PDF")', {
          timeout: TEST_CONFIG.timeouts.standardAction,
        }),
      ]);

      // Validar arquivo PDF
      const pdfFilename = downloadPdf.suggestedFilename();
      expect(pdfFilename).toContain('.pdf');

      // Validar tamanho do PDF (>10KB)
      const pdfPath = await downloadPdf.path();
      if (pdfPath) {
        const fs = await import('fs');
        const stats = fs.statSync(pdfPath);
        expect(stats.size).toBeGreaterThan(10 * 1024); // >10KB
        console.log(`✅ PDF exportado com sucesso (${stats.size} bytes)`);
      }

      // Exportar DOCX
      const [downloadDocx] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Exportar DOCX")', {
          timeout: TEST_CONFIG.timeouts.standardAction,
        }),
      ]);

      // Validar arquivo DOCX
      const docxFilename = downloadDocx.suggestedFilename();
      expect(docxFilename).toContain('.docx');

      // Validar tamanho do DOCX (>10KB)
      const docxPath = await downloadDocx.path();
      if (docxPath) {
        const fs = await import('fs');
        const stats = fs.statSync(docxPath);
        expect(stats.size).toBeGreaterThan(10 * 1024); // >10KB
        console.log(`✅ DOCX exportado com sucesso (${stats.size} bytes)`);
      }
    });

    // ========================================
    // VALIDAÇÕES FINAIS
    // ========================================
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // em segundos

    console.log(`\n TESTE COMPLETO EM ${totalTime.toFixed(2)}s`);

    // Validar tempo total (<3 minutos = 180s)
    expect(totalTime).toBeLessThan(180);

    // Validar que não houve erros no console
    expect(consoleErrors).toEqual([]);

    if (consoleErrors.length > 0) {
      console.error('\n❌ Erros detectados no console durante o teste:');
      consoleErrors.forEach((error, index) => {
        console.error(` [${index + 1}] ${error}`);
      });
    }

    console.log('\n✅ HAPPY PATH TEST: PASSOU EM TODOS OS CRITÉRIOS');
  });
});

/**
 * Teste de smoke test rápido (versão simplificada do happy path)
 *
 * @description Versão rápida do happy path para smoke testing,
 * focando apenas em login e criação básica de ETP
 *
 * @requires-backend Requer backend rodando em localhost:3001
 * @skip-ci Estes testes são skipped no CI pois requerem infraestrutura completa
 */
test.describe('Smoke Test - Quick Validation', () => {
  // Skip no CI - requer backend completo rodando
  test.skip(
    !!process.env.CI,
    'Smoke tests require full backend infrastructure. Run locally or in staging.',
  );

  test('login e criação rápida de ETP', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', TEST_CONFIG.admin.email);
    await page.fill('[name="password"]', TEST_CONFIG.admin.password);
    await page.click('button[type="submit"]');

    // Validar dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });

    // Criar ETP simples
    await page.click('text=Novo ETP');
    await page.fill('[name="title"]', `Smoke Test ETP - ${Date.now()}`);
    await page.fill('[name="description"]', 'Smoke test');
    // Use .first() to avoid strict mode violation
    await page.locator('button:has-text("Criar")').first().click();

    // Validar criação
    await expect(page.locator('h1')).toContainText('Smoke Test ETP');

    console.log('✅ Smoke test passou');
  });
});

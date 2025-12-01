/**
 * E2E Test Setup Utilities
 *
 * @description Helpers para configuração e teardown de testes E2E com Puppeteer.
 * Fornece funções utilitárias para inicializar browser, fazer login, criar ETPs, etc.
 *
 * @module e2e/utils/setup
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const config = require('../puppeteer.config.js');

/**
 * Interface de retorno do setupBrowser
 */
export interface BrowserSetup {
  browser: Browser;
  page: Page;
}

/**
 * Inicializa o Puppeteer e cria uma nova página
 *
 * @returns {Promise<BrowserSetup>} Browser e Page inicializados
 *
 * @example
 * const { browser, page } = await setupBrowser();
 * // ... testes ...
 * await teardownBrowser(browser);
 */
export async function setupBrowser(): Promise<BrowserSetup> {
  const browser = await puppeteer.launch(config.launchOptions);
  const page = await browser.newPage();

  // Configurar viewport
  await page.setViewport(config.viewport);

  // Configurar timeouts padrão
  page.setDefaultNavigationTimeout(config.timeouts.navigation);
  page.setDefaultTimeout(config.timeouts.selector);

  // Interceptar console.log do browser (útil para debug)
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    // Log apenas erros e warnings no terminal (evita poluição)
    if (type === 'error' || type === 'warning') {
      console.log(`[Browser ${type.toUpperCase()}]:`, text);
    }
  });

  // Interceptar page errors (uncaught exceptions)
  page.on('pageerror', (error) => {
    console.error('[Browser Page Error]:', error.message);
  });

  return { browser, page };
}

/**
 * Fecha o browser e libera recursos
 *
 * @param {Browser} browser - Instância do Puppeteer Browser
 *
 * @example
 * await teardownBrowser(browser);
 */
export async function teardownBrowser(browser: Browser): Promise<void> {
  if (browser) {
    await browser.close();
  }
}

/**
 * Realiza login na aplicação
 *
 * @param {Page} page - Página do Puppeteer
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @returns {Promise<void>}
 *
 * @throws {Error} Se o login falhar (selector não encontrado ou redirecionamento inválido)
 *
 * @example
 * await login(page, 'user@example.com', 'password123');
 * expect(page.url()).toContain('/dashboard');
 */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  // Navegar para página de login
  await page.goto(`${config.baseUrl}/login`, {
    waitUntil: 'networkidle2',
  });

  // Aguardar formulário de login estar visível
  await page.waitForSelector('#email', { visible: true });
  await page.waitForSelector('#password', { visible: true });
  await page.waitForSelector('button[type="submit"]', { visible: true });

  // Preencher credenciais
  await page.type('#email', email);
  await page.type('#password', password);

  // Clicar no botão de login
  await page.click('button[type="submit"]');

  // Aguardar navegação (redirecionamento para dashboard ou erro)
  await page.waitForNavigation({
    waitUntil: 'networkidle2',
    timeout: config.timeouts.navigation,
  });
}

/**
 * Cria um novo ETP
 *
 * @param {Page} page - Página do Puppeteer
 * @param {Object} etpData - Dados do ETP
 * @param {string} etpData.title - Título do ETP
 * @param {string} etpData.description - Descrição do ETP (opcional)
 * @returns {Promise<void>}
 *
 * @example
 * await createETP(page, {
 *   title: 'Projeto Teste E2E',
 *   description: 'Descrição teste',
 * });
 */
export async function createETP(
  page: Page,
  etpData: { title: string; description?: string },
): Promise<void> {
  // Navegar para página de criação de ETP
  await page.goto(`${config.baseUrl}/etps/new`, {
    waitUntil: 'networkidle2',
  });

  // Aguardar formulário
  await page.waitForSelector('input[name="title"]', { visible: true });

  // Preencher título
  await page.type('input[name="title"]', etpData.title);

  // Preencher descrição (se fornecida)
  if (etpData.description) {
    const descriptionSelector = 'textarea[name="description"]';
    const descriptionExists = await page.$(descriptionSelector);
    if (descriptionExists) {
      await page.type(descriptionSelector, etpData.description);
    }
  }

  // Clicar no botão de criar
  await page.click('button[type="submit"]');

  // Aguardar redirecionamento para a página do ETP criado
  await page.waitForNavigation({
    waitUntil: 'networkidle2',
    timeout: config.timeouts.navigation,
  });
}

/**
 * Captura screenshot em caso de falha
 *
 * @param {Page} page - Página do Puppeteer
 * @param {string} testName - Nome do teste (para identificar screenshot)
 * @returns {Promise<void>}
 *
 * @example
 * try {
 *   // ... teste ...
 * } catch (error) {
 *   await takeScreenshotOnFailure(page, 'login-test');
 *   throw error;
 * }
 */
export async function takeScreenshotOnFailure(
  page: Page,
  testName: string,
): Promise<void> {
  if (!config.screenshot.onFailure) {
    return;
  }

  // Criar diretório de screenshots se não existir
  const screenshotDir = path.resolve(
    __dirname,
    '..',
    config.screenshot.directory,
  );
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  // Nome do arquivo: YYYY-MM-DD_HH-MM-SS_test-name.png
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${timestamp}_${testName}.${config.screenshot.type}`;
  const filepath = path.join(screenshotDir, filename);

  // Capturar screenshot
  await page.screenshot({
    path: filepath,
    type: config.screenshot.type,
    fullPage: config.screenshot.fullPage,
  });

  console.log(`Screenshot capturado: ${filepath}`);
}

/**
 * Aguarda elemento estar visível e retorna o texto
 *
 * @param {Page} page - Página do Puppeteer
 * @param {string} selector - Seletor CSS
 * @returns {Promise<string>} Texto do elemento
 *
 * @example
 * const errorMsg = await getTextContent(page, '.error-message');
 * expect(errorMsg).toContain('Credenciais inválidas');
 */
export async function getTextContent(
  page: Page,
  selector: string,
): Promise<string> {
  await page.waitForSelector(selector, { visible: true });
  const element = await page.$(selector);

  if (!element) {
    throw new Error(`Elemento não encontrado: ${selector}`);
  }

  const text = await page.evaluate((el) => el.textContent || '', element);
  return text.trim();
}

/**
 * Aguarda URL conter o path esperado
 *
 * @param {Page} page - Página do Puppeteer
 * @param {string} expectedPath - Path esperado (ex: '/dashboard')
 * @param {number} timeout - Timeout em ms (padrão: config.timeouts.navigation)
 * @returns {Promise<void>}
 *
 * @throws {Error} Se timeout atingido sem URL mudar
 *
 * @example
 * await waitForUrlContains(page, '/dashboard');
 */
export async function waitForUrlContains(
  page: Page,
  expectedPath: string,
  timeout: number = config.timeouts.navigation,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentUrl = page.url();
    if (currentUrl.includes(expectedPath)) {
      return;
    }
    await page.waitForTimeout(100); // Poll a cada 100ms
  }

  throw new Error(
    `Timeout aguardando URL conter "${expectedPath}". URL atual: ${page.url()}`,
  );
}

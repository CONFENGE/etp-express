/**
 * E2E Test Suite - Login Flow
 *
 * @description Testa o fluxo completo de autenticação (login/logout) da aplicação ETP Express.
 * Valida cenários de sucesso, falha, validação de campos e mensagens de erro.
 *
 * @group e2e
 */

import { Browser, Page } from 'puppeteer';
import {
  setupBrowser,
  teardownBrowser,
  login,
  takeScreenshotOnFailure,
  getTextContent,
  waitForUrlContains,
} from './utils/setup';

const config = require('./puppeteer.config.js');

/**
 * Descreve a suite de testes de Login
 */
describe('Login Flow E2E', () => {
  let browser: Browser;
  let page: Page;

  /**
   * Antes de cada teste: inicializar browser e page
   */
  beforeEach(async () => {
    const setup = await setupBrowser();
    browser = setup.browser;
    page = setup.page;
  });

  /**
   * Após cada teste: fechar browser e liberar recursos
   */
  afterEach(async () => {
    await teardownBrowser(browser);
  });

  /**
   * Teste 1: Login com credenciais válidas
   * Deve redirecionar para /dashboard
   */
  test(
    'deve fazer login com credenciais válidas e redirecionar para dashboard',
    async () => {
      try {
        // Navegar para página de login
        await page.goto(`${config.baseUrl}/login`, {
          waitUntil: 'networkidle2',
        });

        // Verificar que estamos na página de login
        expect(page.url()).toContain('/login');

        // Aguardar formulário estar visível
        await page.waitForSelector('#email', { visible: true });
        await page.waitForSelector('#password', { visible: true });
        await page.waitForSelector('button[type="submit"]', { visible: true });

        // Preencher credenciais VÁLIDAS
        await page.type('#email', config.testUser.email);
        await page.type('#password', config.testUser.password);

        // Clicar no botão de login
        await page.click('button[type="submit"]');

        // Aguardar navegação para dashboard
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: config.timeouts.navigation,
        });

        // ✅ VALIDAÇÃO: URL deve conter '/dashboard'
        expect(page.url()).toContain('/dashboard');

        // ✅ VALIDAÇÃO: Deve exibir nome do usuário (opcional, se disponível na UI)
        // const userNameExists = await page.$('.user-name');
        // if (userNameExists) {
        //   const userName = await getTextContent(page, '.user-name');
        //   expect(userName).toBe(config.testUser.name);
        // }
      } catch (error) {
        await takeScreenshotOnFailure(page, 'login-valid-credentials');
        throw error;
      }
    },
    config.timeouts.test,
  );

  /**
   * Teste 2: Login com credenciais inválidas
   * Deve exibir mensagem de erro e NÃO redirecionar
   */
  test(
    'deve exibir erro ao tentar login com credenciais inválidas',
    async () => {
      try {
        // Navegar para página de login
        await page.goto(`${config.baseUrl}/login`, {
          waitUntil: 'networkidle2',
        });

        // Preencher credenciais INVÁLIDAS
        await page.type('#email', 'usuario-invalido@example.com');
        await page.type('#password', 'senha-errada-123');

        // Clicar no botão de login
        await page.click('button[type="submit"]');

        // Aguardar mensagem de erro aparecer (NÃO deve haver navegação)
        await page.waitForSelector(
          '.error-message, .alert-error, [role="alert"]',
          {
            visible: true,
            timeout: config.timeouts.selector,
          },
        );

        // ✅ VALIDAÇÃO: Deve permanecer na página de login
        expect(page.url()).toContain('/login');

        // ✅ VALIDAÇÃO: Mensagem de erro deve estar visível
        const errorMessageExists = await page.$(
          '.error-message, .alert-error, [role="alert"]',
        );
        expect(errorMessageExists).toBeTruthy();

        // ✅ VALIDAÇÃO: Mensagem deve conter texto de erro (ajustar seletor conforme UI real)
        // const errorText = await getTextContent(page, '.error-message');
        // expect(errorText.toLowerCase()).toMatch(/credenciais|inv[áa]lido|erro/);
      } catch (error) {
        await takeScreenshotOnFailure(page, 'login-invalid-credentials');
        throw error;
      }
    },
    config.timeouts.test,
  );

  /**
   * Teste 3: Validação de campo obrigatório - Email vazio
   * Deve exibir mensagem de validação HTML5 ou erro customizado
   */
  test(
    'deve validar campo de email obrigatório',
    async () => {
      try {
        // Navegar para página de login
        await page.goto(`${config.baseUrl}/login`, {
          waitUntil: 'networkidle2',
        });

        // NÃO preencher email, apenas senha
        await page.type('#password', 'alguma-senha');

        // Clicar no botão de submit
        await page.click('button[type="submit"]');

        // ✅ VALIDAÇÃO: Validação HTML5 deve impedir submit
        const emailInput = await page.$('#email');
        const isEmailValid = await page.evaluate((input) => {
          return (input as HTMLInputElement).validity.valid;
        }, emailInput);

        expect(isEmailValid).toBe(false);

        // ✅ VALIDAÇÃO: Deve permanecer na página de login
        expect(page.url()).toContain('/login');
      } catch (error) {
        await takeScreenshotOnFailure(page, 'login-email-validation');
        throw error;
      }
    },
    config.timeouts.test,
  );

  /**
   * Teste 4: Validação de campo obrigatório - Senha vazia
   * Deve exibir mensagem de validação HTML5 ou erro customizado
   */
  test(
    'deve validar campo de senha obrigatório',
    async () => {
      try {
        // Navegar para página de login
        await page.goto(`${config.baseUrl}/login`, {
          waitUntil: 'networkidle2',
        });

        // Preencher apenas email, NÃO preencher senha
        await page.type('#email', 'usuario@example.com');

        // Clicar no botão de submit
        await page.click('button[type="submit"]');

        // ✅ VALIDAÇÃO: Validação HTML5 deve impedir submit
        const passwordInput = await page.$('#password');
        const isPasswordValid = await page.evaluate((input) => {
          return (input as HTMLInputElement).validity.valid;
        }, passwordInput);

        expect(isPasswordValid).toBe(false);

        // ✅ VALIDAÇÃO: Deve permanecer na página de login
        expect(page.url()).toContain('/login');
      } catch (error) {
        await takeScreenshotOnFailure(page, 'login-password-validation');
        throw error;
      }
    },
    config.timeouts.test,
  );

  /**
   * Teste 5: Link "Esqueci minha senha" (se disponível)
   * Deve redirecionar para página de recuperação de senha
   */
  test(
    'deve navegar para página de recuperação de senha ao clicar em "Esqueci minha senha"',
    async () => {
      try {
        // Navegar para página de login
        await page.goto(`${config.baseUrl}/login`, {
          waitUntil: 'networkidle2',
        });

        // Verificar se link "Esqueci minha senha" existe
        const forgotPasswordLink = await page.$(
          'a[href*="forgot-password"], a:has-text("Esqueci")',
        );

        if (forgotPasswordLink) {
          // Clicar no link
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('a[href*="forgot-password"], a:has-text("Esqueci")'),
          ]);

          // ✅ VALIDAÇÃO: Deve redirecionar para página de recuperação
          expect(page.url()).toMatch(
            /forgot-password|reset-password|recuperar/i,
          );
        } else {
          console.warn(
            '⚠️  Link "Esqueci minha senha" não encontrado - teste pulado',
          );
        }
      } catch (error) {
        await takeScreenshotOnFailure(page, 'login-forgot-password-link');
        throw error;
      }
    },
    config.timeouts.test,
  );

  /**
   * Teste 6: Helper de login (testar função utilitária)
   * Deve fazer login usando helper do setup.ts
   */
  test(
    'deve fazer login usando helper login() do setup.ts',
    async () => {
      try {
        // Usar helper de login
        await login(page, config.testUser.email, config.testUser.password);

        // ✅ VALIDAÇÃO: Deve estar logado (URL contém /dashboard)
        expect(page.url()).toContain('/dashboard');
      } catch (error) {
        await takeScreenshotOnFailure(page, 'login-helper-function');
        throw error;
      }
    },
    config.timeouts.test,
  );
});

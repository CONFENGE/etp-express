/**
 * Puppeteer E2E Test Configuration
 *
 * @description Configuração base para testes end-to-end com Puppeteer no ETP Express.
 * Define opções de browser, timeouts, viewport e base URL da aplicação.
 *
 * @see https://pptr.dev/
 */

module.exports = {
  /**
   * Base URL da aplicação (frontend React)
   * @type {string}
   */
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:5173',

  /**
   * Opções de lançamento do Puppeteer
   * @see https://pptr.dev/api/puppeteer.puppeteerlaunchoptions
   */
  launchOptions: {
    /**
     * Modo headless (true para CI/CD, false para debug local)
     * @type {boolean}
     */
    headless: process.env.E2E_HEADLESS !== 'false',

    /**
     * Executar em modo devtools (útil para debug)
     * @type {boolean}
     */
    devtools: process.env.E2E_DEVTOOLS === 'true',

    /**
     * Argumentos do Chrome
     * @type {string[]}
     */
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Evita problemas de memória compartilhada em CI
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],

    /**
     * Slow motion (ms) - útil para debug visual
     * @type {number}
     */
    slowMo: process.env.E2E_SLOW_MO ? parseInt(process.env.E2E_SLOW_MO, 10) : 0,
  },

  /**
   * Configurações de viewport (resolução do browser)
   */
  viewport: {
    /**
     * Largura do viewport (px)
     * @type {number}
     */
    width: 1920,

    /**
     * Altura do viewport (px)
     * @type {number}
     */
    height: 1080,

    /**
     * Fator de escala de dispositivo (1 = desktop, 2 = retina)
     * @type {number}
     */
    deviceScaleFactor: 1,

    /**
     * Simular dispositivo móvel
     * @type {boolean}
     */
    isMobile: false,

    /**
     * Suportar touch events
     * @type {boolean}
     */
    hasTouch: false,

    /**
     * Modo landscape
     * @type {boolean}
     */
    isLandscape: true,
  },

  /**
   * Timeouts (ms)
   */
  timeouts: {
    /**
     * Timeout padrão para navegação (page.goto)
     * @type {number}
     */
    navigation: 30000,

    /**
     * Timeout padrão para waitForSelector
     * @type {number}
     */
    selector: 10000,

    /**
     * Timeout padrão para testes
     * @type {number}
     */
    test: 60000,
  },

  /**
   * Usuário padrão para testes (mock)
   * ⚠️  NÃO use credenciais reais em testes automatizados
   */
  testUser: {
    email: process.env.E2E_TEST_EMAIL || 'test@etpexpress.com',
    password: process.env.E2E_TEST_PASSWORD || 'Test@123456',
    name: 'Test User',
  },

  /**
   * Configurações de screenshot
   */
  screenshot: {
    /**
     * Capturar screenshot em caso de falha
     * @type {boolean}
     */
    onFailure: true,

    /**
     * Diretório de screenshots
     * @type {string}
     */
    directory: 'e2e/screenshots',

    /**
     * Formato de imagem
     * @type {'png' | 'jpeg'}
     */
    type: 'png',

    /**
     * Página completa (scroll) ou viewport apenas
     * @type {boolean}
     */
    fullPage: true,
  },
};

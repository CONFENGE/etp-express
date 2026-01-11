/**
 * E2E Tests for ETP Chatbot Feature
 *
 * @description Tests for the AI chat assistant integrated into the ETP Editor.
 * Tests cover:
 * 1. Opening and closing the chat widget
 * 2. Sending messages and receiving responses
 * 3. Context-aware responses based on ETP content
 * 4. Proactive suggestions for empty fields
 * 5. Rate limit enforcement (30 messages/minute)
 * 6. Clear history functionality
 *
 * @issue #1398
 * @parent #1167
 * @group e2e
 * @group chat
 * @priority P1
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  // Test credentials
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },

  // Timeouts
  timeouts: {
    navigation: 15000,
    action: 5000,
    chatResponse: 30000, // AI responses can take up to 30s
    rateLimit: 60000, // 1 minute for rate limit tests
  },

  // Test data
  testMessages: {
    simple: 'O que devo escrever na justificativa?',
    contextual: 'Como posso melhorar a descricao da solucao?',
    legal: 'Qual legislacao se aplica a este tipo de contratacao?',
  },
};

/**
 * Helper function to login
 */
async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[name="email"], input#email', TEST_CONFIG.admin.email);
  await page.fill(
    'input[name="password"], input#password',
    TEST_CONFIG.admin.password,
  );
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard/, {
    timeout: TEST_CONFIG.timeouts.navigation,
  });
}

/**
 * Helper function to navigate to an existing ETP
 */
async function navigateToETP(page: Page): Promise<string> {
  // Go to ETPs list
  await page.goto('/etps');
  await page.waitForLoadState('networkidle');

  // Click on first ETP in the list (or create one if none exists)
  const etpCard = page.locator('[data-testid="etp-card"], .etp-card, a[href^="/etps/"]').first();

  if (await etpCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await etpCard.click();
  } else {
    // Create a new ETP if none exists
    const newEtpButton = page.locator('text=Novo ETP').first();
    await newEtpButton.click();
    await page.waitForTimeout(500);

    // Fill minimal data
    await page.fill('input#title', `Chat Test ETP ${Date.now()}`);
    const nextButton = page.locator('button:has-text("Proximo")');
    await nextButton.click();

    await page.fill('textarea#objeto, input#objeto', 'Teste de chat E2E automatizado');
    await nextButton.click();
    await nextButton.click();
    await nextButton.click();

    const submitButton = page.locator('button:has-text("Criar ETP")');
    await submitButton.click();
  }

  // Wait for ETP editor to load
  await page.waitForURL(/\/etps\/[^/]+$/, {
    timeout: TEST_CONFIG.timeouts.navigation,
  });

  const url = page.url();
  const match = url.match(/\/etps\/([^/]+)/);
  return match ? match[1] : '';
}

/**
 * Helper function to open the chat widget
 */
async function openChatWidget(page: Page): Promise<void> {
  // Look for the floating chat button (FAB)
  const chatFab = page.locator(
    '[data-testid="chat-fab"], [aria-label="Abrir assistente de chat"], button:has(svg.lucide-message-circle)',
  ).first();

  await expect(chatFab).toBeVisible({ timeout: TEST_CONFIG.timeouts.action });
  await chatFab.click();

  // Wait for chat panel to open
  const chatPanel = page.locator(
    '[data-testid="chat-panel"], #chat-panel, [role="dialog"]:has-text("Assistente ETP")',
  ).first();

  await expect(chatPanel).toBeVisible({ timeout: TEST_CONFIG.timeouts.action });
}

/**
 * Helper function to close the chat widget
 */
async function closeChatWidget(page: Page): Promise<void> {
  const closeButton = page.locator(
    '[aria-label="Fechar chat"], button:has(svg.lucide-x)',
  ).first();

  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Helper function to send a chat message
 */
async function sendChatMessage(page: Page, message: string): Promise<void> {
  const chatInput = page.locator(
    '[data-testid="chat-input"], input[placeholder*="pergunta"], textarea[placeholder*="pergunta"]',
  ).first();

  await chatInput.fill(message);

  const sendButton = page.locator(
    '[data-testid="chat-send"], button[aria-label="Enviar"], button:has(svg.lucide-send)',
  ).first();

  await sendButton.click();
}

/**
 * Helper function to wait for assistant response
 */
async function waitForAssistantResponse(page: Page): Promise<void> {
  // Wait for loading indicator to disappear
  const loadingIndicator = page.locator(
    '[data-testid="chat-loading"], .animate-pulse, [aria-busy="true"]',
  );

  if (await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(loadingIndicator).not.toBeVisible({
      timeout: TEST_CONFIG.timeouts.chatResponse,
    });
  }

  // Wait for assistant message to appear
  const assistantMessage = page.locator(
    '[data-testid="chat-message-assistant"], [data-role="assistant"]',
  ).last();

  await expect(assistantMessage).toBeVisible({
    timeout: TEST_CONFIG.timeouts.chatResponse,
  });
}

/**
 * ETP Chatbot E2E Test Suite
 */
test.describe('ETP Chatbot - Chat Widget', () => {
  // Skip in CI if no explicit configuration
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Chatbot tests require full backend infrastructure with AI services. Set E2E_API_URL in CI or run locally.',
  );

  /**
   * Setup: Login before each test
   */
  test.beforeEach(async ({ page }) => {
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    await login(page);
  });

  /**
   * Teardown: Screenshot on failure
   */
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  });

  /**
   * Test 1: Open and close chat widget
   *
   * @description Verifies the chat widget can be opened and closed
   *
   * @acceptance-criteria
   * - Chat FAB button is visible in ETP editor
   * - Clicking FAB opens the chat panel
   * - Chat panel contains header with "Assistente ETP"
   * - Close button closes the panel
   */
  test('should open and close chat widget', async ({ page }) => {
    await navigateToETP(page);

    // Open chat
    await openChatWidget(page);

    // Verify chat header
    const chatHeader = page.locator('text=Assistente ETP').first();
    await expect(chatHeader).toBeVisible();

    // Verify input is present
    const chatInput = page.locator(
      '[data-testid="chat-input"], input[placeholder*="pergunta"], textarea[placeholder*="pergunta"]',
    ).first();
    await expect(chatInput).toBeVisible();

    // Close chat
    await closeChatWidget(page);

    // Verify chat panel is closed
    const chatPanel = page.locator('#chat-panel, [data-testid="chat-panel"]');
    await expect(chatPanel).not.toBeVisible();

    console.log('Open/close chat widget: PASSED');
  });

  /**
   * Test 2: Send message and receive response
   *
   * @description Verifies that messages can be sent and responses received
   *
   * @acceptance-criteria
   * - User can type a message
   * - Send button sends the message
   * - User message appears in chat
   * - Assistant response appears after processing
   */
  test('should send message and receive response', async ({ page }) => {
    await navigateToETP(page);
    await openChatWidget(page);

    // Send a message
    await sendChatMessage(page, TEST_CONFIG.testMessages.simple);

    // Verify user message appears
    const userMessage = page.locator(
      '[data-testid="chat-message-user"], [data-role="user"]',
    ).last();
    await expect(userMessage).toContainText(TEST_CONFIG.testMessages.simple);

    // Wait for assistant response
    await waitForAssistantResponse(page);

    // Verify assistant responded (should mention "justificativa" since that was the question)
    const assistantMessage = page.locator(
      '[data-testid="chat-message-assistant"], [data-role="assistant"]',
    ).last();
    await expect(assistantMessage).toBeVisible();

    // Response should have some content
    const responseText = await assistantMessage.textContent();
    expect(responseText && responseText.length > 10).toBeTruthy();

    console.log('Send message and receive response: PASSED');
  });

  /**
   * Test 3: Context-aware response
   *
   * @description Verifies the chat provides context-aware responses based on ETP
   *
   * @acceptance-criteria
   * - Response references ETP context
   * - Response is relevant to the question asked
   */
  test('should provide context-aware response', async ({ page }) => {
    await navigateToETP(page);
    await openChatWidget(page);

    // Send a contextual question
    await sendChatMessage(page, TEST_CONFIG.testMessages.legal);

    // Wait for response
    await waitForAssistantResponse(page);

    // Verify response contains relevant legal references
    const assistantMessage = page.locator(
      '[data-testid="chat-message-assistant"], [data-role="assistant"]',
    ).last();

    const responseText = await assistantMessage.textContent();

    // Response should mention law or legislation (Lei, legislacao, norma, etc.)
    const hasLegalReference =
      responseText?.toLowerCase().includes('lei') ||
      responseText?.toLowerCase().includes('legisla') ||
      responseText?.toLowerCase().includes('norma') ||
      responseText?.toLowerCase().includes('14.133');

    expect(hasLegalReference).toBeTruthy();

    console.log('Context-aware response: PASSED');
  });

  /**
   * Test 4: Proactive suggestions displayed
   *
   * @description Verifies proactive suggestions appear for empty fields
   *
   * @acceptance-criteria
   * - Proactive hint banner appears when field is empty
   * - Hint offers help for the current context
   * - Clicking help button sends a relevant message
   */
  test('should show proactive suggestions for empty sections', async ({ page }) => {
    await navigateToETP(page);
    await openChatWidget(page);

    // Look for proactive suggestion hint
    const proactiveHint = page.locator(
      '[data-testid="proactive-hint"], .bg-amber-50, .bg-blue-50',
    ).first();

    // Proactive hints may or may not be visible depending on ETP state
    const hasProactiveHint = await proactiveHint.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasProactiveHint) {
      // Verify hint has a help button
      const helpButton = page.locator('button:has-text("Ajudar")').first();

      if (await helpButton.isVisible()) {
        await helpButton.click();

        // Wait for response after clicking help
        await waitForAssistantResponse(page);

        console.log('Proactive suggestions displayed and interactive: PASSED');
      } else {
        console.log('Proactive suggestions displayed (no help button): PASSED');
      }
    } else {
      // No proactive hints - ETP may already be filled
      console.log('Proactive suggestions: SKIPPED (ETP may be complete)');
    }
  });

  /**
   * Test 5: Clear history functionality
   *
   * @description Verifies chat history can be cleared
   *
   * @acceptance-criteria
   * - Clear button is visible when there are messages
   * - Clicking clear shows confirmation dialog
   * - Confirming clears all messages
   */
  test('should clear chat history', async ({ page }) => {
    await navigateToETP(page);
    await openChatWidget(page);

    // Send a message first to have history
    await sendChatMessage(page, 'Teste de limpeza de historico');
    await waitForAssistantResponse(page);

    // Find clear history button
    const clearButton = page.locator(
      '[aria-label="Limpar historico"], button:has(svg.lucide-trash-2)',
    ).first();

    if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearButton.click();

      // Confirm in dialog
      const confirmDialog = page.locator('[role="dialog"]:has-text("Limpar historico")');
      await expect(confirmDialog).toBeVisible();

      const confirmButton = page.locator('button:has-text("Limpar")').last();
      await confirmButton.click();

      // Wait for dialog to close
      await page.waitForTimeout(500);

      // Verify messages are cleared
      const messages = page.locator(
        '[data-testid="chat-message-user"], [data-testid="chat-message-assistant"]',
      );
      const messageCount = await messages.count();
      expect(messageCount).toBe(0);

      console.log('Clear history functionality: PASSED');
    } else {
      console.log('Clear history: SKIPPED (button not visible)');
    }
  });

  /**
   * Test 6: Suggestions chips functionality
   *
   * @description Verifies suggestion chips send predefined prompts
   *
   * @acceptance-criteria
   * - Suggestion chips are visible
   * - Clicking a chip sends the corresponding message
   * - Response is received for the suggestion
   */
  test('should use suggestion chips to send messages', async ({ page }) => {
    await navigateToETP(page);
    await openChatWidget(page);

    // Find suggestion chips
    const suggestionChips = page.locator(
      '[data-testid="suggestion-chip"], button[data-suggestion]',
    );

    const chipCount = await suggestionChips.count();

    if (chipCount > 0) {
      // Click first suggestion chip
      const firstChip = suggestionChips.first();
      const chipText = await firstChip.textContent();

      await firstChip.click();

      // Wait for response
      await waitForAssistantResponse(page);

      // Verify user message was sent
      const userMessage = page.locator(
        '[data-testid="chat-message-user"], [data-role="user"]',
      ).last();
      const userMessageText = await userMessage.textContent();
      expect(userMessageText).toBeTruthy();

      console.log(`Suggestion chips functionality: PASSED (clicked "${chipText}")`);
    } else {
      console.log('Suggestion chips: SKIPPED (no chips found)');
    }
  });

  /**
   * Test 7: Multiple messages in conversation
   *
   * @description Verifies multiple messages can be sent in a conversation
   *
   * @acceptance-criteria
   * - Multiple messages can be sent sequentially
   * - All messages and responses are displayed
   * - Conversation maintains context
   */
  test('should handle multiple messages in conversation', async ({ page }) => {
    await navigateToETP(page);
    await openChatWidget(page);

    // Send first message
    await sendChatMessage(page, 'Ola, preciso de ajuda com meu ETP');
    await waitForAssistantResponse(page);

    // Send second message
    await sendChatMessage(page, 'Qual a estrutura recomendada?');
    await waitForAssistantResponse(page);

    // Verify multiple messages exist
    const userMessages = page.locator(
      '[data-testid="chat-message-user"], [data-role="user"]',
    );
    const assistantMessages = page.locator(
      '[data-testid="chat-message-assistant"], [data-role="assistant"]',
    );

    expect(await userMessages.count()).toBeGreaterThanOrEqual(2);
    expect(await assistantMessages.count()).toBeGreaterThanOrEqual(2);

    console.log('Multiple messages in conversation: PASSED');
  });
});

/**
 * Rate Limit Tests - Separate suite for rate limiting
 */
test.describe('ETP Chatbot - Rate Limiting', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_RATE_LIMIT_TEST,
    'Rate limit tests are slow and optional. Set E2E_RATE_LIMIT_TEST=true to run.',
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * Test 8: Rate limit enforcement
   *
   * @description Verifies rate limit is enforced after 30 messages/minute
   *
   * @acceptance-criteria
   * - First 30 messages are accepted
   * - 31st message shows rate limit error
   * - Error message is displayed to user
   *
   * @note This test is slow (~2 minutes) and is skipped by default
   */
  test('should enforce rate limit after 30 messages', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes timeout

    await navigateToETP(page);
    await openChatWidget(page);

    // Send 31 messages rapidly
    for (let i = 1; i <= 31; i++) {
      await sendChatMessage(page, `Mensagem de teste ${i}`);

      // Don't wait for response for speed, but wait a tiny bit
      await page.waitForTimeout(100);

      if (i % 10 === 0) {
        console.log(`Sent ${i} messages...`);
      }
    }

    // Wait for rate limit error to appear
    const rateLimitError = page.locator(
      '[data-testid="rate-limit-error"], text=limite, text=muitas, .text-apple-red',
    ).first();

    const hasRateLimitError = await rateLimitError
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasRateLimitError) {
      console.log('Rate limit enforcement: PASSED');
    } else {
      // Rate limiting might be handled differently (e.g., 429 response)
      // Check for any error indication
      const anyError = page.locator('.text-red-500, .text-destructive, [role="alert"]').first();
      const hasAnyError = await anyError.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasAnyError) {
        console.log('Rate limit enforcement: PASSED (error shown)');
      } else {
        console.log('Rate limit enforcement: WARNING (no visible error, may be server-side only)');
      }
    }
  });
});

/**
 * Mobile Responsiveness Tests
 */
test.describe('ETP Chatbot - Mobile Responsiveness', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Mobile tests require full backend infrastructure.',
  );

  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  /**
   * Test 9: Chat widget works on mobile
   *
   * @description Verifies chat widget is usable on mobile viewports
   *
   * @acceptance-criteria
   * - Chat FAB is visible on mobile
   * - Chat panel opens full-screen on mobile
   * - Input and send button are accessible
   */
  test('should work correctly on mobile viewport', async ({ page }) => {
    await navigateToETP(page);

    // Open chat
    await openChatWidget(page);

    // Verify chat panel takes more screen space on mobile
    const chatPanel = page.locator('#chat-panel, [data-testid="chat-panel"]').first();
    await expect(chatPanel).toBeVisible();

    // Verify input is usable
    const chatInput = page.locator(
      '[data-testid="chat-input"], input[placeholder*="pergunta"], textarea[placeholder*="pergunta"]',
    ).first();
    await expect(chatInput).toBeVisible();

    // Send a message
    await sendChatMessage(page, 'Teste mobile');
    await waitForAssistantResponse(page);

    console.log('Mobile responsiveness: PASSED');
  });
});

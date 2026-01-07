/**
 * E2E Tests for Template-Based ETP Creation
 *
 * @description Tests for creating ETPs using the 4 template types (OBRAS, TI, SERVICOS, MATERIAIS)
 * and without any template (blank document).
 *
 * Tests cover:
 * 1. Template selection and dynamic fields visibility
 * 2. ETP creation using OBRAS template with specific fields (ART, memorial, cronograma)
 * 3. ETP creation using TI template with specific fields (SLA, metodologia, seguranca)
 * 4. ETP creation using SERVICOS template with specific fields (produtividade, postos)
 * 5. ETP creation using MATERIAIS template with specific fields (garantia, catalogo)
 * 6. ETP creation without template (blank document)
 *
 * @issue #1241
 * @epic #1161
 * @group e2e
 * @group etp
 * @group templates
 * @priority P1
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@confenge.com.br',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin@123',
  },
  timeouts: {
    navigation: 15000,
    action: 5000,
    formSubmit: 10000,
    toast: 3000,
  },
};

/**
 * Template-specific test data
 */
const TEMPLATE_TEST_DATA = {
  OBRAS: {
    name: 'Template para Obras de Engenharia',
    typeLabel: 'Obras e Engenharia',
    icon: '🏗️',
    dynamicFields: {
      artRrt: 'ART-2024-001234567',
      memorialDescritivo:
        'Memorial descritivo completo para construcao de edificio de 3 andares com area total de 2000m2',
      cronogramaFisicoFinanceiro:
        'Fase 1: Fundacao (30 dias) - R$ 200.000\nFase 2: Estrutura (60 dias) - R$ 500.000\nFase 3: Acabamento (90 dias) - R$ 300.000',
      bdiReferencia: '25.5',
      projetoBasico: 'Projeto basico aprovado pelo CREA',
      licencasAmbientais: 'Licenca previa LP-2024-001 emitida pelo IBAMA',
    },
  },
  TI: {
    name: 'Template para Contratações de TI',
    typeLabel: 'Tecnologia da Informacao',
    icon: '💻',
    dynamicFields: {
      especificacoesTecnicas:
        'Sistema web responsivo com suporte a 10.000 usuarios simultaneos, tempo de resposta menor que 2 segundos',
      nivelServico:
        'Disponibilidade 99.9%, Tempo de resposta para incidentes criticos menor que 4 horas',
      metodologiaTrabalho: 'agil', // Select value
      requisitosSeguranca:
        'Conformidade com ISO 27001, criptografia AES-256, autenticacao multifator',
      integracaoSistemas:
        'Integracao via API REST com sistema de RH, SSO via SAML 2.0',
      lgpdConformidade:
        'Consentimento explicito para coleta de dados, direito ao esquecimento implementado',
    },
  },
  SERVICOS: {
    name: 'Template para Serviços Contínuos',
    typeLabel: 'Servicos Continuos',
    icon: '🔧',
    dynamicFields: {
      produtividade:
        '100 m2/dia por servente para limpeza de pisos, 50 m2/dia para limpeza de vidros',
      postosTrabalho: '15',
      frequenciaServico: 'Segunda a sexta, 8h as 18h',
      indicadoresDesempenho:
        'Taxa de satisfacao maior que 90%\nTempo de resposta menor que 4 horas\nAbsenteismo menor que 5%',
      uniformesEpi:
        'Uniforme completo (camisa, calca, sapato), luvas, mascara, oculos de protecao',
      convencaoColetiva: 'Sindicato dos Trabalhadores em Limpeza - SP',
    },
  },
  MATERIAIS: {
    name: 'Template para Aquisição de Materiais e Bens',
    typeLabel: 'Materiais e Bens',
    icon: '📦',
    dynamicFields: {
      especificacoesTecnicas:
        'Notebook com processador Intel Core i7 12a geracao, 16GB RAM DDR4, SSD 512GB, tela 15.6 polegadas Full HD',
      garantiaMinima: '36 meses contra defeitos de fabricacao',
      assistenciaTecnica:
        'Assistencia tecnica em ate 48 horas uteis, com cobertura nacional on-site',
      catalogo: 'CATMAT 449052',
      normasAplicaveis: 'ABNT NBR 5410, INMETRO, Energy Star',
      instalacaoTreinamento:
        'Instalacao inclusa, treinamento de 4 horas para usuarios finais',
    },
  },
};

/**
 * Common ETP fields for all templates
 */
const COMMON_ETP_DATA = {
  step1: {
    title: `E2E Template Test ${Date.now()}`,
    orgaoEntidade: 'Secretaria Municipal de Administracao',
    uasg: '123456',
    unidadeDemandante: 'Departamento de Compras',
    responsavelTecnicoNome: 'Maria Silva',
    responsavelTecnicoMatricula: '54321',
  },
  step2: {
    objeto: 'Objeto de teste para validacao de criacao de ETP via template',
    descricaoDetalhada:
      'Descricao detalhada do objeto para fins de teste E2E automatizado',
    quantidadeEstimada: '100',
    unidadeMedida: 'Unidades',
    justificativaContratacao:
      'Justificativa para contratacao conforme necessidades da administracao',
    necessidadeAtendida: 'Atender demandas operacionais do orgao',
    beneficiosEsperados: 'Melhoria na eficiencia administrativa',
  },
  step3: {
    requisitosTecnicos: 'Requisitos tecnicos especificos para o objeto',
    requisitosQualificacao:
      'Empresa com registro no orgao competente e experiencia comprovada',
    criteriosSustentabilidade:
      'Preferencia por produtos com certificacao ambiental',
    garantiaExigida: '12 meses',
    prazoExecucao: '180',
  },
  step5: {
    valorUnitario: '1000',
    valorEstimado: '100000',
    fontePesquisaPrecos: 'Painel de Precos do ME, cotacoes de mercado, PNCP',
    dotacaoOrcamentaria: '2024.04.122.0001.2001.3390.39',
  },
  step6: {
    nivelRisco: 'MEDIO',
    descricaoRiscos:
      'Riscos identificados: variacao de precos, atraso na entrega, mudancas no escopo',
    description:
      'ETP elaborado seguindo as diretrizes da Lei 14.133/2021 e IN SEGES/ME',
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
 * Helper function to navigate to ETPs list
 */
async function navigateToETPs(page: Page): Promise<void> {
  await page.goto('/etps');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/etps/);
}

/**
 * Helper function to open the create ETP wizard dialog
 */
async function openCreateWizard(page: Page): Promise<void> {
  if (!page.url().includes('/etps')) {
    await navigateToETPs(page);
  }

  const newEtpButton = page.locator('text=Novo ETP').first();
  await newEtpButton.click();
  await page.waitForTimeout(500);

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: TEST_CONFIG.timeouts.action });
}

/**
 * Helper function to select a template by type
 */
async function selectTemplate(page: Page, templateName: string): Promise<void> {
  // Find and click the template card
  const templateCard = page.locator(`text=${templateName}`).first();
  await expect(templateCard).toBeVisible({
    timeout: TEST_CONFIG.timeouts.action,
  });
  await templateCard.click();
  await page.waitForTimeout(300);

  // Verify selection indicator (checkmark) appears
  const selectedIndicator = page
    .locator('.bg-primary svg.w-4.h-4')
    .or(page.locator('[aria-selected="true"]'));
  await expect(selectedIndicator.first()).toBeVisible();
}

/**
 * Helper function to select blank document option
 */
async function selectBlankDocument(page: Page): Promise<void> {
  const blankButton = page.locator('text=Iniciar com documento em branco');
  await expect(blankButton).toBeVisible();
  await blankButton.click();
  await page.waitForTimeout(300);
}

/**
 * Helper function to click the "Next" button
 */
async function clickNext(page: Page): Promise<void> {
  const nextButton = page.locator('button:has-text("Proximo")');
  await nextButton.click();
  await page.waitForTimeout(300);
}

/**
 * Helper function to fill Step 1 (Identification) fields
 */
async function fillStep1(page: Page): Promise<void> {
  const data = COMMON_ETP_DATA.step1;
  await page.fill('input#title', data.title);
  await page.fill('input#orgaoEntidade', data.orgaoEntidade);
  await page.fill('input#uasg', data.uasg);
  await page.fill('input#unidadeDemandante', data.unidadeDemandante);
  await page.fill('input#responsavelTecnicoNome', data.responsavelTecnicoNome);
  await page.fill(
    'input#responsavelTecnicoMatricula',
    data.responsavelTecnicoMatricula,
  );
}

/**
 * Helper function to fill Step 2 (Object and Justification) fields
 */
async function fillStep2(page: Page): Promise<void> {
  const data = COMMON_ETP_DATA.step2;
  await page.fill('textarea#objeto, input#objeto', data.objeto);
  await page.fill('textarea#descricaoDetalhada', data.descricaoDetalhada);
  await page.fill('input#quantidadeEstimada', data.quantidadeEstimada);
  await page.fill('input#unidadeMedida', data.unidadeMedida);
  await page.fill(
    'textarea#justificativaContratacao',
    data.justificativaContratacao,
  );
  await page.fill('textarea#necessidadeAtendida', data.necessidadeAtendida);
  await page.fill('textarea#beneficiosEsperados', data.beneficiosEsperados);
}

/**
 * Helper function to fill Step 3 (Requirements) fields
 */
async function fillStep3(page: Page): Promise<void> {
  const data = COMMON_ETP_DATA.step3;
  await page.fill('textarea#requisitosTecnicos', data.requisitosTecnicos);
  await page.fill(
    'textarea#requisitosQualificacao',
    data.requisitosQualificacao,
  );
  await page.fill(
    'textarea#criteriosSustentabilidade',
    data.criteriosSustentabilidade,
  );
  await page.fill(
    'input#garantiaExigida, textarea#garantiaExigida',
    data.garantiaExigida,
  );
  await page.fill('input#prazoExecucao', data.prazoExecucao);
}

/**
 * Helper function to fill dynamic fields for OBRAS template
 */
async function fillDynamicFieldsObras(page: Page): Promise<void> {
  const data = TEMPLATE_TEST_DATA.OBRAS.dynamicFields;

  // Fill required fields
  const artInput = page
    .locator('input[id*="artRrt"], input[name*="artRrt"]')
    .first();
  if (await artInput.isVisible()) {
    await artInput.fill(data.artRrt);
  }

  const memorialInput = page
    .locator(
      'textarea[id*="memorialDescritivo"], textarea[name*="memorialDescritivo"]',
    )
    .first();
  if (await memorialInput.isVisible()) {
    await memorialInput.fill(data.memorialDescritivo);
  }

  const cronogramaInput = page
    .locator(
      'textarea[id*="cronogramaFisicoFinanceiro"], textarea[name*="cronogramaFisicoFinanceiro"]',
    )
    .first();
  if (await cronogramaInput.isVisible()) {
    await cronogramaInput.fill(data.cronogramaFisicoFinanceiro);
  }

  // Fill optional fields
  const bdiInput = page
    .locator('input[id*="bdiReferencia"], input[name*="bdiReferencia"]')
    .first();
  if (await bdiInput.isVisible()) {
    await bdiInput.fill(data.bdiReferencia);
  }
}

/**
 * Helper function to fill dynamic fields for TI template
 */
async function fillDynamicFieldsTI(page: Page): Promise<void> {
  const data = TEMPLATE_TEST_DATA.TI.dynamicFields;

  // Fill required fields
  const especInput = page
    .locator(
      'textarea[id*="especificacoesTecnicas"], textarea[name*="especificacoesTecnicas"]',
    )
    .first();
  if (await especInput.isVisible()) {
    await especInput.fill(data.especificacoesTecnicas);
  }

  const slaInput = page
    .locator('textarea[id*="nivelServico"], textarea[name*="nivelServico"]')
    .first();
  if (await slaInput.isVisible()) {
    await slaInput.fill(data.nivelServico);
  }

  // Select methodology
  const metodologiaSelect = page.locator('button[role="combobox"]').first();
  if (await metodologiaSelect.isVisible()) {
    await metodologiaSelect.click();
    await page.waitForTimeout(200);
    const agilOption = page.locator('text=Agil').first();
    if (await agilOption.isVisible()) {
      await agilOption.click();
    }
  }

  const segurancaInput = page
    .locator(
      'textarea[id*="requisitosSeguranca"], textarea[name*="requisitosSeguranca"]',
    )
    .first();
  if (await segurancaInput.isVisible()) {
    await segurancaInput.fill(data.requisitosSeguranca);
  }
}

/**
 * Helper function to fill dynamic fields for SERVICOS template
 */
async function fillDynamicFieldsServicos(page: Page): Promise<void> {
  const data = TEMPLATE_TEST_DATA.SERVICOS.dynamicFields;

  const produtividadeInput = page
    .locator('textarea[id*="produtividade"], textarea[name*="produtividade"]')
    .first();
  if (await produtividadeInput.isVisible()) {
    await produtividadeInput.fill(data.produtividade);
  }

  const postosInput = page
    .locator('input[id*="postosTrabalho"], input[name*="postosTrabalho"]')
    .first();
  if (await postosInput.isVisible()) {
    await postosInput.fill(data.postosTrabalho);
  }

  const frequenciaInput = page
    .locator('input[id*="frequenciaServico"], input[name*="frequenciaServico"]')
    .first();
  if (await frequenciaInput.isVisible()) {
    await frequenciaInput.fill(data.frequenciaServico);
  }
}

/**
 * Helper function to fill dynamic fields for MATERIAIS template
 */
async function fillDynamicFieldsMateriais(page: Page): Promise<void> {
  const data = TEMPLATE_TEST_DATA.MATERIAIS.dynamicFields;

  const especInput = page
    .locator(
      'textarea[id*="especificacoesTecnicas"], textarea[name*="especificacoesTecnicas"]',
    )
    .first();
  if (await especInput.isVisible()) {
    await especInput.fill(data.especificacoesTecnicas);
  }

  const garantiaInput = page
    .locator('input[id*="garantiaMinima"], input[name*="garantiaMinima"]')
    .first();
  if (await garantiaInput.isVisible()) {
    await garantiaInput.fill(data.garantiaMinima);
  }
}

/**
 * Helper function to fill Step 5 (Costs) fields
 */
async function fillStep5(page: Page): Promise<void> {
  const data = COMMON_ETP_DATA.step5;
  await page.fill('input#valorUnitario', data.valorUnitario);
  await page.fill('input#valorEstimado', data.valorEstimado);
  await page.fill(
    'textarea#fontePesquisaPrecos, input#fontePesquisaPrecos',
    data.fontePesquisaPrecos,
  );
  await page.fill('input#dotacaoOrcamentaria', data.dotacaoOrcamentaria);
}

/**
 * Helper function to fill Step 6 (Risks) fields
 */
async function fillStep6(page: Page): Promise<void> {
  const data = COMMON_ETP_DATA.step6;

  // Select risk level
  const select = page.locator('select#nivelRisco');
  if (await select.isVisible()) {
    await select.selectOption(data.nivelRisco);
  } else {
    // Try radio button or combobox
    const radioButton = page.locator(
      `input[name="nivelRisco"][value="${data.nivelRisco}"]`,
    );
    if (await radioButton.isVisible()) {
      await radioButton.click();
    }
  }

  await page.fill('textarea#descricaoRiscos', data.descricaoRiscos);
  await page.fill('textarea#description', data.description);
}

/**
 * Template-Based ETP Creation E2E Test Suite
 */
test.describe('Template-Based ETP Creation', () => {
  test.skip(
    !!process.env.CI && !process.env.E2E_API_URL,
    'Template-based creation tests require full backend infrastructure. Set E2E_API_URL in CI or run locally.',
  );

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    await login(page);
  });

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
   * Test 1: Verify template selector shows all 4 templates
   */
  test('should display all 4 templates in template selector', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Step 0 should be Template Selection
    await expect(page.locator('text=Escolha um modelo de ETP')).toBeVisible();

    // Verify all 4 templates are visible
    await expect(
      page.locator(`text=${TEMPLATE_TEST_DATA.OBRAS.name}`),
    ).toBeVisible();
    await expect(
      page.locator(`text=${TEMPLATE_TEST_DATA.TI.name}`),
    ).toBeVisible();
    await expect(
      page.locator(`text=${TEMPLATE_TEST_DATA.SERVICOS.name}`),
    ).toBeVisible();
    await expect(
      page.locator(`text=${TEMPLATE_TEST_DATA.MATERIAIS.name}`),
    ).toBeVisible();

    // Verify blank document option
    await expect(
      page.locator('text=Iniciar com documento em branco'),
    ).toBeVisible();

    console.log('Template selector displays all 4 templates: PASSED');
  });

  /**
   * Test 2: Create ETP using OBRAS template with specific fields
   */
  test('should create ETP using OBRAS template with ART and memorial fields', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Step 0: Select OBRAS template
    console.log('Step 0: Selecting OBRAS template');
    await selectTemplate(page, TEMPLATE_TEST_DATA.OBRAS.name);
    await clickNext(page);

    // Step 1: Identification
    console.log('Step 1: Identification');
    await expect(page.locator('h3:has-text("Identificacao")')).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });
    await fillStep1(page);
    await clickNext(page);

    // Step 2: Object and Justification
    console.log('Step 2: Object and Justification');
    await expect(
      page.locator('h3:has-text("Objeto e Justificativa")'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });
    await fillStep2(page);
    await clickNext(page);

    // Step 3: Requirements
    console.log('Step 3: Requirements');
    await expect(
      page.locator('h3:has-text("Requisitos Tecnicos")'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });
    await fillStep3(page);
    await clickNext(page);

    // Step 4: Dynamic Fields for OBRAS
    console.log('Step 4: Dynamic Fields - OBRAS');
    await expect(
      page.locator('text=Campos Especificos - Obras e Engenharia'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify OBRAS-specific fields are visible
    await expect(page.locator('text=ART/RRT')).toBeVisible();
    await expect(page.locator('text=Memorial Descritivo')).toBeVisible();
    await expect(
      page.locator('text=Cronograma Fisico-Financeiro'),
    ).toBeVisible();

    await fillDynamicFieldsObras(page);
    await clickNext(page);

    // Step 5: Costs
    console.log('Step 5: Costs');
    await expect(
      page.locator('h3:has-text("Estimativa de Custos")'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });
    await fillStep5(page);
    await clickNext(page);

    // Step 6: Risks
    console.log('Step 6: Risks');
    await expect(page.locator('h3:has-text("Analise de Riscos")')).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });
    await fillStep6(page);

    // Submit
    const submitButton = page.locator('button:has-text("Criar ETP")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Wait for navigation to ETP editor
    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.formSubmit,
    });

    expect(page.url()).toMatch(/\/etps\/[^/]+$/);
    console.log('OBRAS template ETP creation: PASSED');
  });

  /**
   * Test 3: Create ETP using TI template with SLA and methodology fields
   */
  test('should create ETP using TI template with SLA and methodology fields', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Step 0: Select TI template
    console.log('Step 0: Selecting TI template');
    await selectTemplate(page, TEMPLATE_TEST_DATA.TI.name);
    await clickNext(page);

    // Fill steps 1-3
    await fillStep1(page);
    await clickNext(page);
    await fillStep2(page);
    await clickNext(page);
    await fillStep3(page);
    await clickNext(page);

    // Step 4: Dynamic Fields for TI
    console.log('Step 4: Dynamic Fields - TI');
    await expect(
      page.locator('text=Campos Especificos - Tecnologia da Informacao'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify TI-specific fields are visible
    await expect(page.locator('text=Especificacoes Tecnicas')).toBeVisible();
    await expect(page.locator('text=Niveis de Servico (SLA)')).toBeVisible();
    await expect(page.locator('text=Metodologia de Trabalho')).toBeVisible();
    await expect(page.locator('text=Requisitos de Seguranca')).toBeVisible();

    await fillDynamicFieldsTI(page);
    await clickNext(page);

    // Fill remaining steps and submit
    await fillStep5(page);
    await clickNext(page);
    await fillStep6(page);

    const submitButton = page.locator('button:has-text("Criar ETP")');
    await submitButton.click();

    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.formSubmit,
    });

    expect(page.url()).toMatch(/\/etps\/[^/]+$/);
    console.log('TI template ETP creation: PASSED');
  });

  /**
   * Test 4: Create ETP using SERVICOS template with productivity fields
   */
  test('should create ETP using SERVICOS template with productivity fields', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Step 0: Select SERVICOS template
    console.log('Step 0: Selecting SERVICOS template');
    await selectTemplate(page, TEMPLATE_TEST_DATA.SERVICOS.name);
    await clickNext(page);

    // Fill steps 1-3
    await fillStep1(page);
    await clickNext(page);
    await fillStep2(page);
    await clickNext(page);
    await fillStep3(page);
    await clickNext(page);

    // Step 4: Dynamic Fields for SERVICOS
    console.log('Step 4: Dynamic Fields - SERVICOS');
    await expect(
      page.locator('text=Campos Especificos - Servicos Continuos'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify SERVICOS-specific fields are visible
    await expect(page.locator('text=Produtividade')).toBeVisible();
    await expect(page.locator('text=Postos de Trabalho')).toBeVisible();
    await expect(page.locator('text=Frequencia do Servico')).toBeVisible();

    await fillDynamicFieldsServicos(page);
    await clickNext(page);

    // Fill remaining steps and submit
    await fillStep5(page);
    await clickNext(page);
    await fillStep6(page);

    const submitButton = page.locator('button:has-text("Criar ETP")');
    await submitButton.click();

    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.formSubmit,
    });

    expect(page.url()).toMatch(/\/etps\/[^/]+$/);
    console.log('SERVICOS template ETP creation: PASSED');
  });

  /**
   * Test 5: Create ETP using MATERIAIS template with guarantee fields
   */
  test('should create ETP using MATERIAIS template with guarantee fields', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Step 0: Select MATERIAIS template
    console.log('Step 0: Selecting MATERIAIS template');
    await selectTemplate(page, TEMPLATE_TEST_DATA.MATERIAIS.name);
    await clickNext(page);

    // Fill steps 1-3
    await fillStep1(page);
    await clickNext(page);
    await fillStep2(page);
    await clickNext(page);
    await fillStep3(page);
    await clickNext(page);

    // Step 4: Dynamic Fields for MATERIAIS
    console.log('Step 4: Dynamic Fields - MATERIAIS');
    await expect(
      page.locator('text=Campos Especificos - Materiais e Bens'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    // Verify MATERIAIS-specific fields are visible
    await expect(page.locator('text=Especificacoes Tecnicas')).toBeVisible();
    await expect(page.locator('text=Garantia Minima')).toBeVisible();
    await expect(page.locator('text=Codigo CATMAT/CATSER')).toBeVisible();

    await fillDynamicFieldsMateriais(page);
    await clickNext(page);

    // Fill remaining steps and submit
    await fillStep5(page);
    await clickNext(page);
    await fillStep6(page);

    const submitButton = page.locator('button:has-text("Criar ETP")');
    await submitButton.click();

    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.formSubmit,
    });

    expect(page.url()).toMatch(/\/etps\/[^/]+$/);
    console.log('MATERIAIS template ETP creation: PASSED');
  });

  /**
   * Test 6: Create ETP without template (blank document)
   */
  test('should create ETP without template (blank document)', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Step 0: Select blank document
    console.log('Step 0: Selecting blank document');
    await selectBlankDocument(page);

    // Verify blank document selection message
    await expect(
      page.locator('text=Documento em branco selecionado'),
    ).toBeVisible();

    await clickNext(page);

    // Fill steps 1-3
    await fillStep1(page);
    await clickNext(page);
    await fillStep2(page);
    await clickNext(page);
    await fillStep3(page);
    await clickNext(page);

    // Step 4: Dynamic Fields - should show info message for blank document
    console.log('Step 4: Dynamic Fields - Blank document');
    await expect(
      page.locator(
        'text=Selecione um template no passo anterior para ver campos especificos',
      ),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });

    await clickNext(page);

    // Fill remaining steps and submit
    await fillStep5(page);
    await clickNext(page);
    await fillStep6(page);

    const submitButton = page.locator('button:has-text("Criar ETP")');
    await submitButton.click();

    await page.waitForURL(/\/etps\/[^/]+$/, {
      timeout: TEST_CONFIG.timeouts.formSubmit,
    });

    expect(page.url()).toMatch(/\/etps\/[^/]+$/);
    console.log('Blank document ETP creation: PASSED');
  });

  /**
   * Test 7: Verify dynamic fields change when switching templates
   */
  test('should show different dynamic fields when changing template selection', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Select OBRAS template first
    console.log('Testing template switching - selecting OBRAS');
    await selectTemplate(page, TEMPLATE_TEST_DATA.OBRAS.name);

    // Switch to TI template
    console.log('Switching to TI template');
    await selectTemplate(page, TEMPLATE_TEST_DATA.TI.name);

    // Navigate through steps to verify TI fields appear
    await clickNext(page); // Go to step 1
    await fillStep1(page);
    await clickNext(page);
    await fillStep2(page);
    await clickNext(page);
    await fillStep3(page);
    await clickNext(page);

    // Verify TI-specific fields appear (not OBRAS)
    await expect(
      page.locator('text=Campos Especificos - Tecnologia da Informacao'),
    ).toBeVisible({
      timeout: TEST_CONFIG.timeouts.action,
    });
    await expect(page.locator('text=Niveis de Servico (SLA)')).toBeVisible();

    // OBRAS fields should NOT be visible
    const artField = page.locator('text=ART/RRT');
    await expect(artField).not.toBeVisible();

    console.log('Template switching test: PASSED');
  });

  /**
   * Test 8: Verify template type label badges are displayed correctly
   */
  test('should display correct template type labels and icons', async ({
    page,
  }) => {
    await navigateToETPs(page);
    await openCreateWizard(page);

    // Verify OBRAS template card has correct type label
    const obrasCard = page.locator(
      `[role="option"]:has-text("${TEMPLATE_TEST_DATA.OBRAS.name}")`,
    );
    await expect(obrasCard.locator('text=Obras e Engenharia')).toBeVisible();

    // Verify TI template card
    const tiCard = page.locator(
      `[role="option"]:has-text("${TEMPLATE_TEST_DATA.TI.name}")`,
    );
    await expect(tiCard.locator('text=Tecnologia da Informacao')).toBeVisible();

    // Verify SERVICOS template card
    const servicosCard = page.locator(
      `[role="option"]:has-text("${TEMPLATE_TEST_DATA.SERVICOS.name}")`,
    );
    await expect(servicosCard.locator('text=Servicos Continuos')).toBeVisible();

    // Verify MATERIAIS template card
    const materiaisCard = page.locator(
      `[role="option"]:has-text("${TEMPLATE_TEST_DATA.MATERIAIS.name}")`,
    );
    await expect(materiaisCard.locator('text=Materiais e Bens')).toBeVisible();

    console.log('Template type labels verification: PASSED');
  });
});

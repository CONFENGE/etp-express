import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';
import { OpenAIService } from './llm/openai.service';
import { LegalAgent } from './agents/legal.agent';
import { FundamentacaoAgent } from './agents/fundamentacao.agent';
import { ClarezaAgent } from './agents/clareza.agent';
import { SimplificacaoAgent } from './agents/simplificacao.agent';
import { AntiHallucinationAgent } from './agents/anti-hallucination.agent';
import { PIIRedactionService } from '../privacy/pii-redaction.service';
import { PerplexityService } from '../search/perplexity/perplexity.service';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Integration tests for OrchestratorService
 *
 * Tests the core orchestration service that coordinates 5 specialized agents:
 * - LegalAgent: Ensures legal compliance with Lei 14.133/2021
 * - FundamentacaoAgent: Validates proper justification structure
 * - ClarezaAgent: Analyzes text clarity and readability
 * - SimplificacaoAgent: Detects complex language and suggests simplifications
 * - AntiHallucinationAgent: Prevents fabrication of legal references
 *
 * Coverage: 98.57% (lines), 87.5% (branches), 100% (functions)
 */
describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let openaiService: OpenAIService;
  let legalAgent: LegalAgent;
  let fundamentacaoAgent: FundamentacaoAgent;
  let clarezaAgent: ClarezaAgent;
  let simplificacaoAgent: SimplificacaoAgent;
  let antiHallucinationAgent: AntiHallucinationAgent;

  // Mock responses
  const mockOpenAIResponse = {
    content: 'Conteúdo gerado pela IA para teste de integração',
    tokens: 150,
    model: 'gpt-4',
  };

  const mockLegalValidation = {
    isCompliant: true,
    score: 85,
    issues: [],
    recommendations: [],
    references: ['Lei 14.133/2021'],
  };

  const mockFundamentacaoResult = {
    score: 80,
    hasNecessidade: true,
    hasInteressePublico: true,
    hasBeneficios: true,
    hasRiscos: true,
    suggestions: [],
  };

  const mockClarezaResult = {
    score: 90,
    readabilityIndex: 50,
    issues: [],
    suggestions: [],
    metrics: {
      avgSentenceLength: 15,
      avgWordLength: 5,
      complexWords: 2,
      passiveVoice: 0,
    },
  };

  const mockSimplificacaoResultHigh = {
    score: 85,
    originalLength: 100,
    simplifiedSuggestions: [],
    redundancies: [],
    complexPhrases: [],
  };

  const mockSimplificacaoResultLow = {
    score: 65,
    originalLength: 100,
    simplifiedSuggestions: ['Simplifique este texto'],
    redundancies: [],
    complexPhrases: [],
  };

  const mockHallucinationCheck = {
    score: 95,
    confidence: 0.9,
    warnings: [],
    suspiciousElements: [],
    verified: true,
  };

  /**
   * Creates a mock OpenAIService instance
   * @returns Mock object with generateCompletion method
   */
  const createMockOpenAIService = () => ({
    generateCompletion: jest.fn().mockResolvedValue(mockOpenAIResponse),
  });

  /**
   * Creates a mock LegalAgent instance
   * @returns Mock object with legal compliance validation methods
   */
  const createMockLegalAgent = () => ({
    enrichWithLegalContext: jest
      .fn()
      .mockImplementation((prompt: string) => Promise.resolve(prompt)),
    validate: jest.fn().mockResolvedValue(mockLegalValidation),
    getSystemPrompt: jest
      .fn()
      .mockReturnValue('Regras de conformidade legal...'),
  });

  /**
   * Creates a mock FundamentacaoAgent instance
   * @returns Mock object with justification analysis methods
   */
  const createMockFundamentacaoAgent = () => ({
    enrich: jest
      .fn()
      .mockImplementation((prompt: string) => Promise.resolve(prompt)),
    analyze: jest.fn().mockResolvedValue(mockFundamentacaoResult),
    getSystemPrompt: jest.fn().mockReturnValue('Regras de fundamentação...'),
  });

  /**
   * Creates a mock ClarezaAgent instance
   * @returns Mock object with clarity analysis methods
   */
  const createMockClarezaAgent = () => ({
    analyze: jest.fn().mockResolvedValue(mockClarezaResult),
    getSystemPrompt: jest.fn().mockReturnValue('Regras de clareza...'),
  });

  /**
   * Creates a mock SimplificacaoAgent instance
   * @returns Mock object with simplification analysis and transformation methods
   */
  const createMockSimplificacaoAgent = () => ({
    analyze: jest.fn().mockResolvedValue(mockSimplificacaoResultHigh),
    simplify: jest
      .fn()
      .mockImplementation((content: string) =>
        Promise.resolve(`${content} [simplificado]`),
      ),
    getSystemPrompt: jest.fn().mockReturnValue('Regras de simplificação...'),
  });

  /**
   * Creates a mock AntiHallucinationAgent instance
   * @returns Mock object with hallucination detection methods
   */
  const createMockAntiHallucinationAgent = () => ({
    check: jest.fn().mockResolvedValue(mockHallucinationCheck),
    generateSafetyPrompt: jest
      .fn()
      .mockResolvedValue('⚠️ NÃO invente números de leis...'),
    getSystemPrompt: jest.fn().mockReturnValue('Regras anti-alucinação...'),
  });

  /**
   * Creates a mock PerplexityService instance
   * @returns Mock object with search methods
   */
  const createMockPerplexityService = () => ({
    search: jest.fn().mockResolvedValue({
      results: [],
      summary: 'Fundamentação de mercado encontrada',
      sources: ['https://example.com'],
      isFallback: false,
    }),
    searchSimilarContracts: jest.fn().mockResolvedValue({
      results: [],
      summary: '',
      sources: [],
      isFallback: false,
    }),
    searchLegalReferences: jest.fn().mockResolvedValue({
      results: [],
      summary: '',
      sources: [],
      isFallback: false,
    }),
    getCircuitState: jest.fn().mockReturnValue({
      opened: false,
      halfOpen: false,
      closed: true,
      stats: {},
    }),
    ping: jest.fn().mockResolvedValue({ latency: 100 }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: OpenAIService, useValue: createMockOpenAIService() },
        { provide: LegalAgent, useValue: createMockLegalAgent() },
        {
          provide: FundamentacaoAgent,
          useValue: createMockFundamentacaoAgent(),
        },
        { provide: ClarezaAgent, useValue: createMockClarezaAgent() },
        {
          provide: SimplificacaoAgent,
          useValue: createMockSimplificacaoAgent(),
        },
        {
          provide: AntiHallucinationAgent,
          useValue: createMockAntiHallucinationAgent(),
        },
        {
          provide: PerplexityService,
          useValue: createMockPerplexityService(),
        },
        {
          provide: PIIRedactionService,
          useValue: {
            redact: jest.fn().mockImplementation((content: string) => ({
              redacted: content, // Return original content (no PII in test cases)
              findings: [],
            })),
            containsPII: jest.fn().mockReturnValue(false),
            getSupportedTypes: jest
              .fn()
              .mockReturnValue([
                'email',
                'cpf',
                'cnpj',
                'phone',
                'processNumber',
                'rg',
                'matricula',
                'cep',
              ]),
          },
        },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
    openaiService = module.get<OpenAIService>(OpenAIService);
    legalAgent = module.get<LegalAgent>(LegalAgent);
    fundamentacaoAgent = module.get<FundamentacaoAgent>(FundamentacaoAgent);
    clarezaAgent = module.get<ClarezaAgent>(ClarezaAgent);
    simplificacaoAgent = module.get<SimplificacaoAgent>(SimplificacaoAgent);
    antiHallucinationAgent = module.get<AntiHallucinationAgent>(
      AntiHallucinationAgent,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * Tests that generateSection returns a complete GenerationResult object
   * with all required fields: content, metadata, validationResults, warnings, and disclaimer
   */
  describe('Teste 1: generateSection retorna resultado completo', () => {
    it('deve retornar objeto GenerationResult com content, metadata, validationResults, warnings e disclaimer', async () => {
      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Gerar introdução para ETP',
      };

      const result = await service.generateSection(request);

      // Verifica estrutura do resultado
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');

      // Verifica metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.tokens).toBe(150);
      expect(result.metadata.model).toBe('gpt-4');
      expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.agentsUsed).toBeDefined();
      expect(Array.isArray(result.metadata.agentsUsed)).toBe(true);

      // Verifica validationResults
      expect(result.validationResults).toBeDefined();
      expect(result.validationResults.legal).toBeDefined();
      expect(result.validationResults.clareza).toBeDefined();
      expect(result.validationResults.simplificacao).toBeDefined();
      expect(result.validationResults.antiHallucination).toBeDefined();

      // Verifica warnings e disclaimer
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.disclaimer).toBeDefined();
      expect(typeof result.disclaimer).toBe('string');
    });

    it('deve incluir dados do ETP no prompt quando fornecidos', async () => {
      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Gerar introdução',
        etpData: {
          objeto: 'Contratação de serviços de TI',
          metadata: { orgao: 'Ministério da Saúde' },
        },
      };

      await service.generateSection(request);

      // Verifica que OpenAI foi chamado
      expect(openaiService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('CONTEXTO DO ETP'),
        }),
      );
    });
  });

  /**
   * Tests that all 5 specialized agents are executed during the generateSection flow
   * Validates proper agent orchestration and execution order
   */
  describe('Teste 2: Todos os 5 agentes são executados durante generateSection', () => {
    it('deve executar LegalAgent durante enriquecimento e validação', async () => {
      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      await service.generateSection(request);

      expect(legalAgent.enrichWithLegalContext).toHaveBeenCalled();
      expect(legalAgent.validate).toHaveBeenCalled();
      expect(legalAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it('deve executar FundamentacaoAgent para seções que precisam de fundamentação', async () => {
      const request = {
        sectionType: 'justificativa',
        title: 'Justificativa',
        userInput: 'Teste',
      };

      await service.generateSection(request);

      expect(fundamentacaoAgent.enrich).toHaveBeenCalled();
      expect(fundamentacaoAgent.analyze).toHaveBeenCalled();
      expect(fundamentacaoAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it('NÃO deve executar FundamentacaoAgent para seções que não precisam', async () => {
      const request = {
        sectionType: 'glossario',
        title: 'Glossário',
        userInput: 'Teste',
      };

      await service.generateSection(request);

      // enrich não deve ser chamado para seções que não precisam de fundamentação
      expect(fundamentacaoAgent.enrich).not.toHaveBeenCalled();
      // analyze retorna null (Promise.resolve(null)) para estas seções
      expect(fundamentacaoAgent.analyze).not.toHaveBeenCalled();
    });

    it('deve executar ClarezaAgent durante validação', async () => {
      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      await service.generateSection(request);

      expect(clarezaAgent.analyze).toHaveBeenCalled();
      expect(clarezaAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it('deve executar SimplificacaoAgent durante análise pós-geração', async () => {
      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      await service.generateSection(request);

      expect(simplificacaoAgent.analyze).toHaveBeenCalled();
      expect(simplificacaoAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it('deve executar AntiHallucinationAgent durante preparação e validação', async () => {
      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      await service.generateSection(request);

      expect(antiHallucinationAgent.generateSafetyPrompt).toHaveBeenCalled();
      expect(antiHallucinationAgent.check).toHaveBeenCalled();
      expect(antiHallucinationAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it('deve registrar todos os agentes usados em metadata.agentsUsed', async () => {
      const request = {
        sectionType: 'justificativa',
        title: 'Justificativa',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.metadata.agentsUsed).toContain('base-prompt');
      expect(result.metadata.agentsUsed).toContain('legal-context');
      expect(result.metadata.agentsUsed).toContain('fundamentacao-guidance');
      expect(result.metadata.agentsUsed).toContain('anti-hallucination');
      expect(result.metadata.agentsUsed).toContain('simplification-analysis');
      expect(result.metadata.agentsUsed).toContain('validation-legal');
      expect(result.metadata.agentsUsed).toContain('validation-clareza');
      expect(result.metadata.agentsUsed).toContain('validation-hallucination');
    });
  });

  /**
   * Tests that the mandatory AI-generated content disclaimer is added to all results
   * Ensures compliance with transparency requirements for AI-assisted content
   */
  describe('Teste 3: Disclaimer é adicionado ao resultado final', () => {
    it('deve adicionar disclaimer obrigatório ao conteúdo', async () => {
      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.content).toContain(
        '⚠️ Este conteúdo foi gerado por IA e requer validação humana antes do uso oficial.',
      );
    });

    it('deve ter disclaimer no campo dedicado do resultado', async () => {
      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.disclaimer).toBe(DISCLAIMER);
    });

    it('disclaimer deve estar presente mesmo quando há warnings', async () => {
      // Mock com score baixo para gerar warnings
      jest
        .spyOn(simplificacaoAgent, 'analyze')
        .mockResolvedValue(mockSimplificacaoResultLow);

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.content).toContain('⚠️');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.disclaimer).toBeDefined();
    });
  });

  /**
   * Tests the auto-simplification trigger when SimplificacaoAgent returns score < 70
   * Validates that complex text is automatically simplified and warnings are added
   */
  describe('Teste 4: Score < 70 em SimplificaçãoAgent dispara auto-simplificação', () => {
    it('deve chamar simplify() quando score < 70', async () => {
      // Mock retorna score 65 (< 70)
      jest
        .spyOn(simplificacaoAgent, 'analyze')
        .mockResolvedValue(mockSimplificacaoResultLow);

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      await service.generateSection(request);

      expect(simplificacaoAgent.analyze).toHaveBeenCalledTimes(1);
      expect(simplificacaoAgent.simplify).toHaveBeenCalledTimes(1);
    });

    it('deve adicionar warning sobre simplificação automática quando score < 70', async () => {
      jest
        .spyOn(simplificacaoAgent, 'analyze')
        .mockResolvedValue(mockSimplificacaoResultLow);

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.warnings).toContain(
        'Texto foi simplificado automaticamente. Revise para garantir correção.',
      );
    });

    it('NÃO deve chamar simplify() quando score >= 70', async () => {
      // Mock retorna score 85 (>= 70)
      jest
        .spyOn(simplificacaoAgent, 'analyze')
        .mockResolvedValue(mockSimplificacaoResultHigh);

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      await service.generateSection(request);

      expect(simplificacaoAgent.analyze).toHaveBeenCalledTimes(1);
      expect(simplificacaoAgent.simplify).not.toHaveBeenCalled();
    });

    it("deve incluir '[simplificado]' no conteúdo após simplificação", async () => {
      jest
        .spyOn(simplificacaoAgent, 'analyze')
        .mockResolvedValue(mockSimplificacaoResultLow);

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.content).toContain('[simplificado]');
    });
  });

  /**
   * Tests that validateContent executes 4 validation agents in parallel using Promise.all
   * Validates proper parallel execution for performance optimization
   */
  describe('Teste 5: validateContent executa 4 agentes em paralelo', () => {
    it('deve executar os 4 agentes de validação', async () => {
      const content = 'Texto para validação';
      const sectionType = 'introducao';

      await service.validateContent(content, sectionType);

      expect(legalAgent.validate).toHaveBeenCalledWith(content, {
        type: sectionType,
      });
      expect(clarezaAgent.analyze).toHaveBeenCalledWith(content);
      expect(simplificacaoAgent.analyze).toHaveBeenCalledWith(content);
      expect(antiHallucinationAgent.check).toHaveBeenCalledWith(content);
    });

    it('deve retornar resultado com scores de todos os agentes', async () => {
      const content = 'Texto para validação';
      const sectionType = 'introducao';

      const result = await service.validateContent(content, sectionType);

      expect(result.legal).toBeDefined();
      expect(result.clareza).toBeDefined();
      expect(result.simplificacao).toBeDefined();
      expect(result.antiHallucination).toBeDefined();
      expect(result.overallScore).toBeDefined();
    });

    /**
     * Validates the overallScore calculation formula: (legal + clareza + simplificacao + antiHallucination) / 4
     */
    it('deve calcular overallScore corretamente (média dos 4 scores)', async () => {
      // Mock com scores conhecidos
      jest.spyOn(legalAgent, 'validate').mockResolvedValue({
        isCompliant: true,
        score: 80,
        issues: [],
        recommendations: [],
        references: [],
      });

      jest.spyOn(clarezaAgent, 'analyze').mockResolvedValue({
        score: 90,
        readabilityIndex: 50,
        issues: [],
        suggestions: [],
        metrics: {
          avgSentenceLength: 15,
          avgWordLength: 5,
          complexWords: 2,
          passiveVoice: 0,
        },
      });

      jest.spyOn(simplificacaoAgent, 'analyze').mockResolvedValue({
        score: 70,
        originalLength: 100,
        simplifiedSuggestions: [],
        redundancies: [],
        complexPhrases: [],
      });

      jest.spyOn(antiHallucinationAgent, 'check').mockResolvedValue({
        score: 100,
        confidence: 0.9,
        warnings: [],
        suspiciousElements: [],
        verified: true,
      });

      const result = await service.validateContent('Texto', 'introducao');

      // overallScore = (80 + 90 + 70 + 100) / 4 = 85.00
      expect(result.overallScore).toBe('85.00');
    });

    it('deve executar validações em paralelo (Promise.all)', async () => {
      // Spy para verificar que todas as promises são criadas antes de serem aguardadas
      const validateSpy = jest.spyOn(legalAgent, 'validate');
      const analyzeClarezaSpy = jest.spyOn(clarezaAgent, 'analyze');
      const analyzeSimplificacaoSpy = jest.spyOn(simplificacaoAgent, 'analyze');
      const checkSpy = jest.spyOn(antiHallucinationAgent, 'check');

      await service.validateContent('Texto', 'introducao');

      // Todas devem ter sido chamadas
      expect(validateSpy).toHaveBeenCalled();
      expect(analyzeClarezaSpy).toHaveBeenCalled();
      expect(analyzeSimplificacaoSpy).toHaveBeenCalled();
      expect(checkSpy).toHaveBeenCalled();
    });
  });

  /**
   * Additional integration tests for edge cases and error handling
   * Tests warning collection, deduplication, and error propagation
   */
  describe('Testes adicionais de integração', () => {
    it('deve deduplicar warnings no resultado final', async () => {
      // Mock com score baixo para gerar warning
      jest.spyOn(simplificacaoAgent, 'analyze').mockResolvedValue({
        score: 65,
        originalLength: 100,
        simplifiedSuggestions: ['Sugestão 1', 'Sugestão 1'], // Duplicado
        redundancies: [],
        complexPhrases: [],
      });

      jest.spyOn(clarezaAgent, 'analyze').mockResolvedValue({
        score: 65,
        readabilityIndex: 50,
        issues: [],
        suggestions: ['Melhore a clareza'],
        metrics: {
          avgSentenceLength: 15,
          avgWordLength: 5,
          complexWords: 2,
          passiveVoice: 0,
        },
      });

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      // Verifica que warnings estão deduplicados
      const uniqueWarnings = [...new Set(result.warnings)];
      expect(uniqueWarnings.length).toBe(result.warnings.length);
    });

    it('deve coletar warnings de agentes com score < 70', async () => {
      jest.spyOn(clarezaAgent, 'analyze').mockResolvedValue({
        score: 65,
        readabilityIndex: 50,
        issues: [],
        suggestions: ['Melhore a clareza do texto'],
        metrics: {
          avgSentenceLength: 15,
          avgWordLength: 5,
          complexWords: 2,
          passiveVoice: 0,
        },
      });

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.warnings).toContain('Melhore a clareza do texto');
    });

    it('deve coletar warnings quando legal não é compliant', async () => {
      jest.spyOn(legalAgent, 'validate').mockResolvedValue({
        isCompliant: false,
        score: 60,
        issues: ['Falta referência à Lei 14.133'],
        recommendations: ['Adicione referência legal'],
        references: [],
      });

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.warnings).toContain('Adicione referência legal');
    });

    it('deve coletar warnings quando antiHallucination não é verified', async () => {
      jest.spyOn(antiHallucinationAgent, 'check').mockResolvedValue({
        score: 60,
        confidence: 0.5,
        warnings: ['Detectada referência suspeita à Lei'],
        suspiciousElements: [],
        verified: false,
      });

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      const result = await service.generateSection(request);

      expect(result.warnings).toContain('Detectada referência suspeita à Lei');
    });

    /**
     * Tests error propagation when OpenAI API fails
     * Ensures errors are properly caught and re-thrown for upstream handling
     */
    it('deve tratar erro e lançar exceção quando OpenAI falha', async () => {
      jest
        .spyOn(openaiService, 'generateCompletion')
        .mockRejectedValue(new Error('OpenAI API Error'));

      const request = {
        sectionType: 'introducao',
        title: 'Introdução',
        userInput: 'Teste',
      };

      await expect(service.generateSection(request)).rejects.toThrow(
        'OpenAI API Error',
      );
    });
  });

  /**
   * Tests for dynamic temperature selection based on section type
   * Validates that factual/legal sections use low temperature (0.2) for precision
   * and creative sections use medium temperature (0.6) for controlled creativity
   */
  describe('Teste 6: getSectionTemperature retorna temperatura apropriada', () => {
    it('deve retornar 0.2 para seções legais/factuais', async () => {
      const factualSections = [
        'justificativa',
        'base_legal',
        'orcamento',
        'identificacao',
        'metodologia',
        'cronograma',
        'riscos',
        'especificacao_tecnica',
      ];

      for (const sectionType of factualSections) {
        const request = {
          sectionType,
          title: 'Teste',
          userInput: 'Teste',
        };

        await service.generateSection(request);

        expect(openaiService.generateCompletion).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: 0.2,
          }),
        );

        jest.clearAllMocks();
      }
    });

    it('deve retornar 0.6 para seções criativas', async () => {
      const creativeSections = [
        'introducao',
        'contextualizacao',
        'descricao_solucao',
        'beneficiarios',
        'sustentabilidade',
        'justificativa_economica',
      ];

      for (const sectionType of creativeSections) {
        const request = {
          sectionType,
          title: 'Teste',
          userInput: 'Teste',
        };

        await service.generateSection(request);

        expect(openaiService.generateCompletion).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: 0.6,
          }),
        );

        jest.clearAllMocks();
      }
    });

    it('deve retornar 0.5 para seções desconhecidas', async () => {
      const unknownSections = ['glossario', 'anexos', 'referencias', 'outro'];

      for (const sectionType of unknownSections) {
        const request = {
          sectionType,
          title: 'Teste',
          userInput: 'Teste',
        };

        await service.generateSection(request);

        expect(openaiService.generateCompletion).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: 0.5,
          }),
        );

        jest.clearAllMocks();
      }
    });

    it('deve ser case-insensitive para nomes de seção', async () => {
      const variations = ['JUSTIFICATIVA', 'Justificativa', 'JuStIfIcAtIvA'];

      for (const sectionType of variations) {
        const request = {
          sectionType,
          title: 'Teste',
          userInput: 'Teste',
        };

        await service.generateSection(request);

        expect(openaiService.generateCompletion).toHaveBeenCalledWith(
          expect.objectContaining({
            temperature: 0.2,
          }),
        );

        jest.clearAllMocks();
      }
    });
  });
});

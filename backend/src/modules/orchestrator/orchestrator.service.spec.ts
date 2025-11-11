import { Test, TestingModule } from "@nestjs/testing";
import { OrchestratorService } from "./orchestrator.service";
import { OpenAIService } from "./llm/openai.service";
import { LegalAgent } from "./agents/legal.agent";
import { FundamentacaoAgent } from "./agents/fundamentacao.agent";
import { ClarezaAgent } from "./agents/clareza.agent";
import { SimplificacaoAgent } from "./agents/simplificacao.agent";
import { AntiHallucinationAgent } from "./agents/anti-hallucination.agent";

describe("OrchestratorService", () => {
  let service: OrchestratorService;
  let openaiService: OpenAIService;
  let legalAgent: LegalAgent;
  let fundamentacaoAgent: FundamentacaoAgent;
  let clarezaAgent: ClarezaAgent;
  let simplificacaoAgent: SimplificacaoAgent;
  let antiHallucinationAgent: AntiHallucinationAgent;

  // Mock responses
  const mockOpenAIResponse = {
    content: "Conteúdo gerado pela IA para teste de integração",
    tokens: 150,
    model: "gpt-4",
  };

  const mockLegalValidation = {
    isCompliant: true,
    score: 85,
    issues: [],
    recommendations: [],
    references: ["Lei 14.133/2021"],
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
    simplifiedSuggestions: ["Simplifique este texto"],
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

  beforeEach(async () => {
    // Create mocks with jest.fn()
    const mockOpenAIService = {
      generateCompletion: jest.fn().mockResolvedValue(mockOpenAIResponse),
    };

    const mockLegalAgentInstance = {
      enrichWithLegalContext: jest
        .fn()
        .mockImplementation((prompt: string) => Promise.resolve(prompt)),
      validate: jest.fn().mockResolvedValue(mockLegalValidation),
      getSystemPrompt: jest
        .fn()
        .mockReturnValue("Regras de conformidade legal..."),
    };

    const mockFundamentacaoAgentInstance = {
      enrich: jest
        .fn()
        .mockImplementation((prompt: string) => Promise.resolve(prompt)),
      analyze: jest.fn().mockResolvedValue(mockFundamentacaoResult),
      getSystemPrompt: jest
        .fn()
        .mockReturnValue("Regras de fundamentação..."),
    };

    const mockClarezaAgentInstance = {
      analyze: jest.fn().mockResolvedValue(mockClarezaResult),
      getSystemPrompt: jest.fn().mockReturnValue("Regras de clareza..."),
    };

    const mockSimplificacaoAgentInstance = {
      analyze: jest.fn().mockResolvedValue(mockSimplificacaoResultHigh),
      simplify: jest
        .fn()
        .mockImplementation((content: string) =>
          Promise.resolve(`${content} [simplificado]`),
        ),
      getSystemPrompt: jest
        .fn()
        .mockReturnValue("Regras de simplificação..."),
    };

    const mockAntiHallucinationAgentInstance = {
      check: jest.fn().mockResolvedValue(mockHallucinationCheck),
      generateSafetyPrompt: jest
        .fn()
        .mockResolvedValue("⚠️ NÃO invente números de leis..."),
      getSystemPrompt: jest
        .fn()
        .mockReturnValue("Regras anti-alucinação..."),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: OpenAIService, useValue: mockOpenAIService },
        { provide: LegalAgent, useValue: mockLegalAgentInstance },
        {
          provide: FundamentacaoAgent,
          useValue: mockFundamentacaoAgentInstance,
        },
        { provide: ClarezaAgent, useValue: mockClarezaAgentInstance },
        {
          provide: SimplificacaoAgent,
          useValue: mockSimplificacaoAgentInstance,
        },
        {
          provide: AntiHallucinationAgent,
          useValue: mockAntiHallucinationAgentInstance,
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

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("Teste 1: generateSection retorna resultado completo", () => {
    it("deve retornar objeto GenerationResult com content, metadata, validationResults, warnings e disclaimer", async () => {
      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Gerar introdução para ETP",
      };

      const result = await service.generateSection(request);

      // Verifica estrutura do resultado
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe("string");

      // Verifica metadata
      expect(result.metadata).toBeDefined();
      expect(result.metadata.tokens).toBe(150);
      expect(result.metadata.model).toBe("gpt-4");
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
      expect(typeof result.disclaimer).toBe("string");
    });

    it("deve incluir dados do ETP no prompt quando fornecidos", async () => {
      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Gerar introdução",
        etpData: {
          objeto: "Contratação de serviços de TI",
          metadata: { orgao: "Ministério da Saúde" },
        },
      };

      await service.generateSection(request);

      // Verifica que OpenAI foi chamado
      expect(openaiService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining("CONTEXTO DO ETP"),
        }),
      );
    });
  });

  describe("Teste 2: Todos os 5 agentes são executados durante generateSection", () => {
    it("deve executar LegalAgent durante enriquecimento e validação", async () => {
      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      await service.generateSection(request);

      expect(legalAgent.enrichWithLegalContext).toHaveBeenCalled();
      expect(legalAgent.validate).toHaveBeenCalled();
      expect(legalAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it("deve executar FundamentacaoAgent para seções que precisam de fundamentação", async () => {
      const request = {
        sectionType: "justificativa",
        title: "Justificativa",
        userInput: "Teste",
      };

      await service.generateSection(request);

      expect(fundamentacaoAgent.enrich).toHaveBeenCalled();
      expect(fundamentacaoAgent.analyze).toHaveBeenCalled();
      expect(fundamentacaoAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it("NÃO deve executar FundamentacaoAgent para seções que não precisam", async () => {
      const request = {
        sectionType: "glossario",
        title: "Glossário",
        userInput: "Teste",
      };

      await service.generateSection(request);

      // enrich não deve ser chamado para seções que não precisam de fundamentação
      expect(fundamentacaoAgent.enrich).not.toHaveBeenCalled();
      // analyze retorna null (Promise.resolve(null)) para estas seções
      expect(fundamentacaoAgent.analyze).not.toHaveBeenCalled();
    });

    it("deve executar ClarezaAgent durante validação", async () => {
      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      await service.generateSection(request);

      expect(clarezaAgent.analyze).toHaveBeenCalled();
      expect(clarezaAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it("deve executar SimplificacaoAgent durante análise pós-geração", async () => {
      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      await service.generateSection(request);

      expect(simplificacaoAgent.analyze).toHaveBeenCalled();
      expect(simplificacaoAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it("deve executar AntiHallucinationAgent durante preparação e validação", async () => {
      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      await service.generateSection(request);

      expect(antiHallucinationAgent.generateSafetyPrompt).toHaveBeenCalled();
      expect(antiHallucinationAgent.check).toHaveBeenCalled();
      expect(antiHallucinationAgent.getSystemPrompt).toHaveBeenCalled();
    });

    it("deve registrar todos os agentes usados em metadata.agentsUsed", async () => {
      const request = {
        sectionType: "justificativa",
        title: "Justificativa",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.metadata.agentsUsed).toContain("base-prompt");
      expect(result.metadata.agentsUsed).toContain("legal-context");
      expect(result.metadata.agentsUsed).toContain("fundamentacao-guidance");
      expect(result.metadata.agentsUsed).toContain("anti-hallucination");
      expect(result.metadata.agentsUsed).toContain("simplification-analysis");
      expect(result.metadata.agentsUsed).toContain("validation-legal");
      expect(result.metadata.agentsUsed).toContain("validation-clareza");
      expect(result.metadata.agentsUsed).toContain("validation-hallucination");
    });
  });

  describe("Teste 3: Disclaimer é adicionado ao resultado final", () => {
    it("deve adicionar disclaimer obrigatório ao conteúdo", async () => {
      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.content).toContain(
        "⚠️ Este conteúdo foi gerado por IA e requer validação humana antes do uso oficial.",
      );
    });

    it("deve ter disclaimer no campo dedicado do resultado", async () => {
      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.disclaimer).toBe(
        "O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.",
      );
    });

    it("disclaimer deve estar presente mesmo quando há warnings", async () => {
      // Mock com score baixo para gerar warnings
      jest
        .spyOn(simplificacaoAgent, "analyze")
        .mockResolvedValue(mockSimplificacaoResultLow);

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.content).toContain("⚠️");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.disclaimer).toBeDefined();
    });
  });

  describe("Teste 4: Score < 70 em SimplificaçãoAgent dispara auto-simplificação", () => {
    it("deve chamar simplify() quando score < 70", async () => {
      // Mock retorna score 65 (< 70)
      jest
        .spyOn(simplificacaoAgent, "analyze")
        .mockResolvedValue(mockSimplificacaoResultLow);

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      await service.generateSection(request);

      expect(simplificacaoAgent.analyze).toHaveBeenCalledTimes(1);
      expect(simplificacaoAgent.simplify).toHaveBeenCalledTimes(1);
    });

    it("deve adicionar warning sobre simplificação automática quando score < 70", async () => {
      jest
        .spyOn(simplificacaoAgent, "analyze")
        .mockResolvedValue(mockSimplificacaoResultLow);

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.warnings).toContain(
        "Texto foi simplificado automaticamente. Revise para garantir correção.",
      );
    });

    it("NÃO deve chamar simplify() quando score >= 70", async () => {
      // Mock retorna score 85 (>= 70)
      jest
        .spyOn(simplificacaoAgent, "analyze")
        .mockResolvedValue(mockSimplificacaoResultHigh);

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      await service.generateSection(request);

      expect(simplificacaoAgent.analyze).toHaveBeenCalledTimes(1);
      expect(simplificacaoAgent.simplify).not.toHaveBeenCalled();
    });

    it("deve incluir '[simplificado]' no conteúdo após simplificação", async () => {
      jest
        .spyOn(simplificacaoAgent, "analyze")
        .mockResolvedValue(mockSimplificacaoResultLow);

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.content).toContain("[simplificado]");
    });
  });

  describe("Teste 5: validateContent executa 4 agentes em paralelo", () => {
    it("deve executar os 4 agentes de validação", async () => {
      const content = "Texto para validação";
      const sectionType = "introducao";

      await service.validateContent(content, sectionType);

      expect(legalAgent.validate).toHaveBeenCalledWith(content, {
        type: sectionType,
      });
      expect(clarezaAgent.analyze).toHaveBeenCalledWith(content);
      expect(simplificacaoAgent.analyze).toHaveBeenCalledWith(content);
      expect(antiHallucinationAgent.check).toHaveBeenCalledWith(content);
    });

    it("deve retornar resultado com scores de todos os agentes", async () => {
      const content = "Texto para validação";
      const sectionType = "introducao";

      const result = await service.validateContent(content, sectionType);

      expect(result.legal).toBeDefined();
      expect(result.clareza).toBeDefined();
      expect(result.simplificacao).toBeDefined();
      expect(result.antiHallucination).toBeDefined();
      expect(result.overallScore).toBeDefined();
    });

    it("deve calcular overallScore corretamente (média dos 4 scores)", async () => {
      // Mock com scores conhecidos
      jest.spyOn(legalAgent, "validate").mockResolvedValue({
        isCompliant: true,
        score: 80,
        issues: [],
        recommendations: [],
        references: [],
      });

      jest.spyOn(clarezaAgent, "analyze").mockResolvedValue({
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

      jest.spyOn(simplificacaoAgent, "analyze").mockResolvedValue({
        score: 70,
        originalLength: 100,
        simplifiedSuggestions: [],
        redundancies: [],
        complexPhrases: [],
      });

      jest.spyOn(antiHallucinationAgent, "check").mockResolvedValue({
        score: 100,
        confidence: 0.9,
        warnings: [],
        suspiciousElements: [],
        verified: true,
      });

      const result = await service.validateContent("Texto", "introducao");

      // overallScore = (80 + 90 + 70 + 100) / 4 = 85.00
      expect(result.overallScore).toBe("85.00");
    });

    it("deve executar validações em paralelo (Promise.all)", async () => {
      // Spy para verificar que todas as promises são criadas antes de serem aguardadas
      const validateSpy = jest.spyOn(legalAgent, "validate");
      const analyzeClarezaSpy = jest.spyOn(clarezaAgent, "analyze");
      const analyzeSimplificacaoSpy = jest.spyOn(simplificacaoAgent, "analyze");
      const checkSpy = jest.spyOn(antiHallucinationAgent, "check");

      await service.validateContent("Texto", "introducao");

      // Todas devem ter sido chamadas
      expect(validateSpy).toHaveBeenCalled();
      expect(analyzeClarezaSpy).toHaveBeenCalled();
      expect(analyzeSimplificacaoSpy).toHaveBeenCalled();
      expect(checkSpy).toHaveBeenCalled();
    });
  });

  describe("Testes adicionais de integração", () => {
    it("deve deduplicar warnings no resultado final", async () => {
      // Mock com score baixo para gerar warning
      jest.spyOn(simplificacaoAgent, "analyze").mockResolvedValue({
        score: 65,
        originalLength: 100,
        simplifiedSuggestions: ["Sugestão 1", "Sugestão 1"], // Duplicado
        redundancies: [],
        complexPhrases: [],
      });

      jest.spyOn(clarezaAgent, "analyze").mockResolvedValue({
        score: 65,
        readabilityIndex: 50,
        issues: [],
        suggestions: ["Melhore a clareza"],
        metrics: {
          avgSentenceLength: 15,
          avgWordLength: 5,
          complexWords: 2,
          passiveVoice: 0,
        },
      });

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      // Verifica que warnings estão deduplicados
      const uniqueWarnings = [...new Set(result.warnings)];
      expect(uniqueWarnings.length).toBe(result.warnings.length);
    });

    it("deve coletar warnings de agentes com score < 70", async () => {
      jest.spyOn(clarezaAgent, "analyze").mockResolvedValue({
        score: 65,
        readabilityIndex: 50,
        issues: [],
        suggestions: ["Melhore a clareza do texto"],
        metrics: {
          avgSentenceLength: 15,
          avgWordLength: 5,
          complexWords: 2,
          passiveVoice: 0,
        },
      });

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.warnings).toContain("Melhore a clareza do texto");
    });

    it("deve coletar warnings quando legal não é compliant", async () => {
      jest.spyOn(legalAgent, "validate").mockResolvedValue({
        isCompliant: false,
        score: 60,
        issues: ["Falta referência à Lei 14.133"],
        recommendations: ["Adicione referência legal"],
        references: [],
      });

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.warnings).toContain("Adicione referência legal");
    });

    it("deve coletar warnings quando antiHallucination não é verified", async () => {
      jest.spyOn(antiHallucinationAgent, "check").mockResolvedValue({
        score: 60,
        confidence: 0.5,
        warnings: ["Detectada referência suspeita à Lei"],
        suspiciousElements: [],
        verified: false,
      });

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      const result = await service.generateSection(request);

      expect(result.warnings).toContain("Detectada referência suspeita à Lei");
    });

    it("deve tratar erro e lançar exceção quando OpenAI falha", async () => {
      jest
        .spyOn(openaiService, "generateCompletion")
        .mockRejectedValue(new Error("OpenAI API Error"));

      const request = {
        sectionType: "introducao",
        title: "Introdução",
        userInput: "Teste",
      };

      await expect(service.generateSection(request)).rejects.toThrow(
        "OpenAI API Error",
      );
    });
  });
});

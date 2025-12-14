import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ETPAnalysisService } from './analysis.service';
import { LegalAgent } from '../orchestrator/agents/legal.agent';
import { ClarezaAgent } from '../orchestrator/agents/clareza.agent';
import { FundamentacaoAgent } from '../orchestrator/agents/fundamentacao.agent';
import { ExtractedDocument } from '../document-extraction/interfaces/extracted-document.interface';
import {
  AnalysisResult,
  ConvertedEtpResult,
} from './interfaces/analysis-result.interface';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import {
  EtpSection,
  SectionType,
  SectionStatus,
} from '../../entities/etp-section.entity';
import { ImprovementReport } from './interfaces/improvement-report.interface';

describe('ETPAnalysisService', () => {
  let service: ETPAnalysisService;
  let legalAgent: LegalAgent;
  let clarezaAgent: ClarezaAgent;
  let fundamentacaoAgent: FundamentacaoAgent;
  let etpRepository: Repository<Etp>;
  let sectionRepository: Repository<EtpSection>;

  const mockEtpRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSectionRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const createMockDocument = (
    fullText: string,
    wordCount = 100,
    sections: ExtractedDocument['sections'] = [],
  ): ExtractedDocument => ({
    fullText,
    sections,
    metadata: {
      wordCount,
      pageCount: 1,
      sectionCount: sections.length || 1,
      characterCount: fullText.length,
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ETPAnalysisService,
        LegalAgent,
        ClarezaAgent,
        FundamentacaoAgent,
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepository,
        },
        {
          provide: getRepositoryToken(EtpSection),
          useValue: mockSectionRepository,
        },
      ],
    }).compile();

    service = module.get<ETPAnalysisService>(ETPAnalysisService);
    legalAgent = module.get<LegalAgent>(LegalAgent);
    clarezaAgent = module.get<ClarezaAgent>(ClarezaAgent);
    fundamentacaoAgent = module.get<FundamentacaoAgent>(FundamentacaoAgent);
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));
    sectionRepository = module.get<Repository<EtpSection>>(
      getRepositoryToken(EtpSection),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeDocument()', () => {
    it('should execute all agents in parallel and return consolidated result', async () => {
      // Arrange
      const document = createMockDocument(`
        Este ETP está fundamentado na Lei 14.133/2021.
        A justificativa da contratação é a necessidade de modernização.
        O objeto é o desenvolvimento de software.
        O valor estimado é de R$ 100.000,00.
        O benefício esperado é a melhoria da eficiência.
        O risco de não contratar é a obsolescência.
        A sociedade será beneficiada com serviços melhores.
      `);

      const legalSpy = jest.spyOn(legalAgent, 'validate');
      const clarezaSpy = jest.spyOn(clarezaAgent, 'analyze');
      const fundamentacaoSpy = jest.spyOn(fundamentacaoAgent, 'analyze');

      // Act
      const result: AnalysisResult = await service.analyzeDocument(document);

      // Assert
      expect(legalSpy).toHaveBeenCalledWith(document.fullText);
      expect(clarezaSpy).toHaveBeenCalledWith(document.fullText);
      expect(fundamentacaoSpy).toHaveBeenCalledWith(document.fullText);
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.legal).toBeDefined();
      expect(result.clareza).toBeDefined();
      expect(result.fundamentacao).toBeDefined();
    });

    it('should return high score for well-formed ETP document', async () => {
      // Arrange
      const wellFormedDocument = createMockDocument(
        `
        Conforme Lei 14.133/2021, artigo 18, apresenta-se este Estudo Técnico Preliminar.

        Justificativa: A contratação é necessária para atender à demanda de modernização
        dos sistemas de informação do órgão.

        O objeto da contratação consiste no desenvolvimento de software integrado.

        A necessidade surge da obsolescência dos sistemas atuais, que não atendem às
        demandas da sociedade por serviços públicos eficientes.

        Os benefícios esperados incluem melhoria de eficiência e redução de custos.

        O risco de não contratar é a continuidade de problemas operacionais que afetam
        a prestação de serviços ao cidadão.

        O valor estimado, baseado em pesquisa de mercado, é de R$ 200.000,00.
        `,
        200,
      );

      // Act
      const result: AnalysisResult =
        await service.analyzeDocument(wellFormedDocument);

      // Assert
      expect(result.summary.overallScore).toBeGreaterThan(70);
      expect(result.summary.meetsMinimumQuality).toBe(true);
      expect(result.legal.isCompliant).toBe(true);
    });

    it('should return low score for poorly-formed document', async () => {
      // Arrange
      const poorDocument = createMockDocument(
        `
        Precisamos de um sistema.
        O atual não funciona bem.
        `,
        20,
      );

      // Act
      const result: AnalysisResult =
        await service.analyzeDocument(poorDocument);

      // Assert
      expect(result.summary.overallScore).toBeLessThan(70);
      expect(result.summary.meetsMinimumQuality).toBe(false);
      expect(result.summary.totalIssues).toBeGreaterThan(0);
      expect(result.summary.totalSuggestions).toBeGreaterThan(0);
    });

    it('should calculate weighted overall score correctly', async () => {
      // Arrange
      const document = createMockDocument('Test content', 50);

      // Mock agent results with known scores
      jest.spyOn(legalAgent, 'validate').mockResolvedValue({
        isCompliant: true,
        score: 100,
        issues: [],
        recommendations: [],
        references: [],
      });
      jest.spyOn(clarezaAgent, 'analyze').mockResolvedValue({
        score: 80,
        readabilityIndex: 80,
        issues: [],
        suggestions: [],
        metrics: {
          avgSentenceLength: 15,
          avgWordLength: 5,
          complexWords: 5,
          passiveVoice: 1,
        },
      });
      jest.spyOn(fundamentacaoAgent, 'analyze').mockResolvedValue({
        score: 60,
        hasNecessidade: true,
        hasInteressePublico: true,
        hasBeneficios: false,
        hasRiscos: false,
        suggestions: ['Add benefits', 'Add risks'],
      });

      // Act
      const result: AnalysisResult = await service.analyzeDocument(document);

      // Assert
      // Expected: 100*0.4 + 80*0.3 + 60*0.3 = 40 + 24 + 18 = 82
      expect(result.summary.overallScore).toBe(82);
    });

    it('should include dimension summaries in result', async () => {
      // Arrange
      const document = createMockDocument(
        'Test content for dimension analysis',
      );

      // Act
      const result: AnalysisResult = await service.analyzeDocument(document);

      // Assert
      expect(result.summary.dimensions).toHaveLength(3);
      expect(result.summary.dimensions[0].dimension).toBe('legal');
      expect(result.summary.dimensions[1].dimension).toBe('clareza');
      expect(result.summary.dimensions[2].dimension).toBe('fundamentacao');

      result.summary.dimensions.forEach((dim) => {
        expect(dim.score).toBeGreaterThanOrEqual(0);
        expect(dim.score).toBeLessThanOrEqual(100);
        expect(typeof dim.passed).toBe('boolean');
        expect(dim.issueCount).toBeGreaterThanOrEqual(0);
        expect(dim.suggestionCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include document info in result', async () => {
      // Arrange
      const document = createMockDocument('Test content', 150);
      document.metadata.sectionCount = 5;

      // Act
      const result: AnalysisResult = await service.analyzeDocument(document);

      // Assert
      expect(result.documentInfo.wordCount).toBe(150);
      expect(result.documentInfo.sectionCount).toBe(5);
    });

    it('should include timestamp in result', async () => {
      // Arrange
      const document = createMockDocument('Test content');
      const beforeAnalysis = new Date();

      // Act
      const result: AnalysisResult = await service.analyzeDocument(document);
      const afterAnalysis = new Date();

      // Assert
      expect(result.analyzedAt).toBeInstanceOf(Date);
      expect(result.analyzedAt.getTime()).toBeGreaterThanOrEqual(
        beforeAnalysis.getTime(),
      );
      expect(result.analyzedAt.getTime()).toBeLessThanOrEqual(
        afterAnalysis.getTime(),
      );
    });

    it('should handle empty document', async () => {
      // Arrange
      const emptyDocument = createMockDocument('', 0);

      // Act
      const result: AnalysisResult =
        await service.analyzeDocument(emptyDocument);

      // Assert
      expect(result).toBeDefined();
      expect(result.summary.overallScore).toBeLessThanOrEqual(50);
      expect(result.summary.meetsMinimumQuality).toBe(false);
    });

    it('should count fundamentacao issues based on missing elements', async () => {
      // Arrange
      const document = createMockDocument('Test content');

      jest.spyOn(fundamentacaoAgent, 'analyze').mockResolvedValue({
        score: 50,
        hasNecessidade: true,
        hasInteressePublico: false, // missing
        hasBeneficios: false, // missing
        hasRiscos: true,
        suggestions: ['Add interesse publico', 'Add beneficios'],
      });

      // Act
      const result: AnalysisResult = await service.analyzeDocument(document);

      // Assert
      const fundamentacaoDim = result.summary.dimensions.find(
        (d) => d.dimension === 'fundamentacao',
      );
      expect(fundamentacaoDim?.issueCount).toBe(2);
    });

    it('should execute agents concurrently for performance', async () => {
      // Arrange
      const document = createMockDocument('Test content');
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Mock agents with artificial delays
      jest.spyOn(legalAgent, 'validate').mockImplementation(async () => {
        await delay(50);
        return {
          isCompliant: true,
          score: 80,
          issues: [],
          recommendations: [],
          references: [],
        };
      });
      jest.spyOn(clarezaAgent, 'analyze').mockImplementation(async () => {
        await delay(50);
        return {
          score: 80,
          readabilityIndex: 80,
          issues: [],
          suggestions: [],
          metrics: {
            avgSentenceLength: 15,
            avgWordLength: 5,
            complexWords: 5,
            passiveVoice: 1,
          },
        };
      });
      jest.spyOn(fundamentacaoAgent, 'analyze').mockImplementation(async () => {
        await delay(50);
        return {
          score: 80,
          hasNecessidade: true,
          hasInteressePublico: true,
          hasBeneficios: true,
          hasRiscos: true,
          suggestions: [],
        };
      });

      // Act
      const startTime = Date.now();
      await service.analyzeDocument(document);
      const elapsedTime = Date.now() - startTime;

      // Assert
      // If running sequentially: ~150ms
      // If running in parallel: ~50-60ms
      expect(elapsedTime).toBeLessThan(100);
    });
  });

  describe('convertToEtp()', () => {
    const userId = 'user-123';
    const organizationId = 'org-456';

    beforeEach(() => {
      // Reset mocks for each test
      mockEtpRepository.create.mockImplementation((data) => ({
        id: 'etp-123',
        ...data,
      }));
      mockEtpRepository.save.mockImplementation((etp) =>
        Promise.resolve({ ...etp, id: etp.id || 'etp-123' }),
      );
      mockSectionRepository.create.mockImplementation((data) => ({
        id: `section-${Math.random().toString(36).substr(2, 9)}`,
        ...data,
      }));
      mockSectionRepository.save.mockImplementation((section) =>
        Promise.resolve(section),
      );
    });

    it('should create ETP in DRAFT status', async () => {
      // Arrange
      const document = createMockDocument('Test content for ETP', 100, [
        { title: 'Justificativa', content: 'A contratação é necessária...' },
      ]);

      // Act
      const result: ConvertedEtpResult = await service.convertToEtp(
        document,
        userId,
        organizationId,
      );

      // Assert
      expect(mockEtpRepository.create).toHaveBeenCalled();
      const createCall = mockEtpRepository.create.mock.calls[0][0];
      expect(createCall.status).toBe(EtpStatus.DRAFT);
      expect(createCall.createdById).toBe(userId);
      expect(createCall.organizationId).toBe(organizationId);
    });

    it('should map known section types correctly', async () => {
      // Arrange
      const document = createMockDocument('Test content', 200, [
        { title: 'Justificativa', content: 'A contratação é necessária...' },
        { title: 'Requisitos', content: 'Os requisitos técnicos são...' },
        {
          title: 'Análise de Riscos',
          content: 'Os riscos identificados são...',
        },
      ]);

      // Act
      const result: ConvertedEtpResult = await service.convertToEtp(
        document,
        userId,
        organizationId,
      );

      // Assert
      expect(result.mappedSectionsCount).toBe(3);
      expect(result.customSectionsCount).toBe(0);

      // Verify section types were mapped correctly
      const createCalls = mockSectionRepository.create.mock.calls;
      expect(createCalls[0][0].type).toBe(SectionType.JUSTIFICATIVA);
      expect(createCalls[1][0].type).toBe(SectionType.REQUISITOS);
      expect(createCalls[2][0].type).toBe(SectionType.ANALISE_RISCOS);
    });

    it('should create CUSTOM sections for unknown titles', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'Seção Personalizada', content: 'Conteúdo personalizado...' },
        { title: 'Outra Seção Especial', content: 'Mais conteúdo...' },
      ]);

      // Act
      const result: ConvertedEtpResult = await service.convertToEtp(
        document,
        userId,
        organizationId,
      );

      // Assert
      expect(result.mappedSectionsCount).toBe(0);
      expect(result.customSectionsCount).toBe(2);

      const createCalls = mockSectionRepository.create.mock.calls;
      expect(createCalls[0][0].type).toBe(SectionType.CUSTOM);
      expect(createCalls[1][0].type).toBe(SectionType.CUSTOM);
    });

    it('should mark sections as imported in metadata', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'Justificativa', content: 'Conteúdo da justificativa...' },
      ]);

      // Act
      await service.convertToEtp(document, userId, organizationId);

      // Assert
      const createCall = mockSectionRepository.create.mock.calls[0][0];
      expect(createCall.metadata.importedFromDocument).toBe(true);
      expect(createCall.metadata.importedAt).toBeDefined();
    });

    it('should set sections to GENERATED status', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'Requisitos', content: 'Os requisitos são...' },
      ]);

      // Act
      await service.convertToEtp(document, userId, organizationId);

      // Assert
      const createCall = mockSectionRepository.create.mock.calls[0][0];
      expect(createCall.status).toBe(SectionStatus.GENERATED);
    });

    it('should skip empty sections', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'Justificativa', content: 'Conteúdo válido...' },
        { title: 'Seção Vazia', content: '' },
        { title: 'Seção Só Espaços', content: '   ' },
        { title: 'Requisitos', content: 'Mais conteúdo válido...' },
      ]);

      // Act
      const result: ConvertedEtpResult = await service.convertToEtp(
        document,
        userId,
        organizationId,
      );

      // Assert
      expect(result.sections.length).toBe(2);
      expect(mockSectionRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should assign sequential order to sections', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'Primeira', content: 'Conteúdo 1...' },
        { title: 'Segunda', content: 'Conteúdo 2...' },
        { title: 'Terceira', content: 'Conteúdo 3...' },
      ]);

      // Act
      await service.convertToEtp(document, userId, organizationId);

      // Assert
      const createCalls = mockSectionRepository.create.mock.calls;
      expect(createCalls[0][0].order).toBe(1);
      expect(createCalls[1][0].order).toBe(2);
      expect(createCalls[2][0].order).toBe(3);
    });

    it('should mark required sections correctly', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'Introdução', content: 'Conteúdo...' }, // required
        { title: 'Justificativa', content: 'Conteúdo...' }, // required
        { title: 'Análise de Riscos', content: 'Conteúdo...' }, // NOT required
      ]);

      // Act
      await service.convertToEtp(document, userId, organizationId);

      // Assert
      const createCalls = mockSectionRepository.create.mock.calls;
      expect(createCalls[0][0].isRequired).toBe(true); // introducao
      expect(createCalls[1][0].isRequired).toBe(true); // justificativa
      expect(createCalls[2][0].isRequired).toBe(false); // analise_riscos
    });

    it('should extract title from first level-1 heading', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'ETP - Contratação de Serviços', content: '...', level: 1 },
        { title: 'Justificativa', content: '...', level: 2 },
      ]);

      // Act
      await service.convertToEtp(document, userId, organizationId);

      // Assert
      const createCall = mockEtpRepository.create.mock.calls[0][0];
      expect(createCall.title).toBe('ETP - Contratação de Serviços');
    });

    it('should extract objeto from introduction section', async () => {
      // Arrange
      const introContent =
        'Este ETP tem como objeto a contratação de serviços de desenvolvimento de software.';
      const document = createMockDocument('Test content', 100, [
        { title: 'Introdução', content: introContent },
        { title: 'Justificativa', content: 'A contratação é necessária...' },
      ]);

      // Act
      await service.convertToEtp(document, userId, organizationId);

      // Assert
      const createCall = mockEtpRepository.create.mock.calls[0][0];
      expect(createCall.objeto).toBe(introContent);
    });

    it('should include import metadata in ETP', async () => {
      // Arrange
      const document = createMockDocument('Test content', 150, [
        { title: 'Seção', content: 'Conteúdo...' },
      ]);
      document.metadata.pageCount = 3;
      document.metadata.sectionCount = 5;

      // Act
      await service.convertToEtp(document, userId, organizationId);

      // Assert
      const createCall = mockEtpRepository.create.mock.calls[0][0];
      expect(createCall.metadata.importedAt).toBeDefined();
      expect(createCall.metadata.originalWordCount).toBe(150);
      expect(createCall.metadata.originalPageCount).toBe(3);
      expect(createCall.metadata.originalSectionCount).toBe(5);
    });

    it('should return ConvertedEtpResult with correct structure', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'Justificativa', content: 'Conteúdo...' },
        { title: 'Seção Custom', content: 'Outro conteúdo...' },
      ]);

      // Act
      const result: ConvertedEtpResult = await service.convertToEtp(
        document,
        userId,
        organizationId,
      );

      // Assert
      expect(result.etp).toBeDefined();
      expect(result.sections).toHaveLength(2);
      expect(result.mappedSectionsCount).toBe(1);
      expect(result.customSectionsCount).toBe(1);
      expect(result.convertedAt).toBeInstanceOf(Date);
    });

    it('should handle document with untitled sections', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { content: 'Conteúdo sem título 1...' },
        { content: 'Conteúdo sem título 2...' },
      ]);

      // Act
      const result: ConvertedEtpResult = await service.convertToEtp(
        document,
        userId,
        organizationId,
      );

      // Assert
      const createCalls = mockSectionRepository.create.mock.calls;
      expect(createCalls[0][0].title).toContain('Seção 1');
      expect(createCalls[1][0].title).toContain('Seção 2');
      expect(result.customSectionsCount).toBe(2);
    });

    it('should handle partial title matches', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        {
          title: 'Justificativa da Contratação de TI',
          content: 'Conteúdo...',
        },
        { title: 'Requisitos Técnicos Especiais', content: 'Conteúdo...' },
      ]);

      // Act
      const result: ConvertedEtpResult = await service.convertToEtp(
        document,
        userId,
        organizationId,
      );

      // Assert
      expect(result.mappedSectionsCount).toBe(2);
      const createCalls = mockSectionRepository.create.mock.calls;
      expect(createCalls[0][0].type).toBe(SectionType.JUSTIFICATIVA);
      expect(createCalls[1][0].type).toBe(SectionType.REQUISITOS);
    });

    it('should update ETP completion percentage after creating sections', async () => {
      // Arrange
      const document = createMockDocument('Test content', 100, [
        { title: 'Justificativa', content: 'Conteúdo...' },
        { title: 'Requisitos', content: 'Conteúdo...' },
      ]);

      // Act
      await service.convertToEtp(document, userId, organizationId);

      // Assert
      // ETP should be saved twice: once on creation, once to update completion
      expect(mockEtpRepository.save).toHaveBeenCalledTimes(2);
      const lastSaveCall =
        mockEtpRepository.save.mock.calls[
          mockEtpRepository.save.mock.calls.length - 1
        ][0];
      expect(lastSaveCall.completionPercentage).toBe(100); // All sections are GENERATED
    });
  });

  describe('generateImprovementReport()', () => {
    const createMockAnalysisResult = (
      overrides?: Partial<AnalysisResult>,
    ): AnalysisResult => ({
      summary: {
        overallScore: 75,
        meetsMinimumQuality: true,
        dimensions: [
          {
            dimension: 'legal',
            score: 80,
            passed: true,
            issueCount: 1,
            suggestionCount: 1,
          },
          {
            dimension: 'clareza',
            score: 70,
            passed: true,
            issueCount: 2,
            suggestionCount: 2,
          },
          {
            dimension: 'fundamentacao',
            score: 75,
            passed: true,
            issueCount: 1,
            suggestionCount: 3,
          },
        ],
        totalIssues: 4,
        totalSuggestions: 6,
      },
      legal: {
        isCompliant: true,
        score: 80,
        issues: ['Falta referência explícita à Lei 14.133/2021'],
        recommendations: ['Inclua referência à Lei 14.133/2021 no documento'],
        references: ['Lei 14.133/2021 - Nova Lei de Licitações'],
      },
      clareza: {
        score: 70,
        readabilityIndex: 70,
        issues: [
          'Frases muito longas detectadas',
          'Uso excessivo de voz passiva',
        ],
        suggestions: [
          'Divida frases longas em frases mais curtas',
          'Prefira voz ativa',
        ],
        metrics: {
          avgSentenceLength: 28,
          avgWordLength: 6,
          complexWords: 15,
          passiveVoice: 5,
        },
      },
      fundamentacao: {
        score: 75,
        hasNecessidade: true,
        hasInteressePublico: true,
        hasBeneficios: true,
        hasRiscos: false,
        suggestions: ['Mencione os riscos de não realizar a contratação'],
      },
      analyzedAt: new Date(),
      documentInfo: {
        wordCount: 500,
        sectionCount: 5,
      },
      ...overrides,
    });

    it('should generate report with correct executive summary', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult();

      // Act
      const report: ImprovementReport =
        service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.executiveSummary.overallScore).toBe(75);
      expect(report.executiveSummary.meetsMinimumQuality).toBe(true);
      expect(report.executiveSummary.totalIssues).toBeGreaterThan(0);
      expect(report.executiveSummary.verdict).toBe('Aprovado com ressalvas');
    });

    it('should categorize issues by severity correctly', () => {
      // Arrange - legal non-compliant => critical
      const analysisResult = createMockAnalysisResult({
        legal: {
          isCompliant: false,
          score: 50,
          issues: ['Issue crítico de compliance'],
          recommendations: ['Corrigir compliance'],
          references: [],
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      const criticalIssues = report.prioritizedRecommendations.filter(
        (i) => i.severity === 'critical',
      );
      expect(criticalIssues.length).toBeGreaterThan(0);
      expect(criticalIssues[0].dimension).toBe('legal');
    });

    it('should sort recommendations by priority (critical > important > suggestion)', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult({
        summary: {
          overallScore: 60,
          meetsMinimumQuality: false,
          dimensions: [
            {
              dimension: 'legal',
              score: 50,
              passed: false,
              issueCount: 2,
              suggestionCount: 1,
            },
            {
              dimension: 'clareza',
              score: 60,
              passed: false,
              issueCount: 2,
              suggestionCount: 2,
            },
            {
              dimension: 'fundamentacao',
              score: 70,
              passed: true,
              issueCount: 0,
              suggestionCount: 1,
            },
          ],
          totalIssues: 4,
          totalSuggestions: 4,
        },
        legal: {
          isCompliant: false,
          score: 50,
          issues: ['Critical legal issue 1', 'Critical legal issue 2'],
          recommendations: ['Fix legal issue 1', 'Fix legal issue 2'],
          references: [],
        },
        clareza: {
          score: 60,
          readabilityIndex: 60,
          issues: ['Important clarity issue 1', 'Important clarity issue 2'],
          suggestions: ['Fix clarity 1', 'Fix clarity 2'],
          metrics: {
            avgSentenceLength: 30,
            avgWordLength: 7,
            complexWords: 20,
            passiveVoice: 10,
          },
        },
        fundamentacao: {
          score: 70,
          hasNecessidade: true,
          hasInteressePublico: true,
          hasBeneficios: true,
          hasRiscos: true,
          suggestions: ['Minor suggestion'],
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      const severities = report.prioritizedRecommendations.map(
        (r) => r.severity,
      );

      // Find first occurrence of each severity
      const firstCritical = severities.indexOf('critical');
      const firstImportant = severities.indexOf('important');
      const firstSuggestion = severities.indexOf('suggestion');

      // Critical should come before important (if both exist)
      if (firstCritical !== -1 && firstImportant !== -1) {
        expect(firstCritical).toBeLessThan(firstImportant);
      }

      // Important should come before suggestion (if both exist)
      if (firstImportant !== -1 && firstSuggestion !== -1) {
        expect(firstImportant).toBeLessThan(firstSuggestion);
      }
    });

    it('should determine verdict "Aprovado" for score >= 80 and no critical issues', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult({
        summary: {
          overallScore: 85,
          meetsMinimumQuality: true,
          dimensions: [
            {
              dimension: 'legal',
              score: 90,
              passed: true,
              issueCount: 0,
              suggestionCount: 1,
            },
            {
              dimension: 'clareza',
              score: 80,
              passed: true,
              issueCount: 0,
              suggestionCount: 1,
            },
            {
              dimension: 'fundamentacao',
              score: 85,
              passed: true,
              issueCount: 0,
              suggestionCount: 1,
            },
          ],
          totalIssues: 0,
          totalSuggestions: 3,
        },
        legal: {
          isCompliant: true,
          score: 90,
          issues: [],
          recommendations: ['Consider adding more references'],
          references: [],
        },
        clareza: {
          score: 80,
          readabilityIndex: 80,
          issues: [],
          suggestions: ['Minor clarity improvement'],
          metrics: {
            avgSentenceLength: 18,
            avgWordLength: 5,
            complexWords: 5,
            passiveVoice: 1,
          },
        },
        fundamentacao: {
          score: 85,
          hasNecessidade: true,
          hasInteressePublico: true,
          hasBeneficios: true,
          hasRiscos: true,
          suggestions: [],
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.executiveSummary.verdict).toBe('Aprovado');
      expect(report.executiveSummary.criticalCount).toBe(0);
    });

    it('should determine verdict "Aprovado com ressalvas" for score 70-79 and no critical', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult({
        summary: {
          overallScore: 75,
          meetsMinimumQuality: true,
          dimensions: [
            {
              dimension: 'legal',
              score: 80,
              passed: true,
              issueCount: 1,
              suggestionCount: 1,
            },
            {
              dimension: 'clareza',
              score: 70,
              passed: true,
              issueCount: 1,
              suggestionCount: 1,
            },
            {
              dimension: 'fundamentacao',
              score: 75,
              passed: true,
              issueCount: 1,
              suggestionCount: 1,
            },
          ],
          totalIssues: 3,
          totalSuggestions: 3,
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.executiveSummary.verdict).toBe('Aprovado com ressalvas');
    });

    it('should determine verdict "Reprovado" for score < 70', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult({
        summary: {
          overallScore: 65,
          meetsMinimumQuality: false,
          dimensions: [
            {
              dimension: 'legal',
              score: 70,
              passed: true,
              issueCount: 1,
              suggestionCount: 1,
            },
            {
              dimension: 'clareza',
              score: 60,
              passed: false,
              issueCount: 3,
              suggestionCount: 3,
            },
            {
              dimension: 'fundamentacao',
              score: 65,
              passed: false,
              issueCount: 2,
              suggestionCount: 2,
            },
          ],
          totalIssues: 6,
          totalSuggestions: 6,
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.executiveSummary.verdict).toBe('Reprovado');
    });

    it('should determine verdict "Reprovado" when critical issues exist regardless of score', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult({
        summary: {
          overallScore: 82,
          meetsMinimumQuality: true,
          dimensions: [
            {
              dimension: 'legal',
              score: 50,
              passed: false,
              issueCount: 2,
              suggestionCount: 1,
            },
            {
              dimension: 'clareza',
              score: 95,
              passed: true,
              issueCount: 0,
              suggestionCount: 0,
            },
            {
              dimension: 'fundamentacao',
              score: 100,
              passed: true,
              issueCount: 0,
              suggestionCount: 0,
            },
          ],
          totalIssues: 2,
          totalSuggestions: 1,
        },
        legal: {
          isCompliant: false,
          score: 50,
          issues: ['Major compliance violation'],
          recommendations: ['Fix compliance'],
          references: [],
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.executiveSummary.verdict).toBe('Reprovado');
      expect(report.executiveSummary.criticalCount).toBeGreaterThan(0);
    });

    it('should include document info in report', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult();

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.documentInfo.wordCount).toBe(500);
      expect(report.documentInfo.sectionCount).toBe(5);
    });

    it('should include generatedAt timestamp', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult();
      const beforeGeneration = new Date();

      // Act
      const report = service.generateImprovementReport(analysisResult);
      const afterGeneration = new Date();

      // Assert
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.generatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeGeneration.getTime(),
      );
      expect(report.generatedAt.getTime()).toBeLessThanOrEqual(
        afterGeneration.getTime(),
      );
    });

    it('should build dimension sections with correct labels', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult();

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.dimensions).toHaveLength(3);
      expect(report.dimensions[0].label).toBe('Conformidade Legal');
      expect(report.dimensions[1].label).toBe('Clareza e Legibilidade');
      expect(report.dimensions[2].label).toBe('Fundamentação');
    });

    it('should extract fundamentacao issues for missing elements', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult({
        fundamentacao: {
          score: 50,
          hasNecessidade: false,
          hasInteressePublico: false,
          hasBeneficios: false,
          hasRiscos: false,
          suggestions: [],
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      const fundamentacaoSection = report.dimensions.find(
        (d) => d.dimension === 'fundamentacao',
      );
      expect(fundamentacaoSection?.issues.length).toBe(4);

      const issueTitles =
        fundamentacaoSection?.issues.map((i) => i.title) || [];
      expect(issueTitles).toContain('Necessidade não fundamentada');
      expect(issueTitles).toContain('Interesse público não demonstrado');
      expect(issueTitles).toContain('Benefícios não listados');
      expect(issueTitles).toContain('Riscos não mencionados');
    });

    it('should count severity levels correctly', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult({
        legal: {
          isCompliant: false,
          score: 50,
          issues: ['Critical issue 1', 'Critical issue 2'],
          recommendations: ['Fix 1', 'Fix 2', 'Suggestion'],
          references: [],
        },
        clareza: {
          score: 65,
          readabilityIndex: 65,
          issues: ['Important issue'],
          suggestions: ['Fix it'],
          metrics: {
            avgSentenceLength: 30,
            avgWordLength: 7,
            complexWords: 20,
            passiveVoice: 10,
          },
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.executiveSummary.criticalCount).toBe(2);
      expect(report.executiveSummary.importantCount).toBeGreaterThanOrEqual(1);
      expect(report.executiveSummary.suggestionCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty issues gracefully', () => {
      // Arrange
      const analysisResult = createMockAnalysisResult({
        legal: {
          isCompliant: true,
          score: 100,
          issues: [],
          recommendations: [],
          references: [],
        },
        clareza: {
          score: 100,
          readabilityIndex: 100,
          issues: [],
          suggestions: [],
          metrics: {
            avgSentenceLength: 15,
            avgWordLength: 5,
            complexWords: 2,
            passiveVoice: 0,
          },
        },
        fundamentacao: {
          score: 100,
          hasNecessidade: true,
          hasInteressePublico: true,
          hasBeneficios: true,
          hasRiscos: true,
          suggestions: [],
        },
      });

      // Act
      const report = service.generateImprovementReport(analysisResult);

      // Assert
      expect(report.executiveSummary.totalIssues).toBe(0);
      expect(report.executiveSummary.criticalCount).toBe(0);
      expect(report.executiveSummary.importantCount).toBe(0);
      expect(report.executiveSummary.suggestionCount).toBe(0);
      expect(report.prioritizedRecommendations).toHaveLength(0);
    });
  });
});

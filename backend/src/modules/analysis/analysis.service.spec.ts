import { Test, TestingModule } from '@nestjs/testing';
import { ETPAnalysisService } from './analysis.service';
import { LegalAgent } from '../orchestrator/agents/legal.agent';
import { ClarezaAgent } from '../orchestrator/agents/clareza.agent';
import { FundamentacaoAgent } from '../orchestrator/agents/fundamentacao.agent';
import { ExtractedDocument } from '../document-extraction/interfaces/extracted-document.interface';
import { AnalysisResult } from './interfaces/analysis-result.interface';

describe('ETPAnalysisService', () => {
  let service: ETPAnalysisService;
  let legalAgent: LegalAgent;
  let clarezaAgent: ClarezaAgent;
  let fundamentacaoAgent: FundamentacaoAgent;

  const createMockDocument = (
    fullText: string,
    wordCount = 100,
  ): ExtractedDocument => ({
    fullText,
    sections: [],
    metadata: {
      wordCount,
      pageCount: 1,
      sectionCount: 1,
      characterCount: fullText.length,
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ETPAnalysisService,
        LegalAgent,
        ClarezaAgent,
        FundamentacaoAgent,
      ],
    }).compile();

    service = module.get<ETPAnalysisService>(ETPAnalysisService);
    legalAgent = module.get<LegalAgent>(LegalAgent);
    clarezaAgent = module.get<ClarezaAgent>(ClarezaAgent);
    fundamentacaoAgent = module.get<FundamentacaoAgent>(FundamentacaoAgent);
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
});

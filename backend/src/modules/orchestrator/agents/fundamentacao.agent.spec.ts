import { Test, TestingModule } from "@nestjs/testing";
import { FundamentacaoAgent, FundamentacaoResult } from "./fundamentacao.agent";

describe("FundamentacaoAgent", () => {
  let agent: FundamentacaoAgent;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FundamentacaoAgent],
    }).compile();

    agent = module.get<FundamentacaoAgent>(FundamentacaoAgent);
  });

  it("should be defined", () => {
    expect(agent).toBeDefined();
  });

  describe("analyze()", () => {
    it("should detect all 4 mandatory elements when present", async () => {
      // Arrange
      const contentWithAllElements = `
        A necessidade desta contratação surge da carência de sistemas modernos
        que atendam às demandas crescentes do órgão público. A infraestrutura
        tecnológica atual não suporta o volume de operações necessárias, gerando
        deficiências significativas na prestação do serviço.

        O interesse público é evidente, pois beneficiará 10.000 cidadãos que
        dependem diariamente dos serviços prestados pelo órgão. A sociedade
        como um todo será impactada positivamente com a modernização.

        Os benefícios esperados incluem melhoria de 50% na eficiência operacional,
        redução de custos com manutenção corretiva, ganho de produtividade das
        equipes e aprimoramento significativo da qualidade dos serviços prestados
        à população.

        Os riscos de não contratar incluem impacto negativo na prestação de
        serviços essenciais, possíveis problemas de continuidade operacional e
        consequências graves para o atendimento à população, com prejuízos
        mensuráveis na qualidade do serviço público.
      `;

      // Act
      const result: FundamentacaoResult = await agent.analyze(
        contentWithAllElements,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.hasNecessidade).toBe(true);
      expect(result.hasInteressePublico).toBe(true);
      expect(result.hasBeneficios).toBe(true);
      expect(result.hasRiscos).toBe(true);
      expect(result.score).toBe(100);
      expect(result.suggestions).toHaveLength(0);
    });

    it("should calculate score correctly based on present elements (2/4 = 50%)", async () => {
      // Arrange
      const contentPartial = `
        A necessidade desta contratação é urgente e imediata.
        Os benefícios incluem redução de custos operacionais.
      `;

      // Act
      const result: FundamentacaoResult = await agent.analyze(contentPartial);

      // Assert
      expect(result.hasNecessidade).toBe(true);
      expect(result.hasInteressePublico).toBe(false);
      expect(result.hasBeneficios).toBe(true);
      expect(result.hasRiscos).toBe(false);
      expect(result.score).toBe(50);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should detect quantitative data (numbers) in content", async () => {
      // Arrange
      const contentWithNumbers = `
        A necessidade surge da demanda de 10.000 usuários.
        O interesse público beneficiará 500 cidadãos diariamente.
        Os benefícios incluem economia de R$ 100.000 e redução de 30% no prazo.
        Os riscos incluem problemas em 50% dos processos.
      `;

      // Act
      const result: FundamentacaoResult =
        await agent.analyze(contentWithNumbers);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBe(100);
      // Verifica que NÃO há sugestão sobre adicionar dados quantitativos
      expect(result.suggestions).not.toContain(
        "Considere adicionar dados quantitativos para fortalecer a fundamentação",
      );
    });

    it("should suggest adding quantitative data when numbers are missing", async () => {
      // Arrange
      const contentWithoutNumbers = `
        A necessidade desta contratação é evidente.
        O interesse público será atendido com a sociedade beneficiada.
        Os benefícios incluem melhoria de processos.
        Os riscos incluem problemas operacionais.
      `;

      // Act
      const result: FundamentacaoResult = await agent.analyze(
        contentWithoutNumbers,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.suggestions).toContain(
        "Considere adicionar dados quantitativos para fortalecer a fundamentação",
      );
    });

    it("should validate minimum length (100 words)", async () => {
      // Arrange
      const shortContent = "Necessidade urgente de contratação."; // < 100 palavras
      const longContent = `
        A necessidade desta contratação é fundamental para o órgão.
        ${"O interesse público será atendido através desta ação. ".repeat(20)}
        Os benefícios esperados são significativos e mensuráveis.
        Os riscos de não realizar a contratação são elevados.
      `; // > 100 palavras

      // Act
      const resultShort: FundamentacaoResult =
        await agent.analyze(shortContent);
      const resultLong: FundamentacaoResult = await agent.analyze(longContent);

      // Assert
      expect(resultShort.suggestions).toContain(
        "A fundamentação parece muito breve. Considere expandir com mais detalhes",
      );
      expect(resultLong.suggestions).not.toContain(
        "A fundamentação parece muito breve. Considere expandir com mais detalhes",
      );
    });

    it("should provide suggestions for missing elements", async () => {
      // Arrange
      const contentMissingElements = `
        Este é um texto genérico sem elementos específicos da fundamentação.
      `;

      // Act
      const result: FundamentacaoResult = await agent.analyze(
        contentMissingElements,
      );

      // Assert
      expect(result.score).toBe(0);
      expect(result.suggestions).toContain(
        "Detalhe melhor a necessidade que motivou a contratação",
      );
      expect(result.suggestions).toContain(
        "Explicite como a contratação atende ao interesse público",
      );
      expect(result.suggestions).toContain(
        "Liste os benefícios esperados com a contratação",
      );
      expect(result.suggestions).toContain(
        "Mencione os riscos de não realizar a contratação",
      );
      expect(result.suggestions).toContain(
        "Considere adicionar dados quantitativos para fortalecer a fundamentação",
      );
      expect(result.suggestions).toContain(
        "A fundamentação parece muito breve. Considere expandir com mais detalhes",
      );
    });

    it("should handle empty text", async () => {
      // Arrange
      const emptyContent = "";

      // Act
      const result: FundamentacaoResult = await agent.analyze(emptyContent);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBe(0);
      expect(result.hasNecessidade).toBe(false);
      expect(result.hasInteressePublico).toBe(false);
      expect(result.hasBeneficios).toBe(false);
      expect(result.hasRiscos).toBe(false);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(4);
    });

    it("should handle very long text", async () => {
      // Arrange
      const veryLongContent = `
        A necessidade desta contratação é fundamental.
        ${"O interesse público da sociedade e cidadãos será atendido. ".repeat(1000)}
        Os benefícios e vantagens esperados são significativos.
        Os riscos e problemas de não contratar são elevados.
        Dados quantitativos: 10.000 usuários.
      `;

      // Act
      const result: FundamentacaoResult = await agent.analyze(veryLongContent);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.hasNecessidade).toBe(true);
      expect(result.hasInteressePublico).toBe(true);
      expect(result.hasBeneficios).toBe(true);
      expect(result.hasRiscos).toBe(true);
    });

    it("should detect alternative keywords for each element", async () => {
      // Arrange
      const contentWithAlternatives = `
        A demanda surge da deficiência nos sistemas atuais.
        A comunidade será beneficiada com esta ação.
        As vantagens incluem ganho de eficiência e aprimoramento dos processos.
        As consequências de não contratar afetarão negativamente o serviço.
      `;

      // Act
      const result: FundamentacaoResult = await agent.analyze(
        contentWithAlternatives,
      );

      // Assert
      expect(result.hasNecessidade).toBe(true); // "demanda", "deficiência"
      expect(result.hasInteressePublico).toBe(true); // "comunidade"
      expect(result.hasBeneficios).toBe(true); // "vantagens", "ganho", "aprimoramento"
      expect(result.hasRiscos).toBe(true); // "consequências", "negativamente"
      expect(result.score).toBe(100);
    });

    it("should be case-insensitive when detecting keywords", async () => {
      // Arrange
      const contentMixedCase = `
        A NECESSIDADE desta contratação é URGENTE.
        O INTERESSE PÚBLICO será atendido.
        Os BENEFÍCIOS esperados são SIGNIFICATIVOS.
        Os RISCOS de não contratar são ELEVADOS.
      `;

      // Act
      const result: FundamentacaoResult = await agent.analyze(contentMixedCase);

      // Assert
      expect(result.hasNecessidade).toBe(true);
      expect(result.hasInteressePublico).toBe(true);
      expect(result.hasBeneficios).toBe(true);
      expect(result.hasRiscos).toBe(true);
      expect(result.score).toBe(100);
    });
  });

  describe("enrich()", () => {
    it("should add checklist to user prompt", async () => {
      // Arrange
      const originalPrompt = "Gere a fundamentação para o projeto X.";

      // Act
      const enrichedPrompt: string = await agent.enrich(originalPrompt);

      // Assert
      expect(enrichedPrompt).toContain(originalPrompt);
      expect(enrichedPrompt).toContain("POR QUÊ");
      expect(enrichedPrompt).toContain("PARA QUEM");
      expect(enrichedPrompt).toContain("O QUE será ganho");
      expect(enrichedPrompt).toContain("O QUE SE PERDE");
      expect(enrichedPrompt).toContain("necessária");
      expect(enrichedPrompt).toContain("interesse público");
      expect(enrichedPrompt).toContain("benefícios esperados");
      expect(enrichedPrompt).toContain("riscos");
      expect(enrichedPrompt).toContain("dados concretos");
      expect(enrichedPrompt.length).toBeGreaterThan(originalPrompt.length);
    });

    it("should preserve original prompt content", async () => {
      // Arrange
      const originalPrompt =
        "Elabore fundamentação detalhada para contratação de software de gestão.";

      // Act
      const enrichedPrompt: string = await agent.enrich(originalPrompt);

      // Assert
      expect(enrichedPrompt).toContain(originalPrompt);
      expect(enrichedPrompt.indexOf(originalPrompt)).toBe(0); // Original vem primeiro
    });
  });

  describe("getSystemPrompt()", () => {
    it("should return system prompt with fundamentação guidelines", () => {
      // Act
      const systemPrompt: string = agent.getSystemPrompt();

      // Assert
      expect(systemPrompt).toContain("fundamentação");
      expect(systemPrompt).toContain("COMPLETA");
      expect(systemPrompt).toContain("CLARA");
      expect(systemPrompt).toContain("CONVINCENTE");
      expect(systemPrompt).toContain("NECESSIDADE");
      expect(systemPrompt).toContain("INTERESSE PÚBLICO");
      expect(systemPrompt).toContain("BENEFÍCIOS");
      expect(systemPrompt).toContain("RISCOS");
      expect(systemPrompt).toContain("dados quantitativos");
      expect(systemPrompt).toContain("EVITE");
      expect(systemPrompt).toContain("genéricas");
      expect(systemPrompt.length).toBeGreaterThan(100);
    });
  });
});

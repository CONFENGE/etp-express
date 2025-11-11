import { Injectable, Logger } from "@nestjs/common";

export interface FundamentacaoResult {
  score: number;
  hasNecessidade: boolean;
  hasInteressePublico: boolean;
  hasBeneficios: boolean;
  hasRiscos: boolean;
  suggestions: string[];
}

@Injectable()
export class FundamentacaoAgent {
  private readonly logger = new Logger(FundamentacaoAgent.name);

  async analyze(content: string): Promise<FundamentacaoResult> {
    this.logger.log("Analyzing fundamentação quality");

    const hasNecessidade = this.checkForElement(content, [
      "necessário",
      "necessidade",
      "demanda",
      "carência",
      "deficiência",
    ]);

    const hasInteressePublico = this.checkForElement(content, [
      "interesse público",
      "benefício público",
      "sociedade",
      "cidadão",
      "comunidade",
    ]);

    const hasBeneficios = this.checkForElement(content, [
      "benefício",
      "vantagem",
      "ganho",
      "melhoria",
      "aprimoramento",
    ]);

    const hasRiscos = this.checkForElement(content, [
      "risco",
      "problema",
      "consequência",
      "impacto negativo",
      "não contratar",
    ]);

    const suggestions: string[] = [];

    if (!hasNecessidade) {
      suggestions.push(
        "Detalhe melhor a necessidade que motivou a contratação",
      );
    }

    if (!hasInteressePublico) {
      suggestions.push(
        "Explicite como a contratação atende ao interesse público",
      );
    }

    if (!hasBeneficios) {
      suggestions.push("Liste os benefícios esperados com a contratação");
    }

    if (!hasRiscos) {
      suggestions.push("Mencione os riscos de não realizar a contratação");
    }

    // Check for quantification
    const hasNumbers = /\d+/.test(content);
    if (!hasNumbers) {
      suggestions.push(
        "Considere adicionar dados quantitativos para fortalecer a fundamentação",
      );
    }

    // Check for length (good fundamentação should be substantive)
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 100) {
      suggestions.push(
        "A fundamentação parece muito breve. Considere expandir com mais detalhes",
      );
    }

    // Calculate score
    const elements = [
      hasNecessidade,
      hasInteressePublico,
      hasBeneficios,
      hasRiscos,
    ];
    const presentElements = elements.filter(Boolean).length;
    const score = (presentElements / elements.length) * 100;

    this.logger.log(`Fundamentação analysis completed. Score: ${score}%`);

    return {
      score,
      hasNecessidade,
      hasInteressePublico,
      hasBeneficios,
      hasRiscos,
      suggestions,
    };
  }

  private checkForElement(content: string, keywords: string[]): boolean {
    const lowerContent = content.toLowerCase();
    return keywords.some((keyword) => lowerContent.includes(keyword));
  }

  getSystemPrompt(): string {
    return `Você é um agente especializado em fundamentação de contratações públicas.

Sua função é garantir que a fundamentação seja COMPLETA, CLARA e CONVINCENTE.

Uma boa fundamentação deve conter:

1. NECESSIDADE: Por que esta contratação é necessária?
   - Qual problema será resolvido?
   - Qual demanda será atendida?
   - Qual carência será suprida?

2. INTERESSE PÚBLICO: Como isso beneficia a sociedade?
   - Quem será beneficiado?
   - Qual o impacto na prestação do serviço público?
   - Como se alinha com políticas públicas?

3. BENEFÍCIOS: Quais são os ganhos esperados?
   - Melhoria de processos
   - Economia de recursos
   - Aumento de eficiência
   - Qualidade do serviço

4. RISCOS: O que acontece se não contratar?
   - Impactos negativos
   - Prejuízos potenciais
   - Comprometimento de atividades

SEMPRE inclua dados quantitativos quando possível (números, percentuais, prazos).

EVITE:
- Fundamentações genéricas
- Justificativas circulares
- Falta de conexão com a realidade do órgão`;
  }

  async enrich(userPrompt: string): Promise<string> {
    return `${userPrompt}

Ao elaborar a fundamentação, garanta que ficará claro:
- POR QUÊ a contratação é necessária (problema/demanda)
- PARA QUEM é importante (interesse público)
- O QUE será ganho (benefícios esperados)
- O QUE SE PERDE se não contratar (riscos)

Use dados concretos sempre que possível.`;
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { OpenAIService, LLMRequest } from "./llm/openai.service";
import { LegalAgent } from "./agents/legal.agent";
import { FundamentacaoAgent } from "./agents/fundamentacao.agent";
import { ClarezaAgent } from "./agents/clareza.agent";
import { SimplificacaoAgent } from "./agents/simplificacao.agent";
import { AntiHallucinationAgent } from "./agents/anti-hallucination.agent";

export interface GenerationRequest {
  sectionType: string;
  title: string;
  userInput: string;
  context?: any;
  etpData?: any;
}

export interface GenerationResult {
  content: string;
  metadata: {
    tokens: number;
    model: string;
    generationTime: number;
    agentsUsed: string[];
  };
  validationResults: {
    legal?: any;
    fundamentacao?: any;
    clareza?: any;
    simplificacao?: any;
    antiHallucination?: any;
  };
  warnings: string[];
  disclaimer: string;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private openaiService: OpenAIService,
    private legalAgent: LegalAgent,
    private fundamentacaoAgent: FundamentacaoAgent,
    private clarezaAgent: ClarezaAgent,
    private simplificacaoAgent: SimplificacaoAgent,
    private antiHallucinationAgent: AntiHallucinationAgent,
  ) {}

  async generateSection(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    this.logger.log(`Generating section: ${request.sectionType}`);

    const agentsUsed: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Build system prompt with all agents
      const systemPrompt = await this.buildSystemPrompt(request.sectionType);
      agentsUsed.push("base-prompt");

      // 2. Enrich user prompt with legal context
      let enrichedUserPrompt = request.userInput;
      enrichedUserPrompt = await this.legalAgent.enrichWithLegalContext(
        enrichedUserPrompt,
        request.sectionType,
      );
      agentsUsed.push("legal-context");

      // 3. Add fundamentação guidance if applicable
      if (this.needsFundamentacao(request.sectionType)) {
        enrichedUserPrompt =
          await this.fundamentacaoAgent.enrich(enrichedUserPrompt);
        agentsUsed.push("fundamentacao-guidance");
      }

      // 4. Add anti-hallucination safety prompt
      const safetyPrompt =
        await this.antiHallucinationAgent.generateSafetyPrompt();
      const finalSystemPrompt = `${systemPrompt}\n\n${safetyPrompt}`;
      agentsUsed.push("anti-hallucination");

      // 5. Add ETP context if available
      if (request.etpData) {
        enrichedUserPrompt = `${enrichedUserPrompt}\n\n[CONTEXTO DO ETP]\nObjeto: ${request.etpData.objeto}\nÓrgão: ${request.etpData.metadata?.orgao || "Não especificado"}`;
      }

      // 6. Generate content with LLM
      const llmRequest: LLMRequest = {
        systemPrompt: finalSystemPrompt,
        userPrompt: enrichedUserPrompt,
        temperature: 0.7,
        maxTokens: 4000,
      };

      const llmResponse =
        await this.openaiService.generateCompletion(llmRequest);
      let generatedContent = llmResponse.content;

      // 7. Post-processing: Simplification
      const simplificationResult =
        await this.simplificacaoAgent.analyze(generatedContent);
      agentsUsed.push("simplification-analysis");

      if (simplificationResult.score < 70) {
        // Try to auto-simplify
        generatedContent =
          await this.simplificacaoAgent.simplify(generatedContent);
        warnings.push(
          "Texto foi simplificado automaticamente. Revise para garantir correção.",
        );
      }

      // 8. Validation: Run all agents
      const [
        legalValidation,
        fundamentacaoValidation,
        clarezaValidation,
        hallucinationCheck,
      ] = await Promise.all([
        this.legalAgent.validate(generatedContent, {
          type: request.sectionType,
        }),
        this.needsFundamentacao(request.sectionType)
          ? this.fundamentacaoAgent.analyze(generatedContent)
          : Promise.resolve(null),
        this.clarezaAgent.analyze(generatedContent),
        this.antiHallucinationAgent.check(generatedContent, request.context),
      ]);

      agentsUsed.push(
        "validation-legal",
        "validation-clareza",
        "validation-hallucination",
      );

      // 9. Collect warnings from validations
      if (!legalValidation.isCompliant) {
        warnings.push(...legalValidation.recommendations);
      }

      if (fundamentacaoValidation && fundamentacaoValidation.score < 70) {
        warnings.push(...fundamentacaoValidation.suggestions);
      }

      if (clarezaValidation.score < 70) {
        warnings.push(...clarezaValidation.suggestions);
      }

      if (!hallucinationCheck.verified) {
        warnings.push(...hallucinationCheck.warnings);
      }

      // 10. Add mandatory disclaimer
      generatedContent +=
        "\n\n⚠️ Este conteúdo foi gerado por IA e requer validação humana antes do uso oficial.";

      const generationTime = Date.now() - startTime;

      this.logger.log(
        `Section generated successfully in ${generationTime}ms. Agents used: ${agentsUsed.length}`,
      );

      return {
        content: generatedContent,
        metadata: {
          tokens: llmResponse.tokens,
          model: llmResponse.model,
          generationTime,
          agentsUsed,
        },
        validationResults: {
          legal: legalValidation,
          fundamentacao: fundamentacaoValidation,
          clareza: clarezaValidation,
          simplificacao: simplificationResult,
          antiHallucination: hallucinationCheck,
        },
        warnings: [...new Set(warnings)],
        disclaimer:
          "O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.",
      };
    } catch (error) {
      this.logger.error("Error generating section:", error);
      throw error;
    }
  }

  private async buildSystemPrompt(sectionType: string): Promise<string> {
    const basePrompt = `Você é um assistente especializado em elaboração de Estudos Técnicos Preliminares (ETP) conforme a Lei 14.133/2021.

Sua tarefa é gerar conteúdo de alta qualidade para a seção: ${sectionType}

Diretrizes gerais:
- Seja objetivo e claro
- Use linguagem formal mas acessível
- Fundamente suas afirmações
- Cite a base legal quando apropriado
- Estruture o conteúdo de forma lógica
- Evite redundâncias`;

    const legalPrompt = this.legalAgent.getSystemPrompt();
    const clarezaPrompt = this.clarezaAgent.getSystemPrompt();
    const simplificacaoPrompt = this.simplificacaoAgent.getSystemPrompt();
    const hallucinationPrompt = this.antiHallucinationAgent.getSystemPrompt();

    let sectionSpecificPrompt = "";

    if (this.needsFundamentacao(sectionType)) {
      sectionSpecificPrompt = this.fundamentacaoAgent.getSystemPrompt();
    }

    return `${basePrompt}

---
${legalPrompt}

---
${clarezaPrompt}

---
${simplificacaoPrompt}

---
${hallucinationPrompt}

${sectionSpecificPrompt ? `---\n${sectionSpecificPrompt}` : ""}`;
  }

  private needsFundamentacao(sectionType: string): boolean {
    return ["justificativa", "introducao", "descricao_solucao"].includes(
      sectionType,
    );
  }

  async validateContent(content: string, sectionType: string) {
    this.logger.log("Validating existing content");

    const [
      legalValidation,
      clarezaValidation,
      simplificationAnalysis,
      hallucinationCheck,
    ] = await Promise.all([
      this.legalAgent.validate(content, { type: sectionType }),
      this.clarezaAgent.analyze(content),
      this.simplificacaoAgent.analyze(content),
      this.antiHallucinationAgent.check(content),
    ]);

    return {
      legal: legalValidation,
      clareza: clarezaValidation,
      simplificacao: simplificationAnalysis,
      antiHallucination: hallucinationCheck,
      overallScore: (
        (legalValidation.score +
          clarezaValidation.score +
          simplificationAnalysis.score +
          hallucinationCheck.score) /
        4
      ).toFixed(2),
    };
  }
}

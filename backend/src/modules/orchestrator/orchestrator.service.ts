import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService, LLMRequest } from './llm/openai.service';
import { LegalAgent } from './agents/legal.agent';
import { FundamentacaoAgent } from './agents/fundamentacao.agent';
import { ClarezaAgent } from './agents/clareza.agent';
import { SimplificacaoAgent } from './agents/simplificacao.agent';
import { AntiHallucinationAgent } from './agents/anti-hallucination.agent';

/**
 * Request structure for ETP section content generation.
 */
export interface GenerationRequest {
  sectionType: string;
  title: string;
  userInput: string;
  context?: any;
  etpData?: any;
}

/**
 * Result structure containing generated content and validation metadata.
 */
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

/**
 * Service responsible for orchestrating AI-powered ETP section content generation.
 *
 * @remarks
 * This service implements a multi-agent architecture for generating high-quality,
 * legally compliant ETP content. It coordinates five specialized AI agents:
 * - LegalAgent: Ensures legal compliance with Lei 14.133/2021
 * - FundamentacaoAgent: Validates argumentation and justification quality
 * - ClarezaAgent: Analyzes content clarity and readability
 * - SimplificacaoAgent: Simplifies complex language for accessibility
 * - AntiHallucinationAgent: Prevents AI from generating unverified facts
 *
 * The orchestration follows a 10-step pipeline:
 * 1. Build base system prompt
 * 2. Enrich user input with legal context
 * 3. Add fundamentacao guidance (for specific sections)
 * 4. Add anti-hallucination safety prompts
 * 5. Inject ETP context data
 * 6. Generate content via OpenAI
 * 7. Post-process with simplification
 * 8. Validate with all agents in parallel
 * 9. Collect warnings and recommendations
 * 10. Add mandatory disclaimer
 *
 * Generation typically takes 30-60 seconds depending on section complexity
 * and OpenAI API response times.
 *
 * @see SectionsService - Consumes this service for section generation
 * @see OpenAIService - LLM integration layer
 */
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

  /**
   * Generates ETP section content using multi-agent AI orchestration.
   *
   * @remarks
   * This method coordinates multiple AI agents through a sophisticated 10-step pipeline
   * to generate high-quality, legally compliant ETP content. The process includes:
   * - Prompt engineering with legal and domain context
   * - Content generation via OpenAI GPT models
   * - Automatic simplification if readability score is below 70%
   * - Parallel validation across all quality dimensions
   * - Warning aggregation from all validation agents
   *
   * The generated content includes a mandatory disclaimer and metadata about
   * tokens used, agents involved, and validation scores. Generation is synchronous
   * and may take 30-60 seconds depending on section complexity.
   *
   * @param request - Generation request containing section type, title, user input, and context
   * @returns Generated content with metadata, validation results, and warnings
   * @throws {Error} If OpenAI API fails or any agent encounters a critical error
   *
   * @example
   * ```ts
   * const result = await orchestratorService.generateSection({
   *   sectionType: 'justificativa',
   *   title: 'Justificativa da Contratação',
   *   userInput: 'Necessidade de adquirir notebooks para equipe de TI',
   *   context: { department: 'TI' },
   *   etpData: {
   *     objeto: 'Aquisição de 50 Notebooks Dell Latitude 5420',
   *     metadata: { orgao: 'Secretaria de Tecnologia' }
   *   }
   * });
   *
   * console.log(result.content); // Generated markdown content
   * console.log(result.metadata.agentsUsed); // ['base-prompt', 'legal-context', ...]
   * console.log(result.warnings); // ['Texto foi simplificado automaticamente...']
   * ```
   */
  async generateSection(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    this.logger.log(`Generating section: ${request.sectionType}`);

    const agentsUsed: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Build system prompt with all agents
      const systemPrompt = await this.buildSystemPrompt(request.sectionType);
      agentsUsed.push('base-prompt');

      // 2. Enrich user prompt with legal context
      let enrichedUserPrompt = request.userInput;
      enrichedUserPrompt = await this.legalAgent.enrichWithLegalContext(
        enrichedUserPrompt,
        request.sectionType,
      );
      agentsUsed.push('legal-context');

      // 3. Add fundamentação guidance if applicable
      if (this.needsFundamentacao(request.sectionType)) {
        enrichedUserPrompt =
          await this.fundamentacaoAgent.enrich(enrichedUserPrompt);
        agentsUsed.push('fundamentacao-guidance');
      }

      // 4. Add anti-hallucination safety prompt
      const safetyPrompt =
        await this.antiHallucinationAgent.generateSafetyPrompt();
      const finalSystemPrompt = `${systemPrompt}\n\n${safetyPrompt}`;
      agentsUsed.push('anti-hallucination');

      // 5. Add ETP context if available
      if (request.etpData) {
        enrichedUserPrompt = `${enrichedUserPrompt}\n\n[CONTEXTO DO ETP]\nObjeto: ${request.etpData.objeto}\nÓrgão: ${request.etpData.metadata?.orgao || 'Não especificado'}`;
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
      agentsUsed.push('simplification-analysis');

      if (simplificationResult.score < 70) {
        // Try to auto-simplify
        generatedContent =
          await this.simplificacaoAgent.simplify(generatedContent);
        warnings.push(
          'Texto foi simplificado automaticamente. Revise para garantir correção.',
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
        'validation-legal',
        'validation-clareza',
        'validation-hallucination',
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
        '\n\n⚠️ Este conteúdo foi gerado por IA e requer validação humana antes do uso oficial.';

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
          'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
      };
    } catch (error) {
      this.logger.error('Error generating section:', error);
      throw error;
    }
  }

  /**
   * Builds comprehensive system prompt by combining all agent-specific prompts.
   *
   * @remarks
   * Constructs a multi-layered system prompt that includes:
   * - Base instructions for ETP generation
   * - Legal compliance guidelines from LegalAgent
   * - Clarity requirements from ClarezaAgent
   * - Simplification rules from SimplificacaoAgent
   * - Anti-hallucination safeguards
   * - Section-specific guidance (e.g., fundamentacao for justificativa sections)
   *
   * All prompts are concatenated with clear separators to maintain context isolation.
   *
   * @param sectionType - Type of section being generated (e.g., 'justificativa', 'introducao')
   * @returns Complete system prompt ready for LLM consumption
   */
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

    let sectionSpecificPrompt = '';

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

${sectionSpecificPrompt ? `---\n${sectionSpecificPrompt}` : ''}`;
  }

  /**
   * Determines if a section type requires fundamentacao (argumentation) validation.
   *
   * @remarks
   * Sections like justificativa, introducao, and descricao_solucao require strong
   * argumentation and justification, so they need the FundamentacaoAgent's guidance
   * during generation and validation.
   *
   * @param sectionType - Type of section being checked
   * @returns True if section requires fundamentacao validation, false otherwise
   */
  private needsFundamentacao(sectionType: string): boolean {
    return ['justificativa', 'introducao', 'descricao_solucao'].includes(
      sectionType,
    );
  }

  /**
   * Validates existing content against all quality and compliance criteria.
   *
   * @remarks
   * This method runs all validation agents in parallel to assess pre-existing content.
   * Unlike generateSection(), this only validates without generating new content.
   * Useful for re-validating edited sections or content imported from external sources.
   *
   * Calculates an overall quality score by averaging scores from all agents.
   *
   * @param content - The text content to validate
   * @param sectionType - Type of section (affects which validations are applied)
   * @returns Validation results from all agents plus an overall quality score (0-100)
   *
   * @example
   * ```ts
   * const validation = await orchestratorService.validateContent(
   *   'Manual text content to validate...',
   *   'justificativa'
   * );
   *
   * console.log(validation.overallScore); // "85.50"
   * console.log(validation.legal.isCompliant); // true
   * console.log(validation.clareza.score); // 82
   * ```
   */
  async validateContent(content: string, sectionType: string) {
    this.logger.log('Validating existing content');

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

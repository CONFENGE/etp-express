import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService, LLMRequest } from './llm/openai.service';
import { LegalAgent } from './agents/legal.agent';
import { FundamentacaoAgent } from './agents/fundamentacao.agent';
import { ClarezaAgent } from './agents/clareza.agent';
import { SimplificacaoAgent } from './agents/simplificacao.agent';
import { AntiHallucinationAgent } from './agents/anti-hallucination.agent';
import { PIIRedactionService } from '../privacy/pii-redaction.service';
import { PerplexityService } from '../search/perplexity/perplexity.service';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Request structure for ETP section content generation.
 */
export interface GenerationRequest {
  sectionType: string;
  title: string;
  userInput: string;
  context?: Record<string, unknown>;
  etpData?: {
    objeto?: string;
    metadata?: {
      orgao?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
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
    legal?: unknown;
    fundamentacao?: unknown;
    clareza?: unknown;
    simplificacao?: unknown;
    antiHallucination?: unknown;
  };
  warnings: string[];
  disclaimer: string;
  /**
   * Indica se a geração foi realizada sem enriquecimento externo (Perplexity).
   * True quando a Perplexity falhou ou retornou fallback.
   */
  hasEnrichmentWarning?: boolean;
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
    private piiRedactionService: PIIRedactionService,
    private perplexityService: PerplexityService,
  ) {}

  /**
   * Sanitizes user input to prevent prompt injection attacks.
   *
   * @remarks
   * Detects and blocks common prompt injection patterns such as:
   * - Instructions to ignore previous prompts
   * - Role manipulation attempts (system:, assistant:, etc.)
   * - Attempts to extract sensitive information
   * - Command injection patterns
   *
   * @param input - User input to sanitize
   * @returns Sanitized input safe for LLM processing
   * @private
   */
  private sanitizeUserInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Detect malicious patterns (case-insensitive)
    const maliciousPatterns = [
      /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
      /forget\s+(everything|all|previous)/i,
      /disregard\s+(all\s+)?(previous|prior)\s+(instructions?|prompts?)/i,
      /(system|assistant|user)\s*:/i,
      /you\s+are\s+now\s+(a|an)\s+/i,
      /reveal\s+(your|the)\s+(prompt|instructions|system)/i,
      /what\s+(is|are)\s+your\s+(instructions|prompt|rules)/i,
      /show\s+me\s+your\s+(instructions|prompt|system)/i,
      /bypass\s+(security|safety|content\s+policy)/i,
      /<\s*script|javascript:|onerror\s*=/i, // XSS patterns
    ];

    // Check for malicious patterns
    const hasMaliciousPattern = maliciousPatterns.some((pattern) =>
      pattern.test(input),
    );

    if (hasMaliciousPattern) {
      this.logger.warn(
        `Prompt injection attempt detected and blocked: ${input.substring(0, 100)}...`,
      );
      // Return sanitized version without the malicious content
      return input
        .replace(
          /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
          '',
        )
        .replace(/forget\s+(everything|all|previous)/gi, '')
        .replace(
          /disregard\s+(all\s+)?(previous|prior)\s+(instructions?|prompts?)/gi,
          '',
        )
        .replace(/(system|assistant|user)\s*:/gi, '')
        .replace(/you\s+are\s+now\s+(a|an)\s+/gi, '')
        .replace(/reveal\s+(your|the)\s+(prompt|instructions|system)/gi, '')
        .replace(/what\s+(is|are)\s+your\s+(instructions|prompt|rules)/gi, '')
        .replace(/show\s+me\s+your\s+(instructions|prompt|system)/gi, '')
        .replace(/bypass\s+(security|safety|content\s+policy)/gi, '')
        .replace(/<\s*script|javascript:|onerror\s*=/gi, '')
        .trim();
    }

    // Basic sanitization: trim and normalize whitespace
    return input.trim().replace(/\s+/g, ' ');
  }

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
      // 0. Sanitize user input to prevent prompt injection attacks
      const sanitizedInput = this.sanitizeUserInput(request.userInput);
      if (sanitizedInput !== request.userInput) {
        warnings.push(
          'Input foi sanitizado para prevenir prompt injection. Conteúdo malicioso foi removido.',
        );
      }

      // 1-5. Build enriched prompts with all agent enhancements
      const {
        userPrompt: enrichedUserPrompt,
        systemPrompt: finalSystemPrompt,
        agentsUsed: promptAgents,
        warnings: promptWarnings,
        hasEnrichmentWarning,
      } = await this.buildEnrichedPrompt(
        request.etpData,
        request.sectionType,
        sanitizedInput,
      );

      agentsUsed.push(...promptAgents);
      warnings.push(...promptWarnings);

      // 5.5. Sanitize PII before sending to external LLM (LGPD compliance)
      const { redacted: sanitizedPrompt, findings: piiFindings } =
        this.piiRedactionService.redact(enrichedUserPrompt);

      if (piiFindings.length > 0) {
        this.logger.warn('PII detected and redacted before LLM call', {
          section: request.sectionType,
          findings: piiFindings,
        });
        warnings.push(
          'Informações pessoais foram detectadas e sanitizadas antes do processamento.',
        );
      }

      // 6. Generate content with LLM
      const temperature = this.getSectionTemperature(request.sectionType);
      const llmRequest: LLMRequest = {
        systemPrompt: finalSystemPrompt,
        userPrompt: sanitizedPrompt, // Use sanitized version
        temperature,
        maxTokens: 4000,
      };

      this.logger.log(
        `Generating section with temperature ${temperature} for sectionType: ${request.sectionType}`,
      );

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
        disclaimer: DISCLAIMER,
        hasEnrichmentWarning,
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
   * Returns appropriate temperature for the section type.
   *
   * @remarks
   * Different section types require different levels of precision vs creativity:
   * - Factual/legal sections: Low temperature (0.2) for precision
   * - Creative/descriptive sections: Medium temperature (0.6) for controlled creativity
   * - Unknown sections: Default balanced temperature (0.5)
   *
   * This prevents AI hallucinations in critical legal/budget sections while
   * allowing appropriate creativity in descriptive content.
   *
   * @param sectionType - Type of section being generated
   * @returns Temperature value between 0.2 and 0.6
   */
  private getSectionTemperature(sectionType: string): number {
    // Sections that require factual and legal precision
    const FACTUAL_SECTIONS = [
      'justificativa',
      'base_legal',
      'orcamento',
      'identificacao',
      'metodologia',
      'cronograma',
      'riscos',
      'especificacao_tecnica',
    ];

    // Sections that allow controlled creativity
    const CREATIVE_SECTIONS = [
      'introducao',
      'contextualizacao',
      'descricao_solucao',
      'beneficiarios',
      'sustentabilidade',
      'justificativa_economica',
    ];

    if (FACTUAL_SECTIONS.includes(sectionType.toLowerCase())) {
      return 0.2; // Factual precision
    } else if (CREATIVE_SECTIONS.includes(sectionType.toLowerCase())) {
      return 0.6; // Controlled creativity
    } else {
      return 0.5; // Default balanced
    }
  }

  /**
   * Determines if a section type benefits from market enrichment via Perplexity.
   *
   * @remarks
   * Sections like justificativa, contextualizacao, and orcamento benefit from
   * external market data and similar contract examples to strengthen argumentation.
   *
   * @param sectionType - Type of section being checked
   * @returns True if section should be enriched with market data, false otherwise
   */
  private needsMarketEnrichment(sectionType: string): boolean {
    return [
      'justificativa',
      'contextualizacao',
      'orcamento',
      'pesquisa_mercado',
      'especificacao_tecnica',
    ].includes(sectionType.toLowerCase());
  }

  /**
   * Builds an enrichment query for Perplexity based on section type and ETP context.
   *
   * @remarks
   * Creates a targeted query to retrieve relevant market data, similar contracts,
   * and pricing information to enrich the ETP section generation.
   *
   * @param sectionType - Type of section being generated
   * @param objeto - The object/item being contracted
   * @returns Formatted query string for Perplexity search
   */
  private buildEnrichmentQuery(sectionType: string, objeto: string): string {
    const baseQuery = `Busque informações sobre contratações públicas brasileiras similares a: "${objeto}".`;

    const sectionSpecificQueries: Record<string, string> = {
      justificativa: `${baseQuery}
      Inclua:
      - Exemplos de justificativas de órgãos públicos
      - Benefícios observados em contratações similares
      - Dados quantitativos sobre impacto e eficiência
      - Referências a casos de sucesso`,

      contextualizacao: `${baseQuery}
      Inclua:
      - Contexto de mercado atual
      - Tendências em contratações públicas do setor
      - Desafios e oportunidades identificados
      - Casos relevantes de outros órgãos`,

      orcamento: `${baseQuery}
      Inclua:
      - Valores praticados em contratações similares
      - Faixas de preço de mercado
      - Referências de preços de órgãos públicos
      - Links para processos licitatórios relacionados`,

      pesquisa_mercado: `${baseQuery}
      Inclua:
      - Fornecedores principais no mercado
      - Valores de referência
      - Condições comerciais típicas
      - Análise de mercado do setor`,

      especificacao_tecnica: `${baseQuery}
      Inclua:
      - Especificações técnicas de referência
      - Padrões de mercado adotados
      - Requisitos técnicos comuns em contratações similares
      - Normas e certificações aplicáveis`,
    };

    const query =
      sectionSpecificQueries[sectionType.toLowerCase()] || baseQuery;

    return `${query}\n\nFoque em dados oficiais e cite as fontes. Priorize informações de órgãos públicos brasileiros.`;
  }

  /**
   * Builds enriched prompts (system and user) with all agent enhancements.
   *
   * @remarks
   * Constructs both system and user prompts by:
   * 1. Building comprehensive system prompt with all agent guidelines
   * 2. Enriching user prompt with legal context
   * 3. Adding fundamentação guidance if applicable
   * 4. Enriching with market data from Perplexity (optional)
   * 5. Adding anti-hallucination safety prompts
   * 6. Injecting ETP context data
   *
   * @param etpData - ETP context data (objeto, orgao, etc)
   * @param sectionType - Type of section being generated
   * @param sanitizedInput - Sanitized user input
   * @returns Object with userPrompt, systemPrompt, agentsUsed, warnings, and hasEnrichmentWarning
   * @private
   */
  private async buildEnrichedPrompt(
    etpData: GenerationRequest['etpData'],
    sectionType: string,
    sanitizedInput: string,
  ): Promise<{
    userPrompt: string;
    systemPrompt: string;
    agentsUsed: string[];
    warnings: string[];
    hasEnrichmentWarning: boolean;
  }> {
    const agentsUsed: string[] = [];
    const warnings: string[] = [];
    let hasEnrichmentWarning = false;

    // 1. Build system prompt with all agents
    const systemPrompt = await this.buildSystemPrompt(sectionType);
    agentsUsed.push('base-prompt');

    // 2. Enrich user prompt with legal context
    let enrichedUserPrompt = sanitizedInput;
    enrichedUserPrompt = await this.legalAgent.enrichWithLegalContext(
      enrichedUserPrompt,
      sectionType,
    );
    agentsUsed.push('legal-context');

    // 3. Add fundamentação guidance if applicable
    if (this.needsFundamentacao(sectionType)) {
      enrichedUserPrompt =
        await this.fundamentacaoAgent.enrich(enrichedUserPrompt);
      agentsUsed.push('fundamentacao-guidance');
    }

    // 3.5. Enrich with market fundamentation from Perplexity (optional)
    if (this.needsMarketEnrichment(sectionType)) {
      try {
        const enrichmentQuery = this.buildEnrichmentQuery(
          sectionType,
          etpData?.objeto || sanitizedInput,
        );

        const enrichmentResult =
          await this.perplexityService.search(enrichmentQuery);

        if (enrichmentResult.isFallback) {
          // Perplexity returned fallback - graceful degradation
          this.logger.warn(
            'Perplexity enrichment unavailable, continuing without market data',
            {
              sectionType,
            },
          );
          warnings.push(
            '⚠️ Fundamentação de mercado temporariamente indisponível. Revise e adicione referências manualmente se necessário.',
          );
          hasEnrichmentWarning = true;
        } else if (enrichmentResult.summary) {
          // Success - add market context to prompt
          enrichedUserPrompt = `${enrichedUserPrompt}\n\n[FUNDAMENTAÇÃO DE MERCADO]\n${enrichmentResult.summary}`;
          agentsUsed.push('market-enrichment');
          this.logger.log(
            `Enriched prompt with ${enrichmentResult.sources.length} market sources`,
          );
        }
      } catch (error) {
        // Unexpected error - log and continue (graceful degradation)
        this.logger.error('Unexpected error during Perplexity enrichment', {
          error: error.message,
          sectionType,
        });
        warnings.push(
          '⚠️ Erro ao buscar fundamentação de mercado. Geração continuou sem dados externos.',
        );
        hasEnrichmentWarning = true;
      }
    }

    // 4. Add anti-hallucination safety prompt
    const safetyPrompt =
      await this.antiHallucinationAgent.generateSafetyPrompt();
    const finalSystemPrompt = `${systemPrompt}\n\n${safetyPrompt}`;
    agentsUsed.push('anti-hallucination');

    // 5. Add ETP context if available
    if (etpData) {
      enrichedUserPrompt = `${enrichedUserPrompt}\n\n[CONTEXTO DO ETP]\nObjeto: ${etpData.objeto}\nÓrgão: ${etpData.metadata?.orgao || 'Não especificado'}`;
    }

    return {
      userPrompt: enrichedUserPrompt,
      systemPrompt: finalSystemPrompt,
      agentsUsed,
      warnings,
      hasEnrichmentWarning,
    };
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

import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService, LLMRequest } from './llm/openai.service';
import { LegalAgent, LegalValidationResult } from './agents/legal.agent';
import {
 FundamentacaoAgent,
 FundamentacaoResult,
} from './agents/fundamentacao.agent';
import { ClarezaAgent, ClarezaResult } from './agents/clareza.agent';
import {
 SimplificacaoAgent,
 SimplificacaoResult,
} from './agents/simplificacao.agent';
import {
 AntiHallucinationAgent,
 HallucinationCheckResult,
} from './agents/anti-hallucination.agent';
import { PIIRedactionService } from '../privacy/pii-redaction.service';
import { ExaService } from '../search/exa/exa.service';
import { GovSearchService } from '../gov-api/gov-search/gov-search.service';
import { GovSearchResult } from '../gov-api/gov-search/gov-search.types';
import {
 GovApiContract,
 GovApiPriceReference,
} from '../gov-api/interfaces/gov-api.interface';
import { DISCLAIMER } from '../../common/constants/messages';
import {
 ParallelValidationResults,
 LLMResponse,
 ValidationSummary,
} from './interfaces';
import {
 sanitizeInput,
 wrapWithXmlDelimiters,
 getXmlDelimiterSystemPrompt,
 SanitizationResult,
} from '../../common/utils/sanitizer';
import { ProgressCallback } from '../sections/interfaces/progress-event.interface';

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
 /**
 * Source of market enrichment data
 * - gov-api: Government APIs only (PNCP, Compras.gov.br, SINAPI, SICRO)
 * - exa: Exa AI only (fallback when gov data unavailable)
 * - mixed: Government APIs + Exa AI
 * - null: No enrichment performed
 */
 enrichmentSource?: 'gov-api' | 'exa' | 'mixed' | null;
 /**
 * Status of data sources queried during enrichment phase.
 * Used by frontend to display DataSourceStatus component.
 * @see #756 - DataSourceStatus frontend component
 */
 dataSourceStatus?: {
 status:
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT';
 sources: Array<{
 name: string;
 status:
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT';
 error?: string;
 latencyMs?: number;
 resultCount?: number;
 }>;
 message: string;
 };
 };
 validationResults: {
 /** Legal compliance validation result */
 legal?: LegalValidationResult;
 /** Argumentation quality validation result (for applicable sections) */
 fundamentacao?: FundamentacaoResult | null;
 /** Clarity and readability validation result */
 clareza?: ClarezaResult;
 /** Simplification analysis result */
 simplificacao?: SimplificacaoResult;
 /** Anti-hallucination check result */
 antiHallucination?: HallucinationCheckResult;
 };
 warnings: string[];
 disclaimer: string;
 /**
 * Indica se a geração foi realizada sem enriquecimento externo completo.
 * True quando houve fallback ou falha parcial.
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
 private govSearchService: GovSearchService,
 private exaService: ExaService,
 ) {}

 /**
 * Sanitizes user input to prevent prompt injection attacks.
 *
 * @remarks
 * Applies multi-layered protection following OWASP LLM Top 10 guidelines:
 * - Unicode normalization (NFKC) to prevent homograph attacks
 * - Zero-width character removal to prevent obfuscation
 * - Size limits per section type to reduce attack surface
 * - Enhanced pattern detection for injection attempts
 * - Detailed logging for security monitoring
 *
 * @param input - User input to sanitize
 * @param sectionType - Type of section (affects size limit)
 * @returns Sanitization result with cleaned input and metadata
 * @private
 */
 private sanitizeUserInputEnhanced(
 input: string,
 sectionType: string,
 ): SanitizationResult {
 const result = sanitizeInput(input, sectionType);

 // Enhanced logging for security monitoring
 if (result.injectionDetected) {
 this.logger.warn('Prompt injection attempt detected', {
 sectionType,
 patterns: result.detectedPatterns,
 inputPreview:
 input.substring(0, 100) + (input.length > 100 ? '...' : ''),
 modifications: result.modifications,
 });
 }

 if (result.wasTruncated) {
 this.logger.warn('Input truncated due to size limit', {
 sectionType,
 originalLength: result.originalLength,
 truncatedTo: result.sanitized.length,
 });
 }

 if (
 result.wasModified &&
 !result.injectionDetected &&
 !result.wasTruncated
 ) {
 this.logger.debug('Input sanitized', {
 sectionType,
 modifications: result.modifications,
 });
 }

 return result;
 }

 /**
 * Builds enriched prompts for LLM generation.
 *
 * @remarks
 * This method constructs both system and user prompts by:
 * - Sanitizing user input to prevent prompt injection
 * - Building base system prompt with all agent guidelines
 * - Enriching user prompt with legal context
 * - Adding fundamentação guidance for applicable sections
 * - Enriching with market data via Exa (when applicable)
 * - Adding anti-hallucination safety prompts
 * - Injecting ETP context data
 * - Redacting PII for LGPD compliance
 *
 * @param request - Generation request containing section type, user input, and ETP data
 * @param agentsUsed - Array to track which agents were used (mutated)
 * @param warnings - Array to collect warnings (mutated)
 * @returns Object with systemPrompt, userPrompt, and hasEnrichmentWarning flag
 * @private
 */
 private async buildEnrichedPrompt(
 request: GenerationRequest,
 agentsUsed: string[],
 warnings: string[],
 ): Promise<{
 systemPrompt: string;
 userPrompt: string;
 hasEnrichmentWarning: boolean;
 enrichmentSource: 'gov-api' | 'exa' | 'mixed' | null;
 }> {
 // 0. Sanitize user input with enhanced protection
 const sanitizationResult = this.sanitizeUserInputEnhanced(
 request.userInput,
 request.sectionType,
 );
 const sanitizedInput = sanitizationResult.sanitized;

 // Add warnings based on sanitization result
 if (sanitizationResult.injectionDetected) {
 warnings.push(
 'Input foi sanitizado para prevenir prompt injection. Conteúdo suspeito foi removido.',
 );
 }
 if (sanitizationResult.wasTruncated) {
 warnings.push(
 `Input foi truncado de ${sanitizationResult.originalLength} para ${sanitizedInput.length} caracteres devido ao limite da seção.`,
 );
 }
 if (
 sanitizationResult.wasModified &&
 !sanitizationResult.injectionDetected &&
 !sanitizationResult.wasTruncated
 ) {
 // Only add a generic message for minor modifications (Unicode normalization, etc.)
 this.logger.debug('Input underwent minor sanitization', {
 modifications: sanitizationResult.modifications,
 });
 }

 // 1. Build system prompt with all agents
 const systemPrompt = await this.buildSystemPrompt(request.sectionType);
 agentsUsed.push('base-prompt');

 // 2. Enrich user prompt with legal context
 let enrichedUserPrompt = sanitizedInput;
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

 // 3.5. Enrich with market fundamentation (Gov-API first, Exa fallback)
 let hasEnrichmentWarning = false;
 let enrichmentSource: 'gov-api' | 'exa' | 'mixed' | null = null;
 if (this.needsMarketEnrichment(request.sectionType)) {
 try {
 const enrichmentResult = await this.enrichWithMarketData(
 request.sectionType,
 request.etpData?.objeto || sanitizedInput,
 );

 // Add market context to prompt
 enrichedUserPrompt = `${enrichedUserPrompt}\n\n[FUNDAMENTAÇÃO DE MERCADO]\n${enrichmentResult.summary}`;
 enrichmentSource = enrichmentResult.source;
 agentsUsed.push(`market-enrichment-${enrichmentResult.source}`);

 this.logger.log(
 `Market enrichment successful via ${enrichmentResult.source}`,
 );

 // Add warning if fallback was used
 if (enrichmentResult.fallbackUsed) {
 hasEnrichmentWarning = true;
 if (enrichmentResult.source === 'mixed') {
 warnings.push(
 '⚠ Dados governamentais insuficientes, complementados com contexto adicional de mercado.',
 );
 }
 }
 } catch (error) {
 // Complete failure - log and continue (graceful degradation)
 this.logger.error('Market enrichment failed from all sources', {
 error: error.message,
 sectionType: request.sectionType,
 });
 warnings.push(
 '⚠ Fundamentação de mercado indisponível. Revise e adicione referências manualmente.',
 );
 hasEnrichmentWarning = true;
 }
 }

 // 4. Add anti-hallucination safety prompt
 const safetyPrompt =
 await this.antiHallucinationAgent.generateSafetyPrompt();

 // 4.5. Add XML delimiter security instructions
 const xmlDelimiterPrompt = getXmlDelimiterSystemPrompt();
 const finalSystemPrompt = `${systemPrompt}\n\n${safetyPrompt}\n\n---\n${xmlDelimiterPrompt}`;
 agentsUsed.push('anti-hallucination', 'xml-delimiter-protection');

 // 5. Add ETP context if available
 if (request.etpData) {
 enrichedUserPrompt = `${enrichedUserPrompt}\n\n[CONTEXTO DO ETP]\nObjeto: ${request.etpData.objeto}\nÓrgão: ${request.etpData.metadata?.orgao || 'Não especificado'}`;
 }

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

 // 6. Wrap user prompt with XML delimiters for structured protection
 const wrappedUserPrompt = wrapWithXmlDelimiters(sanitizedPrompt);

 return {
 systemPrompt: finalSystemPrompt,
 userPrompt: wrappedUserPrompt,
 hasEnrichmentWarning,
 enrichmentSource,
 };
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
 * sectionType: 'justificativa',
 * title: 'Justificativa da Contratação',
 * userInput: 'Necessidade de adquirir notebooks para equipe de TI',
 * context: { department: 'TI' },
 * etpData: {
 * objeto: 'Aquisição de 50 Notebooks Dell Latitude 5420',
 * metadata: { orgao: 'Secretaria de Tecnologia' }
 * }
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
 // 1. Build enriched prompts
 const {
 systemPrompt: finalSystemPrompt,
 userPrompt: sanitizedPrompt,
 hasEnrichmentWarning,
 enrichmentSource,
 } = await this.buildEnrichedPrompt(request, agentsUsed, warnings);

 // 2. Generate content with LLM
 const llmResponse = await this.generateWithLLM(
 sanitizedPrompt,
 finalSystemPrompt,
 request.sectionType,
 );

 // 3. Post-process content
 const { content: processedContent, simplificationResult } =
 await this.postProcessContent(
 llmResponse.content,
 warnings,
 agentsUsed,
 );

 // 4. Run validations
 const validationResults = await this.runParallelValidations(
 processedContent,
 request,
 agentsUsed,
 );

 const validationWarnings = await this.runValidations(
 validationResults.legalValidation,
 validationResults.fundamentacaoValidation,
 validationResults.clarezaValidation,
 validationResults.hallucinationCheck,
 );

 warnings.push(...validationWarnings.warnings);

 // 5. Finalize and return
 return this.buildFinalResult(
 processedContent,
 llmResponse,
 simplificationResult,
 validationResults,
 warnings,
 agentsUsed,
 hasEnrichmentWarning,
 enrichmentSource,
 startTime,
 );
 } catch (error) {
 this.logger.error('Error generating section:', error);
 throw error;
 }
 }

 /**
 * Generates ETP section content with real-time progress callbacks.
 *
 * @remarks
 * This method is similar to `generateSection()` but accepts a progress callback
 * to emit events during each phase of the generation pipeline. This enables
 * Server-Sent Events (SSE) streaming for real-time user feedback.
 *
 * **Progress Phases:**
 * 1. sanitization (10-15%): Input sanitization, PII redaction
 * 2. enrichment (15-30%): Market data enrichment via Gov-API/Exa
 * 3. generation (30-70%): LLM content generation
 * 4. validation (70-95%): Multi-agent validation
 * 5. complete (95-100%): Final result assembly
 *
 * @param request - Generation request containing section type, user input, and ETP data
 * @param onProgress - Callback function invoked at each progress milestone
 * @returns Generated content with metadata, validation results, and warnings
 * @throws {Error} If OpenAI API fails or any agent encounters a critical error
 *
 * @see #754 - SSE streaming implementation
 */
 async generateSectionWithProgress(
 request: GenerationRequest,
 onProgress?: ProgressCallback,
 ): Promise<GenerationResult> {
 const startTime = Date.now();
 this.logger.log(`Generating section with progress: ${request.sectionType}`);

 const agentsUsed: string[] = [];
 const warnings: string[] = [];

 try {
 // Phase 1: Sanitization (10-15%)
 onProgress?.({
 phase: 'sanitization',
 step: 1,
 totalSteps: 5,
 message: 'Sanitizando entrada e removendo dados sensíveis...',
 percentage: 12,
 timestamp: Date.now(),
 });

 // Build enriched prompts
 const {
 systemPrompt: finalSystemPrompt,
 userPrompt: sanitizedPrompt,
 hasEnrichmentWarning,
 enrichmentSource,
 dataSourceStatus,
 } = await this.buildEnrichedPromptWithProgress(
 request,
 agentsUsed,
 warnings,
 onProgress,
 );

 // Phase 3: Generation (30-70%)
 onProgress?.({
 phase: 'generation',
 step: 3,
 totalSteps: 5,
 message: 'Gerando conteúdo com IA...',
 percentage: 35,
 timestamp: Date.now(),
 });

 const llmResponse = await this.generateWithLLM(
 sanitizedPrompt,
 finalSystemPrompt,
 request.sectionType,
 );

 onProgress?.({
 phase: 'generation',
 step: 3,
 totalSteps: 5,
 message: 'Processando resposta da IA...',
 percentage: 65,
 timestamp: Date.now(),
 });

 // Post-process content
 const { content: processedContent, simplificationResult } =
 await this.postProcessContent(
 llmResponse.content,
 warnings,
 agentsUsed,
 );

 // Phase 4: Validation (70-95%)
 onProgress?.({
 phase: 'validation',
 step: 4,
 totalSteps: 5,
 message: 'Validando conformidade legal...',
 percentage: 72,
 timestamp: Date.now(),
 details: {
 agents: ['legal-agent'],
 },
 });

 const validationResults = await this.runParallelValidations(
 processedContent,
 request,
 agentsUsed,
 );

 onProgress?.({
 phase: 'validation',
 step: 4,
 totalSteps: 5,
 message: 'Verificando clareza e anti-alucinação...',
 percentage: 85,
 timestamp: Date.now(),
 details: {
 agents: ['clareza-agent', 'anti-hallucination-agent'],
 },
 });

 const validationWarnings = await this.runValidations(
 validationResults.legalValidation,
 validationResults.fundamentacaoValidation,
 validationResults.clarezaValidation,
 validationResults.hallucinationCheck,
 );

 warnings.push(...validationWarnings.warnings);

 onProgress?.({
 phase: 'validation',
 step: 4,
 totalSteps: 5,
 message: 'Finalizando validações...',
 percentage: 92,
 timestamp: Date.now(),
 });

 // Phase 5: Finalize (95-100%)
 return this.buildFinalResult(
 processedContent,
 llmResponse,
 simplificationResult,
 validationResults,
 warnings,
 agentsUsed,
 hasEnrichmentWarning,
 enrichmentSource,
 startTime,
 dataSourceStatus,
 );
 } catch (error) {
 this.logger.error('Error generating section with progress:', error);
 throw error;
 }
 }

 /**
 * Builds enriched prompts with progress callbacks.
 *
 * @private
 */
 private async buildEnrichedPromptWithProgress(
 request: GenerationRequest,
 agentsUsed: string[],
 warnings: string[],
 onProgress?: ProgressCallback,
 ): Promise<{
 systemPrompt: string;
 userPrompt: string;
 hasEnrichmentWarning: boolean;
 enrichmentSource: 'gov-api' | 'exa' | 'mixed' | null;
 dataSourceStatus?: {
 status:
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT';
 sources: Array<{
 name: string;
 status:
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT';
 error?: string;
 latencyMs?: number;
 resultCount?: number;
 }>;
 message: string;
 };
 }> {
 // Sanitization phase
 const sanitizationResult = this.sanitizeUserInputEnhanced(
 request.userInput,
 request.sectionType,
 );
 const sanitizedInput = sanitizationResult.sanitized;

 if (sanitizationResult.injectionDetected) {
 warnings.push(
 'Input foi sanitizado para prevenir prompt injection. Conteúdo suspeito foi removido.',
 );
 }
 if (sanitizationResult.wasTruncated) {
 warnings.push(
 `Input foi truncado de ${sanitizationResult.originalLength} para ${sanitizedInput.length} caracteres devido ao limite da seção.`,
 );
 }

 // Build system prompt
 const systemPrompt = await this.buildSystemPrompt(request.sectionType);
 agentsUsed.push('base-prompt');

 // Phase 2: Enrichment (15-30%)
 onProgress?.({
 phase: 'enrichment',
 step: 2,
 totalSteps: 5,
 message: 'Enriquecendo com contexto legal...',
 percentage: 18,
 timestamp: Date.now(),
 });

 // Enrich user prompt with legal context
 let enrichedUserPrompt = sanitizedInput;
 enrichedUserPrompt = await this.legalAgent.enrichWithLegalContext(
 enrichedUserPrompt,
 request.sectionType,
 );
 agentsUsed.push('legal-context');

 // Add fundamentação guidance if applicable
 if (this.needsFundamentacao(request.sectionType)) {
 enrichedUserPrompt =
 await this.fundamentacaoAgent.enrich(enrichedUserPrompt);
 agentsUsed.push('fundamentacao-guidance');
 }

 // Market enrichment
 let hasEnrichmentWarning = false;
 let enrichmentSource: 'gov-api' | 'exa' | 'mixed' | null = null;
 let dataSourceStatus:
 | {
 status:
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT';
 sources: Array<{
 name: string;
 status:
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT';
 error?: string;
 latencyMs?: number;
 resultCount?: number;
 }>;
 message: string;
 }
 | undefined;

 if (this.needsMarketEnrichment(request.sectionType)) {
 onProgress?.({
 phase: 'enrichment',
 step: 2,
 totalSteps: 5,
 message: 'Buscando dados de mercado...',
 percentage: 22,
 timestamp: Date.now(),
 });

 try {
 const enrichmentResult = await this.enrichWithMarketData(
 request.sectionType,
 request.etpData?.objeto || sanitizedInput,
 );

 enrichedUserPrompt = `${enrichedUserPrompt}\n\n[FUNDAMENTAÇÃO DE MERCADO]\n${enrichmentResult.summary}`;
 enrichmentSource = enrichmentResult.source;
 dataSourceStatus = enrichmentResult.dataSourceStatus;
 agentsUsed.push(`market-enrichment-${enrichmentResult.source}`);

 onProgress?.({
 phase: 'enrichment',
 step: 2,
 totalSteps: 5,
 message: `Dados obtidos via ${enrichmentResult.source}`,
 percentage: 28,
 timestamp: Date.now(),
 details: {
 enrichmentSource: enrichmentResult.source,
 dataSourceStatus: enrichmentResult.dataSourceStatus,
 },
 });

 if (enrichmentResult.fallbackUsed) {
 hasEnrichmentWarning = true;
 if (enrichmentResult.source === 'mixed') {
 warnings.push(
 '⚠ Dados governamentais insuficientes, complementados com contexto adicional de mercado.',
 );
 }
 }
 } catch (error) {
 this.logger.error('Market enrichment failed from all sources', {
 error: error.message,
 sectionType: request.sectionType,
 });
 warnings.push(
 '⚠ Fundamentação de mercado indisponível. Revise e adicione referências manualmente.',
 );
 hasEnrichmentWarning = true;

 // Create error status for frontend
 dataSourceStatus = {
 status: 'SERVICE_UNAVAILABLE',
 sources: [],
 message: 'Todas as fontes de dados indisponíveis',
 };

 onProgress?.({
 phase: 'enrichment',
 step: 2,
 totalSteps: 5,
 message: 'Enriquecimento de mercado indisponível, continuando...',
 percentage: 28,
 timestamp: Date.now(),
 details: {
 dataSourceStatus,
 },
 });
 }
 }

 // Add anti-hallucination safety prompt
 const safetyPrompt =
 await this.antiHallucinationAgent.generateSafetyPrompt();
 const xmlDelimiterPrompt = getXmlDelimiterSystemPrompt();
 const finalSystemPrompt = `${systemPrompt}\n\n${safetyPrompt}\n\n---\n${xmlDelimiterPrompt}`;
 agentsUsed.push('anti-hallucination', 'xml-delimiter-protection');

 // Add ETP context if available
 if (request.etpData) {
 enrichedUserPrompt = `${enrichedUserPrompt}\n\n[CONTEXTO DO ETP]\nObjeto: ${request.etpData.objeto}\nÓrgão: ${request.etpData.metadata?.orgao || 'Não especificado'}`;
 }

 // Sanitize PII
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

 // Wrap user prompt with XML delimiters
 const wrappedUserPrompt = wrapWithXmlDelimiters(sanitizedPrompt);

 return {
 systemPrompt: finalSystemPrompt,
 userPrompt: wrappedUserPrompt,
 hasEnrichmentWarning,
 enrichmentSource,
 };
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
 * Generates content using the OpenAI LLM with the provided prompts.
 *
 * @remarks
 * Constructs an LLM request with appropriate temperature settings and token limits,
 * logs the generation request, and invokes the OpenAI service to generate content.
 *
 * @param userPrompt - The enriched user prompt containing context and requirements
 * @param systemPrompt - The system prompt with guidelines and constraints
 * @param sectionType - Type of section being generated (affects temperature)
 * @returns LLM response containing content, tokens, and model information
 * @private
 */
 private async generateWithLLM(
 userPrompt: string,
 systemPrompt: string,
 sectionType: string,
 ): Promise<{ content: string; tokens: number; model: string }> {
 const temperature = this.getSectionTemperature(sectionType);
 const llmRequest: LLMRequest = {
 systemPrompt,
 userPrompt,
 temperature,
 maxTokens: 4000,
 };

 this.logger.log(
 `Generating section with temperature ${temperature} for sectionType: ${sectionType}`,
 );

 const llmResponse = await this.openaiService.generateCompletion(llmRequest);
 return llmResponse;
 }

 /**
 * Post-processes generated content by analyzing and applying simplification if needed.
 *
 * @remarks
 * Analyzes the content readability score and automatically simplifies if below 70%.
 * Updates the warnings array when simplification is applied.
 *
 * @param rawContent - Raw content from LLM generation
 * @param warnings - Array to collect warning messages (modified in place)
 * @param agentsUsed - Array to track which agents were used (modified in place)
 * @returns Object containing processed content and simplification analysis result
 * @private
 */
 private async postProcessContent(
 rawContent: string,
 warnings: string[],
 agentsUsed: string[],
 ): Promise<{ content: string; simplificationResult: SimplificacaoResult }> {
 const simplificationResult =
 await this.simplificacaoAgent.analyze(rawContent);
 agentsUsed.push('simplification-analysis');

 if (simplificationResult.score < 70) {
 const simplifiedContent =
 await this.simplificacaoAgent.simplify(rawContent);
 warnings.push(
 'Texto foi simplificado automaticamente. Revise para garantir correção.',
 );
 return { content: simplifiedContent, simplificationResult };
 }

 return { content: rawContent, simplificationResult };
 }

 /**
 * Runs all validation agents in parallel on the generated content.
 *
 * @remarks
 * Executes legal, fundamentacao (if applicable), clarity, and hallucination checks
 * **concurrently** using Promise.all() to minimize validation time. Updates the agentsUsed array.
 *
 * **Performance Characteristics:**
 * - Uses Promise.all() for true parallel execution (verified #341)
 * - Total validation time ≈ slowest agent (not sum of all agents)
 * - Expected speedup: ~4-5x vs sequential execution
 * - Timestamp logs available for performance monitoring
 *
 * @param content - The generated content to validate
 * @param request - Original generation request (needed for section type and context)
 * @param agentsUsed - Array to track which agents were used (mutated)
 * @returns Validation results from all agents
 * @private
 */
 private async runParallelValidations(
 content: string,
 request: GenerationRequest,
 agentsUsed: string[],
 ): Promise<ParallelValidationResults> {
 const startTime = Date.now();
 this.logger.debug(
 '[Parallel Validations] Starting all agents concurrently',
 );

 const [
 legalValidation,
 fundamentacaoValidation,
 clarezaValidation,
 hallucinationCheck,
 ] = await Promise.all([
 this.legalAgent.validate(content, {
 type: request.sectionType,
 }),
 this.needsFundamentacao(request.sectionType)
 ? this.fundamentacaoAgent.analyze(content)
 : Promise.resolve(null),
 this.clarezaAgent.analyze(content),
 this.antiHallucinationAgent.check(content, request.context),
 ]);

 const duration = Date.now() - startTime;
 this.logger.debug(
 `[Parallel Validations] All agents completed in ${duration}ms (parallel execution confirmed)`,
 );

 agentsUsed.push(
 'validation-legal',
 'validation-clareza',
 'validation-hallucination',
 );

 return {
 legalValidation,
 fundamentacaoValidation,
 clarezaValidation,
 hallucinationCheck,
 };
 }

 /**
 * Runs validation checks on generated content and collects warnings.
 *
 * @remarks
 * Analyzes validation results from all agents (legal, fundamentacao, clareza, hallucination)
 * and extracts warnings and recommendations. Returns a structured object indicating if
 * content is valid and what issues were found.
 *
 * @param legalValidation - Validation result from LegalAgent
 * @param fundamentacaoValidation - Validation result from FundamentacaoAgent (nullable)
 * @param clarezaValidation - Validation result from ClarezaAgent
 * @param hallucinationCheck - Validation result from AntiHallucinationAgent
 * @returns Object with isValid flag, warnings array, and errors array
 * @private
 */
 private async runValidations(
 legalValidation: LegalValidationResult,
 fundamentacaoValidation: FundamentacaoResult | null,
 clarezaValidation: ClarezaResult,
 hallucinationCheck: HallucinationCheckResult,
 ): Promise<ValidationSummary> {
 const warnings: string[] = [];
 const errors: string[] = [];

 // Legal compliance validation
 if (!legalValidation.isCompliant) {
 warnings.push(...legalValidation.recommendations);
 }

 // Fundamentacao validation (if applicable)
 if (fundamentacaoValidation && fundamentacaoValidation.score < 70) {
 warnings.push(...fundamentacaoValidation.suggestions);
 }

 // Clarity validation
 if (clarezaValidation.score < 70) {
 warnings.push(...clarezaValidation.suggestions);
 }

 // Anti-hallucination validation
 if (!hallucinationCheck.verified) {
 warnings.push(...hallucinationCheck.warnings);
 }

 const isValid =
 legalValidation.isCompliant &&
 (!fundamentacaoValidation || fundamentacaoValidation.score >= 70) &&
 clarezaValidation.score >= 70 &&
 hallucinationCheck.verified;

 return { isValid, warnings, errors };
 }

 /**
 * Builds the final GenerationResult with all metadata and validations.
 *
 * @remarks
 * Assembles the complete result object including content, metadata, validation results,
 * warnings, and disclaimer. Adds the mandatory AI disclaimer to the content.
 * Logs completion time and agent usage.
 *
 * @param content - The processed content
 * @param llmResponse - Response from LLM generation
 * @param simplificationResult - Result from simplification analysis
 * @param validationResults - Results from all validation agents
 * @param warnings - Accumulated warnings from all steps
 * @param agentsUsed - List of agents used during generation
 * @param hasEnrichmentWarning - Flag indicating if enrichment failed
 * @param startTime - Timestamp when generation started
 * @param dataSourceStatus - Status of data sources queried during enrichment (#756)
 * @returns Complete GenerationResult object
 * @private
 */
 private buildFinalResult(
 content: string,
 llmResponse: LLMResponse,
 simplificationResult: SimplificacaoResult,
 validationResults: ParallelValidationResults,
 warnings: string[],
 agentsUsed: string[],
 hasEnrichmentWarning: boolean,
 enrichmentSource: 'gov-api' | 'exa' | 'mixed' | null,
 startTime: number,
 dataSourceStatus?: GenerationResult['metadata']['dataSourceStatus'],
 ): GenerationResult {
 // Add mandatory disclaimer
 const finalContent =
 content +
 '\n\n⚠ Este conteúdo foi gerado por IA e requer validação humana antes do uso oficial.';

 const generationTime = Date.now() - startTime;

 this.logger.log(
 `Section generated successfully in ${generationTime}ms. Agents used: ${agentsUsed.length}`,
 );

 return {
 content: finalContent,
 metadata: {
 tokens: llmResponse.tokens,
 model: llmResponse.model,
 generationTime,
 agentsUsed,
 enrichmentSource,
 dataSourceStatus,
 },
 validationResults: {
 legal: validationResults.legalValidation,
 fundamentacao: validationResults.fundamentacaoValidation,
 clareza: validationResults.clarezaValidation,
 simplificacao: simplificationResult,
 antiHallucination: validationResults.hallucinationCheck,
 },
 warnings: [...new Set(warnings)],
 disclaimer: DISCLAIMER,
 hasEnrichmentWarning,
 };
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
 * Determines if a section type benefits from market enrichment via Exa AI.
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
 * Builds an enrichment query for Exa based on section type and ETP context.
 *
 * @remarks
 * Creates a targeted query to retrieve relevant market data, similar contracts,
 * and pricing information to enrich the ETP section generation.
 *
 * @param sectionType - Type of section being generated
 * @param objeto - The object/item being contracted
 * @returns Formatted query string for Exa search
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
 * Enriches content with market data using government APIs as primary source.
 *
 * @remarks
 * This method implements a gov-first strategy for market enrichment:
 * 1. First attempts to retrieve data from government APIs (PNCP, Compras.gov.br, SINAPI, SICRO)
 * 2. If government results are insufficient, falls back to Exa AI
 * 3. Logs the source used for metrics and monitoring
 *
 * **Source Priority:**
 * - Primary: Government APIs (official data)
 * - Fallback: Exa AI (general market intelligence)
 *
 * **Metrics:**
 * - `market_enrichment_source`: gov-api | exa | mixed
 * - Logs track which source was used for each enrichment
 *
 * @param sectionType - Type of section being enriched
 * @param objeto - The object/item being contracted
 * @returns Enrichment summary and source metadata
 * @private
 */
 private async enrichWithMarketData(
 sectionType: string,
 objeto: string,
 ): Promise<{
 summary: string;
 source: 'gov-api' | 'exa' | 'mixed';
 fallbackUsed: boolean;
 dataSourceStatus?: {
 status:
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT';
 sources: Array<{
 name: string;
 status:
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT';
 error?: string;
 latencyMs?: number;
 resultCount?: number;
 }>;
 message: string;
 };
 }> {
 const enrichmentQuery = this.buildEnrichmentQuery(sectionType, objeto);

 // Determine if this is infrastructure/construction for Gov-API targeting
 const isInfrastructure = this.isInfrastructureProject(objeto);
 const isConstrucaoCivil = this.isConstrucaoCivilProject(objeto);

 try {
 // 1. Try government APIs first
 this.logger.log(
 `Attempting market enrichment via Gov-API for: ${sectionType}`,
 );

 const govResult = await this.govSearchService.search(enrichmentQuery, {
 includePrecos: this.needsPriceReference(sectionType),
 isInfrastructure,
 isConstrucaoCivil,
 enableExaFallback: false, // We'll handle fallback ourselves
 maxPerSource: 5,
 });

 // 2. Check if government results are sufficient
 const hasSufficientResults = govResult.totalResults >= 3;

 // Build dataSourceStatus from govResult
 const dataSourceStatus = {
 status: govResult.status as
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT',
 sources: govResult.sourceStatuses.map((s) => ({
 name: s.name as string,
 status: s.status as
 | 'SUCCESS'
 | 'PARTIAL'
 | 'SERVICE_UNAVAILABLE'
 | 'RATE_LIMITED'
 | 'TIMEOUT',
 error: s.error,
 latencyMs: s.latencyMs,
 resultCount: s.resultCount,
 })),
 message: govResult.statusMessage,
 };

 if (hasSufficientResults) {
 // Success with government data only
 const summary = this.formatGovApiSummary(govResult);
 this.logger.log(
 `Market enrichment successful via Gov-API (${govResult.totalResults} results)`,
 );

 return {
 summary,
 source: 'gov-api',
 fallbackUsed: false,
 dataSourceStatus,
 };
 }

 // 3. Gov-API results insufficient - fallback to Exa
 this.logger.warn(
 `Gov-API results insufficient (${govResult.totalResults} < 3), falling back to Exa`,
 );

 const exaResult = await this.exaService.searchDeep(enrichmentQuery);

 if (exaResult.isFallback) {
 // Exa also unavailable - return what we have from Gov-API
 this.logger.warn('Exa fallback also unavailable, using Gov-API only');
 return {
 summary: this.formatGovApiSummary(govResult),
 source: 'gov-api',
 fallbackUsed: true,
 dataSourceStatus,
 };
 }

 // 4. Mixed results (Gov-API + Exa)
 const mixedSummary = this.mergeSummaries(
 this.formatGovApiSummary(govResult),
 exaResult.summary,
 );

 this.logger.log('Market enrichment using mixed sources (Gov-API + Exa)');

 // Add Exa to data source status
 dataSourceStatus.sources.push({
 name: 'exa',
 status: 'SUCCESS',
 error: undefined,
 latencyMs: undefined,
 resultCount: exaResult.summary?.length || 0,
 });

 return {
 summary: mixedSummary,
 source: 'mixed',
 fallbackUsed: true,
 dataSourceStatus,
 };
 } catch (error) {
 // Unexpected error - fallback to Exa only
 this.logger.error('Error during Gov-API enrichment', {
 error: error.message,
 sectionType,
 });

 const exaResult = await this.exaService.searchDeep(enrichmentQuery);

 if (exaResult.isFallback) {
 throw new Error('Market enrichment unavailable from all sources');
 }

 return {
 summary: exaResult.summary,
 source: 'exa',
 fallbackUsed: true,
 dataSourceStatus: {
 status: 'PARTIAL',
 sources: [
 {
 name: 'gov-api',
 status: 'SERVICE_UNAVAILABLE',
 error: error.message,
 latencyMs: undefined,
 resultCount: undefined,
 },
 {
 name: 'exa',
 status: 'SUCCESS',
 error: undefined,
 latencyMs: undefined,
 resultCount: exaResult.summary?.length || 0,
 },
 ],
 message:
 'APIs governamentais indisponíveis, usando fonte alternativa',
 },
 };
 }
 }

 /**
 * Formats government API search results into a summary for LLM enrichment.
 *
 * @param govResult - Result from GovSearchService
 * @returns Formatted summary string
 * @private
 */
 private formatGovApiSummary(govResult: GovSearchResult): string {
 const sections: string[] = [];

 // Add contract data if available
 if (govResult.contracts && govResult.contracts.length > 0) {
 sections.push(
 `**Contratos Governamentais Similares (${govResult.contracts.length}):**`,
 );
 govResult.contracts
 .slice(0, 3)
 .forEach((contract: GovApiContract, index: number) => {
 sections.push(`${index + 1}. ${contract.objeto}`);
 if (contract.valorTotal) {
 sections.push(
 ` Valor: R$ ${contract.valorTotal.toLocaleString('pt-BR')}`,
 );
 }
 if (contract.orgaoContratante?.nome) {
 sections.push(` Órgão: ${contract.orgaoContratante.nome}`);
 }
 });
 }

 // Add price references if available
 if (govResult.prices) {
 if (govResult.prices.sinapi && govResult.prices.sinapi.length > 0) {
 sections.push(
 `\n**Preços SINAPI (${govResult.prices.sinapi.length} itens):**`,
 );
 govResult.prices.sinapi
 .slice(0, 3)
 .forEach((price: GovApiPriceReference) => {
 sections.push(
 `- ${price.descricao}: R$ ${price.precoUnitario.toLocaleString('pt-BR')} (${price.unidade})`,
 );
 });
 }

 if (govResult.prices.sicro && govResult.prices.sicro.length > 0) {
 sections.push(
 `\n**Preços SICRO (${govResult.prices.sicro.length} itens):**`,
 );
 govResult.prices.sicro
 .slice(0, 3)
 .forEach((price: GovApiPriceReference) => {
 sections.push(
 `- ${price.descricao}: R$ ${price.precoUnitario.toLocaleString('pt-BR')} (${price.unidade})`,
 );
 });
 }
 }

 // Add source attribution
 sections.push(
 `\n**Fontes:** ${govResult.sources.join(', ')} (dados oficiais do governo brasileiro)`,
 );

 return sections.join('\n');
 }

 /**
 * Merges government and Exa summaries into a unified summary.
 *
 * @param govSummary - Summary from government APIs
 * @param exaSummary - Summary from Exa AI
 * @returns Merged summary
 * @private
 */
 private mergeSummaries(govSummary: string, exaSummary: string): string {
 return `**Dados Oficiais do Governo:**\n${govSummary}\n\n**Contexto Adicional de Mercado:**\n${exaSummary}`;
 }

 /**
 * Determines if project is infrastructure-related (for SICRO targeting).
 *
 * @param objeto - Object description
 * @returns True if infrastructure-related
 * @private
 */
 private isInfrastructureProject(objeto: string): boolean {
 const keywords = [
 'rodovia',
 'estrada',
 'pavimentação',
 'asfalto',
 'terraplanagem',
 'drenagem',
 'obra rodoviária',
 'infraestrutura viária',
 ];
 const objetoLower = objeto.toLowerCase();
 return keywords.some((keyword) => objetoLower.includes(keyword));
 }

 /**
 * Determines if project is construction-related (for SINAPI targeting).
 *
 * @param objeto - Object description
 * @returns True if construction-related
 * @private
 */
 private isConstrucaoCivilProject(objeto: string): boolean {
 const keywords = [
 'construção',
 'edificação',
 'reforma',
 'obra civil',
 'alvenaria',
 'concreto',
 'estrutura',
 'fundação',
 ];
 const objetoLower = objeto.toLowerCase();
 return keywords.some((keyword) => objetoLower.includes(keyword));
 }

 /**
 * Determines if section needs price references (SINAPI/SICRO).
 *
 * @param sectionType - Type of section
 * @returns True if price references are needed
 * @private
 */
 private needsPriceReference(sectionType: string): boolean {
 return ['orcamento', 'pesquisa_mercado', 'especificacao_tecnica'].includes(
 sectionType.toLowerCase(),
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
 * 'Manual text content to validate...',
 * 'justificativa'
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

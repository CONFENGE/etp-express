import { Injectable, Logger } from '@nestjs/common';

/**
 * Result structure for legal compliance validation.
 */
export interface LegalValidationResult {
 /** Indicates if content meets minimum legal compliance threshold (score >= 70%) */
 isCompliant: boolean;
 /** Overall compliance score (0-100) */
 score: number;
 /** List of detected compliance issues */
 issues: string[];
 /** Actionable recommendations to improve compliance */
 recommendations: string[];
 /** Relevant legal references (Lei 14.133/2021, INs, etc.) */
 references: string[];
}

/**
 * Agent responsible for ensuring legal compliance of ETP content with Brazilian public procurement law.
 *
 * @remarks
 * This agent validates generated content against:
 * - Lei 14.133/2021 (Nova Lei de Licitações e Contratos)
 * - Lei 8.666/1993 (partially repealed but still referenced)
 * - IN SEGES/ME nº 40/2020 (ETP methodology)
 * - IN SEGES/ME nº 65/2021 (IT procurement)
 * - TCU jurisprudence and best practices
 *
 * The agent performs heuristic checks for:
 * - Presence of mandatory legal references
 * - Required elements (objeto, necessidade, valor estimado)
 * - Technical requirements compliance
 * - Justification completeness (Art. 18, Lei 14.133/2021)
 *
 * Compliance score is calculated based on presence/absence of key elements.
 * A score >= 70% is considered compliant.
 *
 * @see OrchestratorService - Orchestrates this agent with others
 */
@Injectable()
export class LegalAgent {
 private readonly logger = new Logger(LegalAgent.name);

 private readonly legalReferences = [
 'Lei 14.133/2021 - Nova Lei de Licitações',
 'Lei 8.666/1993 - Lei de Licitações (revogada parcialmente)',
 'IN SEGES/ME nº 40/2020 - ETP',
 'IN SEGES/ME nº 65/2021 - Contratações TI',
 'Decreto 10.024/2019 - Licitações eletrônicas',
 ];

 /**
 * Validates content for legal compliance with Brazilian public procurement law.
 *
 * @remarks
 * Performs heuristic checks including:
 * - Lei 14.133/2021 explicit reference check
 * - Justification section presence (Art. 18)
 * - Required elements: objeto, necessidade, valor estimado
 * - Technical requirements for IT procurement (IN SEGES 40/2020)
 *
 * Compliance score formula: (passed_checks / total_checks) * 100
 * Threshold for compliance: >= 70%
 *
 * @param content - Text content to validate
 * @param context - Optional context (e.g., section type) for context-aware checks
 * @returns Validation result with compliance status, score, issues, and recommendations
 *
 * @example
 * ```ts
 * const result = await legalAgent.validate(
 * 'Este ETP está fundamentado na Lei 14.133/2021...',
 * { type: 'justificativa' }
 * );
 * console.log(result.isCompliant); // true/false
 * console.log(result.score); // 85
 * console.log(result.recommendations); // ['Inclua referência à...']
 * ```
 */
 async validate(
 content: string,
 context?: unknown,
 ): Promise<LegalValidationResult> {
 this.logger.log('Validating legal compliance');

 const issues: string[] = [];
 const recommendations: string[] = [];
 const relevantReferences: string[] = [];

 // Check for Lei 14.133/2021 references
 if (!content.includes('14.133') && !content.includes('Lei de Licitações')) {
 issues.push('Falta referência explícita à Lei 14.133/2021');
 recommendations.push('Inclua referência à Lei 14.133/2021 no documento');
 relevantReferences.push(this.legalReferences[0]);
 }

 // Check for justification presence
 if (!content.toLowerCase().includes('justificativa')) {
 issues.push('Seção de justificativa pode estar ausente ou incompleta');
 recommendations.push(
 'Garanta que a justificativa esteja clara e completa conforme Art. 18 da Lei 14.133/2021',
 );
 }

 // Check for minimum required elements
 const requiredElements = [
 { keyword: 'objeto', message: 'Descrição do objeto da contratação' },
 { keyword: 'necessidade', message: 'Necessidade da contratação' },
 { keyword: 'valor', message: 'Estimativa de valor' },
 ];

 requiredElements.forEach(({ keyword, message }) => {
 if (!content.toLowerCase().includes(keyword)) {
 issues.push(`Elemento possivelmente ausente: ${message}`);
 }
 });

 // Check for technical requirements (IN SEGES 40/2020)
 const contextObj = context as { type?: string } | undefined;
 if (
 contextObj?.type === 'requisitos' ||
 content.toLowerCase().includes('requisito')
 ) {
 if (!content.toLowerCase().includes('técnico')) {
 recommendations.push(
 'Especifique requisitos técnicos conforme IN SEGES/ME nº 40/2020',
 );
 relevantReferences.push(this.legalReferences[2]);
 }
 }

 // Calculate compliance score
 const totalChecks = 10;
 const passedChecks = totalChecks - issues.length;
 const score = Math.max(
 0,
 Math.min(100, (passedChecks / totalChecks) * 100),
 );

 const isCompliant = score >= 70;

 this.logger.log(
 `Legal validation completed. Score: ${score}%, Compliant: ${isCompliant}`,
 );

 return {
 isCompliant,
 score,
 issues,
 recommendations,
 references:
 relevantReferences.length > 0
 ? relevantReferences
 : [this.legalReferences[0]],
 };
 }

 /**
 * Enriches user prompt with relevant legal context for the specific section type.
 *
 * @remarks
 * Appends section-specific legal requirements to guide LLM generation:
 * - Justificativa: Art. 18 requirements (necessidade, interesse público, benefícios, riscos)
 * - Requisitos: IN SEGES 40/2020 guidelines (objetividade, mensurabilidade, anti-direcionamento)
 * - Estimativa de valor: Art. 23 requirements (pesquisa de mercado, metodologia)
 * - Default: Basic Lei 14.133/2021 reference
 *
 * @param userPrompt - Original user input prompt
 * @param sectionType - Type of ETP section being generated
 * @returns Enriched prompt with legal context appended
 *
 * @example
 * ```ts
 * const enriched = await legalAgent.enrichWithLegalContext(
 * 'Descreva a justificativa para contratar notebooks',
 * 'justificativa'
 * );
 * // Returns: original prompt + "\n\n[CONTEXTO LEGAL]\nConforme Art. 18..."
 * ```
 */
 async enrichWithLegalContext(
 userPrompt: string,
 sectionType: string,
 ): Promise<string> {
 const legalContext = this.getLegalContextForSection(sectionType);

 return `${userPrompt}\n\n[CONTEXTO LEGAL]\n${legalContext}`;
 }

 private getLegalContextForSection(sectionType: string): string {
 const contexts: Record<string, string> = {
 justificativa: `Conforme Art. 18 da Lei 14.133/2021, a justificativa deve demonstrar:
- A necessidade da contratação
- O interesse público
- Os benefícios esperados
- Os riscos de não contratar`,

 requisitos: `Conforme IN SEGES/ME nº 40/2020:
- Requisitos devem ser objetivos e mensuráveis
- Devem evitar direcionamento
- Precisam estar alinhados com a necessidade`,

 estimativa_valor: `Conforme Art. 23 da Lei 14.133/2021:
- Estimativa deve ser baseada em pesquisa de mercado
- Considerar valores referenciais
- Incluir metodologia de cálculo`,
 };

 return contexts[sectionType] || 'Base legal: Lei 14.133/2021';
 }

 /**
 * Returns system prompt with legal compliance guidelines for the LLM.
 *
 * @remarks
 * Instructs the LLM to:
 * - Always cite applicable legal basis
 * - Avoid dubious legal interpretations
 * - Be conservative when uncertain
 * - Signal need for legal review when appropriate
 *
 * Includes mandatory disclaimer: "⚠ Este conteúdo requer validação jurídica..."
 *
 * @returns System prompt string with legal compliance instructions
 */
 getSystemPrompt(): string {
 return `Você é um agente especializado em conformidade legal para Estudos Técnicos Preliminares (ETP).

Sua função é garantir que todo conteúdo gerado esteja em conformidade com:
- Lei 14.133/2021 (Nova Lei de Licitações)
- IN SEGES/ME nº 40/2020 (Elaboração de ETP)
- IN SEGES/ME nº 65/2021 (Contratações de TI)
- Jurisprudência do TCU

IMPORTANTE:
- Sempre cite a base legal aplicável
- Evite interpretações duvidosas
- Quando incerto, seja conservador
- Sinalize necessidade de revisão jurídica quando apropriado

Adicione ao final: "⚠ Este conteúdo requer validação jurídica antes do uso oficial."`;
 }
}

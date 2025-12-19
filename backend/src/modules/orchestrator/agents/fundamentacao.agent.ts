import { Injectable, Logger } from '@nestjs/common';

/**
 * Result structure for argumentation quality analysis.
 */
export interface FundamentacaoResult {
 /** Overall argumentation quality score (0-100) based on presence of key elements */
 score: number;
 /** Indicates if content explains necessity/demand */
 hasNecessidade: boolean;
 /** Indicates if content demonstrates public interest */
 hasInteressePublico: boolean;
 /** Indicates if content lists expected benefits */
 hasBeneficios: boolean;
 /** Indicates if content mentions risks of not contracting */
 hasRiscos: boolean;
 /** Actionable suggestions to improve argumentation */
 suggestions: string[];
}

/**
 * Agent responsible for analyzing and strengthening argumentation quality in ETP sections.
 *
 * @remarks
 * This agent ensures that justifications and argumentation are **complete**, **clear**, and **convincing**
 * by validating the presence of 4 critical elements required by Art. 18 of Lei 14.133/2021:
 *
 * 1. **NECESSIDADE**: Why is this procurement necessary?
 * - What problem will be solved?
 * - What demand will be met?
 * - What deficiency will be addressed?
 *
 * 2. **INTERESSE PÚBLICO**: How does this benefit society?
 * - Who will be benefited?
 * - What is the impact on public service delivery?
 * - How does it align with public policies?
 *
 * 3. **BENEFÍCIOS**: What are the expected gains?
 * - Process improvements
 * - Resource savings
 * - Efficiency increases
 * - Service quality enhancements
 *
 * 4. **RISCOS**: What happens if we don't procure?
 * - Negative impacts
 * - Potential harm
 * - Compromised activities
 *
 * The agent also checks for:
 * - Presence of quantitative data (numbers strengthen argumentation)
 * - Sufficient content length (minimum 100 words for substantive justification)
 *
 * Scoring formula: (present_elements / 4) * 100
 *
 * @see OrchestratorService - Uses this agent for justificativa, introducao, and descricao_solucao sections
 */
@Injectable()
export class FundamentacaoAgent {
 private readonly logger = new Logger(FundamentacaoAgent.name);

 /**
 * Analyzes argumentation quality by checking for presence of 4 critical elements.
 *
 * @remarks
 * Performs keyword-based heuristic checks for:
 * 1. Necessidade: Keywords like 'necessário', 'demanda', 'carência'
 * 2. Interesse Público: Keywords like 'interesse público', 'sociedade', 'cidadão'
 * 3. Benefícios: Keywords like 'benefício', 'vantagem', 'melhoria'
 * 4. Riscos: Keywords like 'risco', 'problema', 'consequência', 'não contratar'
 *
 * Additionally checks for:
 * - Quantitative data presence (numbers strengthen argumentation)
 * - Content length (minimum 100 words expected for substantive justification)
 *
 * Score formula: (present_elements / 4) * 100
 * Each missing element adds a specific suggestion to the result.
 *
 * @param content - Text content to analyze
 * @returns Analysis result with score (0-100), boolean flags for each element, and suggestions
 *
 * @example
 * ```ts
 * const result = await fundamentacaoAgent.analyze(
 * 'A contratação é necessária para atender 50 mil cidadãos. O benefício será...'
 * );
 * console.log(result.score); // 75 (3 out of 4 elements present)
 * console.log(result.hasNecessidade); // true
 * console.log(result.suggestions); // ['Mencione os riscos de não realizar...']
 * ```
 */
 async analyze(content: string): Promise<FundamentacaoResult> {
 this.logger.log('Analyzing fundamentação quality');

 const hasNecessidade = this.checkForElement(content, [
 'necessário',
 'necessidade',
 'demanda',
 'carência',
 'deficiência',
 ]);

 const hasInteressePublico = this.checkForElement(content, [
 'interesse público',
 'benefício público',
 'sociedade',
 'cidadão',
 'comunidade',
 ]);

 const hasBeneficios = this.checkForElement(content, [
 'benefício',
 'vantagem',
 'ganho',
 'melhoria',
 'aprimoramento',
 ]);

 const hasRiscos = this.checkForElement(content, [
 'risco',
 'problema',
 'consequência',
 'impacto negativo',
 'não contratar',
 ]);

 const suggestions: string[] = [];

 if (!hasNecessidade) {
 suggestions.push(
 'Detalhe melhor a necessidade que motivou a contratação',
 );
 }

 if (!hasInteressePublico) {
 suggestions.push(
 'Explicite como a contratação atende ao interesse público',
 );
 }

 if (!hasBeneficios) {
 suggestions.push('Liste os benefícios esperados com a contratação');
 }

 if (!hasRiscos) {
 suggestions.push('Mencione os riscos de não realizar a contratação');
 }

 // Check for quantification
 const hasNumbers = /\d+/.test(content);
 if (!hasNumbers) {
 suggestions.push(
 'Considere adicionar dados quantitativos para fortalecer a fundamentação',
 );
 }

 // Check for length (good fundamentação should be substantive)
 const wordCount = content.split(/\s+/).length;
 if (wordCount < 100) {
 suggestions.push(
 'A fundamentação parece muito breve. Considere expandir com mais detalhes',
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

 /**
 * Returns system prompt with argumentation guidelines for the LLM.
 *
 * @remarks
 * Instructs the LLM to create COMPLETE, CLEAR, and CONVINCING argumentation by including:
 * 1. NECESSIDADE (why is this necessary?)
 * 2. INTERESSE PÚBLICO (how does it benefit society?)
 * 3. BENEFÍCIOS (what gains are expected?)
 * 4. RISCOS (what happens if we don't procure?)
 *
 * Emphasizes the importance of:
 * - Quantitative data when possible
 * - Avoiding generic justifications
 * - Avoiding circular reasoning
 * - Connecting to the organization's reality
 *
 * @returns System prompt string with argumentation quality instructions
 */
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

 /**
 * Enriches user prompt with argumentation quality guidelines.
 *
 * @remarks
 * Appends explicit reminders to ensure the LLM addresses all 4 critical elements:
 * - WHY (necessity/problem/demand)
 * - FOR WHOM (public interest)
 * - WHAT WILL BE GAINED (benefits)
 * - WHAT WILL BE LOST (risks of not procuring)
 *
 * Emphasizes use of concrete data when possible.
 *
 * @param userPrompt - Original user input prompt
 * @returns Enriched prompt with argumentation guidelines appended
 */
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

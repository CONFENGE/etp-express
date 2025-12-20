/**
 * Section schemas for LLM output validation.
 *
 * @remarks
 * Defines validation rules for each ETP section type to prevent:
 * - LLM hallucination (content outside expected format)
 * - Injection attacks (malicious content in output)
 * - Invalid structure (malformed JSON/Markdown)
 *
 * @see Issue #656 - Validação estruturada de saída do LLM
 * @see OWASP LLM Top 10 - Insecure Output Handling
 */

/**
 * Schema definition for a section type.
 */
export interface SectionSchema {
  /** Section type identifier */
  type: string;
  /** Human-readable name */
  name: string;
  /** Maximum allowed output length in characters */
  maxLength: number;
  /** Minimum required output length in characters */
  minLength: number;
  /** Patterns that are forbidden in output (security) */
  forbiddenPatterns: string[];
  /** Patterns that should be present in output (content validation) */
  expectedPatterns?: RegExp[];
  /** Whether JSON structure is expected */
  expectJson: boolean;
  /** Required fields if JSON is expected */
  requiredFields?: string[];
  /** Maximum number of regeneration attempts */
  maxRetries: number;
}

/**
 * Forbidden patterns for security validation.
 * These patterns indicate potential injection attacks or malicious content.
 */
export const FORBIDDEN_PATTERNS: string[] = [
  // HTML/JavaScript injection
  '<script',
  '</script>',
  'javascript:',
  'onclick=',
  'onerror=',
  'onload=',
  'onmouseover=',
  '<iframe',
  '</iframe>',
  '<object',
  '<embed',
  '<form',
  'document.cookie',
  'document.write',
  'eval(',
  'Function(',
  // Data URLs that could execute code
  'data:text/html',
  'data:application/javascript',
  // Potential prompt injection leakage
  '\\[SYSTEM\\]',
  '\\[INST\\]',
  '<<SYS>>',
  '<|im_start|>',
  '<|im_end|>',
  // SQL injection patterns
  'DROP TABLE',
  'DELETE FROM',
  'INSERT INTO',
  'UPDATE SET',
  '--',
  '; --',
  // Command injection (backtick only at start of line to avoid markdown code blocks)
  '$((',
  '| cat',
  '| rm',
  '| curl',
  '| wget',
];

/**
 * Patterns indicating AI system prompt leakage.
 */
export const AI_LEAKAGE_PATTERNS: string[] = [
  'As an AI language model',
  'As an AI assistant',
  'I cannot',
  'I apologize',
  'I am an AI',
  'As a large language model',
  'I was trained',
  'My training data',
  'OpenAI',
  'GPT-4',
  'GPT-3',
  'Claude',
  'Anthropic',
  'I do not have access',
  'I cannot provide',
  'I am not able to',
];

/**
 * Section schemas indexed by section type.
 *
 * @remarks
 * Each schema defines validation rules specific to the section type.
 * Factual sections (legal, budget) have stricter length limits.
 * Creative sections (introduction, context) have more flexibility.
 */
export const SECTION_SCHEMAS: Record<string, SectionSchema> = {
  objeto: {
    type: 'objeto',
    name: 'Objeto da Contratação',
    maxLength: 5000,
    minLength: 100,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  justificativa: {
    type: 'justificativa',
    name: 'Justificativa da Contratação',
    maxLength: 10000,
    minLength: 200,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  introducao: {
    type: 'introducao',
    name: 'Introdução',
    maxLength: 8000,
    minLength: 150,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  contextualizacao: {
    type: 'contextualizacao',
    name: 'Contextualização',
    maxLength: 8000,
    minLength: 200,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  descricao_solucao: {
    type: 'descricao_solucao',
    name: 'Descrição da Solução',
    maxLength: 12000,
    minLength: 300,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  base_legal: {
    type: 'base_legal',
    name: 'Base Legal',
    maxLength: 6000,
    minLength: 100,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  orcamento: {
    type: 'orcamento',
    name: 'Orçamento Estimado',
    maxLength: 8000,
    minLength: 100,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  identificacao: {
    type: 'identificacao',
    name: 'Identificação',
    maxLength: 4000,
    minLength: 50,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  metodologia: {
    type: 'metodologia',
    name: 'Metodologia',
    maxLength: 8000,
    minLength: 150,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  cronograma: {
    type: 'cronograma',
    name: 'Cronograma',
    maxLength: 6000,
    minLength: 100,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  riscos: {
    type: 'riscos',
    name: 'Análise de Riscos',
    maxLength: 8000,
    minLength: 150,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  especificacao_tecnica: {
    type: 'especificacao_tecnica',
    name: 'Especificação Técnica',
    maxLength: 15000,
    minLength: 200,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  beneficiarios: {
    type: 'beneficiarios',
    name: 'Beneficiários',
    maxLength: 6000,
    minLength: 100,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  sustentabilidade: {
    type: 'sustentabilidade',
    name: 'Sustentabilidade',
    maxLength: 6000,
    minLength: 100,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  justificativa_economica: {
    type: 'justificativa_economica',
    name: 'Justificativa Econômica',
    maxLength: 8000,
    minLength: 150,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },

  pesquisa_mercado: {
    type: 'pesquisa_mercado',
    name: 'Pesquisa de Mercado',
    maxLength: 10000,
    minLength: 200,
    forbiddenPatterns: FORBIDDEN_PATTERNS,
    expectJson: false,
    maxRetries: 2,
  },
};

/**
 * Default schema for unknown section types.
 */
export const DEFAULT_SCHEMA: SectionSchema = {
  type: 'default',
  name: 'Seção Genérica',
  maxLength: 10000,
  minLength: 50,
  forbiddenPatterns: FORBIDDEN_PATTERNS,
  expectJson: false,
  maxRetries: 2,
};

/**
 * Gets the schema for a section type.
 *
 * @param sectionType - Type of section to get schema for
 * @returns Schema for the section type, or default schema if not found
 */
export function getSchemaForSection(sectionType: string): SectionSchema {
  const normalizedType = sectionType.toLowerCase().trim();
  return SECTION_SCHEMAS[normalizedType] || DEFAULT_SCHEMA;
}

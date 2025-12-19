import { Injectable, Logger } from '@nestjs/common';

/**
 * Result structure for simplification analysis.
 */
export interface SimplificacaoResult {
  /** Original content length in characters */
  originalLength: number;
  /** List of specific suggestions to simplify the text */
  simplifiedSuggestions: string[];
  /** List of detected redundant phrases */
  redundancies: string[];
  /** List of complex phrases with simpler alternatives */
  complexPhrases: Array<{ phrase: string; suggestion: string }>;
  /** Overall simplicity score (0-100), where 100 = no issues */
  score: number;
}

/**
 * Agent responsible for simplifying bureaucratic language into plain, direct communication.
 *
 * @remarks
 * This agent transforms complex, bureaucratic texts into **SIMPLE** and **DIRECT** communication
 * by detecting and suggesting replacements for:
 *
 * **1. Complex Bureaucratic Phrases** (→ Simple Alternatives):
 * - "tendo em vista que" → "porque"
 * - "no sentido de" → "para"
 * - "faz-se necessário" → "é necessário"
 * - "proceder à" → "fazer"
 * - "através de" → "por meio de"
 * - + 7 more patterns
 *
 * **2. Redundancies**:
 * - "planejar antecipadamente" → "planejar"
 * - "elo de ligação" → "ligação"
 * - "fato real" → "fato"
 * - "totalmente completo" → "completo"
 * - + 3 more patterns
 *
 * **3. Other Anti-Patterns**:
 * - Excessive use of "que" (> 5% of words)
 * - Nominalization overuse (realização → realizar)
 * - Adverb overuse (words ending in "-mente" > 3%)
 *
 * **Scoring Formula:**
 * ```
 * total_issues = complex_phrases.length + redundancies.length
 * score = max(0, 100 - total_issues * 5)
 * ```
 *
 * **Auto-Simplification:**
 * The `simplify()` method applies automatic replacements of all detected patterns.
 *
 * **Philosophy:**
 * - Clarity > excessive formality
 * - Simple language ≠ informal language
 * - Goal: Be understood, not impress with vocabulary
 *
 * @see OrchestratorService - Automatically simplifies content with score < 70
 */
@Injectable()
export class SimplificacaoAgent {
  private readonly logger = new Logger(SimplificacaoAgent.name);

  private readonly complexPhrases: Array<{
    phrase: RegExp;
    suggestion: string;
  }> = [
    { phrase: /tendo em vista que/gi, suggestion: 'porque' },
    { phrase: /no sentido de/gi, suggestion: 'para' },
    { phrase: /com vistas a/gi, suggestion: 'para' },
    { phrase: /a fim de/gi, suggestion: 'para' },
    { phrase: /faz-se necessário/gi, suggestion: 'é necessário' },
    { phrase: /proceder à/gi, suggestion: 'fazer' },
    { phrase: /efetuar o/gi, suggestion: 'fazer o' },
    { phrase: /realizar a/gi, suggestion: 'fazer a' },
    { phrase: /através de/gi, suggestion: 'por meio de' },
    { phrase: /de forma a/gi, suggestion: 'para' },
    { phrase: /no âmbito de/gi, suggestion: 'em' },
    { phrase: /em razão de/gi, suggestion: 'por causa de' },
  ];

  private readonly redundancies: Array<{ phrase: RegExp; suggestion: string }> =
    [
      { phrase: /planejar antecipadamente/gi, suggestion: 'planejar' },
      { phrase: /elo de ligação/gi, suggestion: 'ligação' },
      { phrase: /fato real/gi, suggestion: 'fato' },
      { phrase: /certeza absoluta/gi, suggestion: 'certeza' },
      { phrase: /totalmente completo/gi, suggestion: 'completo' },
      { phrase: /repetir novamente/gi, suggestion: 'repetir' },
      { phrase: /conclusão final/gi, suggestion: 'conclusão' },
    ];

  /**
   * Analyzes text for simplification opportunities by detecting complex phrases and redundancies.
   *
   * @remarks
   * Performs pattern-based analysis to detect:
   * 1. **Complex bureaucratic phrases**: Matches 12 regex patterns for phrases like "tendo em vista que"
   * 2. **Redundancies**: Matches 7 regex patterns for phrases like "planejar antecipadamente"
   * 3. **Excessive "que" usage**: Flags if > 5% of words are "que"
   * 4. **Nominalization overuse**: Flags if verbs-turned-nouns (realização, implementação) appear > 2 times
   * 5. **Adverb overuse**: Flags if "-mente" adverbs > 3% of words
   *
   * Each detected issue adds a suggestion to the result.
   *
   * **Score Formula:**
   * ```
   * total_issues = complex_phrases.length + redundancies.length
   * score = max(0, 100 - total_issues * 5)
   * ```
   *
   * A score < 70 triggers automatic simplification in the orchestrator pipeline.
   *
   * @param content - Text content to analyze
   * @returns Simplification analysis with score, detected phrases, redundancies, and suggestions
   *
   * @example
   * ```ts
   * const result = await simplificacaoAgent.analyze(
   * 'Tendo em vista que faz-se necessário proceder à realização do planejamento antecipadamente...'
   * );
   * console.log(result.score); // 25 (5 issues * 5 penalty each)
   * console.log(result.complexPhrases); // [{ phrase: 'tendo em vista que', suggestion: 'porque' }, ...]
   * console.log(result.redundancies); // ['planejamento antecipadamente']
   * ```
   */
  async analyze(content: string): Promise<SimplificacaoResult> {
    this.logger.log('Analyzing text for simplification opportunities');

    const simplifiedSuggestions: string[] = [];
    const redundancies: string[] = [];
    const complexPhrases: Array<{ phrase: string; suggestion: string }> = [];

    // Check for complex phrases
    this.complexPhrases.forEach(({ phrase, suggestion }) => {
      const matches = content.match(phrase);
      if (matches && matches.length > 0) {
        matches.forEach((match) => {
          complexPhrases.push({
            phrase: match,
            suggestion: suggestion,
          });
          simplifiedSuggestions.push(
            `Substitua "${match}" por "${suggestion}" para simplificar`,
          );
        });
      }
    });

    // Check for redundancies
    this.redundancies.forEach(({ phrase, suggestion }) => {
      const matches = content.match(phrase);
      if (matches && matches.length > 0) {
        matches.forEach((match) => {
          redundancies.push(match);
          simplifiedSuggestions.push(
            `"${match}" é redundante. Use apenas "${suggestion}"`,
          );
        });
      }
    });

    // Check for excessive use of "que"
    const queCount = (content.match(/\bque\b/gi) || []).length;
    const wordCount = content.split(/\s+/).length;
    if (queCount > wordCount * 0.05) {
      simplifiedSuggestions.push(
        'Uso excessivo da palavra "que". Tente reescrever algumas frases para reduzi-la',
      );
    }

    // Check for nominalization (verbs turned into nouns)
    const nominalizations = [
      { noun: /realização/gi, verb: 'realizar' },
      { noun: /implementação/gi, verb: 'implementar' },
      { noun: /utilização/gi, verb: 'utilizar' },
      { noun: /elaboração/gi, verb: 'elaborar' },
      { noun: /execução/gi, verb: 'executar' },
    ];

    nominalizations.forEach(({ noun, verb }) => {
      const matches = content.match(noun);
      if (matches && matches.length > 2) {
        simplifiedSuggestions.push(
          `Considere usar o verbo "${verb}" ao invés da forma nominal em alguns casos`,
        );
      }
    });

    // Check for adverb overuse
    const adverbs = content.match(/mente\b/gi) || [];
    if (adverbs.length > wordCount * 0.03) {
      simplifiedSuggestions.push(
        'Reduza o uso de advérbios terminados em "-mente". Muitas vezes podem ser eliminados',
      );
    }

    // Calculate score (inverse of issues found)
    const totalIssues = complexPhrases.length + redundancies.length;
    const score = Math.max(0, 100 - totalIssues * 5);

    this.logger.log(
      `Simplification analysis completed. Issues found: ${totalIssues}, Score: ${score}%`,
    );

    return {
      originalLength: content.length,
      simplifiedSuggestions: [...new Set(simplifiedSuggestions)], // Remove duplicates
      redundancies,
      complexPhrases,
      score,
    };
  }

  /**
   * Automatically simplifies text by applying all pattern-based replacements.
   *
   * @remarks
   * Applies regex replacements for:
   * - All 12 complex bureaucratic phrases → simpler alternatives
   * - All 7 redundancies → concise forms
   *
   * This method is called automatically by the orchestrator when the simplification
   * score is < 70%.
   *
   * **Note:** This is a simple find-and-replace operation. It may occasionally
   * produce awkward phrasing in edge cases. The orchestrator adds a warning
   * when auto-simplification is applied: "Texto foi simplificado automaticamente.
   * Revise para garantir correção."
   *
   * @param content - Original text to simplify
   * @returns Simplified text with all pattern replacements applied
   *
   * @example
   * ```ts
   * const simplified = await simplificacaoAgent.simplify(
   * 'Tendo em vista que faz-se necessário proceder à realização...'
   * );
   * console.log(simplified);
   * // "Porque é necessário fazer a realização..."
   * ```
   */
  async simplify(content: string): Promise<string> {
    let simplified = content;

    // Apply automatic simplifications
    this.complexPhrases.forEach(({ phrase, suggestion }) => {
      simplified = simplified.replace(phrase, suggestion);
    });

    this.redundancies.forEach(({ phrase, suggestion }) => {
      simplified = simplified.replace(phrase, suggestion);
    });

    return simplified;
  }

  /**
   * Returns system prompt with simplification guidelines for the LLM.
   *
   * @remarks
   * Instructs the LLM to write in simple, direct language by:
   * - Using simple words: "fazer" instead of "proceder à realização"
   * - Avoiding redundancies: "planejar" not "planejar antecipadamente"
   * - Preferring active voice: "o órgão realizará" not "será realizado pelo órgão"
   * - Eliminating empty expressions: "porque" not "tendo em vista que"
   * - Using verbs instead of nouns: "implementar" not "realizar a implementação"
   *
   * Emphasizes:
   * - Clarity > excessive formality
   * - Simple language ≠ informal language
   * - Goal: Be understood, not impress
   *
   * Analogy: "Write as if explaining to a coworker."
   *
   * @returns System prompt string with simplification instructions
   */
  getSystemPrompt(): string {
    return `Você é um agente especializado em simplificação de linguagem burocrática.

Sua função é transformar textos complexos e rebuscados em comunicação SIMPLES e DIRETA.

Princípios de simplificação:

1. USE PALAVRAS SIMPLES
 ❌ "proceder à realização"
 ✅ "fazer"

2. EVITE REDUNDÂNCIAS
 ❌ "planejar antecipadamente"
 ✅ "planejar"

3. PREFIRA VOZ ATIVA
 ❌ "será realizado pelo órgão"
 ✅ "o órgão realizará"

4. ELIMINE EXPRESSÕES VAZIAS
 ❌ "tendo em vista que"
 ✅ "porque"

5. USE VERBOS NO LUGAR DE SUBSTANTIVOS
 ❌ "realizar a implementação"
 ✅ "implementar"

LEMBRE-SE:
- Clareza é mais importante que formalidade excessiva
- Linguagem simples não é linguagem informal
- O objetivo é ser entendido, não impressionar com vocabulário

Escreva como se estivesse explicando para um colega de trabalho.`;
  }
}

import { Injectable, Logger } from '@nestjs/common';

export interface SimplificacaoResult {
  originalLength: number;
  simplifiedSuggestions: string[];
  redundancies: string[];
  complexPhrases: Array<{ phrase: string; suggestion: string }>;
  score: number;
}

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

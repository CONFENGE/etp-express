import { Injectable, Logger } from '@nestjs/common';

export interface ClarezaResult {
  score: number;
  readabilityIndex: number;
  issues: string[];
  suggestions: string[];
  metrics: {
    avgSentenceLength: number;
    avgWordLength: number;
    complexWords: number;
    passiveVoice: number;
  };
}

@Injectable()
export class ClarezaAgent {
  private readonly logger = new Logger(ClarezaAgent.name);

  async analyze(content: string): Promise<ClarezaResult> {
    this.logger.log('Analyzing text clarity');

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Calculate metrics
    const sentences = this.splitIntoSentences(content);
    const words = content.split(/\s+/).filter((w) => w.length > 0);

    const avgSentenceLength = words.length / Math.max(sentences.length, 1);
    const avgWordLength =
      words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);

    const complexWords = this.countComplexWords(words);
    const passiveVoice = this.countPassiveVoice(content);

    // Check sentence length
    if (avgSentenceLength > 25) {
      issues.push('Frases muito longas detectadas (média > 25 palavras)');
      suggestions.push(
        'Divida frases longas em frases mais curtas para melhor compreensão',
      );
    }

    // Check for jargon overuse
    const jargonCount = this.countJargon(content);
    if (jargonCount > words.length * 0.1) {
      issues.push('Uso excessivo de jargão técnico');
      suggestions.push(
        'Considere explicar termos técnicos ou usar linguagem mais acessível',
      );
    }

    // Check for passive voice overuse
    if (passiveVoice > sentences.length * 0.3) {
      issues.push('Uso excessivo de voz passiva');
      suggestions.push(
        'Prefira voz ativa para tornar o texto mais direto e claro',
      );
    }

    // Check for complex words
    const complexWordPercentage = (complexWords / words.length) * 100;
    if (complexWordPercentage > 20) {
      issues.push('Muitas palavras complexas (> 20%)');
      suggestions.push(
        'Simplifique vocabulário quando possível sem perder precisão',
      );
    }

    // Check structure
    const hasParagraphs =
      content.includes('\n\n') || content.split('\n').length > 3;
    if (!hasParagraphs) {
      issues.push('Texto sem paragrafação adequada');
      suggestions.push('Organize o conteúdo em parágrafos para melhor leitura');
    }

    // Calculate readability (simplified Flesch Reading Ease)
    const readabilityIndex = this.calculateReadability(
      avgSentenceLength,
      avgWordLength,
    );

    // Calculate overall score
    const score = Math.max(0, Math.min(100, readabilityIndex));

    this.logger.log(
      `Clarity analysis completed. Score: ${score}%, Readability: ${readabilityIndex}`,
    );

    return {
      score,
      readabilityIndex,
      issues,
      suggestions,
      metrics: {
        avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
        avgWordLength: Math.round(avgWordLength * 10) / 10,
        complexWords,
        passiveVoice,
      },
    };
  }

  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  }

  private countComplexWords(words: string[]): number {
    // Words with more than 3 syllables (approximation: > 8 characters)
    return words.filter((w) => w.length > 8).length;
  }

  private countPassiveVoice(text: string): number {
    const passiveIndicators = [
      'foi',
      'foram',
      'será',
      'serão',
      'é feito',
      'são feitos',
      'foi realizado',
      'foram realizados',
    ];

    let count = 0;
    const lowerText = text.toLowerCase();
    passiveIndicators.forEach((indicator) => {
      const regex = new RegExp(indicator, 'g');
      const matches = lowerText.match(regex);
      count += matches ? matches.length : 0;
    });

    return count;
  }

  private countJargon(text: string): number {
    const technicalTerms = [
      'objeto',
      'contratação',
      'licitação',
      'requisitos',
      'especificações',
      'modalidade',
      'pregão',
      'dispensa',
      'inexigibilidade',
    ];

    let count = 0;
    const lowerText = text.toLowerCase();
    technicalTerms.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      const matches = lowerText.match(regex);
      count += matches ? matches.length : 0;
    });

    return count;
  }

  private calculateReadability(
    avgSentenceLength: number,
    avgWordLength: number,
  ): number {
    // Simplified readability formula (0-100, higher is better)
    // Penalize long sentences and long words
    const sentencePenalty = Math.max(0, (avgSentenceLength - 15) * 2);
    const wordPenalty = Math.max(0, (avgWordLength - 5) * 10);

    return Math.max(0, 100 - sentencePenalty - wordPenalty);
  }

  getSystemPrompt(): string {
    return `Você é um agente especializado em clareza e legibilidade de textos técnicos.

Sua função é garantir que o conteúdo seja CLARO, OBJETIVO e COMPREENSÍVEL.

Princípios de clareza:

1. FRASES CURTAS: Máximo 20-25 palavras por frase
2. VOZ ATIVA: Prefira "O órgão realizará" ao invés de "Será realizado pelo órgão"
3. VOCABULÁRIO ACESSÍVEL: Use termos técnicos apenas quando necessário
4. ESTRUTURA LÓGICA: Organize ideias em parágrafos temáticos
5. OBJETIVIDADE: Vá direto ao ponto, sem rodeios

EVITE:
- Frases longas e confusas
- Dupla negação
- Ambiguidades
- Redundâncias
- Jargão excessivo

EXEMPLO BOM:
"O sistema atual não atende às necessidades. Por isso, precisamos contratar um novo."

EXEMPLO RUIM:
"Tendo em vista que o sistema atualmente em utilização não vem atendendo de forma adequada às necessidades identificadas pela equipe, faz-se necessário proceder à contratação de solução mais adequada."

Escreva de forma que qualquer servidor público possa entender facilmente.`;
  }
}

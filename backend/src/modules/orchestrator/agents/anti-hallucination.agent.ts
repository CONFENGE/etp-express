import { Injectable, Logger } from '@nestjs/common';

export interface HallucinationCheckResult {
  score: number;
  confidence: number;
  warnings: string[];
  suspiciousElements: Array<{
    element: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  verified: boolean;
}

@Injectable()
export class AntiHallucinationAgent {
  private readonly logger = new Logger(AntiHallucinationAgent.name);

  private readonly suspiciousPatterns = [
    {
      pattern: /(?:lei|decreto|portaria|instrução normativa)\s+n?[º°]?\s*\d+/gi,
      description: 'Referência a norma legal',
      severity: 'high' as const,
    },
    {
      pattern: /artigo\s+\d+|art\.\s*\d+/gi,
      description: 'Referência a artigo de lei',
      severity: 'high' as const,
    },
    {
      pattern: /\d{1,3}[.,]\d{3}[.,]\d{3}[.,]\d{2}/g,
      description: 'Valor monetário específico',
      severity: 'medium' as const,
    },
    {
      pattern: /(?:em|no ano de|ano)\s+\d{4}/gi,
      description: 'Referência a ano/data específica',
      severity: 'medium' as const,
    },
    {
      pattern: /processo\s+n?[º°]?\s*[\d\/\-\.]+/gi,
      description: 'Número de processo',
      severity: 'high' as const,
    },
    {
      pattern: /(?:conforme|segundo)\s+(?:TCU|CNJ|AGU|STF|STJ)/gi,
      description: 'Citação de órgão de controle',
      severity: 'high' as const,
    },
  ];

  private readonly prohibitedClaims = [
    'melhor do mercado',
    'único capaz',
    'comprovadamente superior',
    'indiscutivelmente',
    'certamente',
    'sem dúvida',
    'é fato que',
    'todos sabem',
  ];

  async check(content: string, context?: any): Promise<HallucinationCheckResult> {
    this.logger.log('Checking for potential hallucinations');

    const warnings: string[] = [];
    const suspiciousElements: Array<{
      element: string;
      reason: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Check for suspicious patterns
    this.suspiciousPatterns.forEach(({ pattern, description, severity }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        matches.forEach((match) => {
          suspiciousElements.push({
            element: match,
            reason: `${description} - VERIFICAR VERACIDADE`,
            severity,
          });
          warnings.push(`Verifique a veracidade de: "${match}"`);
        });
      }
    });

    // Check for prohibited claims
    this.prohibitedClaims.forEach((claim) => {
      const regex = new RegExp(claim, 'gi');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        matches.forEach((match) => {
          suspiciousElements.push({
            element: match,
            reason: 'Afirmação categórica sem fundamentação',
            severity: 'medium',
          });
          warnings.push(`Evite afirmações categóricas como: "${match}"`);
        });
      }
    });

    // Check for overly specific claims without source
    const hasSpecificNumbers =
      /\d+%|\d+\s*milhões?|\d+\s*bilhões?|\d+\s*vezes/gi.test(content);
    const hasSources = /fonte:|referência:|conforme|segundo/gi.test(content);

    if (hasSpecificNumbers && !hasSources) {
      warnings.push(
        'Dados numéricos específicos detectados sem citação de fonte. Adicione referências.',
      );
      suspiciousElements.push({
        element: 'Dados numéricos',
        reason: 'Números específicos sem fonte citada',
        severity: 'medium',
      });
    }

    // Check for vague or hedging language (good in this context)
    const hedgeWords = [
      'aproximadamente',
      'cerca de',
      'estima-se',
      'pode',
      'possivelmente',
      'geralmente',
    ];
    const hedgeCount = hedgeWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      return count + (content.match(regex) || []).length;
    }, 0);

    // Some hedging is good - it shows appropriate uncertainty
    const wordCount = content.split(/\s+/).length;
    const hedgeRatio = hedgeCount / wordCount;

    if (hedgeRatio < 0.01 && suspiciousElements.length > 3) {
      warnings.push(
        'Texto muito assertivo para conteúdo gerado por IA. Considere adicionar linguagem que indique estimativas quando apropriado.',
      );
    }

    // Calculate confidence score
    const highSeverityCount = suspiciousElements.filter((e) => e.severity === 'high').length;
    const mediumSeverityCount = suspiciousElements.filter((e) => e.severity === 'medium').length;

    // Higher penalties for high severity items
    const penaltyScore = highSeverityCount * 15 + mediumSeverityCount * 5;
    const score = Math.max(0, 100 - penaltyScore);

    // Confidence is inverse of suspicious elements
    const confidence = Math.max(0, 100 - suspiciousElements.length * 10);

    const verified = suspiciousElements.length === 0 || score >= 70;

    this.logger.log(
      `Hallucination check completed. Score: ${score}%, Confidence: ${confidence}%, Verified: ${verified}`,
    );

    return {
      score,
      confidence,
      warnings: [...new Set(warnings)],
      suspiciousElements,
      verified,
    };
  }

  async generateSafetyPrompt(): Promise<string> {
    return `IMPORTANTE - DIRETRIZES DE SEGURANÇA:

1. NÃO invente números de leis, decretos ou normas
2. NÃO cite artigos específicos sem ter certeza absoluta
3. NÃO mencione valores monetários específicos sem base
4. NÃO crie números de processos ou documentos
5. NÃO cite jurisprudência específica

SEMPRE:
- Use linguagem que indique estimativa quando apropriado
- Prefira "geralmente" a "sempre"
- Use "pode" ao invés de "deve" quando não tiver certeza
- Indique quando algo precisa ser verificado
- Seja conservador em afirmações categóricas

Quando mencionar legislação, use termos gerais:
✅ "conforme a Lei de Licitações"
❌ "conforme o Art. 23, §2º, inciso III da Lei..."

Adicione este aviso ao final:
"⚠️ Informações específicas (números de normas, valores, datas) devem ser verificadas antes do uso oficial."`;
  }

  getSystemPrompt(): string {
    return `Você é um agente de verificação de segurança para conteúdo gerado por IA.

Sua missão é PREVENIR ALUCINAÇÕES - invenção de fatos, leis, números ou informações.

REGRAS CRÍTICAS:

1. NUNCA invente:
   - Números de leis ou normas
   - Artigos ou incisos específicos
   - Valores monetários sem fonte
   - Datas ou prazos específicos
   - Números de processo
   - Nomes de pessoas ou órgãos

2. SEMPRE indique incerteza quando apropriado:
   - "aproximadamente" para valores estimados
   - "geralmente" para comportamentos típicos
   - "pode" ao invés de "deve" quando não há certeza
   - "estima-se" para projeções

3. SINALIZE necessidade de verificação:
   - Quando mencionar legislação específica
   - Quando citar dados numéricos
   - Quando fazer afirmações categóricas

4. SEJA CONSERVADOR:
   - É melhor ser vago e correto que específico e errado
   - É melhor indicar necessidade de verificação que inventar

Lembre-se: Uma informação incorreta em um documento oficial pode ter consequências legais graves.`;
  }
}

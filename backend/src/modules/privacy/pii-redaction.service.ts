import { Injectable, Logger } from '@nestjs/common';

/**
 * PII Finding Interface
 * Representa uma detecção de informação pessoal identificável
 */
export interface PIIFinding {
  type: string;
  count: number;
}

/**
 * PII Redaction Result Interface
 * Resultado da sanitização de PII
 */
export interface PIIRedactionResult {
  redacted: string;
  findings: PIIFinding[];
}

/**
 * PII Redaction Service
 *
 * Serviço responsável por sanitizar informações pessoais identificáveis (PII)
 * antes do envio de dados para serviços externos (OpenAI, Exa).
 *
 * Conforme LGPD:
 * - Art. 6º, III - Princípio da necessidade (minimização de dados)
 * - Art. 33 - Transferência internacional de dados
 *
 * @see https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
 */
@Injectable()
export class PIIRedactionService {
  private readonly logger = new Logger(PIIRedactionService.name);

  /**
   * Patterns de detecção de PII
   * Adaptados para o contexto brasileiro e governamental
   * Ordem importa: CNPJ deve vir antes de CPF para evitar false positives
   */
  private readonly patterns = {
    // Email: usuario@dominio.com.br
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // CNPJ: 12.345.678/0001-90 ou 12345678000190 (must come before CPF)
    cnpj: /\b\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2}\b/g,

    // CPF: 123.456.789-00 ou 12345678900
    cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,

    // Telefone: (11) 98765-4321 ou 11987654321
    phone: /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g,

    // Número de processo: Processo nº 1234/2024 ou processo 1234.56.2024.1.00.0000
    processNumber: /processo\s+n?[º°]?\s*[\d/\-.]+/gi,

    // RG: 12.345.678-9 ou MG-12.345.678
    rg: /\b[A-Z]{2}-?\d{1,2}\.?\d{3}\.?\d{3}-?\d{1}\b/g,

    // Matrícula de servidor: MAT 123456 ou matrícula 123456
    matricula: /\bmatr[íi]cula:?\s+\d{4,}\b/gi,

    // CEP: 12345-678 ou 12345678
    cep: /\b\d{5}-?\d{3}\b/g,
  };

  /**
   * Redact PII from content
   *
   * Sanitiza todas as informações pessoais identificáveis do conteúdo,
   * substituindo-as por placeholders genéricos.
   *
   * @param content - Conteúdo a ser sanitizado
   * @returns Resultado com conteúdo sanitizado e lista de findings
   *
   * @example
   * const { redacted, findings } = service.redact(
   * "Contato: joao.silva@gov.br, CPF 123.456.789-00"
   * );
   * // redacted: "Contato: [EMAIL_REDACTED], CPF [CPF_REDACTED]"
   * // findings: [{ type: 'email', count: 1 }, { type: 'cpf', count: 1 }]
   */
  redact(content: string): PIIRedactionResult {
    if (!content || typeof content !== 'string') {
      return { redacted: content || '', findings: [] };
    }

    let redacted = content;
    const findings: PIIFinding[] = [];

    Object.entries(this.patterns).forEach(([type, pattern]) => {
      const matches = content.match(pattern);

      if (matches && matches.length > 0) {
        const uniqueMatches = [...new Set(matches)]; // Remove duplicatas
        findings.push({ type, count: uniqueMatches.length });

        // Substituir por placeholder
        redacted = redacted.replace(
          pattern,
          `[${type.toUpperCase()}_REDACTED]`,
        );
      }
    });

    // Log de auditoria (sem os valores reais)
    if (findings.length > 0) {
      this.logger.warn('PII detected and redacted before external API call', {
        findings,
        totalRedactions: findings.reduce((sum, f) => sum + f.count, 0),
      });
    }

    return { redacted, findings };
  }

  /**
   * Check if content contains PII
   *
   * Verifica se o conteúdo contém informações pessoais identificáveis,
   * sem realizar a sanitização.
   *
   * @param content - Conteúdo a ser verificado
   * @returns true se PII foi detectado, false caso contrário
   */
  containsPII(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    return Object.values(this.patterns).some((pattern) =>
      pattern.test(content),
    );
  }

  /**
   * Get supported PII types
   *
   * Retorna a lista de tipos de PII suportados pelo serviço.
   *
   * @returns Array com os tipos de PII detectáveis
   */
  getSupportedTypes(): string[] {
    return Object.keys(this.patterns);
  }
}

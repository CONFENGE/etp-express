import { Test, TestingModule } from '@nestjs/testing';
import {
  OutputValidatorService,
  LLMOutputValidationError,
} from './output-validator';

describe('OutputValidatorService', () => {
  let service: OutputValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutputValidatorService],
    }).compile();

    service = module.get<OutputValidatorService>(OutputValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateOutput', () => {
    const validContent = `
      A contratação de notebooks Dell Latitude 5420 é necessária para modernizar
      a infraestrutura tecnológica da Secretaria de Tecnologia, conforme previsto
      na Lei 14.133/2021. Esta aquisição visa atender às demandas crescentes de
      processamento de dados e mobilidade dos servidores públicos, garantindo
      maior eficiência operacional e conformidade com os padrões de segurança
      da informação estabelecidos pelo Governo Federal.
    `.trim();

    describe('valid outputs', () => {
      it('should validate a well-formed output', () => {
        const result = service.validateOutput(validContent, 'justificativa');

        expect(result.valid).toBe(true);
        expect(result.details).toBeDefined();
        expect(result.details?.sectionType).toBe('justificativa');
      });

      it('should validate output for different section types', () => {
        const sectionTypes = [
          'objeto',
          'introducao',
          'contextualizacao',
          'base_legal',
          'orcamento',
        ];

        for (const sectionType of sectionTypes) {
          const result = service.validateOutput(validContent, sectionType);
          expect(result.valid).toBe(true);
        }
      });

      it('should use default schema for unknown section types', () => {
        const result = service.validateOutput(
          validContent,
          'unknown_section_type',
        );

        expect(result.valid).toBe(true);
        expect(result.details?.sectionType).toBe('unknown_section_type');
      });
    });

    describe('empty or whitespace content', () => {
      it('should reject empty string', () => {
        const result = service.validateOutput('', 'justificativa');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('empty');
      });

      it('should reject whitespace-only string', () => {
        const result = service.validateOutput('   \n\t  ', 'justificativa');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('empty');
      });

      it('should reject null-ish values', () => {
        const result = service.validateOutput(
          null as unknown as string,
          'justificativa',
        );

        expect(result.valid).toBe(false);
      });
    });

    describe('length validation', () => {
      it('should reject content shorter than minimum length', () => {
        const shortContent = 'Texto muito curto.';
        const result = service.validateOutput(shortContent, 'justificativa');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('too short');
        expect(result.details?.minLength).toBe(200);
      });

      it('should reject content longer than maximum length', () => {
        const longContent = 'A'.repeat(15001);
        const result = service.validateOutput(longContent, 'objeto');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('too long');
        expect(result.details?.maxLength).toBe(5000);
      });

      it('should accept content at exactly minimum length', () => {
        // Generate varied content at minimum length (200 chars for justificativa)
        const content = `A contratacao de servicos de tecnologia da informacao justifica-se pela necessidade de modernizar a infraestrutura do orgao publico conforme previsto na Lei 14133 de 2021 que regulamenta as novas licitacoes.`;
        expect(content.length).toBeGreaterThanOrEqual(200);
        const result = service.validateOutput(content, 'justificativa');

        expect(result.valid).toBe(true);
      });
    });

    describe('forbidden patterns (security)', () => {
      it('should reject content with script tags', () => {
        const maliciousContent = `${validContent} <script>alert('xss')</script>`;
        const result = service.validateOutput(
          maliciousContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Forbidden patterns');
        expect(result.detectedPatterns).toContain('<script');
      });

      it('should reject content with javascript: protocol', () => {
        const maliciousContent = `${validContent} Link: javascript:alert(1)`;
        const result = service.validateOutput(
          maliciousContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('javascript:');
      });

      it('should reject content with onclick handlers', () => {
        const maliciousContent = `${validContent} <div onclick="evil()">`;
        const result = service.validateOutput(
          maliciousContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('onclick=');
      });

      it('should reject content with iframe tags', () => {
        const maliciousContent = `${validContent} <iframe src="evil.com">`;
        const result = service.validateOutput(
          maliciousContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('<iframe');
      });

      it('should reject content with document.cookie access', () => {
        const maliciousContent = `${validContent} console.log(document.cookie)`;
        const result = service.validateOutput(
          maliciousContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('document.cookie');
      });

      it('should reject content with eval calls', () => {
        const maliciousContent = `${validContent} eval(userInput)`;
        const result = service.validateOutput(
          maliciousContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('eval(');
      });

      it('should reject content with SQL injection patterns', () => {
        const maliciousContent = `${validContent} ; DROP TABLE users; --`;
        const result = service.validateOutput(
          maliciousContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('DROP TABLE');
      });
    });

    describe('AI leakage detection', () => {
      it('should reject content with "As an AI language model"', () => {
        const leakyContent = `${validContent} As an AI language model, I cannot provide...`;
        const result = service.validateOutput(leakyContent, 'justificativa');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('AI system prompt leakage');
        expect(result.detectedPatterns).toContain('As an AI language model');
      });

      it('should reject content with "I apologize"', () => {
        const leakyContent = `${validContent} I apologize, but I cannot help with that.`;
        const result = service.validateOutput(leakyContent, 'justificativa');

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('I apologize');
      });

      it('should reject content mentioning OpenAI', () => {
        const leakyContent = `${validContent} As OpenAI has trained me...`;
        const result = service.validateOutput(leakyContent, 'justificativa');

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('OpenAI');
      });

      it('should reject content mentioning GPT models', () => {
        const leakyContent = `${validContent} Based on my GPT-4 training...`;
        const result = service.validateOutput(leakyContent, 'justificativa');

        expect(result.valid).toBe(false);
        expect(result.detectedPatterns).toContain('GPT-4');
      });
    });

    describe('repetitive content detection', () => {
      it('should reject content with repeated words', () => {
        const repetitiveContent = `${validContent} teste teste teste teste teste teste teste`;
        const result = service.validateOutput(
          repetitiveContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('repetitive');
      });

      it('should reject content with repeated sentences', () => {
        const sentence = 'Esta frase se repete muitas vezes no documento. ';
        const repetitiveContent = sentence.repeat(20);
        const result = service.validateOutput(
          repetitiveContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('repetitive');
      });

      it('should reject content with repeated blocks', () => {
        const block = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
          3,
        );
        const repetitiveContent = block + block + block;
        const result = service.validateOutput(
          repetitiveContent,
          'justificativa',
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('repetitive');
      });

      it('should allow normal repetition of common words', () => {
        const normalContent = `
          A contratacao de servicos de TI e necessaria. A contratacao deve seguir
          a Lei 14.133/2021. A contratacao sera realizada por pregao eletronico.
          Os servicos serao prestados conforme especificado no termo de referencia.
          O prazo de execucao sera de 12 meses a partir da assinatura do contrato.
        `.trim();
        const result = service.validateOutput(normalContent, 'justificativa');

        expect(result.valid).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle unicode content correctly', () => {
        const unicodeContent = `${validContent} Caracteres especiais: cafe, informacao, manutencao.`;
        const result = service.validateOutput(unicodeContent, 'justificativa');

        expect(result.valid).toBe(true);
      });

      it('should handle content with markdown formatting', () => {
        const markdownContent = `
          # Titulo

          ${validContent}

          ## Subtitulo

          - Item 1
          - Item 2

          **Texto em negrito** e *italico*.
        `;
        const result = service.validateOutput(markdownContent, 'justificativa');

        expect(result.valid).toBe(true);
      });

      it('should handle content with code blocks (non-malicious)', () => {
        const codeContent = `
          ${validContent}

          Exemplo de configuracao em formato JSON contendo as seguintes propriedades:
          nome do projeto ETP Express e versao 1.0 do sistema, conforme especificado
          nos requisitos tecnicos da contratacao.
        `;
        const result = service.validateOutput(codeContent, 'justificativa');

        expect(result.valid).toBe(true);
      });

      it('should handle very long valid content near max length', () => {
        // Generate unique numbered paragraphs to avoid repetition detection
        const sentences: string[] = [];
        for (let i = 1; i <= 100; i++) {
          sentences.push(`Paragrafo numero ${i} trata da necessidade de contratacao de servicos tecnicos especializados para o orgao publico federal que demanda modernizacao de sua infraestrutura de acordo com normas vigentes.`);
        }
        let nearMaxContent = sentences.join(' ');
        nearMaxContent = nearMaxContent.substring(0, 9990);
        const result = service.validateOutput(nearMaxContent, 'justificativa');

        expect(result.valid).toBe(true);
        expect(result.details?.outputLength).toBe(9990);
      });
    });
  });

  describe('getMaxRetries', () => {
    it('should return correct max retries for known section types', () => {
      expect(service.getMaxRetries('justificativa')).toBe(2);
      expect(service.getMaxRetries('objeto')).toBe(2);
      expect(service.getMaxRetries('introducao')).toBe(2);
    });

    it('should return default max retries for unknown section types', () => {
      expect(service.getMaxRetries('unknown_type')).toBe(2);
    });
  });

  describe('LLMOutputValidationError', () => {
    it('should create error with correct properties', () => {
      const error = new LLMOutputValidationError(
        'Validation failed',
        'justificativa',
        3,
        'Output too short',
      );

      expect(error.name).toBe('LLMOutputValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.sectionType).toBe('justificativa');
      expect(error.attempts).toBe(3);
      expect(error.lastReason).toBe('Output too short');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new LLMOutputValidationError('Test error', 'test', 1, 'reason');
      }).toThrow(LLMOutputValidationError);
    });
  });
});

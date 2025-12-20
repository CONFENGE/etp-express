import {
  SECTION_SCHEMAS,
  DEFAULT_SCHEMA,
  FORBIDDEN_PATTERNS,
  AI_LEAKAGE_PATTERNS,
  getSchemaForSection,
  SectionSchema,
} from './section-schemas';

describe('Section Schemas', () => {
  describe('SECTION_SCHEMAS', () => {
    it('should define schemas for all expected section types', () => {
      const expectedSections = [
        'objeto',
        'justificativa',
        'introducao',
        'contextualizacao',
        'descricao_solucao',
        'base_legal',
        'orcamento',
        'identificacao',
        'metodologia',
        'cronograma',
        'riscos',
        'especificacao_tecnica',
        'beneficiarios',
        'sustentabilidade',
        'justificativa_economica',
        'pesquisa_mercado',
      ];

      for (const section of expectedSections) {
        expect(SECTION_SCHEMAS[section]).toBeDefined();
        expect(SECTION_SCHEMAS[section].type).toBe(section);
      }
    });

    it('should have valid schema structure for all sections', () => {
      for (const [key, schema] of Object.entries(SECTION_SCHEMAS)) {
        expect(schema.type).toBe(key);
        expect(schema.name).toBeDefined();
        expect(typeof schema.maxLength).toBe('number');
        expect(typeof schema.minLength).toBe('number');
        expect(schema.maxLength).toBeGreaterThan(schema.minLength);
        expect(Array.isArray(schema.forbiddenPatterns)).toBe(true);
        expect(typeof schema.expectJson).toBe('boolean');
        expect(typeof schema.maxRetries).toBe('number');
      }
    });

    it('should have reasonable length limits', () => {
      for (const schema of Object.values(SECTION_SCHEMAS)) {
        // Min length should be at least 50 characters
        expect(schema.minLength).toBeGreaterThanOrEqual(50);
        // Max length should be at most 20000 characters
        expect(schema.maxLength).toBeLessThanOrEqual(20000);
        // Max retries should be 1-5
        expect(schema.maxRetries).toBeGreaterThanOrEqual(1);
        expect(schema.maxRetries).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('DEFAULT_SCHEMA', () => {
    it('should have all required properties', () => {
      expect(DEFAULT_SCHEMA.type).toBe('default');
      expect(DEFAULT_SCHEMA.name).toBeDefined();
      expect(DEFAULT_SCHEMA.maxLength).toBeDefined();
      expect(DEFAULT_SCHEMA.minLength).toBeDefined();
      expect(DEFAULT_SCHEMA.forbiddenPatterns).toBeDefined();
      expect(DEFAULT_SCHEMA.expectJson).toBeDefined();
      expect(DEFAULT_SCHEMA.maxRetries).toBeDefined();
    });

    it('should have generic limits', () => {
      expect(DEFAULT_SCHEMA.maxLength).toBe(10000);
      expect(DEFAULT_SCHEMA.minLength).toBe(50);
    });
  });

  describe('FORBIDDEN_PATTERNS', () => {
    it('should contain HTML/script injection patterns', () => {
      expect(FORBIDDEN_PATTERNS).toContain('<script');
      expect(FORBIDDEN_PATTERNS).toContain('</script>');
      expect(FORBIDDEN_PATTERNS).toContain('<iframe');
      expect(FORBIDDEN_PATTERNS).toContain('javascript:');
    });

    it('should contain event handler patterns', () => {
      expect(FORBIDDEN_PATTERNS).toContain('onclick=');
      expect(FORBIDDEN_PATTERNS).toContain('onerror=');
      expect(FORBIDDEN_PATTERNS).toContain('onload=');
    });

    it('should contain SQL injection patterns', () => {
      expect(FORBIDDEN_PATTERNS).toContain('DROP TABLE');
      expect(FORBIDDEN_PATTERNS).toContain('DELETE FROM');
    });

    it('should contain JavaScript execution patterns', () => {
      expect(FORBIDDEN_PATTERNS).toContain('eval(');
      expect(FORBIDDEN_PATTERNS).toContain('document.cookie');
      expect(FORBIDDEN_PATTERNS).toContain('document.write');
    });

    it('should contain prompt injection markers', () => {
      expect(FORBIDDEN_PATTERNS).toContain('\\[SYSTEM\\]');
      expect(FORBIDDEN_PATTERNS).toContain('\\[INST\\]');
      expect(FORBIDDEN_PATTERNS).toContain('<<SYS>>');
    });

    it('should not be empty', () => {
      expect(FORBIDDEN_PATTERNS.length).toBeGreaterThan(0);
    });
  });

  describe('AI_LEAKAGE_PATTERNS', () => {
    it('should contain common AI self-reference patterns', () => {
      expect(AI_LEAKAGE_PATTERNS).toContain('As an AI language model');
      expect(AI_LEAKAGE_PATTERNS).toContain('As an AI assistant');
      expect(AI_LEAKAGE_PATTERNS).toContain('I am an AI');
    });

    it('should contain apologetic patterns', () => {
      expect(AI_LEAKAGE_PATTERNS).toContain('I apologize');
      expect(AI_LEAKAGE_PATTERNS).toContain('I cannot');
    });

    it('should contain model name references', () => {
      expect(AI_LEAKAGE_PATTERNS).toContain('OpenAI');
      expect(AI_LEAKAGE_PATTERNS).toContain('GPT-4');
      expect(AI_LEAKAGE_PATTERNS).toContain('GPT-3');
      expect(AI_LEAKAGE_PATTERNS).toContain('Claude');
      expect(AI_LEAKAGE_PATTERNS).toContain('Anthropic');
    });

    it('should contain training-related patterns', () => {
      expect(AI_LEAKAGE_PATTERNS).toContain('My training data');
      expect(AI_LEAKAGE_PATTERNS).toContain('I was trained');
    });
  });

  describe('getSchemaForSection', () => {
    it('should return correct schema for known section types', () => {
      const schema = getSchemaForSection('justificativa');

      expect(schema.type).toBe('justificativa');
      expect(schema.name).toBe('Justificativa da Contratação');
      expect(schema.maxLength).toBe(10000);
    });

    it('should return default schema for unknown section types', () => {
      const schema = getSchemaForSection('unknown_section');

      expect(schema).toEqual(DEFAULT_SCHEMA);
    });

    it('should handle case-insensitive section types', () => {
      const schema = getSchemaForSection('JUSTIFICATIVA');

      expect(schema.type).toBe('justificativa');
    });

    it('should handle section types with whitespace', () => {
      const schema = getSchemaForSection('  justificativa  ');

      expect(schema.type).toBe('justificativa');
    });

    it('should return different schemas for different section types', () => {
      const justificativa = getSchemaForSection('justificativa');
      const objeto = getSchemaForSection('objeto');
      const especificacao = getSchemaForSection('especificacao_tecnica');

      expect(justificativa.maxLength).toBe(10000);
      expect(objeto.maxLength).toBe(5000);
      expect(especificacao.maxLength).toBe(15000);
    });
  });

  describe('schema validation properties', () => {
    it('should have forbiddenPatterns referencing FORBIDDEN_PATTERNS', () => {
      for (const schema of Object.values(SECTION_SCHEMAS)) {
        expect(schema.forbiddenPatterns).toBe(FORBIDDEN_PATTERNS);
      }
    });

    it('should not expect JSON for text sections', () => {
      const textSections = [
        'objeto',
        'justificativa',
        'introducao',
        'contextualizacao',
      ];

      for (const section of textSections) {
        expect(SECTION_SCHEMAS[section].expectJson).toBe(false);
      }
    });

    it('should have maxRetries set to 2 for all sections', () => {
      for (const schema of Object.values(SECTION_SCHEMAS)) {
        expect(schema.maxRetries).toBe(2);
      }
    });
  });
});

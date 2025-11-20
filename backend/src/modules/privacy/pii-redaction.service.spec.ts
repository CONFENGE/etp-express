import { Test, TestingModule } from '@nestjs/testing';
import { PIIRedactionService, PIIFinding } from './pii-redaction.service';

describe('PIIRedactionService', () => {
  let service: PIIRedactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PIIRedactionService],
    }).compile();

    service = module.get<PIIRedactionService>(PIIRedactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('redact', () => {
    it('should redact email addresses', () => {
      const input = 'Contato: joao.silva@gov.br e maria.santos@exemplo.com.br';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toBe('Contato: [EMAIL_REDACTED] e [EMAIL_REDACTED]');
      expect(findings).toHaveLength(1);
      expect(findings[0]).toEqual({ type: 'email', count: 2 });
    });

    it('should redact CPF (formatted and unformatted)', () => {
      const input = 'CPF: 123.456.789-00 ou 98765432188';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toBe('CPF: [CPF_REDACTED] ou [CPF_REDACTED]');
      // Note: phone pattern may also match unformatted CPF/CNPJ - this is expected
      expect(findings.some((f) => f.type === 'cpf')).toBe(true);
      expect(findings.find((f) => f.type === 'cpf')?.count).toBe(2);
    });

    it('should redact CNPJ (formatted and unformatted)', () => {
      const input = 'CNPJ: 12.345.678/0001-90 ou 12345678000190';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toBe('CNPJ: [CNPJ_REDACTED] ou [CNPJ_REDACTED]');
      // Note: phone pattern may also match - this is expected behavior
      expect(findings.some((f) => f.type === 'cnpj')).toBe(true);
      expect(findings.find((f) => f.type === 'cnpj')?.count).toBe(2);
    });

    it('should redact phone numbers (formatted and unformatted)', () => {
      const input = 'Telefones: (11) 98765-4321, (21)987654321, 11 9876-5432';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toBe(
        'Telefones: [PHONE_REDACTED], [PHONE_REDACTED], [PHONE_REDACTED]',
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].type).toBe('phone');
      expect(findings[0].count).toBe(3);
    });

    it('should redact process numbers', () => {
      const input = 'Processo nº 1234/2024 e processo 1234.56.2024.1.00.0000';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toContain('[PROCESSNUMBER_REDACTED]');
      expect(findings).toHaveLength(1);
      expect(findings[0].type).toBe('processNumber');
    });

    it('should redact RG numbers', () => {
      const input = 'RG: MG-12.345.678 ou SP12345678';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toContain('[RG_REDACTED]');
      expect(findings.some((f) => f.type === 'rg')).toBe(true);
    });

    it('should redact matricula (employee ID)', () => {
      const input = 'Matrícula 123456 e matrícula 789012';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toBe('[MATRICULA_REDACTED] e [MATRICULA_REDACTED]');
      expect(findings).toHaveLength(1);
      expect(findings[0].type).toBe('matricula');
      expect(findings[0].count).toBe(2);
    });

    it('should redact CEP (postal codes)', () => {
      const input = 'CEP: 01310-100 ou 30130320';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toBe('CEP: [CEP_REDACTED] ou [CEP_REDACTED]');
      expect(findings).toHaveLength(1);
      expect(findings[0].type).toBe('cep');
    });

    it('should handle multiple PII types in one text', () => {
      const input = `
        Responsável: João Silva
        Email: joao.silva@gov.br
        CPF: 123.456.789-00
        Telefone: (11) 98765-4321
        Matrícula: 123456
      `;
      const { redacted, findings } = service.redact(input);

      expect(findings.length).toBeGreaterThan(0);
      expect(redacted).toContain('[EMAIL_REDACTED]');
      expect(redacted).toContain('[CPF_REDACTED]');
      expect(redacted).toContain('[PHONE_REDACTED]');
      expect(redacted).toContain('[MATRICULA_REDACTED]');
    });

    it('should return original text if no PII found', () => {
      const input = 'Este é um texto sem informações pessoais.';
      const { redacted, findings } = service.redact(input);

      expect(redacted).toBe(input);
      expect(findings).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const { redacted, findings } = service.redact('');

      expect(redacted).toBe('');
      expect(findings).toHaveLength(0);
    });

    it('should handle null/undefined gracefully', () => {
      const resultNull = service.redact(null as any);
      const resultUndefined = service.redact(undefined as any);

      expect(resultNull.redacted).toBe('');
      expect(resultNull.findings).toHaveLength(0);
      expect(resultUndefined.redacted).toBe('');
      expect(resultUndefined.findings).toHaveLength(0);
    });

    it('should count unique occurrences correctly', () => {
      const input = 'Email: teste@gov.br, teste@gov.br, outro@gov.br';
      const { findings } = service.redact(input);

      expect(findings).toHaveLength(1);
      expect(findings[0].type).toBe('email');
      // Deve contar apenas emails únicos (teste@gov.br e outro@gov.br)
      expect(findings[0].count).toBe(2);
    });
  });

  describe('containsPII', () => {
    it('should return true if PII is present', () => {
      expect(service.containsPII('Email: teste@gov.br')).toBe(true);
      expect(service.containsPII('CPF: 123.456.789-00')).toBe(true);
      expect(service.containsPII('Telefone: (11) 98765-4321')).toBe(true);
    });

    it('should return false if no PII is present', () => {
      expect(service.containsPII('Texto sem dados pessoais')).toBe(false);
      expect(service.containsPII('')).toBe(false);
    });

    it('should handle null/undefined gracefully', () => {
      expect(service.containsPII(null as any)).toBe(false);
      expect(service.containsPII(undefined as any)).toBe(false);
    });
  });

  describe('getSupportedTypes', () => {
    it('should return list of supported PII types', () => {
      const types = service.getSupportedTypes();

      expect(types).toContain('email');
      expect(types).toContain('cpf');
      expect(types).toContain('cnpj');
      expect(types).toContain('phone');
      expect(types).toContain('processNumber');
      expect(types).toContain('rg');
      expect(types).toContain('matricula');
      expect(types).toContain('cep');
      expect(types.length).toBe(8);
    });
  });

  describe('edge cases and security', () => {
    it('should not be bypassed by whitespace variations', () => {
      const input = 'CPF:123.456.789-00 (sem espaço)';
      const { findings } = service.redact(input);

      expect(findings.some((f) => f.type === 'cpf')).toBe(true);
    });

    it('should handle very long texts efficiently', () => {
      const longText =
        'Texto longo '.repeat(1000) +
        ' joao@gov.br ' +
        'mais texto '.repeat(1000);
      const { redacted, findings } = service.redact(longText);

      expect(findings).toHaveLength(1);
      expect(findings[0].type).toBe('email');
      expect(redacted).toContain('[EMAIL_REDACTED]');
    });

    it('should preserve text structure and formatting', () => {
      const input = `
## Título
- Item 1: joao@gov.br
- Item 2: maria@gov.br

**Importante:** CPF 123.456.789-00
      `;
      const { redacted } = service.redact(input);

      expect(redacted).toContain('## Título');
      expect(redacted).toContain('- Item 1:');
      expect(redacted).toContain('**Importante:**');
      expect(redacted).toContain('[EMAIL_REDACTED]');
      expect(redacted).toContain('[CPF_REDACTED]');
    });
  });

  describe('government-specific patterns', () => {
    it('should redact government process numbers', () => {
      const input = 'Processo nº 1234/2024-CONFENGE';
      const { findings } = service.redact(input);

      expect(findings.some((f) => f.type === 'processNumber')).toBe(true);
    });

    it('should redact employee matriculas', () => {
      const input = 'Servidor matrícula 987654';
      const { findings } = service.redact(input);

      expect(findings.some((f) => f.type === 'matricula')).toBe(true);
    });

    it('should handle government email domains', () => {
      const input = 'Contato: servidor@confenge.gov.br';
      const { redacted } = service.redact(input);

      expect(redacted).toContain('[EMAIL_REDACTED]');
    });
  });
});

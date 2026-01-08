import { describe, it, expect } from 'vitest';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
  etpWizardSchema,
  WIZARD_STEPS,
  defaultWizardValues,
} from './etpWizardSchema';

describe('etpWizardSchema', () => {
  describe('step1Schema - Identification', () => {
    it('validates valid step 1 data', () => {
      const validData = {
        title: 'Contratacao de Servicos de TI',
        orgaoEntidade: 'Secretaria Municipal',
        uasg: '123456',
        unidadeDemandante: 'Departamento de TI',
        responsavelTecnicoNome: 'Joao Silva',
        responsavelTecnicoMatricula: '12345',
        dataElaboracao: '2024-01-15',
      };

      expect(() => step1Schema.parse(validData)).not.toThrow();
    });

    it('rejects title shorter than 5 characters', () => {
      const invalidData = {
        title: 'abc',
      };

      expect(() => step1Schema.parse(invalidData)).toThrow(
        /mínimo 5 caracteres/,
      );
    });

    it('rejects title longer than 200 characters', () => {
      const invalidData = {
        title: 'a'.repeat(201),
      };

      expect(() => step1Schema.parse(invalidData)).toThrow(
        /máximo 200 caracteres/,
      );
    });

    it('rejects invalid UASG format', () => {
      const invalidData = {
        title: 'Valid Title Here',
        uasg: '12345', // Only 5 digits
      };

      expect(() => step1Schema.parse(invalidData)).toThrow(/6 dígitos/);
    });

    it('accepts valid UASG format', () => {
      const validData = {
        title: 'Valid Title Here',
        uasg: '123456',
      };

      expect(() => step1Schema.parse(validData)).not.toThrow();
    });

    it('allows empty optional fields', () => {
      const validData = {
        title: 'Valid Title Here',
        orgaoEntidade: '',
        uasg: '',
      };

      expect(() => step1Schema.parse(validData)).not.toThrow();
    });
  });

  describe('step2Schema - Object and Justification', () => {
    it('validates valid step 2 data', () => {
      const validData = {
        objeto: 'Contratacao de empresa para desenvolvimento',
        descricaoDetalhada: 'Descricao detalhada do servico',
        quantidadeEstimada: 12,
        unidadeMedida: 'mes',
        justificativaContratacao: 'A'.repeat(60), // min 50
        necessidadeAtendida: 'Atender demanda',
        beneficiosEsperados: 'Reducao de custos',
      };

      expect(() => step2Schema.parse(validData)).not.toThrow();
    });

    it('rejects objeto shorter than 10 characters', () => {
      const invalidData = {
        objeto: 'abc',
      };

      expect(() => step2Schema.parse(invalidData)).toThrow(
        /mínimo 10 caracteres/,
      );
    });

    it('rejects quantidadeEstimada less than 1', () => {
      const invalidData = {
        objeto: 'Valid objeto here',
        quantidadeEstimada: 0,
      };

      expect(() => step2Schema.parse(invalidData)).toThrow(/mínimo 1/);
    });

    it('rejects justificativa shorter than 50 characters', () => {
      const invalidData = {
        objeto: 'Valid objeto here',
        justificativaContratacao: 'Too short',
      };

      expect(() => step2Schema.parse(invalidData)).toThrow(
        /mínimo 50 caracteres/,
      );
    });
  });

  describe('step3Schema - Technical Requirements', () => {
    it('validates valid step 3 data', () => {
      const validData = {
        requisitosTecnicos: 'Sistema deve suportar 10.000 usuarios',
        requisitosQualificacao: 'Certificacao ISO 9001',
        criteriosSustentabilidade: 'Materiais reciclaveis',
        garantiaExigida: '12 meses',
        prazoExecucao: 180,
      };

      expect(() => step3Schema.parse(validData)).not.toThrow();
    });

    it('rejects prazoExecucao less than 1', () => {
      const invalidData = {
        prazoExecucao: 0,
      };

      expect(() => step3Schema.parse(invalidData)).toThrow(/mínimo 1 dia/);
    });

    it('rejects non-integer prazoExecucao', () => {
      const invalidData = {
        prazoExecucao: 10.5,
      };

      expect(() => step3Schema.parse(invalidData)).toThrow(/número inteiro/);
    });
  });

  describe('step4Schema - Cost Estimation', () => {
    it('validates valid step 4 data', () => {
      const validData = {
        valorUnitario: 5000.0,
        valorEstimado: 500000.0,
        fontePesquisaPrecos: 'Painel de Precos',
        dotacaoOrcamentaria: '02.031.0001.2001',
      };

      expect(() => step4Schema.parse(validData)).not.toThrow();
    });

    it('rejects negative valorUnitario', () => {
      const invalidData = {
        valorUnitario: -100,
      };

      expect(() => step4Schema.parse(invalidData)).toThrow(
        /maior ou igual a 0/,
      );
    });

    it('rejects negative valorEstimado', () => {
      const invalidData = {
        valorEstimado: -1000,
      };

      expect(() => step4Schema.parse(invalidData)).toThrow(
        /maior ou igual a 0/,
      );
    });

    it('allows zero values', () => {
      const validData = {
        valorUnitario: 0,
        valorEstimado: 0,
      };

      expect(() => step4Schema.parse(validData)).not.toThrow();
    });
  });

  describe('step5Schema - Risk Analysis', () => {
    it('validates valid step 5 data', () => {
      const validData = {
        nivelRisco: 'MEDIO' as const,
        descricaoRiscos: 'Risco de atraso na entrega',
        description: 'Observacoes adicionais',
      };

      expect(() => step5Schema.parse(validData)).not.toThrow();
    });

    it('accepts all valid nivelRisco values', () => {
      const levels = ['BAIXO', 'MEDIO', 'ALTO'] as const;

      levels.forEach((nivel) => {
        expect(() => step5Schema.parse({ nivelRisco: nivel })).not.toThrow();
      });
    });

    it('rejects invalid nivelRisco value', () => {
      const invalidData = {
        nivelRisco: 'INVALIDO',
      };

      expect(() => step5Schema.parse(invalidData)).toThrow();
    });
  });

  describe('etpWizardSchema - Complete Form', () => {
    it('validates complete form data', () => {
      const validData = {
        // Step 1
        title: 'Contratacao de Servicos de TI',
        orgaoEntidade: 'Secretaria Municipal',
        uasg: '123456',
        unidadeDemandante: 'Departamento de TI',
        responsavelTecnicoNome: 'Joao Silva',
        responsavelTecnicoMatricula: '12345',
        dataElaboracao: '2024-01-15',
        // Step 2
        objeto: 'Contratacao de empresa especializada',
        descricaoDetalhada: 'Descricao detalhada',
        quantidadeEstimada: 12,
        unidadeMedida: 'mes',
        justificativaContratacao: 'A'.repeat(60),
        necessidadeAtendida: 'Atender demanda',
        beneficiosEsperados: 'Reducao de custos',
        // Step 3
        requisitosTecnicos: 'Requisitos tecnicos',
        requisitosQualificacao: 'Qualificacao',
        criteriosSustentabilidade: 'Sustentabilidade',
        garantiaExigida: '12 meses',
        prazoExecucao: 180,
        // Step 4
        valorUnitario: 5000,
        valorEstimado: 500000,
        fontePesquisaPrecos: 'SINAPI',
        dotacaoOrcamentaria: '02.031.0001',
        // Step 5
        nivelRisco: 'MEDIO' as const,
        descricaoRiscos: 'Riscos identificados',
        description: 'Observacoes',
      };

      expect(() => etpWizardSchema.parse(validData)).not.toThrow();
    });

    it('validates with minimal required fields', () => {
      const minimalData = {
        title: 'Valid Title Here',
        objeto: 'Valid objeto here',
      };

      // All other fields are optional
      expect(() => etpWizardSchema.parse(minimalData)).not.toThrow();
    });
  });

  describe('WIZARD_STEPS configuration', () => {
    it('has exactly 7 steps (including template selection and dynamic fields)', () => {
      expect(WIZARD_STEPS).toHaveLength(7);
    });

    it('has unique step IDs', () => {
      const ids = WIZARD_STEPS.map((step) => step.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids).toEqual(uniqueIds);
    });

    it('has all required properties for each step', () => {
      WIZARD_STEPS.forEach((step) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('schema');
        expect(step).toHaveProperty('fields');
        expect(Array.isArray(step.fields)).toBe(true);
      });
    });
  });

  describe('defaultWizardValues', () => {
    it('has all expected fields', () => {
      // Step 0 fields (Template Selection)
      expect(defaultWizardValues).toHaveProperty('templateId');

      // Step 1 fields
      expect(defaultWizardValues).toHaveProperty('title');
      expect(defaultWizardValues).toHaveProperty('orgaoEntidade');
      expect(defaultWizardValues).toHaveProperty('uasg');

      // Step 2 fields
      expect(defaultWizardValues).toHaveProperty('objeto');
      expect(defaultWizardValues).toHaveProperty('descricaoDetalhada');

      // Step 3 fields
      expect(defaultWizardValues).toHaveProperty('requisitosTecnicos');

      // Step 4 fields
      expect(defaultWizardValues).toHaveProperty('valorUnitario');
      expect(defaultWizardValues).toHaveProperty('valorEstimado');

      // Step 5 fields
      expect(defaultWizardValues).toHaveProperty('nivelRisco');
      expect(defaultWizardValues).toHaveProperty('descricaoRiscos');
    });

    it('has empty string defaults for text fields', () => {
      expect(defaultWizardValues.title).toBe('');
      expect(defaultWizardValues.objeto).toBe('');
      expect(defaultWizardValues.orgaoEntidade).toBe('');
    });

    it('has undefined defaults for numeric and enum fields', () => {
      expect(defaultWizardValues.valorUnitario).toBeUndefined();
      expect(defaultWizardValues.valorEstimado).toBeUndefined();
      expect(defaultWizardValues.nivelRisco).toBeUndefined();
    });
  });
});

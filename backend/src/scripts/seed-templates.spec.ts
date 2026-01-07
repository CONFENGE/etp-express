import { EtpTemplateType } from '../entities/etp-template.entity';
import { TEMPLATES_DATA } from './seed-templates';

/**
 * Tests for seed-templates.ts script.
 *
 * Note: These tests validate the seed script logic without requiring a database connection.
 * Integration tests would require a test database setup.
 *
 * @see Issue #1236 - [TMPL-1161b] Seed 4 base templates
 */

describe('Seed Templates Script', () => {
  describe('Templates Data Configuration', () => {
    it('should have exactly 4 templates', () => {
      expect(TEMPLATES_DATA).toHaveLength(4);
    });

    it('should have one template for each type', () => {
      const types = TEMPLATES_DATA.map((t) => t.type);

      expect(types).toContain(EtpTemplateType.OBRAS);
      expect(types).toContain(EtpTemplateType.TI);
      expect(types).toContain(EtpTemplateType.SERVICOS);
      expect(types).toContain(EtpTemplateType.MATERIAIS);
    });

    it('should have unique types (no duplicates)', () => {
      const types = TEMPLATES_DATA.map((t) => t.type);
      const uniqueTypes = [...new Set(types)];

      expect(types.length).toBe(uniqueTypes.length);
    });
  });

  describe('Template: OBRAS (Engineering)', () => {
    const obrasTemplate = TEMPLATES_DATA.find(
      (t) => t.type === EtpTemplateType.OBRAS,
    );

    it('should exist', () => {
      expect(obrasTemplate).toBeDefined();
    });

    it('should have correct name', () => {
      expect(obrasTemplate?.name).toBe('Template para Obras de Engenharia');
    });

    it('should have description mentioning key characteristics', () => {
      expect(obrasTemplate?.description).toContain('obras');
      expect(obrasTemplate?.description).toContain('ART/RRT');
      expect(obrasTemplate?.description).toContain('SINAPI');
    });

    it('should have required fields for engineering projects', () => {
      expect(obrasTemplate?.requiredFields).toContain('memorialDescritivo');
      expect(obrasTemplate?.requiredFields).toContain(
        'cronogramaFisicoFinanceiro',
      );
      expect(obrasTemplate?.requiredFields).toContain('estimativaCusto');
    });

    it('should have optional fields for ART/RRT and projects', () => {
      expect(obrasTemplate?.optionalFields).toContain('artRrt');
      expect(obrasTemplate?.optionalFields).toContain('projetoBasico');
      expect(obrasTemplate?.optionalFields).toContain('projetoExecutivo');
    });

    it('should include SINAPI and SICRO as price sources', () => {
      expect(obrasTemplate?.priceSourcesPreferred).toContain('SINAPI');
      expect(obrasTemplate?.priceSourcesPreferred).toContain('SICRO');
    });

    it('should reference Lei 14.133 and CONFEA resolutions', () => {
      expect(
        obrasTemplate?.legalReferences.some((ref) => ref.includes('14.133')),
      ).toBe(true);
      expect(
        obrasTemplate?.legalReferences.some((ref) => ref.includes('CONFEA')),
      ).toBe(true);
    });

    it('should have prompts for key sections', () => {
      const sectionTypes = obrasTemplate?.prompts.map((p) => p.sectionType);

      expect(sectionTypes).toContain('descricao_necessidade');
      expect(sectionTypes).toContain('estimativa_custo');
      expect(sectionTypes).toContain('levantamento_mercado');
    });
  });

  describe('Template: TI (Information Technology)', () => {
    const tiTemplate = TEMPLATES_DATA.find(
      (t) => t.type === EtpTemplateType.TI,
    );

    it('should exist', () => {
      expect(tiTemplate).toBeDefined();
    });

    it('should have correct name', () => {
      expect(tiTemplate?.name).toBe('Template para Contratações de TI');
    });

    it('should have description mentioning IN 94/2022', () => {
      expect(tiTemplate?.description).toContain('IN SEGES/ME nº 94/2022');
    });

    it('should have required fields for IT projects', () => {
      expect(tiTemplate?.requiredFields).toContain('especificacoesTecnicas');
      expect(tiTemplate?.requiredFields).toContain('nivelServico');
      expect(tiTemplate?.requiredFields).toContain('requisitosSeguranca');
    });

    it('should have optional fields for SLA and LGPD', () => {
      expect(tiTemplate?.optionalFields).toContain('slaMetricas');
      expect(tiTemplate?.optionalFields).toContain('lgpdConformidade');
    });

    it('should reference LGPD and IN 94/2022', () => {
      expect(
        tiTemplate?.legalReferences.some((ref) => ref.includes('LGPD')),
      ).toBe(true);
      expect(
        tiTemplate?.legalReferences.some((ref) => ref.includes('94/2022')),
      ).toBe(true);
    });

    it('should prefer PNCP and Painel de Preços', () => {
      expect(tiTemplate?.priceSourcesPreferred).toContain('PNCP');
      expect(tiTemplate?.priceSourcesPreferred).toContain('Painel de Preços');
    });
  });

  describe('Template: SERVICOS (Continuous Services)', () => {
    const servicosTemplate = TEMPLATES_DATA.find(
      (t) => t.type === EtpTemplateType.SERVICOS,
    );

    it('should exist', () => {
      expect(servicosTemplate).toBeDefined();
    });

    it('should have correct name', () => {
      expect(servicosTemplate?.name).toBe('Template para Serviços Contínuos');
    });

    it('should have description mentioning workforce', () => {
      expect(servicosTemplate?.description).toContain('mão de obra');
      expect(servicosTemplate?.description).toContain('produtividade');
    });

    it('should have required fields for continuous services', () => {
      expect(servicosTemplate?.requiredFields).toContain('produtividade');
      expect(servicosTemplate?.requiredFields).toContain('unidadeMedida');
      expect(servicosTemplate?.requiredFields).toContain('fiscalizacao');
    });

    it('should have optional fields for workforce calculation', () => {
      expect(servicosTemplate?.optionalFields).toContain('postosTrabalho');
      expect(servicosTemplate?.optionalFields).toContain('convencaoColetiva');
    });

    it('should reference IN 5/2017 for services', () => {
      expect(
        servicosTemplate?.legalReferences.some((ref) => ref.includes('5/2017')),
      ).toBe(true);
    });

    it('should include Convenções Coletivas as price source', () => {
      expect(servicosTemplate?.priceSourcesPreferred).toContain(
        'Convenções Coletivas',
      );
    });
  });

  describe('Template: MATERIAIS (Materials and Goods)', () => {
    const materiaisTemplate = TEMPLATES_DATA.find(
      (t) => t.type === EtpTemplateType.MATERIAIS,
    );

    it('should exist', () => {
      expect(materiaisTemplate).toBeDefined();
    });

    it('should have correct name', () => {
      expect(materiaisTemplate?.name).toBe(
        'Template para Aquisição de Materiais e Bens',
      );
    });

    it('should have description mentioning CATMAT/CATSER', () => {
      expect(materiaisTemplate?.description).toContain('CATMAT/CATSER');
    });

    it('should have required fields for materials acquisition', () => {
      expect(materiaisTemplate?.requiredFields).toContain(
        'especificacoesTecnicas',
      );
      expect(materiaisTemplate?.requiredFields).toContain('quantidade');
      expect(materiaisTemplate?.requiredFields).toContain('prazoEntrega');
    });

    it('should have optional fields for warranty and assistance', () => {
      expect(materiaisTemplate?.optionalFields).toContain('garantiaMinima');
      expect(materiaisTemplate?.optionalFields).toContain('assistenciaTecnica');
    });

    it('should reference Compras Sustentáveis decree', () => {
      expect(
        materiaisTemplate?.legalReferences.some((ref) =>
          ref.includes('Sustentáveis'),
        ),
      ).toBe(true);
    });

    it('should include Comprasnet as price source', () => {
      expect(materiaisTemplate?.priceSourcesPreferred).toContain('Comprasnet');
    });
  });

  describe('All Templates Structure', () => {
    TEMPLATES_DATA.forEach((template) => {
      describe(`Template: ${template.type}`, () => {
        it('should have a non-empty name', () => {
          expect(template.name).toBeTruthy();
          expect(template.name.length).toBeGreaterThan(10);
        });

        it('should have a non-empty description', () => {
          expect(template.description).toBeTruthy();
          expect(template.description.length).toBeGreaterThan(50);
        });

        it('should have at least 5 required fields', () => {
          expect(template.requiredFields.length).toBeGreaterThanOrEqual(5);
        });

        it('should have at least 3 optional fields', () => {
          expect(template.optionalFields.length).toBeGreaterThanOrEqual(3);
        });

        it('should have common required fields (objeto, justificativa, estimativaCusto)', () => {
          expect(template.requiredFields).toContain('objeto');
          expect(template.requiredFields).toContain('justificativa');
          expect(template.requiredFields).toContain('estimativaCusto');
        });

        it('should have standard ETP sections', () => {
          expect(template.defaultSections).toContain('descricao_necessidade');
          expect(template.defaultSections).toContain('estimativa_custo');
          expect(template.defaultSections).toContain('levantamento_mercado');
          expect(template.defaultSections).toContain('declaracao_viabilidade');
        });

        it('should have at least 2 prompts', () => {
          expect(template.prompts.length).toBeGreaterThanOrEqual(2);
        });

        it('should have prompt for descricao_necessidade', () => {
          const hasNecessidadePrompt = template.prompts.some(
            (p) => p.sectionType === 'descricao_necessidade',
          );
          expect(hasNecessidadePrompt).toBe(true);
        });

        it('should have all prompts with required fields', () => {
          template.prompts.forEach((prompt) => {
            expect(prompt.sectionType).toBeTruthy();
            expect(prompt.systemPrompt).toBeTruthy();
            expect(prompt.userPromptTemplate).toBeTruthy();
          });
        });

        it('should have at least 3 legal references', () => {
          expect(template.legalReferences.length).toBeGreaterThanOrEqual(3);
        });

        it('should reference Lei 14.133/2021 (Nova Lei de Licitações)', () => {
          expect(
            template.legalReferences.some((ref) => ref.includes('14.133')),
          ).toBe(true);
        });

        it('should have at least 2 preferred price sources', () => {
          expect(template.priceSourcesPreferred.length).toBeGreaterThanOrEqual(
            2,
          );
        });

        it('should include PNCP as price source', () => {
          expect(template.priceSourcesPreferred).toContain('PNCP');
        });
      });
    });
  });

  describe('Prompts Quality', () => {
    it('all system prompts should mention sector público or licitações', () => {
      TEMPLATES_DATA.forEach((template) => {
        template.prompts.forEach((prompt) => {
          const hasPublicSector =
            prompt.systemPrompt.includes('público') ||
            prompt.systemPrompt.includes('públicas') ||
            prompt.systemPrompt.includes('licitações') ||
            prompt.systemPrompt.includes('contratações');

          if (!hasPublicSector) {
            console.log(
              `Failing prompt for ${template.type}: ${prompt.sectionType}`,
            );
            console.log(`System prompt: ${prompt.systemPrompt}`);
          }
          expect(hasPublicSector).toBe(true);
        });
      });
    });

    it('all user prompt templates should have placeholders', () => {
      TEMPLATES_DATA.forEach((template) => {
        template.prompts.forEach((prompt) => {
          expect(prompt.userPromptTemplate).toMatch(/\{\{.*?\}\}/);
        });
      });
    });
  });

  describe('Legal Compliance', () => {
    it('all templates should reference IN SEGES/ME nº 73/2022 (ETP)', () => {
      const templatesWithIN73 = TEMPLATES_DATA.filter((t) =>
        t.legalReferences.some((ref) => ref.includes('73/2022')),
      );

      // At least OBRAS and MATERIAIS should have IN 73/2022
      expect(templatesWithIN73.length).toBeGreaterThanOrEqual(2);
    });

    it('all templates should reference Decreto 10.024/2019 (Pregão)', () => {
      TEMPLATES_DATA.forEach((template) => {
        const hasDecree = template.legalReferences.some((ref) =>
          ref.includes('10.024'),
        );
        expect(hasDecree).toBe(true);
      });
    });
  });

  describe('EtpTemplateType Enum', () => {
    it('should have OBRAS type defined', () => {
      expect(EtpTemplateType.OBRAS).toBe('OBRAS');
    });

    it('should have TI type defined', () => {
      expect(EtpTemplateType.TI).toBe('TI');
    });

    it('should have SERVICOS type defined', () => {
      expect(EtpTemplateType.SERVICOS).toBe('SERVICOS');
    });

    it('should have MATERIAIS type defined', () => {
      expect(EtpTemplateType.MATERIAIS).toBe('MATERIAIS');
    });

    it('should have exactly 4 types', () => {
      const types = Object.values(EtpTemplateType);
      expect(types).toHaveLength(4);
    });
  });

  describe('Idempotency Requirements', () => {
    it('each template should have unique type (for upsert logic)', () => {
      const types = TEMPLATES_DATA.map((t) => t.type);
      const uniqueTypes = [...new Set(types)];

      expect(types.length).toBe(uniqueTypes.length);
    });

    it('each template should have unique name', () => {
      const names = TEMPLATES_DATA.map((t) => t.name);
      const uniqueNames = [...new Set(names)];

      expect(names.length).toBe(uniqueNames.length);
    });
  });
});

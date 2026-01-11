import { TrTemplateType } from '../entities/termo-referencia-template.entity';
import { TR_TEMPLATES_DATA } from './seed-tr-templates';

/**
 * Tests for seed-tr-templates.ts script.
 *
 * Note: These tests validate the seed script logic without requiring a database connection.
 * Integration tests would require a test database setup.
 *
 * @see Issue #1250 - [TR-c] Criar templates de TR por categoria
 */

describe('Seed TR Templates Script', () => {
  describe('Templates Data Configuration', () => {
    it('should have exactly 4 templates', () => {
      expect(TR_TEMPLATES_DATA).toHaveLength(4);
    });

    it('should have one template for each type', () => {
      const types = TR_TEMPLATES_DATA.map((t) => t.type);

      expect(types).toContain(TrTemplateType.OBRAS);
      expect(types).toContain(TrTemplateType.TI);
      expect(types).toContain(TrTemplateType.SERVICOS);
      expect(types).toContain(TrTemplateType.MATERIAIS);
    });

    it('should have unique types (no duplicates)', () => {
      const types = TR_TEMPLATES_DATA.map((t) => t.type);
      const uniqueTypes = [...new Set(types)];

      expect(types.length).toBe(uniqueTypes.length);
    });
  });

  describe('Template: OBRAS (Engineering)', () => {
    const obrasTemplate = TR_TEMPLATES_DATA.find(
      (t) => t.type === TrTemplateType.OBRAS,
    );

    it('should exist', () => {
      expect(obrasTemplate).toBeDefined();
    });

    it('should have correct name', () => {
      expect(obrasTemplate?.name).toBe(
        'Template de TR para Obras de Engenharia',
      );
    });

    it('should have description mentioning key characteristics', () => {
      expect(obrasTemplate?.description).toContain('engenharia');
      expect(obrasTemplate?.description).toContain('ART/RRT');
      expect(obrasTemplate?.description).toContain('SINAPI');
    });

    it('should have required specific fields for engineering projects', () => {
      const fieldNames = obrasTemplate?.specificFields.map((f) => f.name);

      expect(fieldNames).toContain('artRrt');
      expect(fieldNames).toContain('memorialDescritivo');
      expect(fieldNames).toContain('cronogramaFisicoFinanceiro');
      expect(fieldNames).toContain('bdiReferencia');
    });

    it('should have fontePrecosReferencia field with SINAPI and SICRO options', () => {
      const fontePrecos = obrasTemplate?.specificFields.find(
        (f) => f.name === 'fontePrecosReferencia',
      );

      expect(fontePrecos).toBeDefined();
      expect(fontePrecos?.options).toContain('SINAPI');
      expect(fontePrecos?.options).toContain('SICRO');
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

      expect(sectionTypes).toContain('memorial_descritivo');
      expect(sectionTypes).toContain('cronograma_execucao');
      expect(sectionTypes).toContain('requisitos_contratacao');
    });

    it('should have default texts for all mandatory TR sections', () => {
      expect(obrasTemplate?.defaultFundamentacaoLegal).toBeTruthy();
      expect(obrasTemplate?.defaultModeloExecucao).toBeTruthy();
      expect(obrasTemplate?.defaultModeloGestao).toBeTruthy();
      expect(obrasTemplate?.defaultCriteriosSelecao).toBeTruthy();
      expect(obrasTemplate?.defaultObrigacoesContratante).toBeTruthy();
      expect(obrasTemplate?.defaultObrigacoesContratada).toBeTruthy();
      expect(obrasTemplate?.defaultSancoesPenalidades).toBeTruthy();
    });
  });

  describe('Template: TI (Information Technology)', () => {
    const tiTemplate = TR_TEMPLATES_DATA.find(
      (t) => t.type === TrTemplateType.TI,
    );

    it('should exist', () => {
      expect(tiTemplate).toBeDefined();
    });

    it('should have correct name', () => {
      expect(tiTemplate?.name).toBe('Template de TR para Contratacoes de TI');
    });

    it('should have description mentioning IN 94/2022', () => {
      expect(tiTemplate?.description).toContain('IN SEGES/ME n 94/2022');
    });

    it('should have required specific fields for IT projects', () => {
      const fieldNames = tiTemplate?.specificFields.map((f) => f.name);

      expect(fieldNames).toContain('nivelServico');
      expect(fieldNames).toContain('metodologiaTrabalho');
      expect(fieldNames).toContain('requisitosSeguranca');
    });

    it('should have metodologiaTrabalho field with methodology options', () => {
      const metodologia = tiTemplate?.specificFields.find(
        (f) => f.name === 'metodologiaTrabalho',
      );

      expect(metodologia?.options).toContain('Agile/Scrum');
      expect(metodologia?.options).toContain('DevOps');
    });

    it('should reference LGPD and IN 94/2022', () => {
      expect(
        tiTemplate?.legalReferences.some((ref) => ref.includes('LGPD')),
      ).toBe(true);
      expect(
        tiTemplate?.legalReferences.some((ref) => ref.includes('94/2022')),
      ).toBe(true);
    });

    it('should have prompts for IT-specific sections', () => {
      const sectionTypes = tiTemplate?.prompts.map((p) => p.sectionType);

      expect(sectionTypes).toContain('especificacoes_tecnicas');
      expect(sectionTypes).toContain('nivel_servico');
      expect(sectionTypes).toContain('seguranca_informacao');
    });

    it('should have default texts mentioning SLA penalties', () => {
      expect(tiTemplate?.defaultSancoesPenalidades).toContain('SLA');
      expect(tiTemplate?.defaultSancoesPenalidades).toContain('glosa');
    });
  });

  describe('Template: SERVICOS (Continuous Services)', () => {
    const servicosTemplate = TR_TEMPLATES_DATA.find(
      (t) => t.type === TrTemplateType.SERVICOS,
    );

    it('should exist', () => {
      expect(servicosTemplate).toBeDefined();
    });

    it('should have correct name', () => {
      expect(servicosTemplate?.name).toBe(
        'Template de TR para Servicos Continuos',
      );
    });

    it('should have description mentioning workforce', () => {
      expect(servicosTemplate?.description).toContain('mao de obra');
      expect(servicosTemplate?.description).toContain('produtividade');
    });

    it('should have required specific fields for continuous services', () => {
      const fieldNames = servicosTemplate?.specificFields.map((f) => f.name);

      expect(fieldNames).toContain('produtividade');
      expect(fieldNames).toContain('postosTrabalho');
      expect(fieldNames).toContain('convencaoColetiva');
    });

    it('should have frequenciaServico field with frequency options', () => {
      const frequencia = servicosTemplate?.specificFields.find(
        (f) => f.name === 'frequenciaServico',
      );

      expect(frequencia?.options).toContain('Diario');
      expect(frequencia?.options).toContain('Semanal');
      expect(frequencia?.options).toContain('Sob Demanda');
    });

    it('should reference IN 5/2017 for services', () => {
      expect(
        servicosTemplate?.legalReferences.some((ref) => ref.includes('5/2017')),
      ).toBe(true);
    });

    it('should have prompts for service-specific sections', () => {
      const sectionTypes = servicosTemplate?.prompts.map((p) => p.sectionType);

      expect(sectionTypes).toContain('produtividade');
      expect(sectionTypes).toContain('dimensionamento');
      expect(sectionTypes).toContain('repactuacao');
    });

    it('should have default sections including transicao_contratual and repactuacao', () => {
      expect(servicosTemplate?.defaultSections).toContain(
        'transicao_contratual',
      );
      expect(servicosTemplate?.defaultSections).toContain('repactuacao');
    });
  });

  describe('Template: MATERIAIS (Materials and Goods)', () => {
    const materiaisTemplate = TR_TEMPLATES_DATA.find(
      (t) => t.type === TrTemplateType.MATERIAIS,
    );

    it('should exist', () => {
      expect(materiaisTemplate).toBeDefined();
    });

    it('should have correct name', () => {
      expect(materiaisTemplate?.name).toBe(
        'Template de TR para Aquisicao de Materiais e Bens',
      );
    });

    it('should have description mentioning CATMAT/CATSER', () => {
      expect(materiaisTemplate?.description).toContain('CATMAT/CATSER');
    });

    it('should have required specific fields for materials acquisition', () => {
      const fieldNames = materiaisTemplate?.specificFields.map((f) => f.name);

      expect(fieldNames).toContain('especificacoesTecnicas');
      expect(fieldNames).toContain('unidadeFornecimento');
      expect(fieldNames).toContain('prazoEntrega');
      expect(fieldNames).toContain('garantiaMinima');
    });

    it('should have prazoEntrega with default value of 30', () => {
      const prazoEntrega = materiaisTemplate?.specificFields.find(
        (f) => f.name === 'prazoEntrega',
      );

      expect(prazoEntrega?.defaultValue).toBe(30);
    });

    it('should reference Compras Sustentaveis decree', () => {
      expect(
        materiaisTemplate?.legalReferences.some((ref) =>
          ref.includes('Sustentaveis'),
        ),
      ).toBe(true);
    });

    it('should have prompts for materials-specific sections', () => {
      const sectionTypes = materiaisTemplate?.prompts.map((p) => p.sectionType);

      expect(sectionTypes).toContain('especificacoes_tecnicas');
      expect(sectionTypes).toContain('garantia');
      expect(sectionTypes).toContain('local_entrega');
    });

    it('should have criterios_selecao mentioning menor preco por item', () => {
      expect(materiaisTemplate?.defaultCriteriosSelecao).toContain(
        'Menor preco por item',
      );
    });
  });

  describe('All Templates Structure', () => {
    TR_TEMPLATES_DATA.forEach((template) => {
      describe(`Template: ${template.type}`, () => {
        it('should have a non-empty name', () => {
          expect(template.name).toBeTruthy();
          expect(template.name.length).toBeGreaterThan(10);
        });

        it('should have a non-empty description', () => {
          expect(template.description).toBeTruthy();
          expect(template.description.length).toBeGreaterThan(50);
        });

        it('should have at least 5 specific fields', () => {
          expect(template.specificFields.length).toBeGreaterThanOrEqual(5);
        });

        it('should have at least 1 required specific field', () => {
          const requiredFields = template.specificFields.filter(
            (f) => f.required,
          );
          expect(requiredFields.length).toBeGreaterThanOrEqual(1);
        });

        it('should have common default sections (objeto, fundamentacao_legal)', () => {
          expect(template.defaultSections).toContain('objeto');
          expect(template.defaultSections).toContain('fundamentacao_legal');
        });

        it('should have standard TR sections', () => {
          expect(template.defaultSections).toContain('modelo_execucao');
          expect(template.defaultSections).toContain('modelo_gestao');
          expect(template.defaultSections).toContain('criterios_selecao');
          expect(template.defaultSections).toContain('obrigacoes_contratante');
          expect(template.defaultSections).toContain('obrigacoes_contratada');
          expect(template.defaultSections).toContain('sancoes_penalidades');
        });

        it('should have at least 2 prompts', () => {
          expect(template.prompts.length).toBeGreaterThanOrEqual(2);
        });

        it('should have all prompts with required fields', () => {
          template.prompts.forEach((prompt) => {
            expect(prompt.sectionType).toBeTruthy();
            expect(prompt.systemPrompt).toBeTruthy();
            expect(prompt.userPromptTemplate).toBeTruthy();
          });
        });

        it('should have at least 5 legal references', () => {
          expect(template.legalReferences.length).toBeGreaterThanOrEqual(5);
        });

        it('should reference Lei 14.133/2021 (Nova Lei de Licitacoes)', () => {
          expect(
            template.legalReferences.some((ref) => ref.includes('14.133')),
          ).toBe(true);
        });

        it('should have non-empty default texts for all TR sections', () => {
          expect(template.defaultFundamentacaoLegal.length).toBeGreaterThan(50);
          expect(template.defaultModeloExecucao.length).toBeGreaterThan(50);
          expect(template.defaultModeloGestao.length).toBeGreaterThan(50);
          expect(template.defaultCriteriosSelecao.length).toBeGreaterThan(50);
          expect(template.defaultObrigacoesContratante.length).toBeGreaterThan(
            50,
          );
          expect(template.defaultObrigacoesContratada.length).toBeGreaterThan(
            50,
          );
          expect(template.defaultSancoesPenalidades.length).toBeGreaterThan(50);
        });
      });
    });
  });

  describe('Specific Fields Structure', () => {
    TR_TEMPLATES_DATA.forEach((template) => {
      describe(`Template ${template.type} specific fields`, () => {
        it('should have valid field types', () => {
          const validTypes = ['text', 'textarea', 'number', 'select'];
          template.specificFields.forEach((field) => {
            expect(validTypes).toContain(field.type);
          });
        });

        it('should have options only for select type fields', () => {
          template.specificFields.forEach((field) => {
            if (field.type === 'select') {
              expect(field.options).toBeDefined();
              expect(field.options!.length).toBeGreaterThan(0);
            }
          });
        });

        it('should have all required field properties', () => {
          template.specificFields.forEach((field) => {
            expect(field.name).toBeTruthy();
            expect(field.label).toBeTruthy();
            expect(field.type).toBeTruthy();
            expect(typeof field.required).toBe('boolean');
          });
        });
      });
    });
  });

  describe('Prompts Quality', () => {
    it('all system prompts should mention public sector context', () => {
      TR_TEMPLATES_DATA.forEach((template) => {
        template.prompts.forEach((prompt) => {
          const hasPublicSector =
            prompt.systemPrompt.includes('publico') ||
            prompt.systemPrompt.includes('publicas') ||
            prompt.systemPrompt.includes('licitacoes') ||
            prompt.systemPrompt.includes('contratacoes');

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
      TR_TEMPLATES_DATA.forEach((template) => {
        template.prompts.forEach((prompt) => {
          expect(prompt.userPromptTemplate).toMatch(/\{\{.*?\}\}/);
        });
      });
    });
  });

  describe('Legal Compliance', () => {
    it('all templates should reference Decreto 10.024/2019 (Pregao)', () => {
      TR_TEMPLATES_DATA.forEach((template) => {
        const hasDecree = template.legalReferences.some((ref) =>
          ref.includes('10.024'),
        );
        expect(hasDecree).toBe(true);
      });
    });

    it('default fundamentacao legal should mention Lei 14.133', () => {
      TR_TEMPLATES_DATA.forEach((template) => {
        expect(template.defaultFundamentacaoLegal).toContain('14.133');
      });
    });

    it('default sancoes should reference art. 155 da Lei 14.133', () => {
      TR_TEMPLATES_DATA.forEach((template) => {
        expect(template.defaultSancoesPenalidades).toContain('155');
        expect(template.defaultSancoesPenalidades).toContain('14.133');
      });
    });
  });

  describe('TrTemplateType Enum', () => {
    it('should have OBRAS type defined', () => {
      expect(TrTemplateType.OBRAS).toBe('OBRAS');
    });

    it('should have TI type defined', () => {
      expect(TrTemplateType.TI).toBe('TI');
    });

    it('should have SERVICOS type defined', () => {
      expect(TrTemplateType.SERVICOS).toBe('SERVICOS');
    });

    it('should have MATERIAIS type defined', () => {
      expect(TrTemplateType.MATERIAIS).toBe('MATERIAIS');
    });

    it('should have exactly 4 types', () => {
      const types = Object.values(TrTemplateType);
      expect(types).toHaveLength(4);
    });
  });

  describe('Idempotency Requirements', () => {
    it('each template should have unique type (for upsert logic)', () => {
      const types = TR_TEMPLATES_DATA.map((t) => t.type);
      const uniqueTypes = [...new Set(types)];

      expect(types.length).toBe(uniqueTypes.length);
    });

    it('each template should have unique name', () => {
      const names = TR_TEMPLATES_DATA.map((t) => t.name);
      const uniqueNames = [...new Set(names)];

      expect(names.length).toBe(uniqueNames.length);
    });
  });

  describe('Default Sections Consistency', () => {
    it('all templates should have at least 14 default sections', () => {
      TR_TEMPLATES_DATA.forEach((template) => {
        expect(template.defaultSections.length).toBeGreaterThanOrEqual(14);
      });
    });

    it('all templates should have valor_estimado and dotacao_orcamentaria', () => {
      TR_TEMPLATES_DATA.forEach((template) => {
        expect(template.defaultSections).toContain('valor_estimado');
        expect(template.defaultSections).toContain('dotacao_orcamentaria');
      });
    });
  });
});

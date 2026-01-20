import {
  EditalTemplate,
  EditalTemplateModalidade,
  EditalTemplateSecao,
  EditalTemplateClausula,
  EditalTemplateField,
} from './edital-template.entity';

describe('EditalTemplate Entity', () => {
  describe('Entity Structure', () => {
    it('should create an EditalTemplate with required fields', () => {
      const template = new EditalTemplate();
      template.id = '123e4567-e89b-12d3-a456-426614174000';
      template.name = 'Template de Pregão Eletrônico';
      template.modalidade = EditalTemplateModalidade.PREGAO;
      template.description =
        'Template para pregão eletrônico - modalidade mais comum';
      template.secoes = [];
      template.clausulas = [];
      template.specificFields = [];
      template.legalReferences = ['Lei 14.133/2021'];

      expect(template.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(template.name).toBe('Template de Pregão Eletrônico');
      expect(template.modalidade).toBe(EditalTemplateModalidade.PREGAO);
      expect(template.description).toContain('pregão eletrônico');
    });

    it('should support EditalTemplateModalidade enum with all modalities', () => {
      expect(EditalTemplateModalidade.PREGAO).toBe('PREGAO');
      expect(EditalTemplateModalidade.CONCORRENCIA).toBe('CONCORRENCIA');
      expect(EditalTemplateModalidade.DISPENSA).toBe('DISPENSA');
      expect(EditalTemplateModalidade.INEXIGIBILIDADE).toBe('INEXIGIBILIDADE');
    });

    it('should allow setting modalidade property', () => {
      const template = new EditalTemplate();
      template.modalidade = EditalTemplateModalidade.CONCORRENCIA;

      expect(template.modalidade).toBe(EditalTemplateModalidade.CONCORRENCIA);
    });
  });

  describe('Sections (Secoes)', () => {
    it('should store structured sections with ordem', () => {
      const template = new EditalTemplate();
      const secoes: EditalTemplateSecao[] = [
        {
          id: 'preambulo',
          nome: 'Preâmbulo',
          ordem: 1,
          textoModelo: 'O {{orgao}} torna público...',
          obrigatoria: true,
          referenciaLegal: 'Lei 14.133/2021 Art. 25',
        },
        {
          id: 'objeto',
          nome: 'Do Objeto',
          ordem: 2,
          textoModelo: 'Contratação de {{objetoDetalhado}}...',
          obrigatoria: true,
          referenciaLegal: 'Lei 14.133/2021 Art. 25, I',
        },
      ];

      template.secoes = secoes;

      expect(template.secoes).toHaveLength(2);
      expect(template.secoes[0].id).toBe('preambulo');
      expect(template.secoes[0].ordem).toBe(1);
      expect(template.secoes[0].obrigatoria).toBe(true);
      expect(template.secoes[1].id).toBe('objeto');
      expect(template.secoes[1].ordem).toBe(2);
    });

    it('should support sections with placeholders', () => {
      const secao: EditalTemplateSecao = {
        id: 'objeto',
        nome: 'Do Objeto',
        ordem: 1,
        textoModelo:
          'Contratação de {{objetoDetalhado}} no valor de R$ {{valorEstimado}}',
        obrigatoria: true,
      };

      expect(secao.textoModelo).toContain('{{objetoDetalhado}}');
      expect(secao.textoModelo).toContain('{{valorEstimado}}');
    });

    it('should mark mandatory sections', () => {
      const secaoObrigatoria: EditalTemplateSecao = {
        id: 'objeto',
        nome: 'Do Objeto',
        ordem: 1,
        textoModelo: 'Contratação de...',
        obrigatoria: true,
        referenciaLegal: 'Lei 14.133/2021 Art. 25, I',
      };

      const secaoOpcional: EditalTemplateSecao = {
        id: 'anexos',
        nome: 'Dos Anexos',
        ordem: 10,
        textoModelo: 'Anexos opcionais...',
        obrigatoria: false,
      };

      expect(secaoObrigatoria.obrigatoria).toBe(true);
      expect(secaoObrigatoria.referenciaLegal).toBeDefined();
      expect(secaoOpcional.obrigatoria).toBe(false);
    });
  });

  describe('Clauses (Clausulas)', () => {
    it('should store structured clauses with categoria', () => {
      const template = new EditalTemplate();
      const clausulas: EditalTemplateClausula[] = [
        {
          id: 'prazo_vigencia',
          titulo: 'Do Prazo de Vigência',
          textoModelo: 'O contrato terá vigência de {{prazoVigencia}} dias...',
          obrigatoria: true,
          referenciaLegal: 'Lei 14.133/2021 Art. 25, VII',
          categoria: 'prazo',
        },
        {
          id: 'valor_estimado',
          titulo: 'Do Valor Estimado',
          textoModelo: 'O valor estimado é de R$ {{valorEstimado}}...',
          obrigatoria: true,
          referenciaLegal: 'Lei 14.133/2021 Art. 25, IX',
          categoria: 'valor',
        },
      ];

      template.clausulas = clausulas;

      expect(template.clausulas).toHaveLength(2);
      expect(template.clausulas[0].id).toBe('prazo_vigencia');
      expect(template.clausulas[0].categoria).toBe('prazo');
      expect(template.clausulas[1].id).toBe('valor_estimado');
      expect(template.clausulas[1].categoria).toBe('valor');
    });

    it('should support clauses with placeholders', () => {
      const clausula: EditalTemplateClausula = {
        id: 'forma_pagamento',
        titulo: 'Da Forma de Pagamento',
        textoModelo:
          'O pagamento será efetuado em {{prazoPagamento}} dias úteis...',
        obrigatoria: true,
        referenciaLegal: 'Lei 14.133/2021 Art. 137',
        categoria: 'pagamento',
      };

      expect(clausula.textoModelo).toContain('{{prazoPagamento}}');
      expect(clausula.categoria).toBe('pagamento');
    });

    it('should categorize clauses by type', () => {
      const clausulas: EditalTemplateClausula[] = [
        {
          id: '1',
          titulo: 'Prazo',
          textoModelo: '...',
          obrigatoria: true,
          categoria: 'prazo',
        },
        {
          id: '2',
          titulo: 'Valor',
          textoModelo: '...',
          obrigatoria: true,
          categoria: 'valor',
        },
        {
          id: '3',
          titulo: 'Garantia',
          textoModelo: '...',
          obrigatoria: false,
          categoria: 'garantia',
        },
      ];

      const prazoClausulas = clausulas.filter((c) => c.categoria === 'prazo');
      const valorClausulas = clausulas.filter((c) => c.categoria === 'valor');
      const garantiaClausulas = clausulas.filter(
        (c) => c.categoria === 'garantia',
      );

      expect(prazoClausulas).toHaveLength(1);
      expect(valorClausulas).toHaveLength(1);
      expect(garantiaClausulas).toHaveLength(1);
    });
  });

  describe('Specific Fields', () => {
    it('should define dynamic fields with types and validations', () => {
      const template = new EditalTemplate();
      const fields: EditalTemplateField[] = [
        {
          name: 'uasg',
          label: 'UASG',
          type: 'text',
          required: true,
          placeholder: 'Código UASG de 6 dígitos',
        },
        {
          name: 'sistemaEletronico',
          label: 'Sistema Eletrônico',
          type: 'select',
          required: true,
          options: ['Comprasnet', 'Licitações-e', 'Portal Compras Públicas'],
          defaultValue: 'Comprasnet',
        },
        {
          name: 'exclusividadeMeEpp',
          label: 'Exclusivo para ME/EPP',
          type: 'boolean',
          required: false,
          defaultValue: false,
        },
      ];

      template.specificFields = fields;

      expect(template.specificFields).toHaveLength(3);
      expect(template.specificFields[0].type).toBe('text');
      expect(template.specificFields[1].type).toBe('select');
      expect(template.specificFields[1].options).toHaveLength(3);
      expect(template.specificFields[2].type).toBe('boolean');
      expect(template.specificFields[2].defaultValue).toBe(false);
    });

    it('should support different field types', () => {
      const textField: EditalTemplateField = {
        name: 'numero',
        label: 'Número do Edital',
        type: 'text',
        required: true,
      };

      const selectField: EditalTemplateField = {
        name: 'modalidade',
        label: 'Modalidade',
        type: 'select',
        required: true,
        options: ['Pregão', 'Concorrência'],
      };

      const numberField: EditalTemplateField = {
        name: 'percentualGarantia',
        label: 'Garantia (%)',
        type: 'number',
        required: true,
        defaultValue: 5,
      };

      const booleanField: EditalTemplateField = {
        name: 'sigiloOrcamento',
        label: 'Sigilo Orçamentário',
        type: 'boolean',
        required: false,
        defaultValue: false,
      };

      expect(textField.type).toBe('text');
      expect(selectField.type).toBe('select');
      expect(selectField.options).toBeDefined();
      expect(numberField.type).toBe('number');
      expect(numberField.defaultValue).toBe(5);
      expect(booleanField.type).toBe('boolean');
      expect(booleanField.defaultValue).toBe(false);
    });
  });

  describe('Legal References', () => {
    it('should store multiple legal references', () => {
      const template = new EditalTemplate();
      template.legalReferences = [
        'Lei nº 14.133/2021 - Nova Lei de Licitações',
        'Lei Complementar nº 123/2006 - Estatuto da ME/EPP',
        'IN SEGES/ME nº 65/2021 - Pesquisa de Preços',
      ];

      expect(template.legalReferences).toHaveLength(3);
      expect(template.legalReferences[0]).toContain('Lei nº 14.133/2021');
      expect(template.legalReferences[1]).toContain('LC 123/2006');
      expect(template.legalReferences[2]).toContain('IN SEGES/ME');
    });
  });

  describe('Default Texts', () => {
    it('should provide default texts for common sections', () => {
      const template = new EditalTemplate();
      template.defaultPreambulo =
        'O {{orgao}}, CNPJ {{cnpjOrgao}}, torna público que realizará licitação...';
      template.defaultFundamentacaoLegal =
        'A presente licitação fundamenta-se na Lei nº 14.133/2021...';
      template.defaultCondicoesParticipacao =
        'Poderão participar pessoas jurídicas que explorem ramo compatível...';
      template.defaultRequisitosHabilitacao =
        'A habilitação será verificada mediante documentos de regularidade fiscal...';

      expect(template.defaultPreambulo).toContain('{{orgao}}');
      expect(template.defaultFundamentacaoLegal).toContain(
        'Lei nº 14.133/2021',
      );
      expect(template.defaultCondicoesParticipacao).toBeDefined();
      expect(template.defaultRequisitosHabilitacao).toBeDefined();
    });

    it('should provide default texts for contract clauses', () => {
      const template = new EditalTemplate();
      template.defaultSancoesAdministrativas =
        'Pela inexecução total ou parcial, a Administração aplicará as sanções previstas...';
      template.defaultCondicoesPagamento =
        'O pagamento será efetuado em até 30 dias úteis...';
      template.defaultGarantiaContratual =
        'Será exigida garantia de 5% do valor contratado...';
      template.defaultReajusteContratual =
        'Os preços serão reajustados anualmente pelo índice IPCA...';

      expect(template.defaultSancoesAdministrativas).toContain('sanções');
      expect(template.defaultCondicoesPagamento).toContain('30 dias');
      expect(template.defaultGarantiaContratual).toContain('5%');
      expect(template.defaultReajusteContratual).toContain('IPCA');
    });
  });

  describe('Instructions and Metadata', () => {
    it('should provide usage instructions', () => {
      const template = new EditalTemplate();
      template.instructions =
        'Este template é recomendado para contratações de bens e serviços comuns. ' +
        'Certifique-se de anexar Termo de Referência e pesquisa de preços.';

      expect(template.instructions).toContain('recomendado');
      expect(template.instructions).toContain('Termo de Referência');
    });

    it('should support active/inactive status', () => {
      const template = new EditalTemplate();
      template.isActive = true;

      expect(template.isActive).toBe(true);

      template.isActive = false;
      expect(template.isActive).toBe(false);
    });

    it('should support version control', () => {
      const template = new EditalTemplate();
      template.version = 1;

      expect(template.version).toBe(1);

      // Increment version on update
      template.version = 2;
      expect(template.version).toBe(2);
    });
  });

  describe('Modality-Specific Templates', () => {
    it('should create PREGAO template', () => {
      const template = new EditalTemplate();
      template.name = 'Template de Pregão Eletrônico';
      template.modalidade = EditalTemplateModalidade.PREGAO;
      template.description =
        'Modalidade mais comum para bens e serviços comuns';

      expect(template.modalidade).toBe(EditalTemplateModalidade.PREGAO);
      expect(template.description).toContain('bens e serviços comuns');
    });

    it('should create CONCORRENCIA template', () => {
      const template = new EditalTemplate();
      template.name = 'Template de Concorrência';
      template.modalidade = EditalTemplateModalidade.CONCORRENCIA;
      template.description = 'Para grandes contratações e obras de engenharia';

      expect(template.modalidade).toBe(EditalTemplateModalidade.CONCORRENCIA);
      expect(template.description).toContain('obras de engenharia');
    });

    it('should create DISPENSA template', () => {
      const template = new EditalTemplate();
      template.name = 'Template de Dispensa de Licitação';
      template.modalidade = EditalTemplateModalidade.DISPENSA;
      template.description =
        'Para contratações diretas com dispensa (Arts. 75-81)';

      expect(template.modalidade).toBe(EditalTemplateModalidade.DISPENSA);
      expect(template.description).toContain('dispensa');
    });

    it('should create INEXIGIBILIDADE template', () => {
      const template = new EditalTemplate();
      template.name = 'Template de Inexigibilidade de Licitação';
      template.modalidade = EditalTemplateModalidade.INEXIGIBILIDADE;
      template.description =
        'Para contratações diretas com inviabilidade de competição (Art. 74)';

      expect(template.modalidade).toBe(
        EditalTemplateModalidade.INEXIGIBILIDADE,
      );
      expect(template.description).toContain('inviabilidade de competição');
    });
  });

  describe('Lei 14.133/2021 Compliance', () => {
    it('should reference Lei 14.133/2021 in legal references', () => {
      const template = new EditalTemplate();
      template.legalReferences = [
        'Lei nº 14.133/2021 - Nova Lei de Licitações',
      ];

      expect(template.legalReferences[0]).toContain('14.133/2021');
    });

    it('should include mandatory Art. 25 sections', () => {
      const mandatorySections: EditalTemplateSecao[] = [
        {
          id: 'objeto',
          nome: 'Do Objeto',
          ordem: 1,
          textoModelo: '...',
          obrigatoria: true,
          referenciaLegal: 'Lei 14.133/2021 Art. 25, I',
        },
        {
          id: 'habilitacao',
          nome: 'Da Habilitação',
          ordem: 2,
          textoModelo: '...',
          obrigatoria: true,
          referenciaLegal: 'Lei 14.133/2021 Art. 25, V',
        },
        {
          id: 'sancoes',
          nome: 'Das Sanções',
          ordem: 3,
          textoModelo: '...',
          obrigatoria: true,
          referenciaLegal: 'Lei 14.133/2021 Art. 25, VI',
        },
      ];

      mandatorySections.forEach((secao) => {
        expect(secao.obrigatoria).toBe(true);
        expect(secao.referenciaLegal).toContain('Art. 25');
      });
    });
  });
});

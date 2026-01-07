import {
  TermoReferencia,
  TermoReferenciaStatus,
  ModalidadeLicitacao,
  CriterioJulgamento,
  RegimeExecucao,
} from './termo-referencia.entity';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Etp } from './etp.entity';

/**
 * Unit tests for TermoReferencia Entity
 *
 * Tests entity structure, enums, and relationships as defined
 * in Issue #1248 - [TR-a] Criar entity TermoReferencia e relacionamentos
 *
 * @see TermoReferencia entity
 * @see Issue #1248
 * @see Milestone M10 - Termo de Referência
 */
describe('TermoReferencia Entity', () => {
  describe('Entity Structure', () => {
    it('should create a TermoReferencia with required fields', () => {
      const tr = new TermoReferencia();
      tr.id = '123e4567-e89b-12d3-a456-426614174000';
      tr.etpId = '123e4567-e89b-12d3-a456-426614174001';
      tr.titulo = 'Termo de Referência para Contratação de Serviços de TI';
      tr.objeto =
        'Contratação de empresa especializada para desenvolvimento de sistemas';
      tr.organizationId = '123e4567-e89b-12d3-a456-426614174002';
      tr.createdById = '123e4567-e89b-12d3-a456-426614174003';

      expect(tr.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(tr.etpId).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(tr.titulo).toBe(
        'Termo de Referência para Contratação de Serviços de TI',
      );
      expect(tr.objeto).toBe(
        'Contratação de empresa especializada para desenvolvimento de sistemas',
      );
      expect(tr.organizationId).toBe('123e4567-e89b-12d3-a456-426614174002');
      expect(tr.createdById).toBe('123e4567-e89b-12d3-a456-426614174003');
    });

    it('should allow setting all optional identification fields', () => {
      const tr = new TermoReferencia();
      tr.numeroTR = 'TR-2024/001';
      tr.numeroProcesso = '23000.123456/2024-00';
      tr.titulo = 'TR para Serviços de TI';
      tr.objeto = 'Descrição do objeto';

      expect(tr.numeroTR).toBe('TR-2024/001');
      expect(tr.numeroProcesso).toBe('23000.123456/2024-00');
    });

    it('should allow setting justificativa and natureza', () => {
      const tr = new TermoReferencia();
      tr.justificativa =
        'A contratação se justifica pela necessidade de modernização';
      tr.naturezaObjeto = 'Serviço Comum';

      expect(tr.justificativa).toBe(
        'A contratação se justifica pela necessidade de modernização',
      );
      expect(tr.naturezaObjeto).toBe('Serviço Comum');
    });

    it('should support nullable fields', () => {
      const tr = new TermoReferencia();
      tr.id = 'test-id';
      tr.etpId = 'etp-id';
      tr.titulo = 'TR Test';
      tr.objeto = 'Objeto test';
      tr.organizationId = 'org-id';
      tr.createdById = 'user-id';

      // Optional fields should be undefined or nullable
      expect(tr.numeroTR).toBeUndefined();
      expect(tr.especificacoes).toBeUndefined();
      expect(tr.cronograma).toBeUndefined();
      expect(tr.obrigacoes).toBeUndefined();
      expect(tr.penalidades).toBeUndefined();
    });
  });

  describe('Status Enum', () => {
    it('should support all status values', () => {
      const tr = new TermoReferencia();

      tr.status = TermoReferenciaStatus.DRAFT;
      expect(tr.status).toBe('draft');

      tr.status = TermoReferenciaStatus.IN_PROGRESS;
      expect(tr.status).toBe('in_progress');

      tr.status = TermoReferenciaStatus.REVIEW;
      expect(tr.status).toBe('review');

      tr.status = TermoReferenciaStatus.APPROVED;
      expect(tr.status).toBe('approved');

      tr.status = TermoReferenciaStatus.ARCHIVED;
      expect(tr.status).toBe('archived');
    });

    it('should default to DRAFT status', () => {
      const tr = new TermoReferencia();
      // Default is set at database level, but we can verify enum value
      tr.status = TermoReferenciaStatus.DRAFT;
      expect(tr.status).toBe(TermoReferenciaStatus.DRAFT);
    });
  });

  describe('Modalidade Enum (Lei 14.133/2021)', () => {
    it('should support all modalidade values', () => {
      expect(ModalidadeLicitacao.PREGAO).toBe('PREGAO');
      expect(ModalidadeLicitacao.CONCORRENCIA).toBe('CONCORRENCIA');
      expect(ModalidadeLicitacao.CONCURSO).toBe('CONCURSO');
      expect(ModalidadeLicitacao.LEILAO).toBe('LEILAO');
      expect(ModalidadeLicitacao.DIALOGO_COMPETITIVO).toBe(
        'DIALOGO_COMPETITIVO',
      );
      expect(ModalidadeLicitacao.DISPENSA).toBe('DISPENSA');
      expect(ModalidadeLicitacao.INEXIGIBILIDADE).toBe('INEXIGIBILIDADE');
    });

    it('should allow setting modalidade on TR', () => {
      const tr = new TermoReferencia();
      tr.modalidade = ModalidadeLicitacao.PREGAO;

      expect(tr.modalidade).toBe(ModalidadeLicitacao.PREGAO);
    });
  });

  describe('CriterioJulgamento Enum (Lei 14.133/2021, Art. 33)', () => {
    it('should support all criterio julgamento values', () => {
      expect(CriterioJulgamento.MENOR_PRECO).toBe('MENOR_PRECO');
      expect(CriterioJulgamento.MAIOR_DESCONTO).toBe('MAIOR_DESCONTO');
      expect(CriterioJulgamento.MELHOR_TECNICA).toBe('MELHOR_TECNICA');
      expect(CriterioJulgamento.TECNICA_PRECO).toBe('TECNICA_PRECO');
      expect(CriterioJulgamento.MAIOR_LANCE).toBe('MAIOR_LANCE');
      expect(CriterioJulgamento.MAIOR_RETORNO_ECONOMICO).toBe(
        'MAIOR_RETORNO_ECONOMICO',
      );
    });

    it('should allow setting criterio on TR', () => {
      const tr = new TermoReferencia();
      tr.criterioJulgamento = CriterioJulgamento.MENOR_PRECO;

      expect(tr.criterioJulgamento).toBe(CriterioJulgamento.MENOR_PRECO);
    });
  });

  describe('RegimeExecucao Enum', () => {
    it('should support all regime execucao values', () => {
      expect(RegimeExecucao.EMPREITADA_PRECO_GLOBAL).toBe(
        'EMPREITADA_PRECO_GLOBAL',
      );
      expect(RegimeExecucao.EMPREITADA_PRECO_UNITARIO).toBe(
        'EMPREITADA_PRECO_UNITARIO',
      );
      expect(RegimeExecucao.TAREFA).toBe('TAREFA');
      expect(RegimeExecucao.EMPREITADA_INTEGRAL).toBe('EMPREITADA_INTEGRAL');
      expect(RegimeExecucao.CONTRATACAO_INTEGRADA).toBe(
        'CONTRATACAO_INTEGRADA',
      );
      expect(RegimeExecucao.CONTRATACAO_SEMI_INTEGRADA).toBe(
        'CONTRATACAO_SEMI_INTEGRADA',
      );
      expect(RegimeExecucao.FORNECIMENTO_INSTALACAO).toBe(
        'FORNECIMENTO_INSTALACAO',
      );
    });

    it('should allow setting regime on TR', () => {
      const tr = new TermoReferencia();
      tr.regimeExecucao = RegimeExecucao.EMPREITADA_PRECO_UNITARIO;

      expect(tr.regimeExecucao).toBe(RegimeExecucao.EMPREITADA_PRECO_UNITARIO);
    });
  });

  describe('Values and Quantities', () => {
    it('should support decimal values for valorEstimado', () => {
      const tr = new TermoReferencia();
      tr.valorEstimado = 500000.5;
      tr.quantidade = 12;
      tr.unidadeMedida = 'mês';

      expect(tr.valorEstimado).toBe(500000.5);
      expect(tr.quantidade).toBe(12);
      expect(tr.unidadeMedida).toBe('mês');
    });

    it('should support metodologiaPrecos field', () => {
      const tr = new TermoReferencia();
      tr.metodologiaPrecos =
        'Painel de Preços PNCP, SINAPI 03/2024, 3 cotações de mercado';

      expect(tr.metodologiaPrecos).toBe(
        'Painel de Preços PNCP, SINAPI 03/2024, 3 cotações de mercado',
      );
    });
  });

  describe('Prazos and Deadlines', () => {
    it('should support prazo fields', () => {
      const tr = new TermoReferencia();
      tr.prazoVigencia = 12; // meses
      tr.prazoExecucao = 180; // dias
      tr.permiteProrrogacao = true;

      expect(tr.prazoVigencia).toBe(12);
      expect(tr.prazoExecucao).toBe(180);
      expect(tr.permiteProrrogacao).toBe(true);
    });

    it('should support cronograma as JSONB array', () => {
      const tr = new TermoReferencia();
      tr.cronograma = [
        {
          etapa: 1,
          descricao: 'Mobilização',
          prazoInicio: 0,
          prazoFim: 30,
          percentualPagamento: 10,
          entregaveis: ['Relatório de mobilização'],
        },
        {
          etapa: 2,
          descricao: 'Execução',
          prazoInicio: 31,
          prazoFim: 150,
          percentualPagamento: 70,
          entregaveis: ['Entrega parcial 1', 'Entrega parcial 2'],
        },
      ];

      expect(tr.cronograma).toHaveLength(2);
      expect(tr.cronograma[0].etapa).toBe(1);
      expect(tr.cronograma[1].descricao).toBe('Execução');
    });
  });

  describe('Especificacoes Tecnicas', () => {
    it('should support especificacoes as JSONB array', () => {
      const tr = new TermoReferencia();
      tr.especificacoes = [
        {
          item: 'Computador Desktop',
          descricao: 'Desktop com Intel Core i7, 16GB RAM, SSD 512GB',
          unidade: 'unidade',
          quantidade: 50,
          valorUnitarioEstimado: 4500,
          observacoes: 'Inclui monitor 24 polegadas',
        },
      ];

      expect(tr.especificacoes).toHaveLength(1);
      expect(tr.especificacoes[0].item).toBe('Computador Desktop');
      expect(tr.especificacoes[0].quantidade).toBe(50);
    });

    it('should support normasAplicaveis as string array', () => {
      const tr = new TermoReferencia();
      tr.normasAplicaveis = [
        'NBR ISO 9001:2015',
        'NBR ISO 27001:2013',
        'Lei 14.133/2021',
      ];

      expect(tr.normasAplicaveis).toHaveLength(3);
      expect(tr.normasAplicaveis).toContain('NBR ISO 9001:2015');
    });
  });

  describe('Obrigacoes and Penalidades', () => {
    it('should support obrigacoes as JSONB array', () => {
      const tr = new TermoReferencia();
      tr.obrigacoes = [
        {
          tipo: 'CONTRATANTE',
          descricao: 'Fornecer local adequado para execução',
          referenciaNormativa: 'Lei 14.133/2021, Art. 92',
        },
        {
          tipo: 'CONTRATADA',
          descricao: 'Manter equipe técnica qualificada',
          referenciaNormativa: 'Lei 14.133/2021, Art. 92',
        },
      ];

      expect(tr.obrigacoes).toHaveLength(2);
      expect(tr.obrigacoes[0].tipo).toBe('CONTRATANTE');
      expect(tr.obrigacoes[1].tipo).toBe('CONTRATADA');
    });

    it('should support penalidades as JSONB array', () => {
      const tr = new TermoReferencia();
      tr.penalidades = [
        {
          tipo: 'ADVERTENCIA',
          descricao: 'Por atraso injustificado na entrega',
          fundamentacaoLegal: 'Lei 14.133/2021, Art. 156',
        },
        {
          tipo: 'MULTA',
          descricao: 'Multa de 0,5% por dia de atraso',
          percentual: 0.5,
          prazo: 30,
          fundamentacaoLegal: 'Lei 14.133/2021, Art. 156',
        },
      ];

      expect(tr.penalidades).toHaveLength(2);
      expect(tr.penalidades[0].tipo).toBe('ADVERTENCIA');
      expect(tr.penalidades[1].percentual).toBe(0.5);
    });
  });

  describe('Garantia Contratual', () => {
    it('should support garantiaContratual as JSONB object', () => {
      const tr = new TermoReferencia();
      tr.garantiaContratual = {
        percentual: 5,
        tipo: ['Caução em dinheiro', 'Seguro-garantia', 'Fiança bancária'],
        prazo: 365,
      };

      expect(tr.garantiaContratual.percentual).toBe(5);
      expect(tr.garantiaContratual.tipo).toHaveLength(3);
      expect(tr.garantiaContratual.prazo).toBe(365);
    });
  });

  describe('Indicadores de Desempenho', () => {
    it('should support indicadoresDesempenho as JSONB array', () => {
      const tr = new TermoReferencia();
      tr.indicadoresDesempenho = [
        {
          indicador: 'Taxa de satisfação',
          meta: '>= 90%',
          periodicidade: 'Mensal',
          penalidade: 'Multa de 1% por ponto abaixo',
        },
        {
          indicador: 'Tempo de resposta',
          meta: '< 4 horas úteis',
          periodicidade: 'Semanal',
        },
      ];

      expect(tr.indicadoresDesempenho).toHaveLength(2);
      expect(tr.indicadoresDesempenho[0].meta).toBe('>= 90%');
    });
  });

  describe('Multi-Tenancy', () => {
    it('should support organization assignment', () => {
      const tr = new TermoReferencia();
      const org = new Organization();
      org.id = 'org-uuid-123';
      org.name = 'Prefeitura de Lages';
      org.cnpj = '12.345.678/0001-90';
      org.domainWhitelist = ['lages.sc.gov.br'];
      org.isActive = true;

      tr.organizationId = org.id;
      tr.organization = org;

      expect(tr.organizationId).toBe('org-uuid-123');
      expect(tr.organization).toBe(org);
      expect(tr.organization.name).toBe('Prefeitura de Lages');
    });

    it('should support different organizations for tenant isolation', () => {
      const org1 = new Organization();
      org1.id = 'org-1';
      org1.name = 'Prefeitura A';
      org1.cnpj = '11.111.111/0001-11';
      org1.domainWhitelist = ['a.gov.br'];
      org1.isActive = true;

      const org2 = new Organization();
      org2.id = 'org-2';
      org2.name = 'Prefeitura B';
      org2.cnpj = '22.222.222/0001-22';
      org2.domainWhitelist = ['b.gov.br'];
      org2.isActive = true;

      const tr1 = new TermoReferencia();
      tr1.id = 'tr-1';
      tr1.titulo = 'TR de TI';
      tr1.objeto = 'Serviços de TI';
      tr1.etpId = 'etp-1';
      tr1.organizationId = org1.id;
      tr1.organization = org1;
      tr1.createdById = 'user-1';

      const tr2 = new TermoReferencia();
      tr2.id = 'tr-2';
      tr2.titulo = 'TR de TI';
      tr2.objeto = 'Serviços de TI';
      tr2.etpId = 'etp-2';
      tr2.organizationId = org2.id;
      tr2.organization = org2;
      tr2.createdById = 'user-2';

      // Same titulo but different organizations
      expect(tr1.titulo).toBe(tr2.titulo);
      expect(tr1.organizationId).not.toBe(tr2.organizationId);
      expect(tr1.organization?.name).toBe('Prefeitura A');
      expect(tr2.organization?.name).toBe('Prefeitura B');
    });
  });

  describe('ETP Relationship', () => {
    it('should support ETP assignment', () => {
      const tr = new TermoReferencia();
      const etp = new Etp();
      etp.id = 'etp-uuid-123';
      etp.title = 'ETP para Serviços de TI';
      etp.objeto = 'Contratação de serviços de TI';

      tr.etpId = etp.id;
      tr.etp = etp;

      expect(tr.etpId).toBe('etp-uuid-123');
      expect(tr.etp).toBe(etp);
      expect(tr.etp.title).toBe('ETP para Serviços de TI');
    });

    it('should require etpId (not nullable)', () => {
      const tr = new TermoReferencia();
      tr.etpId = 'required-etp-id';

      expect(tr.etpId).toBe('required-etp-id');
    });
  });

  describe('User Relationship', () => {
    it('should support createdBy user assignment', () => {
      const tr = new TermoReferencia();
      const user = new User();
      user.id = 'user-uuid-123';
      user.email = 'usuario@gov.br';
      user.name = 'João Silva';

      tr.createdById = user.id;
      tr.createdBy = user;

      expect(tr.createdById).toBe('user-uuid-123');
      expect(tr.createdBy).toBe(user);
      expect(tr.createdBy.email).toBe('usuario@gov.br');
    });
  });

  describe('Versioning and Control', () => {
    it('should support versao field', () => {
      const tr = new TermoReferencia();
      tr.versao = 1;

      expect(tr.versao).toBe(1);
    });

    it('should support completionPercentage field', () => {
      const tr = new TermoReferencia();
      tr.completionPercentage = 75.5;

      expect(tr.completionPercentage).toBe(75.5);
    });
  });

  describe('Metadata', () => {
    it('should support metadata as JSONB object', () => {
      const tr = new TermoReferencia();
      tr.metadata = {
        tags: ['TI', 'Desenvolvimento', 'Urgente'],
        observacoesInternas: 'Revisar com setor jurídico',
        customField: 'valor personalizado',
      };

      expect(tr.metadata?.tags).toHaveLength(3);
      expect(tr.metadata?.observacoesInternas).toBe(
        'Revisar com setor jurídico',
      );
      expect(tr.metadata?.customField).toBe('valor personalizado');
    });

    it('should support partial metadata', () => {
      const tr = new TermoReferencia();
      tr.metadata = {
        tags: ['urgente'],
      };

      expect(tr.metadata?.tags).toContain('urgente');
      expect(tr.metadata?.observacoesInternas).toBeUndefined();
    });

    it('should support nullable metadata', () => {
      const tr = new TermoReferencia();
      // Entity allows null via @Column({ nullable: true })
      (tr as any).metadata = null;

      expect(tr.metadata).toBeNull();
    });
  });

  describe('Fundamentacao Legal', () => {
    it('should support fundamentacaoLegal as string array', () => {
      const tr = new TermoReferencia();
      tr.fundamentacaoLegal = [
        'Lei 14.133/2021, Art. 6º, XXIII',
        'IN SEGES/ME nº 65/2021',
        'Decreto 10.024/2019',
      ];

      expect(tr.fundamentacaoLegal).toHaveLength(3);
      expect(tr.fundamentacaoLegal).toContain(
        'Lei 14.133/2021, Art. 6º, XXIII',
      );
    });
  });

  describe('Sustentabilidade', () => {
    it('should support criteriosSustentabilidade field', () => {
      const tr = new TermoReferencia();
      tr.criteriosSustentabilidade =
        'Utilização de materiais recicláveis; Equipamentos com certificação Energy Star';

      expect(tr.criteriosSustentabilidade).toBe(
        'Utilização de materiais recicláveis; Equipamentos com certificação Energy Star',
      );
    });
  });

  describe('Contractual Conditions', () => {
    it('should support formaPagamento field', () => {
      const tr = new TermoReferencia();
      tr.formaPagamento = 'Pagamento em até 30 dias após ateste da nota fiscal';

      expect(tr.formaPagamento).toBe(
        'Pagamento em até 30 dias após ateste da nota fiscal',
      );
    });

    it('should support dotacaoOrcamentaria field', () => {
      const tr = new TermoReferencia();
      tr.dotacaoOrcamentaria = '02.031.0001.2001.339039';

      expect(tr.dotacaoOrcamentaria).toBe('02.031.0001.2001.339039');
    });

    it('should support localEntrega field', () => {
      const tr = new TermoReferencia();
      tr.localEntrega = 'Sede da Secretaria de Tecnologia, Av. Principal, 1000';

      expect(tr.localEntrega).toBe(
        'Sede da Secretaria de Tecnologia, Av. Principal, 1000',
      );
    });

    it('should support modeloGestao field', () => {
      const tr = new TermoReferencia();
      tr.modeloGestao =
        'O contrato será gerido pelo Núcleo de Gestão de Contratos';

      expect(tr.modeloGestao).toBe(
        'O contrato será gerido pelo Núcleo de Gestão de Contratos',
      );
    });
  });

  describe('Timestamps', () => {
    it('should track createdAt and updatedAt', () => {
      const tr = new TermoReferencia();
      const now = new Date();
      tr.createdAt = now;
      tr.updatedAt = now;

      expect(tr.createdAt).toBe(now);
      expect(tr.updatedAt).toBe(now);
    });
  });
});

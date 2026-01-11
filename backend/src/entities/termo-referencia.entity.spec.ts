import {
  TermoReferencia,
  TermoReferenciaStatus,
} from './termo-referencia.entity';

describe('TermoReferencia Entity', () => {
  describe('TermoReferenciaStatus enum', () => {
    it('should have all required status values', () => {
      expect(TermoReferenciaStatus.DRAFT).toBe('draft');
      expect(TermoReferenciaStatus.REVIEW).toBe('review');
      expect(TermoReferenciaStatus.APPROVED).toBe('approved');
      expect(TermoReferenciaStatus.ARCHIVED).toBe('archived');
    });

    it('should have exactly 4 status values', () => {
      const statusValues = Object.values(TermoReferenciaStatus);
      expect(statusValues).toHaveLength(4);
    });
  });

  describe('TermoReferencia class', () => {
    let termoReferencia: TermoReferencia;

    beforeEach(() => {
      termoReferencia = new TermoReferencia();
    });

    it('should create an instance', () => {
      expect(termoReferencia).toBeDefined();
      expect(termoReferencia).toBeInstanceOf(TermoReferencia);
    });

    it('should accept all required fields', () => {
      termoReferencia.id = 'tr-uuid-123';
      termoReferencia.etpId = 'etp-uuid-456';
      termoReferencia.organizationId = 'org-uuid-789';
      termoReferencia.objeto = 'Contratacao de servicos de desenvolvimento';
      termoReferencia.status = TermoReferenciaStatus.DRAFT;
      termoReferencia.versao = 1;
      termoReferencia.createdById = 'user-uuid-001';

      expect(termoReferencia.id).toBe('tr-uuid-123');
      expect(termoReferencia.etpId).toBe('etp-uuid-456');
      expect(termoReferencia.organizationId).toBe('org-uuid-789');
      expect(termoReferencia.objeto).toBe(
        'Contratacao de servicos de desenvolvimento',
      );
      expect(termoReferencia.status).toBe(TermoReferenciaStatus.DRAFT);
      expect(termoReferencia.versao).toBe(1);
      expect(termoReferencia.createdById).toBe('user-uuid-001');
    });

    it('should accept all optional Lei 14.133/2021 fields', () => {
      termoReferencia.fundamentacaoLegal = 'Lei 14.133/2021, art. 6';
      termoReferencia.descricaoSolucao = 'Solucao proposta';
      termoReferencia.requisitosContratacao = 'Requisitos tecnicos';
      termoReferencia.modeloExecucao = 'Execucao continuada';
      termoReferencia.modeloGestao = 'Modelo de gestao';
      termoReferencia.criteriosSelecao = 'Menor preco';
      termoReferencia.valorEstimado = 150000.5;
      termoReferencia.dotacaoOrcamentaria = '02.031.0001.2001.339039';
      termoReferencia.prazoVigencia = 365;
      termoReferencia.obrigacoesContratante = 'Obrigacoes do contratante';
      termoReferencia.obrigacoesContratada = 'Obrigacoes da contratada';
      termoReferencia.sancoesPenalidades = 'Sancoes aplicaveis';

      expect(termoReferencia.fundamentacaoLegal).toBe(
        'Lei 14.133/2021, art. 6',
      );
      expect(termoReferencia.descricaoSolucao).toBe('Solucao proposta');
      expect(termoReferencia.requisitosContratacao).toBe('Requisitos tecnicos');
      expect(termoReferencia.modeloExecucao).toBe('Execucao continuada');
      expect(termoReferencia.modeloGestao).toBe('Modelo de gestao');
      expect(termoReferencia.criteriosSelecao).toBe('Menor preco');
      expect(termoReferencia.valorEstimado).toBe(150000.5);
      expect(termoReferencia.dotacaoOrcamentaria).toBe(
        '02.031.0001.2001.339039',
      );
      expect(termoReferencia.prazoVigencia).toBe(365);
      expect(termoReferencia.obrigacoesContratante).toBe(
        'Obrigacoes do contratante',
      );
      expect(termoReferencia.obrigacoesContratada).toBe(
        'Obrigacoes da contratada',
      );
      expect(termoReferencia.sancoesPenalidades).toBe('Sancoes aplicaveis');
    });

    it('should accept JSONB fields', () => {
      termoReferencia.cronograma = {
        etapas: [
          { nome: 'Fase 1', prazo: 30 },
          { nome: 'Fase 2', prazo: 60 },
        ],
      };
      termoReferencia.especificacoesTecnicas = {
        tecnologias: ['Node.js', 'React'],
        requisitos: ['API REST', 'PostgreSQL'],
      };

      expect(termoReferencia.cronograma).toHaveProperty('etapas');
      expect(
        (termoReferencia.cronograma as { etapas: unknown[] }).etapas,
      ).toHaveLength(2);
      expect(termoReferencia.especificacoesTecnicas).toHaveProperty(
        'tecnologias',
      );
    });

    it('should accept additional optional fields', () => {
      termoReferencia.localExecucao = 'Sede do orgao';
      termoReferencia.garantiaContratual = '5% do valor do contrato';
      termoReferencia.condicoesPagamento = 'Mensal, ate dia 10';
      termoReferencia.subcontratacao = 'Permitida ate 30%';

      expect(termoReferencia.localExecucao).toBe('Sede do orgao');
      expect(termoReferencia.garantiaContratual).toBe(
        '5% do valor do contrato',
      );
      expect(termoReferencia.condicoesPagamento).toBe('Mensal, ate dia 10');
      expect(termoReferencia.subcontratacao).toBe('Permitida ate 30%');
    });

    it('should handle date fields', () => {
      const now = new Date();
      termoReferencia.createdAt = now;
      termoReferencia.updatedAt = now;

      expect(termoReferencia.createdAt).toBe(now);
      expect(termoReferencia.updatedAt).toBe(now);
    });
  });
});

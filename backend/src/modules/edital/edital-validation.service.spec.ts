import { Test, TestingModule } from '@nestjs/testing';
import {
  EditalValidationService,
  EditalValidationResult,
} from './edital-validation.service';
import {
  Edital,
  EditalModalidade,
  EditalTipoContratacaoDireta,
  EditalCriterioJulgamento,
  EditalModoDisputa,
  EditalStatus,
} from '../../entities/edital.entity';

describe('EditalValidationService', () => {
  let service: EditalValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EditalValidationService],
    }).compile();

    service = module.get<EditalValidationService>(EditalValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate - Campos gerais obrigatórios', () => {
    it('should fail when numero is missing', () => {
      const edital = createMinimalEdital();
      edital.numero = '';

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'numero',
          severity: 'critical',
          required: true,
        }),
      );
    });

    it('should fail when objeto is missing', () => {
      const edital = createMinimalEdital();
      edital.objeto = '';

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'objeto',
          severity: 'critical',
          required: true,
        }),
      );
    });

    it('should warn when objeto is too short', () => {
      const edital = createMinimalEdital();
      edital.objeto = 'Curto'; // < 20 chars

      const result = service.validate(edital);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'objeto',
          severity: 'warning',
        }),
      );
    });

    it('should fail when fundamentacaoLegal is missing', () => {
      const edital = createMinimalEdital();
      edital.fundamentacaoLegal = '';

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'fundamentacaoLegal',
          severity: 'critical',
        }),
      );
    });
  });

  describe('validate - Modalidade PREGAO', () => {
    it('should fail when prazoVigencia is missing', () => {
      const edital = createMinimalEdital();
      edital.modalidade = EditalModalidade.PREGAO;
      edital.prazoVigencia = null;

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'prazoVigencia',
          severity: 'critical',
        }),
      );
    });

    it('should fail when valorEstimado is missing and not sigiloso', () => {
      const edital = createMinimalEdital();
      edital.modalidade = EditalModalidade.PREGAO;
      edital.valorEstimado = null;
      edital.sigiloOrcamento = false;

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'valorEstimado',
          severity: 'critical',
        }),
      );
    });

    it('should pass when valorEstimado is missing but sigiloso', () => {
      const edital = createMinimalEdital();
      edital.modalidade = EditalModalidade.PREGAO;
      edital.valorEstimado = null;
      edital.sigiloOrcamento = true;
      edital.prazoVigencia = 12;
      edital.dataSessaoPublica = new Date(Date.now() + 86400000); // +1 day
      edital.sistemaEletronico = 'Comprasnet';
      edital.linkSistemaEletronico = 'https://comprasnet.gov.br';
      edital.condicoesParticipacao = 'ME/EPP podem participar';

      const result = service.validate(edital);

      const valorErrors = result.errors.filter(
        (e) => e.field === 'valorEstimado',
      );
      expect(valorErrors).toHaveLength(0);
    });

    it('should fail when sistemaEletronico is missing', () => {
      const edital = createMinimalEdital();
      edital.modalidade = EditalModalidade.PREGAO;
      edital.sistemaEletronico = null;

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'sistemaEletronico',
          severity: 'critical',
        }),
      );
    });

    it('should pass with valid PREGAO', () => {
      const edital = createValidPregao();

      const result = service.validate(edital);

      // Deve ter apenas warnings (se houver), sem erros críticos
      const criticalErrors = result.errors.filter(
        (e) => e.severity === 'critical',
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  describe('validate - Modalidade CONCORRENCIA', () => {
    it('should fail when requisitosHabilitacao is missing', () => {
      const edital = createMinimalEdital();
      edital.modalidade = EditalModalidade.CONCORRENCIA;
      edital.requisitosHabilitacao = null;

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'requisitosHabilitacao',
          severity: 'critical',
        }),
      );
    });

    it('should fail when garantiaContratual is missing', () => {
      const edital = createMinimalEdital();
      edital.modalidade = EditalModalidade.CONCORRENCIA;
      edital.garantiaContratual = null;

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'garantiaContratual',
          severity: 'critical',
        }),
      );
    });

    it('should fail when sancoesAdministrativas is missing', () => {
      const edital = createMinimalEdital();
      edital.modalidade = EditalModalidade.CONCORRENCIA;
      edital.sancoesAdministrativas = null;

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'sancoesAdministrativas',
          severity: 'critical',
        }),
      );
    });

    it('should pass with valid CONCORRENCIA', () => {
      const edital = createValidConcorrencia();

      const result = service.validate(edital);

      const criticalErrors = result.errors.filter(
        (e) => e.severity === 'critical',
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  describe('validate - Tipo DISPENSA', () => {
    it('should fail when fundamentacaoLegal is missing', () => {
      const edital = createMinimalEdital();
      edital.modalidade = null;
      edital.tipoContratacaoDireta = EditalTipoContratacaoDireta.DISPENSA;
      edital.fundamentacaoLegal = '';

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      const fundamentacaoErrors = result.errors.filter(
        (e) => e.field === 'fundamentacaoLegal',
      );
      expect(fundamentacaoErrors.length).toBeGreaterThan(0);
    });

    it('should fail when justificativa is too short', () => {
      const edital = createMinimalEdital();
      edital.modalidade = null;
      edital.tipoContratacaoDireta = EditalTipoContratacaoDireta.DISPENSA;
      edital.descricaoObjeto = 'Curta'; // < 50 chars

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'descricaoObjeto',
          severity: 'critical',
        }),
      );
    });

    it('should pass with valid DISPENSA', () => {
      const edital = createValidDispensa();

      const result = service.validate(edital);

      const criticalErrors = result.errors.filter(
        (e) => e.severity === 'critical',
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  describe('validate - Tipo INEXIGIBILIDADE', () => {
    it('should fail when justificativa is too short', () => {
      const edital = createMinimalEdital();
      edital.modalidade = null;
      edital.tipoContratacaoDireta =
        EditalTipoContratacaoDireta.INEXIGIBILIDADE;
      edital.descricaoObjeto = 'Justificativa curta demais'; // < 100 chars

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'descricaoObjeto',
          severity: 'critical',
        }),
      );
    });

    it('should pass with valid INEXIGIBILIDADE', () => {
      const edital = createValidInexigibilidade();

      const result = service.validate(edital);

      const criticalErrors = result.errors.filter(
        (e) => e.severity === 'critical',
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  describe('validate - Coerência de modalidades', () => {
    it('should fail when both modalidade and tipoContratacaoDireta are set', () => {
      const edital = createMinimalEdital();
      edital.modalidade = EditalModalidade.PREGAO;
      edital.tipoContratacaoDireta = EditalTipoContratacaoDireta.DISPENSA;

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'modalidade',
          message: expect.stringContaining('simultaneamente'),
        }),
      );
    });

    it('should fail when neither modalidade nor tipoContratacaoDireta is set', () => {
      const edital = createMinimalEdital();
      edital.modalidade = null;
      edital.tipoContratacaoDireta = null;

      const result = service.validate(edital);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'modalidade',
          message: expect.stringContaining('obrigatória'),
        }),
      );
    });
  });

  describe('validate - Prazos e datas', () => {
    it('should warn when dataSessaoPublica is in the past', () => {
      const edital = createMinimalEdital();
      edital.dataSessaoPublica = new Date('2020-01-01');

      const result = service.validate(edital);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'dataSessaoPublica',
          severity: 'warning',
        }),
      );
    });

    it('should fail when prazoVigencia is zero or negative', () => {
      const edital = createMinimalEdital();
      edital.prazoVigencia = 0;

      const result = service.validate(edital);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'prazoVigencia',
          message: expect.stringContaining('maior que zero'),
        }),
      );
    });

    it('should fail when dataPublicacao is after dataSessaoPublica', () => {
      const edital = createMinimalEdital();
      edital.dataPublicacao = new Date('2024-02-01');
      edital.dataSessaoPublica = new Date('2024-01-01');

      const result = service.validate(edital);

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'dataPublicacao',
          message: expect.stringContaining('anterior'),
        }),
      );
    });
  });

  describe('validate - Completion percentage', () => {
    it('should calculate completion percentage correctly', () => {
      const edital = createMinimalEdital();

      const result = service.validate(edital);

      expect(result.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(result.completionPercentage).toBeLessThanOrEqual(100);
    });

    it('should have high completion percentage for fully filled edital', () => {
      const edital = createFullyFilledEdital();

      const result = service.validate(edital);

      // Alguns campos são mutuamente exclusivos (modalidade vs tipoContratacaoDireta),
      // então 100% não é sempre possível. Esperamos >= 90%.
      expect(result.completionPercentage).toBeGreaterThanOrEqual(90);
    });
  });

  describe('validate - Missing mandatory fields', () => {
    it('should list missing mandatory fields', () => {
      const edital = createMinimalEdital();
      edital.numero = '';
      edital.objeto = '';

      const result = service.validate(edital);

      expect(result.missingMandatoryFields).toContain('numero');
      expect(result.missingMandatoryFields).toContain('objeto');
    });
  });
});

// ============================================
// Helper Functions - Test Fixtures
// ============================================

/**
 * Cria um Edital mínimo para testes.
 */
function createMinimalEdital(): Edital {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    numero: '001/2024-PREGAO',
    objeto: 'Aquisição de material de escritório para uso administrativo',
    modalidade: EditalModalidade.PREGAO,
    tipoContratacaoDireta: null,
    criterioJulgamento: EditalCriterioJulgamento.MENOR_PRECO,
    modoDisputa: EditalModoDisputa.ABERTO,
    fundamentacaoLegal: 'Lei Federal nº 14.133/2021 (Nova Lei de Licitações)',
    organizationId: 'org-123',
    createdById: 'user-123',
    status: EditalStatus.DRAFT,
    versao: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Optional fields
    etpId: null,
    termoReferenciaId: null,
    pesquisaPrecosId: null,
    numeroProcesso: null,
    uasg: null,
    descricaoObjeto: null,
    condicoesParticipacao: null,
    exclusividadeMeEpp: false,
    valorLimiteMeEpp: null,
    cotaReservadaMeEpp: null,
    exigenciaConsorcio: null,
    requisitosHabilitacao: null,
    sancoesAdministrativas: null,
    prazoVigencia: null,
    possibilidadeProrrogacao: null,
    dotacaoOrcamentaria: null,
    fonteRecursos: null,
    valorEstimado: null,
    sigiloOrcamento: false,
    prazos: null,
    dataSessaoPublica: null,
    localSessaoPublica: null,
    clausulas: null,
    anexos: null,
    condicoesPagamento: null,
    garantiaContratual: null,
    reajusteContratual: null,
    localEntrega: null,
    sistemaEletronico: null,
    linkSistemaEletronico: null,
    observacoesInternas: null,
    dataPublicacao: null,
    referenciaPublicacao: null,
    approvedById: null,
    approvedAt: null,
  } as Edital;
}

/**
 * Cria um Pregão válido.
 */
function createValidPregao(): Edital {
  const edital = createMinimalEdital();
  edital.modalidade = EditalModalidade.PREGAO;
  edital.prazoVigencia = 12;
  edital.valorEstimado = '50000.00';
  edital.dataSessaoPublica = new Date(Date.now() + 86400000 * 7); // +7 days
  edital.sistemaEletronico = 'Comprasnet';
  edital.linkSistemaEletronico = 'https://comprasnet.gov.br';
  edital.condicoesParticipacao =
    'Podem participar ME, EPP e cooperativas conforme LC 123/2006';
  return edital;
}

/**
 * Cria uma Concorrência válida.
 */
function createValidConcorrencia(): Edital {
  const edital = createMinimalEdital();
  edital.modalidade = EditalModalidade.CONCORRENCIA;
  edital.requisitosHabilitacao = {
    juridica: 'Registro comercial',
    fiscal: 'Regularidade fiscal federal, estadual e municipal',
    tecnica: 'Atestado de capacidade técnica',
  };
  edital.garantiaContratual = 'Seguro-garantia no valor de 5% do contrato';
  edital.sancoesAdministrativas =
    'Multa de 0,5% por dia de atraso, suspensão temporária, declaração de inidoneidade';
  edital.condicoesPagamento = 'Pagamento em 30 dias após atesto';
  edital.prazoVigencia = 12;
  edital.valorEstimado = '500000.00';
  return edital;
}

/**
 * Cria uma Dispensa válida.
 */
function createValidDispensa(): Edital {
  const edital = createMinimalEdital();
  edital.modalidade = null;
  edital.tipoContratacaoDireta = EditalTipoContratacaoDireta.DISPENSA;
  edital.fundamentacaoLegal =
    'Lei Federal nº 14.133/2021 Art. 75, inciso II (valor até R$ 50.000)';
  edital.descricaoObjeto =
    'Justificativa da dispensa: contratação de pequeno valor conforme Art. 75, inciso II da Lei 14.133/2021';
  edital.valorEstimado = '45000.00';
  edital.prazoVigencia = 6;
  return edital;
}

/**
 * Cria uma Inexigibilidade válida.
 */
function createValidInexigibilidade(): Edital {
  const edital = createMinimalEdital();
  edital.modalidade = null;
  edital.tipoContratacaoDireta = EditalTipoContratacaoDireta.INEXIGIBILIDADE;
  edital.fundamentacaoLegal =
    'Lei Federal nº 14.133/2021 Art. 74, inciso III (notória especialização)';
  edital.descricaoObjeto =
    'Justificativa da inexigibilidade: contratação de empresa com notória especialização para elaboração de projeto específico, sendo inviável a competição devido à singularidade do objeto e às características técnicas exclusivas do profissional. O profissional possui reconhecimento no mercado com premiações e publicações específicas sobre o tema.';
  edital.valorEstimado = '80000.00';
  edital.prazoVigencia = 12;
  return edital;
}

/**
 * Cria um Edital completamente preenchido (100% completo).
 */
function createFullyFilledEdital(): Edital {
  const edital = createValidPregao();
  edital.numeroProcesso = '12345.678910/2024-11';
  edital.uasg = '123456';
  edital.descricaoObjeto = 'Descrição detalhada do objeto da licitação';
  edital.condicoesParticipacao = 'Condições detalhadas';
  edital.exclusividadeMeEpp = true;
  edital.valorLimiteMeEpp = '50000.00';
  edital.cotaReservadaMeEpp = '25.00';
  edital.exigenciaConsorcio = 'Não admitido';
  edital.requisitosHabilitacao = { juridica: 'teste', fiscal: 'teste' };
  edital.sancoesAdministrativas = 'Sanções aplicáveis';
  edital.possibilidadeProrrogacao = 'Prorrogável por até 60 meses';
  edital.dotacaoOrcamentaria = '02.031.0001.2001.339039';
  edital.fonteRecursos = 'Tesouro';
  edital.prazos = { proposta: '10 dias', impugnacao: '3 dias' };
  edital.localSessaoPublica = 'Virtual - Comprasnet';
  edital.clausulas = { obrigacoes: 'Cláusulas contratuais' };
  edital.anexos = { termoReferencia: 'TR-001-2024.pdf' };
  edital.condicoesPagamento = 'Pagamento em 30 dias';
  edital.garantiaContratual = 'Não exigida';
  edital.reajusteContratual = 'IPCA anual';
  edital.localEntrega = 'Sede do órgão';
  return edital;
}

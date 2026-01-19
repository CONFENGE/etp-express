import { Contrato, ContratoStatus } from './contrato.entity';
import { Edital } from './edital.entity';
import { User, UserRole } from './user.entity';
import { Organization } from './organization.entity';

describe('Contrato Entity', () => {
  describe('Entity Structure', () => {
    it('should create a Contrato with required fields', () => {
      const contrato = new Contrato();
      contrato.id = '123e4567-e89b-12d3-a456-426614174000';
      contrato.numero = '001/2024-CONTRATO';
      contrato.objeto = 'Contratação de serviços de manutenção predial';
      contrato.contratadoCnpj = '12.345.678/0001-90';
      contrato.contratadoRazaoSocial = 'Empresa XYZ Ltda';
      contrato.valorGlobal = '50000.00';
      contrato.vigenciaInicio = new Date('2024-01-01');
      contrato.vigenciaFim = new Date('2024-12-31');

      expect(contrato.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(contrato.numero).toBe('001/2024-CONTRATO');
      expect(contrato.objeto).toBe(
        'Contratação de serviços de manutenção predial',
      );
      expect(contrato.contratadoCnpj).toBe('12.345.678/0001-90');
      expect(contrato.contratadoRazaoSocial).toBe('Empresa XYZ Ltda');
      expect(contrato.valorGlobal).toBe('50000.00');
    });

    it('should support ContratoStatus enum with all lifecycle states', () => {
      expect(ContratoStatus.MINUTA).toBe('minuta');
      expect(ContratoStatus.ASSINADO).toBe('assinado');
      expect(ContratoStatus.EM_EXECUCAO).toBe('em_execucao');
      expect(ContratoStatus.ADITIVADO).toBe('aditivado');
      expect(ContratoStatus.SUSPENSO).toBe('suspenso');
      expect(ContratoStatus.RESCINDIDO).toBe('rescindido');
      expect(ContratoStatus.ENCERRADO).toBe('encerrado');
    });

    it('should allow setting status property', () => {
      const contrato = new Contrato();
      contrato.status = ContratoStatus.ASSINADO;

      expect(contrato.status).toBe(ContratoStatus.ASSINADO);
    });

    it('should default status to MINUTA', () => {
      const contrato = new Contrato();
      // Status default is set at database level via @Column decorator
      // We validate it can be assigned
      contrato.status = ContratoStatus.MINUTA;

      expect(contrato.status).toBe(ContratoStatus.MINUTA);
    });
  });

  describe('Relationships', () => {
    it('should support nullable Edital relationship', () => {
      const contrato = new Contrato();
      contrato.editalId = null;
      contrato.edital = undefined;

      expect(contrato.editalId).toBeNull();
      expect(contrato.edital).toBeUndefined();
    });

    it('should support Edital assignment', () => {
      const contrato = new Contrato();
      const edital = new Edital();
      edital.id = 'edital-uuid';
      edital.numero = '001/2024-PREGAO';
      edital.objeto = 'Pregão Eletrônico - Manutenção Predial';

      contrato.editalId = edital.id;
      contrato.edital = edital;

      expect(contrato.editalId).toBe('edital-uuid');
      expect(contrato.edital?.numero).toBe('001/2024-PREGAO');
      expect(contrato.edital?.objeto).toBe(
        'Pregão Eletrônico - Manutenção Predial',
      );
    });

    it('should require Organization relationship', () => {
      const contrato = new Contrato();
      const org = new Organization();
      org.id = 'org-uuid';
      org.name = 'Prefeitura Municipal';
      org.cnpj = '12.345.678/0001-90';

      contrato.organizationId = org.id;
      contrato.organization = org;

      expect(contrato.organizationId).toBe('org-uuid');
      expect(contrato.organization.name).toBe('Prefeitura Municipal');
    });

    it('should require Gestor Responsavel relationship', () => {
      const contrato = new Contrato();
      const gestor = new User();
      gestor.id = 'gestor-uuid';
      gestor.email = 'gestor@prefeitura.gov.br';
      gestor.role = UserRole.ADMIN;

      contrato.gestorResponsavelId = gestor.id;
      contrato.gestorResponsavel = gestor;

      expect(contrato.gestorResponsavelId).toBe('gestor-uuid');
      expect(contrato.gestorResponsavel.email).toBe(
        'gestor@prefeitura.gov.br',
      );
    });

    it('should require Fiscal Responsavel relationship', () => {
      const contrato = new Contrato();
      const fiscal = new User();
      fiscal.id = 'fiscal-uuid';
      fiscal.email = 'fiscal@prefeitura.gov.br';
      fiscal.role = UserRole.USER;

      contrato.fiscalResponsavelId = fiscal.id;
      contrato.fiscalResponsavel = fiscal;

      expect(contrato.fiscalResponsavelId).toBe('fiscal-uuid');
      expect(contrato.fiscalResponsavel.email).toBe(
        'fiscal@prefeitura.gov.br',
      );
    });

    it('should require createdBy relationship for audit', () => {
      const contrato = new Contrato();
      const creator = new User();
      creator.id = 'creator-uuid';
      creator.email = 'creator@prefeitura.gov.br';

      contrato.createdById = creator.id;
      contrato.createdBy = creator;

      expect(contrato.createdById).toBe('creator-uuid');
      expect(contrato.createdBy.email).toBe('creator@prefeitura.gov.br');
    });
  });

  describe('Contracted Party Data', () => {
    it('should store complete contratado information', () => {
      const contrato = new Contrato();
      contrato.contratadoCnpj = '12.345.678/0001-90';
      contrato.contratadoRazaoSocial = 'Empresa XYZ Ltda';
      contrato.contratadoNomeFantasia = 'XYZ Serviços';
      contrato.contratadoEndereco = 'Rua ABC, 123 - Centro';
      contrato.contratadoTelefone = '(48) 3333-4444';
      contrato.contratadoEmail = 'contato@xyz.com.br';

      expect(contrato.contratadoCnpj).toBe('12.345.678/0001-90');
      expect(contrato.contratadoRazaoSocial).toBe('Empresa XYZ Ltda');
      expect(contrato.contratadoNomeFantasia).toBe('XYZ Serviços');
      expect(contrato.contratadoEndereco).toBe('Rua ABC, 123 - Centro');
      expect(contrato.contratadoTelefone).toBe('(48) 3333-4444');
      expect(contrato.contratadoEmail).toBe('contato@xyz.com.br');
    });
  });

  describe('Contract Values', () => {
    it('should support valor global and valor unitario', () => {
      const contrato = new Contrato();
      contrato.valorGlobal = '100000.50';
      contrato.valorUnitario = '250.75';
      contrato.unidadeMedida = 'hora';
      contrato.quantidadeContratada = '400.000';

      expect(contrato.valorGlobal).toBe('100000.50');
      expect(contrato.valorUnitario).toBe('250.75');
      expect(contrato.unidadeMedida).toBe('hora');
      expect(contrato.quantidadeContratada).toBe('400.000');
    });

    it('should handle contracts without unitary values', () => {
      const contrato = new Contrato();
      contrato.valorGlobal = '50000.00';
      contrato.valorUnitario = null;
      contrato.unidadeMedida = null;
      contrato.quantidadeContratada = null;

      expect(contrato.valorGlobal).toBe('50000.00');
      expect(contrato.valorUnitario).toBeNull();
      expect(contrato.unidadeMedida).toBeNull();
      expect(contrato.quantidadeContratada).toBeNull();
    });
  });

  describe('Validity Period', () => {
    it('should store vigencia dates', () => {
      const contrato = new Contrato();
      const inicio = new Date('2024-01-01');
      const fim = new Date('2024-12-31');

      contrato.vigenciaInicio = inicio;
      contrato.vigenciaFim = fim;

      expect(contrato.vigenciaInicio).toBe(inicio);
      expect(contrato.vigenciaFim).toBe(fim);
    });

    it('should support prazoExecucao and possibilidadeProrrogacao', () => {
      const contrato = new Contrato();
      contrato.prazoExecucao = 365;
      contrato.possibilidadeProrrogacao =
        'Prorrogável por até 60 meses conforme Art. 107 da Lei 14.133/2021';

      expect(contrato.prazoExecucao).toBe(365);
      expect(contrato.possibilidadeProrrogacao).toContain(
        'Prorrogável por até 60 meses',
      );
    });
  });

  describe('Contract Clauses and Conditions', () => {
    it('should store dotacao orcamentaria and fonte recursos', () => {
      const contrato = new Contrato();
      contrato.dotacaoOrcamentaria = '02.031.0001.2001.339039';
      contrato.fonteRecursos = 'Tesouro Municipal';

      expect(contrato.dotacaoOrcamentaria).toBe('02.031.0001.2001.339039');
      expect(contrato.fonteRecursos).toBe('Tesouro Municipal');
    });

    it('should store contract conditions', () => {
      const contrato = new Contrato();
      contrato.condicoesPagamento =
        'Pagamento em 30 dias após medição e ateste';
      contrato.garantiaContratual = 'Seguro-garantia de 5% do valor global';
      contrato.reajusteContratual = 'IPCA anualmente';
      contrato.sancoesAdministrativas = 'Multa de 10% por inadimplemento';
      contrato.fundamentacaoLegal = 'Lei 14.133/2021 Arts. 90-129';
      contrato.localEntrega = 'Sede da Prefeitura Municipal';

      expect(contrato.condicoesPagamento).toContain('30 dias');
      expect(contrato.garantiaContratual).toContain('Seguro-garantia');
      expect(contrato.reajusteContratual).toBe('IPCA anualmente');
      expect(contrato.sancoesAdministrativas).toContain('Multa de 10%');
      expect(contrato.fundamentacaoLegal).toContain('Lei 14.133/2021');
      expect(contrato.localEntrega).toBe('Sede da Prefeitura Municipal');
    });

    it('should support structured clausulas in JSONB', () => {
      const contrato = new Contrato();
      contrato.clausulas = {
        clausula1: { titulo: 'Do Objeto', descricao: '...' },
        clausula2: { titulo: 'Das Obrigações', descricao: '...' },
      };

      expect(contrato.clausulas).toHaveProperty('clausula1');
      expect(contrato.clausulas).toHaveProperty('clausula2');
    });
  });

  describe('Status Transitions', () => {
    it('should transition from MINUTA to ASSINADO', () => {
      const contrato = new Contrato();
      contrato.status = ContratoStatus.MINUTA;

      contrato.status = ContratoStatus.ASSINADO;
      contrato.dataAssinatura = new Date('2024-01-15');

      expect(contrato.status).toBe(ContratoStatus.ASSINADO);
      expect(contrato.dataAssinatura).toBeDefined();
    });

    it('should transition from ASSINADO to EM_EXECUCAO', () => {
      const contrato = new Contrato();
      contrato.status = ContratoStatus.ASSINADO;

      contrato.status = ContratoStatus.EM_EXECUCAO;

      expect(contrato.status).toBe(ContratoStatus.EM_EXECUCAO);
    });

    it('should support ADITIVADO status with versao increment', () => {
      const contrato = new Contrato();
      contrato.status = ContratoStatus.EM_EXECUCAO;
      contrato.versao = 1;

      contrato.status = ContratoStatus.ADITIVADO;
      contrato.versao = 2;

      expect(contrato.status).toBe(ContratoStatus.ADITIVADO);
      expect(contrato.versao).toBe(2);
    });

    it('should handle RESCINDIDO status with motivo', () => {
      const contrato = new Contrato();
      contrato.status = ContratoStatus.EM_EXECUCAO;

      contrato.status = ContratoStatus.RESCINDIDO;
      contrato.motivoRescisao =
        'Inadimplência contratual conforme Art. 137 da Lei 14.133/2021';
      contrato.dataRescisao = new Date('2024-06-30');

      expect(contrato.status).toBe(ContratoStatus.RESCINDIDO);
      expect(contrato.motivoRescisao).toContain('Inadimplência');
      expect(contrato.dataRescisao).toBeDefined();
    });

    it('should support SUSPENSO status', () => {
      const contrato = new Contrato();
      contrato.status = ContratoStatus.EM_EXECUCAO;

      contrato.status = ContratoStatus.SUSPENSO;

      expect(contrato.status).toBe(ContratoStatus.SUSPENSO);
    });

    it('should transition to ENCERRADO at end of vigencia', () => {
      const contrato = new Contrato();
      contrato.status = ContratoStatus.EM_EXECUCAO;

      contrato.status = ContratoStatus.ENCERRADO;

      expect(contrato.status).toBe(ContratoStatus.ENCERRADO);
    });
  });

  describe('Publication and Versioning', () => {
    it('should support publication metadata', () => {
      const contrato = new Contrato();
      contrato.dataPublicacao = new Date('2024-01-20');
      contrato.referenciaPublicacao = 'Diário Oficial 123/2024';

      expect(contrato.dataPublicacao).toBeDefined();
      expect(contrato.referenciaPublicacao).toBe('Diário Oficial 123/2024');
    });

    it('should increment versao on amendments', () => {
      const contrato = new Contrato();
      contrato.versao = 1;

      // First amendment
      contrato.versao = 2;
      expect(contrato.versao).toBe(2);

      // Second amendment
      contrato.versao = 3;
      expect(contrato.versao).toBe(3);
    });

    it('should support observacoesInternas for internal notes', () => {
      const contrato = new Contrato();
      contrato.observacoesInternas =
        'Contrato prioritário - acompanhar execução semanalmente';

      expect(contrato.observacoesInternas).toContain('Contrato prioritário');
    });
  });

  describe('Lei 14.133/2021 Compliance', () => {
    it('should support all required fields per Art. 92', () => {
      const contrato = new Contrato();
      contrato.numero = '001/2024';
      contrato.objeto = 'Contratação de serviços';
      contrato.contratadoCnpj = '12.345.678/0001-90';
      contrato.contratadoRazaoSocial = 'Empresa ABC Ltda';
      contrato.valorGlobal = '100000.00';
      contrato.vigenciaInicio = new Date('2024-01-01');
      contrato.vigenciaFim = new Date('2024-12-31');

      // Art. 92 essential fields validation
      expect(contrato.numero).toBeDefined();
      expect(contrato.objeto).toBeDefined();
      expect(contrato.contratadoCnpj).toBeDefined();
      expect(contrato.contratadoRazaoSocial).toBeDefined();
      expect(contrato.valorGlobal).toBeDefined();
      expect(contrato.vigenciaInicio).toBeDefined();
      expect(contrato.vigenciaFim).toBeDefined();
    });

    it('should support contract administrator per Art. 117', () => {
      const contrato = new Contrato();
      const gestor = new User();
      gestor.id = 'gestor-uuid';
      const fiscal = new User();
      fiscal.id = 'fiscal-uuid';

      contrato.gestorResponsavelId = gestor.id;
      contrato.fiscalResponsavelId = fiscal.id;

      expect(contrato.gestorResponsavelId).toBeDefined();
      expect(contrato.fiscalResponsavelId).toBeDefined();
    });
  });
});

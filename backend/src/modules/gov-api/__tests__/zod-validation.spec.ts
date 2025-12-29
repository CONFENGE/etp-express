/**
 * Tests for Zod validation schemas
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1054
 */

import {
  ComprasGovLicitacaoRawSchema,
  ComprasGovListResponseSchema,
  ComprasGovMaterialRawSchema,
  ComprasGovServicoRawSchema,
  ComprasGovContratoRawSchema,
  PncpOrgaoEntidadeSchema,
  PncpUnidadeSchema,
  PncpContratacaoSchema,
  PncpContratoSchema,
  PncpAtaSchema,
  PncpContratacaoPaginatedSchema,
  PncpContratoPaginatedSchema,
  PncpAtaPaginatedSchema,
  formatZodErrors,
} from '../schemas/gov-api.schemas';

describe('Zod Validation Schemas', () => {
  describe('formatZodErrors', () => {
    it('should format errors with path', () => {
      const result = ComprasGovLicitacaoRawSchema.safeParse({
        identificador: 'not-a-number',
        numero_aviso: '123',
        modalidade: 1,
        uasg: 123,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('identificador');
      }
    });

    it('should format nested path errors', () => {
      const result = PncpContratacaoSchema.safeParse({
        numeroControlePNCP: '123',
        anoCompra: 2024,
        sequencialCompra: 1,
        objetoCompra: 'Test',
        dataPublicacaoPncp: '2024-01-01',
        srp: false,
        orgaoEntidade: {
          cnpj: 123, // should be string
        },
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('orgaoEntidade');
      }
    });
  });

  describe('ComprasGovLicitacaoRawSchema', () => {
    const validLicitacao = {
      identificador: 12345,
      numero_aviso: 'PE-2024-001',
      modalidade: 5,
      uasg: 110161,
    };

    it('should accept valid licitacao data', () => {
      const result = ComprasGovLicitacaoRawSchema.safeParse(validLicitacao);
      expect(result.success).toBe(true);
    });

    it('should accept licitacao with optional fields', () => {
      const fullLicitacao = {
        ...validLicitacao,
        objeto: 'Contratacao de servicos de TI',
        situacao: 'ABERTA',
        data_publicacao: '2024-01-15',
        data_entrega_proposta: '2024-02-15',
        valor_estimado: 1500000.0,
      };
      const result = ComprasGovLicitacaoRawSchema.safeParse(fullLicitacao);
      expect(result.success).toBe(true);
    });

    it('should reject licitacao with missing required field', () => {
      const incomplete = { numero_aviso: 'PE-2024-001' };
      const result = ComprasGovLicitacaoRawSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('should reject licitacao with wrong type for identificador', () => {
      const result = ComprasGovLicitacaoRawSchema.safeParse({
        ...validLicitacao,
        identificador: 'not-a-number',
      });
      expect(result.success).toBe(false);
    });

    it('should reject licitacao with wrong type for numero_aviso', () => {
      const result = ComprasGovLicitacaoRawSchema.safeParse({
        ...validLicitacao,
        numero_aviso: 12345,
      });
      expect(result.success).toBe(false);
    });

    it('should reject licitacao with wrong type for modalidade', () => {
      const result = ComprasGovLicitacaoRawSchema.safeParse({
        ...validLicitacao,
        modalidade: 'pregao',
      });
      expect(result.success).toBe(false);
    });

    it('should reject licitacao with wrong type for uasg', () => {
      const result = ComprasGovLicitacaoRawSchema.safeParse({
        ...validLicitacao,
        uasg: '110161',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ComprasGovListResponseSchema', () => {
    it('should accept empty response', () => {
      const result = ComprasGovListResponseSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept response with licitacoes', () => {
      const response = {
        _embedded: {
          licitacoes: [
            {
              identificador: 12345,
              numero_aviso: 'PE-2024-001',
              modalidade: 5,
              uasg: 110161,
            },
          ],
        },
        total: 1,
      };
      const result = ComprasGovListResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('should reject response with invalid licitacao in array', () => {
      const response = {
        _embedded: {
          licitacoes: [
            { identificador: 'invalid' }, // missing required fields
          ],
        },
      };
      const result = ComprasGovListResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('ComprasGovMaterialRawSchema', () => {
    it('should accept valid material', () => {
      const material = {
        codigo: 123456,
        descricao: 'Papel A4 branco',
      };
      const result = ComprasGovMaterialRawSchema.safeParse(material);
      expect(result.success).toBe(true);
    });

    it('should reject material with wrong type', () => {
      const material = {
        codigo: '123456', // should be number
        descricao: 'Papel A4 branco',
      };
      const result = ComprasGovMaterialRawSchema.safeParse(material);
      expect(result.success).toBe(false);
    });
  });

  describe('ComprasGovServicoRawSchema', () => {
    it('should accept valid servico', () => {
      const servico = {
        codigo: 789,
        descricao: 'Servico de manutencao',
      };
      const result = ComprasGovServicoRawSchema.safeParse(servico);
      expect(result.success).toBe(true);
    });
  });

  describe('ComprasGovContratoRawSchema', () => {
    it('should accept valid contrato', () => {
      const contrato = {
        numero: 'CT-2024-001',
        objeto: 'Prestacao de servicos',
        valor: 100000,
      };
      const result = ComprasGovContratoRawSchema.safeParse(contrato);
      expect(result.success).toBe(true);
    });
  });

  describe('PncpOrgaoEntidadeSchema', () => {
    it('should accept valid orgao entidade', () => {
      const orgao = { cnpj: '00000000000191' };
      const result = PncpOrgaoEntidadeSchema.safeParse(orgao);
      expect(result.success).toBe(true);
    });

    it('should reject orgao with missing cnpj', () => {
      const result = PncpOrgaoEntidadeSchema.safeParse({
        razaoSocial: 'Orgao Teste',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PncpUnidadeSchema', () => {
    const validUnidade = {
      codigoUnidade: '001',
      nomeUnidade: 'Unidade Central',
      ufSigla: 'DF',
    };

    it('should accept valid unidade', () => {
      const result = PncpUnidadeSchema.safeParse(validUnidade);
      expect(result.success).toBe(true);
    });

    it('should accept unidade with optional fields', () => {
      const result = PncpUnidadeSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('PncpContratacaoSchema', () => {
    const validContratacao = {
      numeroControlePNCP: '00000000000191-1-000001/2024',
      anoCompra: 2024,
      sequencialCompra: 1,
      objetoCompra: 'Aquisicao de equipamentos de TI',
      dataPublicacaoPncp: '2024-01-15',
      srp: false,
    };

    it('should accept valid contratacao', () => {
      const result = PncpContratacaoSchema.safeParse(validContratacao);
      expect(result.success).toBe(true);
    });

    it('should accept contratacao with all optional fields', () => {
      const full = {
        ...validContratacao,
        informacaoComplementar: 'Informacoes adicionais',
        modalidadeId: 6,
        modalidadeNome: 'Pregao Eletronico',
        valorTotalEstimado: 500000,
        orgaoEntidade: {
          cnpj: '00000000000191',
          razaoSocial: 'Ministerio da Economia',
        },
        unidadeOrgao: {
          ufSigla: 'DF',
          municipioNome: 'Brasilia',
        },
      };
      const result = PncpContratacaoSchema.safeParse(full);
      expect(result.success).toBe(true);
    });

    it('should reject contratacao with missing srp', () => {
      const incomplete = { ...validContratacao };
      delete (incomplete as Record<string, unknown>).srp;
      const result = PncpContratacaoSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it('should reject contratacao with wrong type for anoCompra', () => {
      const result = PncpContratacaoSchema.safeParse({
        ...validContratacao,
        anoCompra: '2024',
      });
      expect(result.success).toBe(false);
    });

    it('should reject contratacao with invalid orgaoEntidade', () => {
      const result = PncpContratacaoSchema.safeParse({
        ...validContratacao,
        orgaoEntidade: { razaoSocial: 'Test' }, // missing cnpj
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PncpContratoSchema', () => {
    const validContrato = {
      numeroControlePNCP: '00000000000191-1-000001/2024',
      valorInicial: 100000,
    };

    it('should accept valid contrato', () => {
      const result = PncpContratoSchema.safeParse(validContrato);
      expect(result.success).toBe(true);
    });

    it('should accept contrato with fornecedor', () => {
      const result = PncpContratoSchema.safeParse({
        ...validContrato,
        fornecedor: {
          cnpjCpf: '12345678000190',
          nomeRazaoSocial: 'Empresa Teste',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject contrato with missing valorInicial', () => {
      const incomplete = { numeroControlePNCP: '123' };
      const result = PncpContratoSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });
  });

  describe('PncpAtaSchema', () => {
    const validAta = {
      numeroControlePNCP: '00000000000191-1-000001/2024',
    };

    it('should accept valid ata', () => {
      const result = PncpAtaSchema.safeParse(validAta);
      expect(result.success).toBe(true);
    });

    it('should accept ata with contratacao', () => {
      const result = PncpAtaSchema.safeParse({
        ...validAta,
        contratacao: {
          numeroControlePNCP: '00000000000191-1-000001/2024',
          anoCompra: 2024,
          sequencialCompra: 1,
          objetoCompra: 'Registro de precos',
          dataPublicacaoPncp: '2024-01-15',
          srp: true,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('PncpContratacaoPaginatedSchema', () => {
    const validPaginated = {
      data: [
        {
          numeroControlePNCP: '00000000000191-1-000001/2024',
          anoCompra: 2024,
          sequencialCompra: 1,
          objetoCompra: 'Teste',
          dataPublicacaoPncp: '2024-01-15',
          srp: false,
        },
      ],
      numeroPagina: 1,
      quantidadeRegistrosPagina: 1,
      totalRegistros: 100,
      totalPaginas: 10,
    };

    it('should accept valid paginated response', () => {
      const result = PncpContratacaoPaginatedSchema.safeParse(validPaginated);
      expect(result.success).toBe(true);
    });

    it('should accept empty paginated response', () => {
      const result = PncpContratacaoPaginatedSchema.safeParse({
        data: [],
        numeroPagina: 1,
        quantidadeRegistrosPagina: 0,
        totalRegistros: 0,
        totalPaginas: 0,
      });
      expect(result.success).toBe(true);
    });

    it('should reject paginated response with invalid item', () => {
      const result = PncpContratacaoPaginatedSchema.safeParse({
        data: [{ invalid: true }],
        numeroPagina: 1,
        quantidadeRegistrosPagina: 1,
        totalRegistros: 1,
        totalPaginas: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject paginated response with missing pagination fields', () => {
      const result = PncpContratacaoPaginatedSchema.safeParse({
        data: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PncpContratoPaginatedSchema', () => {
    it('should accept valid paginated contrato response', () => {
      const result = PncpContratoPaginatedSchema.safeParse({
        data: [
          {
            numeroControlePNCP: '123',
            valorInicial: 100000,
          },
        ],
        numeroPagina: 1,
        quantidadeRegistrosPagina: 1,
        totalRegistros: 1,
        totalPaginas: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('PncpAtaPaginatedSchema', () => {
    it('should accept valid paginated ata response', () => {
      const result = PncpAtaPaginatedSchema.safeParse({
        data: [
          {
            numeroControlePNCP: '123',
          },
        ],
        numeroPagina: 1,
        quantidadeRegistrosPagina: 1,
        totalRegistros: 1,
        totalPaginas: 1,
      });
      expect(result.success).toBe(true);
    });
  });
});

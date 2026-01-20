import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contrato } from '../../../entities/contrato.entity';

/**
 * Interface representando a cadeia completa de rastreabilidade de um contrato.
 * Estrutura: ETP → TR → Edital → Contrato
 *
 * **Issue #1285** - [Contratos-b] Vínculo ETP → TR → Edital → Contrato
 */
export interface ContractChain {
  etp: {
    id: string;
    numero: string | null;
    objeto: string;
    status: string;
    numeroProcesso: string | null;
  };
  termoReferencia: {
    id: string;
    numero: string | null;
    objeto: string;
    status: string;
    versao: number;
  };
  edital: {
    id: string;
    numero: string;
    objeto: string;
    modalidade: string | null;
    tipoContratacaoDireta: string | null;
    status: string;
    dataPublicacao: Date | null;
  };
  contrato: {
    id: string;
    numero: string;
    objeto: string;
    status: string;
    valorGlobal: string;
    vigenciaInicio: Date;
    vigenciaFim: Date;
    contratadoRazaoSocial: string;
  };
}

/**
 * Service responsável por buscar e montar a cadeia de rastreabilidade completa de contratos.
 *
 * Fornece métodos para obter o histórico completo desde o ETP até o Contrato,
 * garantindo auditabilidade e conformidade com Lei 14.133/2021 Art. 90.
 *
 * **Issue #1285** - [Contratos-b] Vínculo ETP → TR → Edital → Contrato
 *
 * @see Lei 14.133/2021 Art. 90 - Gestão de riscos e rastreabilidade
 */
@Injectable()
export class ContractChainService {
  constructor(
    @InjectRepository(Contrato)
    private readonly contratoRepo: Repository<Contrato>,
  ) {}

  /**
   * Busca a cadeia completa de rastreabilidade de um contrato.
   *
   * Retorna estrutura hierárquica: ETP → TR → Edital → Contrato.
   * Utiliza eager loading para evitar N+1 queries.
   *
   * @param contratoId - UUID do contrato
   * @returns {Promise<ContractChain>} Cadeia completa de documentos
   * @throws {NotFoundException} Se contrato não existe ou cadeia incompleta
   *
   * **Exemplo de uso:**
   * ```typescript
   * const chain = await contractChainService.getChainByContratoId('uuid');
   * console.log(chain.etp.objeto); // Objeto original do ETP
   * ```
   */
  async getChainByContratoId(contratoId: string): Promise<ContractChain> {
    // Buscar contrato com todos os relacionamentos necessários
    const contrato = await this.contratoRepo.findOne({
      where: { id: contratoId },
      relations: [
        'edital',
        'edital.termoReferencia',
        'edital.termoReferencia.etp',
      ],
    });

    if (!contrato) {
      throw new NotFoundException(`Contrato ${contratoId} não encontrado`);
    }

    // Validar que a cadeia está completa
    if (!contrato.edital) {
      throw new NotFoundException(
        `Contrato ${contratoId} não possui Edital associado`,
      );
    }

    if (!contrato.edital.termoReferencia) {
      throw new NotFoundException(
        `Edital ${contrato.edital.id} não possui Termo de Referência associado`,
      );
    }

    if (!contrato.edital.termoReferencia.etp) {
      throw new NotFoundException(
        `Termo de Referência ${contrato.edital.termoReferencia.id} não possui ETP associado`,
      );
    }

    // Montar estrutura da cadeia
    const chain: ContractChain = {
      etp: {
        id: contrato.edital.termoReferencia.etp.id,
        numero: contrato.edital.termoReferencia.etp.numeroProcesso,
        objeto: contrato.edital.termoReferencia.etp.objeto,
        status: contrato.edital.termoReferencia.etp.status,
        numeroProcesso: contrato.edital.termoReferencia.etp.numeroProcesso,
      },
      termoReferencia: {
        id: contrato.edital.termoReferencia.id,
        numero: null, // TR não possui campo numero ainda
        objeto: contrato.edital.termoReferencia.objeto,
        status: contrato.edital.termoReferencia.status,
        versao: contrato.edital.termoReferencia.versao,
      },
      edital: {
        id: contrato.edital.id,
        numero: contrato.edital.numero,
        objeto: contrato.edital.objeto,
        modalidade: contrato.edital.modalidade,
        tipoContratacaoDireta: contrato.edital.tipoContratacaoDireta,
        status: contrato.edital.status,
        dataPublicacao: contrato.edital.dataPublicacao,
      },
      contrato: {
        id: contrato.id,
        numero: contrato.numero,
        objeto: contrato.objeto,
        status: contrato.status,
        valorGlobal: contrato.valorGlobal,
        vigenciaInicio: contrato.vigenciaInicio,
        vigenciaFim: contrato.vigenciaFim,
        contratadoRazaoSocial: contrato.contratadoRazaoSocial,
      },
    };

    return chain;
  }

  /**
   * Valida se um contrato possui cadeia completa de rastreabilidade.
   *
   * @param contratoId - UUID do contrato
   * @returns {Promise<boolean>} True se cadeia completa, False caso contrário
   *
   * **Uso interno para validações:**
   * ```typescript
   * const isValid = await contractChainService.validateChain('uuid');
   * if (!isValid) {
   *   throw new BadRequestException('Cadeia de rastreabilidade incompleta');
   * }
   * ```
   */
  async validateChain(contratoId: string): Promise<boolean> {
    try {
      await this.getChainByContratoId(contratoId);
      return true;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }
      throw error;
    }
  }
}

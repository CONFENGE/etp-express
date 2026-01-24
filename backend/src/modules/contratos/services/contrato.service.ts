/**
 * Contrato Service (#1660)
 *
 * Business logic for contract management, including:
 * - Paginated list with server-side filtering
 * - Filter by status, supplier, value range, and date range
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Contrato, ContratoStatus } from '../../../entities/contrato.entity';

/**
 * Filtros para busca de contratos
 */
export interface ContratoFilters {
  status?: ContratoStatus[];
  fornecedor?: string;
  valorMin?: number;
  valorMax?: number;
  vigenciaInicio?: string; // ISO date
  vigenciaFim?: string; // ISO date
}

/**
 * Resposta paginada de contratos
 */
export interface PaginatedContratos {
  data: Contrato[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ContratoService {
  constructor(
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
  ) {}

  /**
   * Lista contratos com filtros e paginação
   *
   * @param organizationId - ID da organização (multi-tenancy)
   * @param filters - Filtros opcionais
   * @param page - Número da página (default: 1)
   * @param limit - Itens por página (default: 10)
   * @returns Contratos paginados
   */
  async listContracts(
    organizationId: string,
    filters: ContratoFilters,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedContratos> {
    // Base query with relations
    const query = this.contratoRepository
      .createQueryBuilder('contrato')
      .leftJoinAndSelect('contrato.gestorResponsavel', 'gestorResponsavel')
      .leftJoinAndSelect('contrato.fiscalResponsavel', 'fiscalResponsavel')
      .where('contrato.organizationId = :organizationId', { organizationId });

    // Apply filters
    this.applyFilters(query, filters);

    // Count total matching records
    const total = await query.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by creation date (newest first)
    query.orderBy('contrato.createdAt', 'DESC');

    // Execute query
    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Aplica filtros ao QueryBuilder
   */
  private applyFilters(
    query: SelectQueryBuilder<Contrato>,
    filters: ContratoFilters,
  ): void {
    // Filter by status (multi-select)
    if (filters.status && filters.status.length > 0) {
      query.andWhere('contrato.status IN (:...statuses)', {
        statuses: filters.status,
      });
    }

    // Filter by supplier (CNPJ or Razão Social)
    if (filters.fornecedor) {
      query.andWhere(
        '(contrato.contratadoRazaoSocial ILIKE :fornecedor OR contrato.contratadoCnpj ILIKE :fornecedor)',
        { fornecedor: `%${filters.fornecedor}%` },
      );
    }

    // Filter by value range
    if (filters.valorMin !== undefined) {
      query.andWhere('CAST(contrato.valorGlobal AS DECIMAL) >= :valorMin', {
        valorMin: filters.valorMin,
      });
    }

    if (filters.valorMax !== undefined) {
      query.andWhere('CAST(contrato.valorGlobal AS DECIMAL) <= :valorMax', {
        valorMax: filters.valorMax,
      });
    }

    // Filter by vigencia date range
    if (filters.vigenciaInicio) {
      query.andWhere('contrato.vigenciaFim >= :vigenciaInicio', {
        vigenciaInicio: filters.vigenciaInicio,
      });
    }

    if (filters.vigenciaFim) {
      query.andWhere('contrato.vigenciaInicio <= :vigenciaFim', {
        vigenciaFim: filters.vigenciaFim,
      });
    }
  }
}

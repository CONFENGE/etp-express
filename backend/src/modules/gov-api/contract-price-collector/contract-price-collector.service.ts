/**
 * Contract Price Collector Service
 *
 * Service for collecting and storing homologated (real) prices from public procurements.
 * This is the foundation of M13: Market Intelligence module.
 *
 * Features:
 * - Collects prices from PNCP via existing PncpService
 * - Normalizes and stores data in ContractPrice entity
 * - Scheduled weekly collection (Sunday 3h)
 * - Deduplication via externalId + fonte unique index
 *
 * @module modules/gov-api/contract-price-collector
 * @see Issue #1269 for M13: Market Intelligence implementation
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PncpService } from '../pncp/pncp.service';
import { GovApiPriceReference } from '../interfaces/gov-api.interface';
import {
  ContractPrice,
  ContractPriceModalidade,
  ContractPriceFonte,
} from '../../../entities/contract-price.entity';
import {
  CollectorFilters,
  CollectionResult,
  CollectionStats,
  NormalizedPriceData,
  SchedulerStatus,
} from './contract-price-collector.types';

/**
 * Default collection period in days (30 days)
 */
const DEFAULT_COLLECTION_DAYS = 30;

/**
 * Cron expression for weekly collection (Sunday at 3:00 AM)
 */
const WEEKLY_COLLECTION_CRON = '0 3 * * 0';

/**
 * ContractPriceCollectorService - Service for collecting homologated prices
 *
 * @example
 * ```typescript
 * // Manual collection
 * const result = await collectorService.collectFromPncp({
 *   dataInicial: '20240101',
 *   dataFinal: '20240131',
 *   uf: 'DF',
 * });
 *
 * // Get statistics
 * const stats = await collectorService.getCollectionStats();
 * ```
 */
@Injectable()
export class ContractPriceCollectorService implements OnModuleInit {
  private readonly logger = new Logger(ContractPriceCollectorService.name);
  private schedulerStatus: SchedulerStatus = {
    enabled: true,
    lastRun: null,
    nextRun: null,
    cronExpression: WEEKLY_COLLECTION_CRON,
    status: 'idle',
  };

  constructor(
    private readonly pncpService: PncpService,
    private readonly configService: ConfigService,
    @InjectRepository(ContractPrice)
    private readonly contractPriceRepository: Repository<ContractPrice>,
  ) {}

  /**
   * Initialize the service and log status
   */
  onModuleInit(): void {
    this.logger.log('ContractPriceCollectorService initialized');
    this.logger.log(
      `Scheduled collection: ${this.schedulerStatus.cronExpression}`,
    );
  }

  /**
   * Collect prices from PNCP and store in database
   *
   * @param filters Collection filters (date range, UF, etc.)
   * @returns Collection result with statistics
   */
  async collectFromPncp(filters: CollectorFilters): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let collected = 0;
    let skipped = 0;
    let failed = 0;

    this.logger.log(
      `Starting PNCP collection: ${filters.dataInicial} to ${filters.dataFinal}`,
    );

    try {
      // 1. Fetch prices from PNCP using existing service
      const pncpResponse = await this.pncpService.searchContratosItens({
        dataInicial: filters.dataInicial,
        dataFinal: filters.dataFinal,
        ufOrgao: filters.uf,
        apenasAtivos: filters.apenasAtivos ?? false,
        pagina: filters.pagina ?? 1,
        tamanhoPagina: filters.tamanhoPagina ?? 500,
      });

      if (!pncpResponse.data || pncpResponse.data.length === 0) {
        this.logger.log('No data returned from PNCP');
        return {
          collected: 0,
          skipped: 0,
          failed: 0,
          total: 0,
          durationMs: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      this.logger.log(
        `Fetched ${pncpResponse.data.length} price references from PNCP`,
      );

      // 2. Process and store each price reference
      for (const priceRef of pncpResponse.data) {
        try {
          const result = await this.processAndStorePriceReference(priceRef);
          if (result === 'collected') {
            collected++;
          } else if (result === 'skipped') {
            skipped++;
          }
        } catch (error) {
          failed++;
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to process ${priceRef.id}: ${errorMsg}`);
          this.logger.warn(
            `Failed to process price reference ${priceRef.id}: ${errorMsg}`,
          );
        }
      }

      this.logger.log(
        `Collection complete: ${collected} collected, ${skipped} skipped, ${failed} failed`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Collection failed: ${errorMsg}`);
      errors.push(`Collection failed: ${errorMsg}`);
    }

    return {
      collected,
      skipped,
      failed,
      total: collected + skipped + failed,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Process and store a single price reference
   *
   * @param priceRef Price reference from PNCP
   * @returns 'collected' if new record, 'skipped' if duplicate
   */
  private async processAndStorePriceReference(
    priceRef: GovApiPriceReference,
  ): Promise<'collected' | 'skipped'> {
    // Check for duplicate (externalId + fonte unique index)
    const existing = await this.contractPriceRepository.findOne({
      where: {
        externalId: priceRef.id,
        fonte: ContractPriceFonte.PNCP,
      },
    });

    if (existing) {
      return 'skipped';
    }

    // Normalize data
    const normalized = this.normalizePriceReference(priceRef);

    // Create entity
    const contractPrice = this.contractPriceRepository.create({
      ...normalized,
      organizationId: null, // Global data, not tenant-specific
    });

    // Save to database
    await this.contractPriceRepository.save(contractPrice);

    return 'collected';
  }

  /**
   * Normalize a price reference to ContractPrice format
   *
   * @param priceRef Price reference from PNCP
   * @returns Normalized data ready for storage
   */
  private normalizePriceReference(
    priceRef: GovApiPriceReference,
  ): NormalizedPriceData {
    // Map modalidade from PNCP to our enum
    const modalidade = this.mapModalidade(
      priceRef.metadata?.modalidadeId as number | undefined,
    );

    // Parse date from mesReferencia (YYYY-MM format) or use fetchedAt
    const dataHomologacao = this.parseDataHomologacao(priceRef);

    // Extract UF from metadata or default
    const uf = priceRef.uf?.toUpperCase() || 'BR';

    // Normalize unit
    const unidade = this.normalizeUnidade(priceRef.unidade);

    // Extract supplier info from metadata
    const fornecedor = priceRef.metadata?.fornecedor as
      | { cpfCnpj?: string; nomeRazaoSocial?: string }
      | undefined;

    return {
      codigoItem: priceRef.codigo,
      descricao: priceRef.descricao,
      unidade,
      precoUnitario: priceRef.precoUnitario,
      quantidade: (priceRef.metadata?.quantidade as number) || 1,
      valorTotal:
        priceRef.precoUnitario *
        ((priceRef.metadata?.quantidade as number) || 1),
      dataHomologacao,
      modalidade,
      fonte: ContractPriceFonte.PNCP,
      externalId: priceRef.id,
      uasgCodigo: (priceRef.metadata?.uasgCodigo as string) || null,
      uasgNome:
        (priceRef.metadata?.orgaoNome as string) ||
        (priceRef.metadata?.uasgNome as string) ||
        'Órgão não informado',
      uf,
      municipio: (priceRef.metadata?.municipio as string) || null,
      cnpjFornecedor: fornecedor?.cpfCnpj?.replace(/\D/g, '') || null,
      razaoSocial: fornecedor?.nomeRazaoSocial || null,
      numeroProcesso: (priceRef.metadata?.numeroProcesso as string) || null,
      urlOrigem: priceRef.url || null,
      metadata: {
        marca: priceRef.metadata?.marca as string,
        modelo: priceRef.metadata?.modelo as string,
        tipoContrato: priceRef.metadata?.tipoContrato as string,
        codigoCatmat: priceRef.metadata?.codigoCatmat as string,
        codigoCatser: priceRef.metadata?.codigoCatser as string,
        situacaoItem: priceRef.metadata?.situacaoItem as string,
        objetoContrato: priceRef.metadata?.objetoContrato as string,
        categoria: priceRef.categoria,
        desonerado: priceRef.desonerado,
      },
      fetchedAt: priceRef.fetchedAt,
    };
  }

  /**
   * Map PNCP modalidade ID to our enum
   */
  private mapModalidade(modalidadeId?: number): ContractPriceModalidade {
    if (!modalidadeId) {
      return ContractPriceModalidade.OUTROS;
    }

    const mapping: Record<number, ContractPriceModalidade> = {
      1: ContractPriceModalidade.LEILAO, // Leilão - Eletrônico
      2: ContractPriceModalidade.DIALOGO_COMPETITIVO,
      3: ContractPriceModalidade.CONCURSO,
      4: ContractPriceModalidade.CONCORRENCIA, // Concorrência - Eletrônica
      5: ContractPriceModalidade.CONCORRENCIA, // Concorrência - Presencial
      6: ContractPriceModalidade.PREGAO_ELETRONICO,
      7: ContractPriceModalidade.PREGAO_PRESENCIAL,
      8: ContractPriceModalidade.DISPENSA,
      9: ContractPriceModalidade.INEXIGIBILIDADE,
      10: ContractPriceModalidade.OUTROS, // Manifestação de Interesse
      11: ContractPriceModalidade.OUTROS, // Pré-qualificação
      12: ContractPriceModalidade.CREDENCIAMENTO,
      13: ContractPriceModalidade.LEILAO, // Leilão - Presencial
    };

    return mapping[modalidadeId] || ContractPriceModalidade.OUTROS;
  }

  /**
   * Parse dataHomologacao from price reference
   */
  private parseDataHomologacao(priceRef: GovApiPriceReference): Date {
    // Try mesReferencia first (YYYY-MM format)
    if (priceRef.mesReferencia) {
      const [year, month] = priceRef.mesReferencia.split('-').map(Number);
      if (year && month) {
        return new Date(year, month - 1, 1);
      }
    }

    // Try metadata.dataAssinatura or dataPublicacaoPncp
    if (priceRef.metadata?.dataAssinatura) {
      const date = new Date(priceRef.metadata.dataAssinatura as string);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    if (priceRef.metadata?.dataPublicacaoPncp) {
      const date = new Date(priceRef.metadata.dataPublicacaoPncp as string);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Default to fetchedAt
    return priceRef.fetchedAt;
  }

  /**
   * Normalize unit of measurement
   */
  private normalizeUnidade(unidade: string): string {
    const normalized = unidade?.toUpperCase().trim() || 'UN';

    // Common normalizations
    const mapping: Record<string, string> = {
      UNIDADE: 'UN',
      UNID: 'UN',
      UND: 'UN',
      QUILOGRAMA: 'KG',
      QUILO: 'KG',
      METRO: 'M',
      METROS: 'M',
      'METRO QUADRADO': 'M2',
      'METROS QUADRADOS': 'M2',
      'METRO CUBICO': 'M3',
      'METROS CUBICOS': 'M3',
      LITRO: 'L',
      LITROS: 'L',
      HORA: 'H',
      HORAS: 'H',
      DIA: 'D',
      DIAS: 'D',
      MES: 'MES',
      MESES: 'MES',
      PACOTE: 'PCT',
      CAIXA: 'CX',
      LATA: 'LT',
      ROLO: 'RL',
      FOLHA: 'FL',
      RESMA: 'RESMA',
      GALAO: 'GL',
      SACO: 'SC',
      BALDE: 'BD',
      FRASCO: 'FR',
    };

    return mapping[normalized] || normalized;
  }

  /**
   * Get collection statistics
   *
   * @returns Statistics about collected data
   */
  async getCollectionStats(): Promise<CollectionStats> {
    // Total records
    const totalRecords = await this.contractPriceRepository.count();

    // Count by source
    const bySourceRaw = await this.contractPriceRepository
      .createQueryBuilder('cp')
      .select('cp.fonte', 'fonte')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cp.fonte')
      .getRawMany();

    const bySource: Record<ContractPriceFonte, number> = {
      [ContractPriceFonte.PNCP]: 0,
      [ContractPriceFonte.COMPRASGOV]: 0,
    };
    for (const row of bySourceRaw) {
      bySource[row.fonte as ContractPriceFonte] = parseInt(row.count, 10);
    }

    // Count by UF (top 10)
    const byUfRaw = await this.contractPriceRepository
      .createQueryBuilder('cp')
      .select('cp.uf', 'uf')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cp.uf')
      .orderBy('count', 'DESC')
      .limit(27)
      .getRawMany();

    const byUf: Record<string, number> = {};
    for (const row of byUfRaw) {
      byUf[row.uf] = parseInt(row.count, 10);
    }

    // Count by modalidade
    const byModalidadeRaw = await this.contractPriceRepository
      .createQueryBuilder('cp')
      .select('cp.modalidade', 'modalidade')
      .addSelect('COUNT(*)', 'count')
      .groupBy('cp.modalidade')
      .getRawMany();

    const byModalidade: Record<ContractPriceModalidade, number> = {
      [ContractPriceModalidade.PREGAO_ELETRONICO]: 0,
      [ContractPriceModalidade.PREGAO_PRESENCIAL]: 0,
      [ContractPriceModalidade.CONCORRENCIA]: 0,
      [ContractPriceModalidade.DISPENSA]: 0,
      [ContractPriceModalidade.INEXIGIBILIDADE]: 0,
      [ContractPriceModalidade.LEILAO]: 0,
      [ContractPriceModalidade.DIALOGO_COMPETITIVO]: 0,
      [ContractPriceModalidade.CONCURSO]: 0,
      [ContractPriceModalidade.CREDENCIAMENTO]: 0,
      [ContractPriceModalidade.OUTROS]: 0,
    };
    for (const row of byModalidadeRaw) {
      byModalidade[row.modalidade as ContractPriceModalidade] = parseInt(
        row.count,
        10,
      );
    }

    // Date range
    const oldest = await this.contractPriceRepository.findOne({
      order: { dataHomologacao: 'ASC' },
    });
    const newest = await this.contractPriceRepository.findOne({
      order: { dataHomologacao: 'DESC' },
    });

    // Last collection (newest fetchedAt)
    const lastCollected = await this.contractPriceRepository.findOne({
      order: { fetchedAt: 'DESC' },
    });

    return {
      totalRecords,
      bySource,
      byUf,
      byModalidade,
      dateRange: {
        oldest: oldest?.dataHomologacao || null,
        newest: newest?.dataHomologacao || null,
      },
      lastCollection: lastCollected?.fetchedAt || null,
    };
  }

  /**
   * Get scheduler status
   *
   * @returns Current scheduler status
   */
  getSchedulerStatus(): SchedulerStatus {
    return { ...this.schedulerStatus };
  }

  /**
   * Scheduled weekly collection (Sunday at 3:00 AM)
   *
   * Collects prices from the last 30 days.
   * Can be disabled via CONTRACT_PRICE_COLLECTOR_ENABLED env var.
   */
  @Cron(WEEKLY_COLLECTION_CRON)
  async scheduledCollection(): Promise<void> {
    // Check if scheduler is enabled
    const enabled =
      this.configService.get<string>('CONTRACT_PRICE_COLLECTOR_ENABLED') !==
      'false';

    if (!enabled) {
      this.logger.log('Scheduled collection is disabled');
      this.schedulerStatus.enabled = false;
      return;
    }

    this.logger.log('Starting scheduled weekly collection');
    this.schedulerStatus.status = 'running';

    try {
      // Calculate date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - DEFAULT_COLLECTION_DAYS * 24 * 60 * 60 * 1000,
      );

      const result = await this.collectFromPncp({
        dataInicial: this.formatDate(startDate),
        dataFinal: this.formatDate(endDate),
      });

      this.schedulerStatus.lastRun = new Date();

      // Check if there were critical errors (collection failed message)
      if (result.errors?.some((e) => e.startsWith('Collection failed:'))) {
        const errorMsg =
          result.errors.find((e) => e.startsWith('Collection failed:')) ||
          'Unknown collection error';
        this.schedulerStatus.status = 'error';
        this.schedulerStatus.lastError = errorMsg.replace(
          'Collection failed: ',
          '',
        );
        this.logger.error(`Scheduled collection failed: ${errorMsg}`);
      } else {
        this.schedulerStatus.status = 'idle';
        this.schedulerStatus.lastError = undefined;
        this.logger.log(
          `Scheduled collection complete: ${result.collected} collected, ${result.skipped} skipped`,
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.schedulerStatus.status = 'error';
      this.schedulerStatus.lastError = errorMsg;
      this.logger.error(`Scheduled collection failed: ${errorMsg}`);
    }
  }

  /**
   * Format date to YYYYMMDD string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

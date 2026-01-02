/**
 * Government Search Service
 *
 * Unified search service that orchestrates searches across all government APIs:
 * - PNCP (Portal Nacional de Contratações Públicas)
 * - Compras.gov.br (SIASG)
 * - SINAPI (Sistema Nacional de Pesquisa de Custos)
 * - SICRO (Sistema de Custos Rodoviários)
 *
 * Features:
 * - Parallel search across multiple sources
 * - Result deduplication by CNPJ + similar object
 * - Unified relevance scoring
 * - Fallback to Exa when results are insufficient
 * - Comprehensive logging of source attribution
 *
 * @module modules/gov-api/gov-search
 * @see https://github.com/CONFENGE/etp-express/issues/695
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ComprasGovService } from '../compras-gov/compras-gov.service';
import { PncpService } from '../pncp/pncp.service';
import { SinapiService } from '../sinapi/sinapi.service';
import { SicroService } from '../sicro/sicro.service';
import { ExaService } from '../../search/exa/exa.service';
import {
  GovApiContract,
  GovApiPriceReference,
} from '../interfaces/gov-api.interface';
import {
  GovSearchOptions,
  GovSearchResult,
  DEFAULT_EXA_FALLBACK_THRESHOLD,
  DEFAULT_MAX_PER_SOURCE,
} from './gov-search.types';
import {
  SearchStatus,
  SourceStatus,
  calculateOverallStatus,
  getStatusMessage,
} from '../types/search-result';
import { createHash } from 'crypto';

/**
 * Similarity threshold for deduplication (0-1)
 * Two contracts with similarity >= 0.85 are considered duplicates
 */
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Individual timeout for each API source (in milliseconds)
 * Each source gets 5s to respond before timing out
 * This prevents slow sources from blocking the entire search
 * @see https://github.com/CONFENGE/etp-express/issues/1061
 */
const INDIVIDUAL_SOURCE_TIMEOUT_MS = 5000;

/**
 * Wraps a promise with a timeout
 * If the promise doesn't resolve within the timeout, it rejects with a timeout error
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param sourceName - Name of the source for error messages
 * @returns Promise that resolves with the result or rejects with timeout error
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  sourceName: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `Timeout: ${sourceName} did not respond within ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

@Injectable()
export class GovSearchService {
  private readonly logger = new Logger(GovSearchService.name);
  private readonly exaFallbackThreshold: number;

  constructor(
    private readonly comprasGovService: ComprasGovService,
    private readonly pncpService: PncpService,
    private readonly sinapiService: SinapiService,
    private readonly sicroService: SicroService,
    private readonly exaService: ExaService,
    private readonly configService: ConfigService,
  ) {
    this.exaFallbackThreshold = this.configService.get<number>(
      'EXA_FALLBACK_THRESHOLD',
      DEFAULT_EXA_FALLBACK_THRESHOLD,
    );
  }

  /**
   * Unified search across all government data sources
   *
   * @param query - Search query string
   * @param options - Search options
   * @returns Consolidated search results
   *
   * @example
   * ```typescript
   * const results = await govSearchService.search('pavimentação asfaltica', {
   * includePrecos: true,
   * isInfrastructure: true,
   * uf: 'DF',
   * });
   * ```
   */
  async search(
    query: string,
    options: GovSearchOptions = {},
  ): Promise<GovSearchResult> {
    const startTime = Date.now();
    this.logger.log(`Starting unified government search: "${query}"`);

    const {
      includePrecos = false,
      isInfrastructure = false,
      isConstrucaoCivil = false,
      maxPerSource = DEFAULT_MAX_PER_SOURCE,
      startDate,
      endDate,
      uf,
      mesReferencia,
      enableExaFallback = true,
    } = options;

    // 1. Search contracts in parallel (PNCP + Compras.gov.br)
    // Now returns full response with status info
    // Each source has individual timeout to prevent slow sources from blocking
    const contractPromises = [
      withTimeout(
        this.searchComprasGovWithStatus(query, {
          startDate,
          endDate,
          uf,
          maxPerSource,
        }),
        INDIVIDUAL_SOURCE_TIMEOUT_MS,
        'Compras.gov.br',
      ),
      withTimeout(
        this.searchPncpWithStatus(query, {
          startDate,
          endDate,
          uf,
          maxPerSource,
        }),
        INDIVIDUAL_SOURCE_TIMEOUT_MS,
        'PNCP',
      ),
    ];

    // 2. Search prices if requested
    // Each source has individual timeout to prevent slow sources from blocking
    const pricePromises: Promise<{
      data: GovApiPriceReference[];
      status: SourceStatus;
    }>[] = [];
    if (includePrecos) {
      if (isConstrucaoCivil) {
        pricePromises.push(
          withTimeout(
            this.searchSinapiWithStatus(query, {
              uf,
              mesReferencia,
              maxPerSource,
            }),
            INDIVIDUAL_SOURCE_TIMEOUT_MS,
            'SINAPI',
          ),
        );
      }
      if (isInfrastructure) {
        pricePromises.push(
          withTimeout(
            this.searchSicroWithStatus(query, {
              uf,
              mesReferencia,
              maxPerSource,
            }),
            INDIVIDUAL_SOURCE_TIMEOUT_MS,
            'SICRO',
          ),
        );
      }
    }

    // 3. Execute searches in parallel (separate contracts and prices)
    const contractResults = await Promise.allSettled(contractPromises);
    const priceResults = await Promise.allSettled(pricePromises);

    // 4. Extract results and collect source statuses
    const sourceStatuses: SourceStatus[] = [];

    // Extract contract results with status
    const siasgResult = this.extractResultWithStatus<GovApiContract>(
      contractResults[0],
      'comprasgov',
    );
    const pncpResult = this.extractResultWithStatus<GovApiContract>(
      contractResults[1],
      'pncp',
    );

    sourceStatuses.push(siasgResult.status);
    sourceStatuses.push(pncpResult.status);

    // Extract price results with status
    let priceIndex = 0;
    let sinapiResults: GovApiPriceReference[] = [];
    let sicroResults: GovApiPriceReference[] = [];

    if (includePrecos && isConstrucaoCivil) {
      const sinapiResult = this.extractResultWithStatus<GovApiPriceReference>(
        priceResults[priceIndex++],
        'sinapi',
      );
      sinapiResults = sinapiResult.data;
      sourceStatuses.push(sinapiResult.status);
    }

    if (includePrecos && isInfrastructure) {
      const sicroResult = this.extractResultWithStatus<GovApiPriceReference>(
        priceResults[priceIndex],
        'sicro',
      );
      sicroResults = sicroResult.data;
      sourceStatuses.push(sicroResult.status);
    }

    // 5. Consolidate and deduplicate contract results
    const consolidatedContracts = this.consolidateContracts([
      ...siasgResult.data,
      ...pncpResult.data,
    ]);

    this.logger.log(
      `Found ${consolidatedContracts.length} contracts after deduplication`,
    );

    // 6. Check if fallback to Exa is needed
    let fallbackUsed = false;
    if (
      enableExaFallback &&
      consolidatedContracts.length < this.exaFallbackThreshold
    ) {
      this.logger.warn(
        `Insufficient results (${consolidatedContracts.length} < ${this.exaFallbackThreshold}), using Exa fallback`,
      );
      const exaResults = await this.searchExaFallback(query);
      consolidatedContracts.push(...exaResults);
      fallbackUsed = true;

      // Add Exa to source statuses
      sourceStatuses.push({
        name: 'exa',
        status: SearchStatus.SUCCESS,
        resultCount: exaResults.length,
      });
    }

    // 7. Calculate overall status
    const overallStatus = calculateOverallStatus(sourceStatuses);
    const failedSources = sourceStatuses
      .filter((s) => s.status !== SearchStatus.SUCCESS)
      .map((s) => s.name as string);

    // 8. Build response with status info
    const sources = [
      'compras.gov.br',
      'pncp',
      ...(includePrecos && isConstrucaoCivil ? ['sinapi'] : []),
      ...(includePrecos && isInfrastructure ? ['sicro'] : []),
      ...(fallbackUsed ? ['exa'] : []),
    ];

    const result: GovSearchResult = {
      contracts: consolidatedContracts,
      prices: {
        sinapi: sinapiResults,
        sicro: sicroResults,
      },
      sources,
      fallbackUsed,
      totalResults:
        consolidatedContracts.length +
        sinapiResults.length +
        sicroResults.length,
      query,
      timestamp: new Date(),
      cached: false, // TODO: Implement caching
      status: overallStatus,
      sourceStatuses,
      statusMessage: getStatusMessage(overallStatus, failedSources),
    };

    const duration = Date.now() - startTime;
    this.logger.log(
      `Unified search completed in ${duration}ms with status: ${overallStatus}`,
    );

    return result;
  }

  /**
   * Search Compras.gov.br (SIASG) for contracts
   */
  private async searchComprasGov(
    query: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      uf?: string;
      maxPerSource: number;
    },
  ): Promise<GovApiContract[]> {
    try {
      this.logger.log('Searching Compras.gov.br (SIASG)');
      const response = await this.comprasGovService.search(query, {
        startDate: options.startDate,
        endDate: options.endDate,
        uf: options.uf,
        perPage: options.maxPerSource,
      });

      this.logger.log(
        `Compras.gov.br returned ${response.data.length} results`,
      );
      return response.data as GovApiContract[];
    } catch (error) {
      this.logger.error(
        `Error searching Compras.gov.br: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Search PNCP for contracts
   */
  private async searchPncp(
    query: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      uf?: string;
      maxPerSource: number;
    },
  ): Promise<GovApiContract[]> {
    try {
      this.logger.log('Searching PNCP');
      const response = await this.pncpService.search(query, {
        startDate: options.startDate,
        endDate: options.endDate,
        uf: options.uf,
        perPage: options.maxPerSource,
      });

      this.logger.log(`PNCP returned ${response.data.length} results`);
      return response.data as GovApiContract[];
    } catch (error) {
      this.logger.error(`Error searching PNCP: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Search SINAPI for price references
   */
  private async searchSinapi(
    query: string,
    options: {
      uf?: string;
      mesReferencia?: string;
      maxPerSource: number;
    },
  ): Promise<GovApiPriceReference[]> {
    try {
      this.logger.log('Searching SINAPI');
      const response = await this.sinapiService.search(query, {
        uf: options.uf,
        mesReferencia: options.mesReferencia,
        perPage: options.maxPerSource,
      });

      this.logger.log(`SINAPI returned ${response.data.length} results`);
      return response.data as GovApiPriceReference[];
    } catch (error) {
      this.logger.error(
        `Error searching SINAPI: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Search SICRO for price references
   */
  private async searchSicro(
    query: string,
    options: {
      uf?: string;
      mesReferencia?: string;
      maxPerSource: number;
    },
  ): Promise<GovApiPriceReference[]> {
    try {
      this.logger.log('Searching SICRO');
      const response = await this.sicroService.search(query, {
        uf: options.uf,
        mesReferencia: options.mesReferencia,
        perPage: options.maxPerSource,
      });

      this.logger.log(`SICRO returned ${response.data.length} results`);
      return response.data as GovApiPriceReference[];
    } catch (error) {
      this.logger.error(`Error searching SICRO: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Fallback search using Exa when government sources return insufficient results
   */
  private async searchExaFallback(query: string): Promise<GovApiContract[]> {
    try {
      this.logger.log('Executing Exa fallback search');
      const exaResponse = await this.exaService.searchSimple(
        `licitação pública brasil ${query}`,
      );

      // Transform Exa results to GovApiContract format
      const contracts: GovApiContract[] = exaResponse.results.map((result) => {
        const url = result.url || 'https://example.com';
        return {
          id: createHash('sha256').update(url).digest('hex').substring(0, 16),
          title: result.title,
          description: result.snippet || result.title,
          source: 'comprasgov' as const, // Mark as comprasgov to maintain type compatibility
          url,
          relevance: result.relevance,
          metadata: { exaFallback: true },
          fetchedAt: new Date(),
          numero: 'EXA-' + url.substring(0, 10),
          ano: new Date().getFullYear(),
          orgaoContratante: {
            cnpj: '00000000000000',
            nome: 'Fonte Externa',
            uf: 'BR',
          },
          objeto: result.snippet || result.title,
          valorTotal: 0,
          modalidade: 'Não especificado',
          status: 'Informação externa',
          dataPublicacao: new Date(),
        };
      });

      this.logger.log(`Exa fallback returned ${contracts.length} results`);
      return contracts;
    } catch (error) {
      this.logger.error(`Error in Exa fallback: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Search Compras.gov.br with full status info
   */
  private async searchComprasGovWithStatus(
    query: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      uf?: string;
      maxPerSource: number;
    },
  ): Promise<{ data: GovApiContract[]; status: SourceStatus }> {
    const startTime = Date.now();
    try {
      this.logger.log('Searching Compras.gov.br (SIASG)');
      const response = await this.comprasGovService.search(query, {
        startDate: options.startDate,
        endDate: options.endDate,
        uf: options.uf,
        perPage: options.maxPerSource,
      });

      const latencyMs = Date.now() - startTime;
      this.logger.log(
        `Compras.gov.br returned ${response.data.length} results`,
      );

      return {
        data: response.data as GovApiContract[],
        status: {
          name: 'comprasgov',
          status: response.status || SearchStatus.SUCCESS,
          resultCount: response.data.length,
          latencyMs,
          error:
            response.status !== SearchStatus.SUCCESS
              ? response.statusMessage
              : undefined,
        },
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error searching Compras.gov.br: ${errorMessage}`);

      return {
        data: [],
        status: {
          name: 'comprasgov',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: errorMessage,
          latencyMs,
          resultCount: 0,
        },
      };
    }
  }

  /**
   * Search PNCP with full status info
   */
  private async searchPncpWithStatus(
    query: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      uf?: string;
      maxPerSource: number;
    },
  ): Promise<{ data: GovApiContract[]; status: SourceStatus }> {
    const startTime = Date.now();
    try {
      this.logger.log('Searching PNCP');
      const response = await this.pncpService.search(query, {
        startDate: options.startDate,
        endDate: options.endDate,
        uf: options.uf,
        perPage: options.maxPerSource,
      });

      const latencyMs = Date.now() - startTime;
      this.logger.log(`PNCP returned ${response.data.length} results`);

      return {
        data: response.data as GovApiContract[],
        status: {
          name: 'pncp',
          status: response.status || SearchStatus.SUCCESS,
          resultCount: response.data.length,
          latencyMs,
          error:
            response.status !== SearchStatus.SUCCESS
              ? response.statusMessage
              : undefined,
        },
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error searching PNCP: ${errorMessage}`);

      return {
        data: [],
        status: {
          name: 'pncp',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: errorMessage,
          latencyMs,
          resultCount: 0,
        },
      };
    }
  }

  /**
   * Search SINAPI with full status info
   */
  private async searchSinapiWithStatus(
    query: string,
    options: {
      uf?: string;
      mesReferencia?: string;
      maxPerSource: number;
    },
  ): Promise<{ data: GovApiPriceReference[]; status: SourceStatus }> {
    const startTime = Date.now();
    try {
      this.logger.log('Searching SINAPI');
      const response = await this.sinapiService.search(query, {
        uf: options.uf,
        mesReferencia: options.mesReferencia,
        perPage: options.maxPerSource,
      });

      const latencyMs = Date.now() - startTime;
      this.logger.log(`SINAPI returned ${response.data.length} results`);

      return {
        data: response.data as GovApiPriceReference[],
        status: {
          name: 'sinapi',
          status: response.status || SearchStatus.SUCCESS,
          resultCount: response.data.length,
          latencyMs,
        },
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error searching SINAPI: ${errorMessage}`);

      return {
        data: [],
        status: {
          name: 'sinapi',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: errorMessage,
          latencyMs,
          resultCount: 0,
        },
      };
    }
  }

  /**
   * Search SICRO with full status info
   */
  private async searchSicroWithStatus(
    query: string,
    options: {
      uf?: string;
      mesReferencia?: string;
      maxPerSource: number;
    },
  ): Promise<{ data: GovApiPriceReference[]; status: SourceStatus }> {
    const startTime = Date.now();
    try {
      this.logger.log('Searching SICRO');
      const response = await this.sicroService.search(query, {
        uf: options.uf,
        mesReferencia: options.mesReferencia,
        perPage: options.maxPerSource,
      });

      const latencyMs = Date.now() - startTime;
      this.logger.log(`SICRO returned ${response.data.length} results`);

      return {
        data: response.data as GovApiPriceReference[],
        status: {
          name: 'sicro',
          status: response.status || SearchStatus.SUCCESS,
          resultCount: response.data.length,
          latencyMs,
        },
      };
    } catch (error: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error searching SICRO: ${errorMessage}`);

      return {
        data: [],
        status: {
          name: 'sicro',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: errorMessage,
          latencyMs,
          resultCount: 0,
        },
      };
    }
  }

  /**
   * Extract result from Promise.allSettled result
   * @deprecated Use extractResultWithStatus instead
   */
  private extractResult<T>(result: PromiseSettledResult<T[]>): T[] {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      this.logger.warn(`Promise rejected: ${result.reason}`);
      return [];
    }
  }

  /**
   * Extract result with status info from Promise.allSettled result
   */
  private extractResultWithStatus<T>(
    result: PromiseSettledResult<{ data: T[]; status: SourceStatus }>,
    sourceName: string,
  ): { data: T[]; status: SourceStatus } {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      this.logger.warn(`Promise rejected for ${sourceName}: ${result.reason}`);
      return {
        data: [],
        status: {
          name: sourceName,
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: String(result.reason),
          resultCount: 0,
        },
      };
    }
  }

  /**
   * Consolidate and deduplicate contract results
   *
   * Deduplication strategy:
   * 1. Group by orgaoContratante.cnpj
   * 2. Compare objeto similarity using Levenshtein distance
   * 3. Keep highest relevance score when duplicates found
   */
  private consolidateContracts(contracts: GovApiContract[]): GovApiContract[] {
    // Group contracts by CNPJ
    const byOrg = new Map<string, GovApiContract[]>();

    for (const contract of contracts) {
      const cnpj = contract.orgaoContratante.cnpj || 'unknown';
      const existing = byOrg.get(cnpj) || [];
      existing.push(contract);
      byOrg.set(cnpj, existing);
    }

    // For each CNPJ group, deduplicate by objeto similarity
    const consolidated: GovApiContract[] = [];

    for (const [, orgContracts] of byOrg) {
      const deduplicated: GovApiContract[] = [];

      for (const contract of orgContracts) {
        // Check if similar contract already exists in deduplicated list
        let isDuplicate = false;
        let duplicateIndex = -1;

        for (let i = 0; i < deduplicated.length; i++) {
          const similarity = this.calculateSimilarity(
            deduplicated[i].objeto,
            contract.objeto,
          );

          if (similarity >= SIMILARITY_THRESHOLD) {
            isDuplicate = true;
            duplicateIndex = i;
            break;
          }
        }

        if (isDuplicate && duplicateIndex >= 0) {
          // Keep the one with higher relevance
          if (contract.relevance > deduplicated[duplicateIndex].relevance) {
            this.logger.debug(
              `Replaced duplicate (higher relevance): ${contract.numero}`,
            );
            deduplicated[duplicateIndex] = contract;
          } else {
            this.logger.debug(`Skipped duplicate: ${contract.numero}`);
          }
        } else {
          deduplicated.push(contract);
        }
      }

      consolidated.push(...deduplicated);
    }

    // Sort by relevance descending
    consolidated.sort((a, b) => b.relevance - a.relevance);

    this.logger.log(
      `Deduplication: ${contracts.length} → ${consolidated.length}`,
    );

    return consolidated;
  }

  /**
   * Generate deduplication key from contract (CNPJ only)
   */
  private generateDedupKey(contract: GovApiContract): string {
    return contract.orgaoContratante.cnpj || 'unknown';
  }

  /**
   * Calculate text similarity using Levenshtein distance
   * Returns similarity score between 0 and 1
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const s1 = this.normalizeText(text1);
    const s2 = this.normalizeText(text2);

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    if (maxLength === 0) return 1;

    return 1 - distance / maxLength;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Get health status of all government API sources
   */
  async healthCheck(): Promise<Record<string, unknown>> {
    const [comprasGov, pncp, sinapi, sicro] = await Promise.allSettled([
      this.comprasGovService.healthCheck(),
      this.pncpService.healthCheck(),
      this.sinapiService.healthCheck(),
      this.sicroService.healthCheck(),
    ]);

    return {
      comprasGov: comprasGov.status === 'fulfilled' ? comprasGov.value : null,
      pncp: pncp.status === 'fulfilled' ? pncp.value : null,
      sinapi: sinapi.status === 'fulfilled' ? sinapi.value : null,
      sicro: sicro.status === 'fulfilled' ? sicro.value : null,
    };
  }

  /**
   * Get combined cache statistics from all sources
   */
  getCacheStats(): Record<string, unknown> {
    return {
      comprasGov: this.comprasGovService.getCacheStats(),
      pncp: this.pncpService.getCacheStats(),
      sinapi: this.sinapiService.getCacheStats(),
      sicro: this.sicroService.getCacheStats(),
    };
  }
}

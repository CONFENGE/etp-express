import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PriceBenchmark,
  OrgaoPorte,
} from '../../../entities/price-benchmark.entity';
import { NormalizedContractItem } from '../../../entities/normalized-contract-item.entity';
import { ItemCategory } from '../../../entities/item-category.entity';
import { ContractPrice } from '../../../entities/contract-price.entity';
import {
  BenchmarkQueryDto,
  BenchmarkResponseDto,
  PriceComparisonDto,
  PriceComparisonResultDto,
  PriceRisk,
  BenchmarkCalculationOptionsDto,
  BenchmarkStatsDto,
  RegionalBreakdownResponseDto,
  RegionalBreakdownItemDto,
  PriceRangeDto,
  PeriodDto,
} from '../dto/regional-benchmark.dto';

/**
 * Brazilian state names mapping.
 */
const UF_NAMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
  BR: 'Brasil (Nacional)',
};

/**
 * All Brazilian UF codes.
 */
const ALL_UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

/**
 * Default configuration values.
 */
const DEFAULT_PERIOD_MONTHS = 12;
const DEFAULT_MIN_SAMPLE_SIZE = 5;

/**
 * RegionalBenchmarkService - Calculate and query regional price benchmarks.
 *
 * This service provides market intelligence through:
 * - Regional price benchmarks by category and UF
 * - Price comparison against benchmarks
 * - Overprice risk assessment
 * - Historical trend analysis
 *
 * Key Features:
 * - Statistical calculations: mean, median, percentiles, stddev
 * - Regional segmentation by 27 states + national
 * - Organization size segmentation (small/medium/large)
 * - Scheduled recalculation at 4 AM daily
 *
 * Part of M13: Market Intelligence milestone.
 *
 * @see PriceBenchmark for data storage
 * @see Issue #1271 for implementation
 * @see Issue #1268 for parent epic
 */
@Injectable()
export class RegionalBenchmarkService {
  private readonly logger = new Logger(RegionalBenchmarkService.name);
  private isCalculating = false;

  constructor(
    @InjectRepository(PriceBenchmark)
    private readonly benchmarkRepo: Repository<PriceBenchmark>,
    @InjectRepository(NormalizedContractItem)
    private readonly normalizedItemRepo: Repository<NormalizedContractItem>,
    @InjectRepository(ItemCategory)
    private readonly categoryRepo: Repository<ItemCategory>,
    @InjectRepository(ContractPrice)
    private readonly contractPriceRepo: Repository<ContractPrice>,
  ) {}

  /**
   * Scheduled task to recalculate all benchmarks.
   * Runs daily at 4 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async scheduledRecalculation(): Promise<void> {
    this.logger.log('Starting scheduled benchmark recalculation');
    try {
      const result = await this.calculateBenchmarks({});
      this.logger.log(
        `Scheduled recalculation completed. Created/updated ${result} benchmarks.`,
      );
    } catch (error) {
      this.logger.error('Scheduled recalculation failed', error);
    }
  }

  /**
   * Calculate benchmarks for all categories and regions.
   *
   * @param options - Calculation options
   * @returns Number of benchmarks created/updated
   */
  async calculateBenchmarks(
    options: BenchmarkCalculationOptionsDto,
  ): Promise<number> {
    if (this.isCalculating) {
      this.logger.warn('Benchmark calculation already in progress, skipping');
      return 0;
    }

    this.isCalculating = true;
    const startTime = Date.now();
    let benchmarkCount = 0;

    try {
      const periodMonths = options.periodMonths || DEFAULT_PERIOD_MONTHS;
      const minSampleSize = options.minSampleSize || DEFAULT_MIN_SAMPLE_SIZE;

      // Calculate period dates
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - periodMonths);

      // Get categories to process
      const categoryFilter = options.categoryId
        ? { id: options.categoryId }
        : { active: true };
      const categories = await this.categoryRepo.find({
        where: categoryFilter,
      });

      this.logger.log(
        `Processing ${categories.length} categories for period ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
      );

      // Process each category
      for (const category of categories) {
        // Calculate national benchmark (BR)
        const nationalBenchmark = await this.calculateCategoryBenchmark(
          category.id,
          'BR',
          OrgaoPorte.TODOS,
          periodStart,
          periodEnd,
          minSampleSize,
        );

        if (nationalBenchmark) {
          await this.upsertBenchmark(nationalBenchmark);
          benchmarkCount++;
        }

        // Calculate regional benchmarks for each UF
        const ufsToProcess = options.uf ? [options.uf] : ALL_UFS;
        for (const uf of ufsToProcess) {
          const regionalBenchmark = await this.calculateCategoryBenchmark(
            category.id,
            uf,
            OrgaoPorte.TODOS,
            periodStart,
            periodEnd,
            minSampleSize,
          );

          if (regionalBenchmark) {
            await this.upsertBenchmark(regionalBenchmark);
            benchmarkCount++;
          }
        }
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `Benchmark calculation completed: ${benchmarkCount} benchmarks in ${elapsed}ms`,
      );

      return benchmarkCount;
    } finally {
      this.isCalculating = false;
    }
  }

  /**
   * Calculate benchmark for a specific category and region.
   */
  private async calculateCategoryBenchmark(
    categoryId: string,
    uf: string,
    orgaoPorte: OrgaoPorte,
    periodStart: Date,
    periodEnd: Date,
    minSampleSize: number,
  ): Promise<Partial<PriceBenchmark> | null> {
    // Build query for normalized items with prices
    const query = this.normalizedItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.originalItem', 'contract')
      .select([
        'item.normalizedPrice as price',
        'item.normalizedUnit as unit',
        'contract.uf as uf',
      ])
      .where('item.categoryId = :categoryId', { categoryId })
      .andWhere('item.normalizedPrice > 0')
      .andWhere(
        'contract.dataHomologacao BETWEEN :periodStart AND :periodEnd',
        {
          periodStart,
          periodEnd,
        },
      );

    // Apply UF filter (BR = all states)
    if (uf !== 'BR') {
      query.andWhere('contract.uf = :uf', { uf });
    }

    // Get raw data
    const rawData = await query.getRawMany();

    // Check minimum sample size
    if (rawData.length < minSampleSize) {
      return null;
    }

    // Extract prices and calculate statistics
    const prices = rawData
      .map((r) => parseFloat(r.price))
      .sort((a, b) => a - b);
    const units = rawData.map((r) => r.unit);
    const dominantUnit = this.getMostCommonUnit(units);

    const stats = this.calculateStatistics(prices);

    return {
      categoryId,
      uf,
      orgaoPorte,
      avgPrice: stats.mean,
      medianPrice: stats.median,
      minPrice: stats.min,
      maxPrice: stats.max,
      p25: stats.p25,
      p75: stats.p75,
      stdDev: stats.stdDev,
      sampleCount: prices.length,
      unit: dominantUnit,
      periodStart,
      periodEnd,
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate statistical measures for a sorted array of prices.
   */
  private calculateStatistics(sortedPrices: number[]): {
    mean: number;
    median: number;
    min: number;
    max: number;
    p25: number;
    p75: number;
    stdDev: number;
  } {
    const n = sortedPrices.length;
    if (n === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, p25: 0, p75: 0, stdDev: 0 };
    }

    // Mean
    const sum = sortedPrices.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Median
    const median =
      n % 2 === 0
        ? (sortedPrices[n / 2 - 1] + sortedPrices[n / 2]) / 2
        : sortedPrices[Math.floor(n / 2)];

    // Min/Max
    const min = sortedPrices[0];
    const max = sortedPrices[n - 1];

    // Percentiles (using linear interpolation)
    const p25 = this.percentile(sortedPrices, 25);
    const p75 = this.percentile(sortedPrices, 75);

    // Standard deviation
    const variance =
      sortedPrices.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { mean, median, min, max, p25, p75, stdDev };
  }

  /**
   * Calculate percentile using linear interpolation.
   */
  private percentile(sortedData: number[], p: number): number {
    const n = sortedData.length;
    if (n === 0) return 0;
    if (n === 1) return sortedData[0];

    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;

    if (upper >= n) return sortedData[n - 1];

    return (
      sortedData[lower] + fraction * (sortedData[upper] - sortedData[lower])
    );
  }

  /**
   * Get the most common unit from an array.
   */
  private getMostCommonUnit(units: string[]): string {
    const counts: Record<string, number> = {};
    units.forEach((unit) => {
      counts[unit] = (counts[unit] || 0) + 1;
    });

    let maxCount = 0;
    let dominantUnit = 'UN';
    Object.entries(counts).forEach(([unit, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantUnit = unit;
      }
    });

    return dominantUnit;
  }

  /**
   * Upsert a benchmark record.
   */
  private async upsertBenchmark(
    benchmark: Partial<PriceBenchmark>,
  ): Promise<void> {
    const existing = await this.benchmarkRepo.findOne({
      where: {
        categoryId: benchmark.categoryId,
        uf: benchmark.uf,
        orgaoPorte: benchmark.orgaoPorte,
      },
    });

    if (existing) {
      await this.benchmarkRepo.update(existing.id, benchmark);
    } else {
      await this.benchmarkRepo.save(this.benchmarkRepo.create(benchmark));
    }
  }

  /**
   * Query benchmarks with filters.
   *
   * @param query - Query parameters
   * @returns Paginated benchmark results
   */
  async getBenchmarks(
    query: BenchmarkQueryDto,
  ): Promise<{ data: BenchmarkResponseDto[]; total: number }> {
    const qb = this.benchmarkRepo
      .createQueryBuilder('benchmark')
      .leftJoinAndSelect('benchmark.category', 'category');

    // Apply filters
    if (query.categoryId) {
      qb.andWhere('benchmark.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.categoryCode) {
      qb.andWhere('category.code = :categoryCode', {
        categoryCode: query.categoryCode,
      });
    }

    if (query.uf) {
      qb.andWhere('benchmark.uf = :uf', { uf: query.uf });
    }

    if (query.orgaoPorte) {
      qb.andWhere('benchmark.orgaoPorte = :orgaoPorte', {
        orgaoPorte: query.orgaoPorte,
      });
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    qb.orderBy('benchmark.sampleCount', 'DESC').skip(skip).take(limit);

    const [benchmarks, total] = await qb.getManyAndCount();

    const data = benchmarks.map((b) => this.toBenchmarkResponse(b));

    return { data, total };
  }

  /**
   * Get benchmark for a specific category.
   *
   * @param categoryId - Category ID or code
   * @returns National benchmark for the category
   */
  async getBenchmarkByCategory(
    categoryId: string,
  ): Promise<BenchmarkResponseDto> {
    // Try to find by ID first, then by code
    let benchmark = await this.benchmarkRepo.findOne({
      where: { categoryId, uf: 'BR', orgaoPorte: OrgaoPorte.TODOS },
      relations: ['category'],
    });

    if (!benchmark) {
      // Try by category code
      const category = await this.categoryRepo.findOne({
        where: { code: categoryId },
      });
      if (category) {
        benchmark = await this.benchmarkRepo.findOne({
          where: {
            categoryId: category.id,
            uf: 'BR',
            orgaoPorte: OrgaoPorte.TODOS,
          },
          relations: ['category'],
        });
      }
    }

    if (!benchmark) {
      throw new NotFoundException(
        `Benchmark not found for category: ${categoryId}`,
      );
    }

    return this.toBenchmarkResponse(benchmark);
  }

  /**
   * Get regional breakdown for a category.
   *
   * @param categoryId - Category ID or code
   * @returns Regional breakdown with all states
   */
  async getRegionalBreakdown(
    categoryId: string,
  ): Promise<RegionalBreakdownResponseDto> {
    // Get category
    let category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      category = await this.categoryRepo.findOne({
        where: { code: categoryId },
      });
    }

    if (!category) {
      throw new NotFoundException(`Category not found: ${categoryId}`);
    }

    // Get national benchmark
    const nationalBenchmark = await this.benchmarkRepo.findOne({
      where: {
        categoryId: category.id,
        uf: 'BR',
        orgaoPorte: OrgaoPorte.TODOS,
      },
      relations: ['category'],
    });

    if (!nationalBenchmark) {
      throw new NotFoundException(
        `National benchmark not found for category: ${categoryId}`,
      );
    }

    // Get regional benchmarks
    const regionalBenchmarks = await this.benchmarkRepo.find({
      where: {
        categoryId: category.id,
        uf: In(ALL_UFS),
        orgaoPorte: OrgaoPorte.TODOS,
      },
      relations: ['category'],
    });

    const regions: RegionalBreakdownItemDto[] = regionalBenchmarks.map((b) => ({
      uf: b.uf,
      stateName: UF_NAMES[b.uf] || b.uf,
      avgPrice: Number(b.avgPrice),
      medianPrice: Number(b.medianPrice),
      sampleCount: b.sampleCount,
      deviationFromNational:
        ((Number(b.medianPrice) - Number(nationalBenchmark.medianPrice)) /
          Number(nationalBenchmark.medianPrice)) *
        100,
    }));

    // Sort by sample count descending
    regions.sort((a, b) => b.sampleCount - a.sampleCount);

    return {
      categoryId: category.id,
      categoryCode: category.code,
      categoryName: category.name,
      national: this.toBenchmarkResponse(nationalBenchmark),
      regions,
    };
  }

  /**
   * Compare a price against the benchmark.
   *
   * @param dto - Price comparison input
   * @returns Comparison result with risk assessment
   */
  async comparePriceToBenchmark(
    dto: PriceComparisonDto,
  ): Promise<PriceComparisonResultDto> {
    // Find the category
    let categoryId = dto.categoryId;
    if (!categoryId && dto.categoryCode) {
      const category = await this.categoryRepo.findOne({
        where: { code: dto.categoryCode },
      });
      if (category) {
        categoryId = category.id;
      }
    }

    if (!categoryId) {
      throw new NotFoundException('Category not found');
    }

    // Get the benchmark (try specific UF first, then national)
    let benchmark = await this.benchmarkRepo.findOne({
      where: {
        categoryId,
        uf: dto.uf,
        orgaoPorte: dto.orgaoPorte || OrgaoPorte.TODOS,
      },
      relations: ['category'],
    });

    // Fallback to national if regional not available
    if (!benchmark) {
      benchmark = await this.benchmarkRepo.findOne({
        where: {
          categoryId,
          uf: 'BR',
          orgaoPorte: dto.orgaoPorte || OrgaoPorte.TODOS,
        },
        relations: ['category'],
      });
    }

    if (!benchmark) {
      throw new NotFoundException(
        `Benchmark not found for category in region: ${dto.uf}`,
      );
    }

    // Calculate deviation
    const medianPrice = Number(benchmark.medianPrice);
    const deviation = ((dto.price - medianPrice) / medianPrice) * 100;

    // Estimate percentile
    const percentile = this.estimatePercentile(dto.price, benchmark);

    // Determine risk
    const risk = this.assessRisk(deviation);

    // Generate suggestion
    const suggestion = this.generateSuggestion(
      dto.price,
      benchmark,
      deviation,
      risk,
    );

    return {
      inputPrice: dto.price,
      benchmark: this.toBenchmarkResponse(benchmark),
      deviation: Math.round(deviation * 100) / 100,
      percentile: Math.round(percentile),
      risk,
      suggestion,
    };
  }

  /**
   * Estimate percentile for a price using normal distribution approximation.
   */
  private estimatePercentile(price: number, benchmark: PriceBenchmark): number {
    const mean = Number(benchmark.avgPrice);
    const stdDev = Number(benchmark.stdDev);

    if (stdDev === 0) {
      return price >= mean ? 100 : 0;
    }

    // Z-score
    const z = (price - mean) / stdDev;

    // Convert to percentile using error function approximation
    // This is a simplified approximation of the cumulative normal distribution
    const sign = z >= 0 ? 1 : -1;
    const absZ = Math.abs(z);
    const t = 1 / (1 + 0.2316419 * absZ);
    const d = 0.3989423 * Math.exp((-absZ * absZ) / 2);
    const p =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return Math.min(100, Math.max(0, (0.5 + sign * (0.5 - p)) * 100));
  }

  /**
   * Assess risk based on deviation from median.
   */
  private assessRisk(deviation: number): PriceRisk {
    if (deviation <= 20) {
      return PriceRisk.LOW;
    } else if (deviation <= 40) {
      return PriceRisk.MEDIUM;
    } else if (deviation <= 60) {
      return PriceRisk.HIGH;
    } else {
      return PriceRisk.CRITICAL;
    }
  }

  /**
   * Generate human-readable suggestion based on comparison.
   */
  private generateSuggestion(
    inputPrice: number,
    benchmark: PriceBenchmark,
    deviation: number,
    risk: PriceRisk,
  ): string {
    const medianPrice = Number(benchmark.medianPrice);
    const p25 = Number(benchmark.p25);
    const p75 = Number(benchmark.p75);

    const formattedInput = inputPrice.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const formattedMedian = medianPrice.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const formattedP25 = p25.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const formattedP75 = p75.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    if (deviation <= 0) {
      return `O preço informado (${formattedInput}) está abaixo ou igual à mediana de mercado (${formattedMedian}). Excelente valor.`;
    }

    switch (risk) {
      case PriceRisk.LOW:
        return `O preço informado (${formattedInput}) está ${Math.abs(deviation).toFixed(1)}% acima da mediana de mercado (${formattedMedian}), dentro da faixa aceitável.`;

      case PriceRisk.MEDIUM:
        return `O preço informado (${formattedInput}) está ${Math.abs(deviation).toFixed(1)}% acima da mediana de mercado (${formattedMedian}). Considere negociar para a faixa ${formattedP25}-${formattedP75}.`;

      case PriceRisk.HIGH:
        return `O preço informado (${formattedInput}) está ${Math.abs(deviation).toFixed(1)}% acima da mediana de mercado (${formattedMedian}). Alerta: TCE pode questionar. Sugestão: ajustar para faixa ${formattedP25}-${formattedP75}.`;

      case PriceRisk.CRITICAL:
        return `O preço informado (${formattedInput}) está ${Math.abs(deviation).toFixed(1)}% acima da mediana de mercado (${formattedMedian}). CRÍTICO: Alta probabilidade de questionamento pelo TCE. Recomendação forte: ajustar para faixa ${formattedP25}-${formattedP75}.`;

      default:
        return `O preço informado está ${Math.abs(deviation).toFixed(1)}% ${deviation > 0 ? 'acima' : 'abaixo'} da mediana de mercado.`;
    }
  }

  /**
   * Get benchmark statistics.
   */
  async getStatistics(): Promise<BenchmarkStatsDto> {
    const [totalBenchmarks, lastBenchmark] = await Promise.all([
      this.benchmarkRepo.count(),
      this.benchmarkRepo.findOne({
        order: { calculatedAt: 'DESC' },
      }),
    ]);

    const categoryStats = await this.benchmarkRepo
      .createQueryBuilder('benchmark')
      .select('COUNT(DISTINCT benchmark.categoryId)', 'categories')
      .getRawOne();

    const stateStats = await this.benchmarkRepo
      .createQueryBuilder('benchmark')
      .select('COUNT(DISTINCT benchmark.uf)', 'states')
      .getRawOne();

    const sampleStats = await this.benchmarkRepo
      .createQueryBuilder('benchmark')
      .select('SUM(benchmark.sampleCount)', 'totalSamples')
      .addSelect('AVG(benchmark.sampleCount)', 'avgSamples')
      .getRawOne();

    return {
      totalBenchmarks,
      categoriesWithBenchmarks: parseInt(categoryStats?.categories || '0'),
      statesWithData: parseInt(stateStats?.states || '0'),
      totalSamples: parseInt(sampleStats?.totalSamples || '0'),
      lastCalculatedAt: lastBenchmark?.calculatedAt || null,
      avgSamplesPerBenchmark: parseFloat(sampleStats?.avgSamples || '0'),
    };
  }

  /**
   * Convert entity to response DTO.
   */
  private toBenchmarkResponse(benchmark: PriceBenchmark): BenchmarkResponseDto {
    const priceRange: PriceRangeDto = {
      min: Number(benchmark.minPrice),
      max: Number(benchmark.maxPrice),
      p25: Number(benchmark.p25),
      p75: Number(benchmark.p75),
    };

    const period: PeriodDto = {
      start: benchmark.periodStart,
      end: benchmark.periodEnd,
    };

    return {
      id: benchmark.id,
      categoryId: benchmark.categoryId,
      categoryCode: benchmark.category?.code || '',
      categoryName: benchmark.category?.name || '',
      uf: benchmark.uf,
      orgaoPorte: benchmark.orgaoPorte,
      avgPrice: Number(benchmark.avgPrice),
      medianPrice: Number(benchmark.medianPrice),
      priceRange,
      stdDev: Number(benchmark.stdDev),
      sampleCount: benchmark.sampleCount,
      unit: benchmark.unit,
      period,
      updatedAt: benchmark.updatedAt,
    };
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  OverpriceAlert,
  AlertLevel,
} from '../../../entities/overprice-alert.entity';
import { ItemCategory } from '../../../entities/item-category.entity';
import { RegionalBenchmarkService } from './regional-benchmark.service';
import { TextSimilarityService } from './text-similarity.service';
import {
  CheckPriceDto,
  CheckPriceResponseDto,
  AcknowledgeAlertDto,
  ListAlertsQueryDto,
  AlertResponseDto,
  AlertListResponseDto,
  AlertSummaryDto,
  AlertThresholdsDto,
} from '../dto/overprice-alert.dto';

/**
 * Default thresholds for alert levels (percentage above median).
 * Can be overridden via environment variables:
 * - OVERPRICE_THRESHOLD_ATTENTION (default: 20)
 * - OVERPRICE_THRESHOLD_WARNING (default: 40)
 * - OVERPRICE_THRESHOLD_CRITICAL (default: 60)
 */
const DEFAULT_THRESHOLDS = {
  attention: 20,
  warning: 40,
  critical: 60,
};

/**
 * OverpriceAlertService - Detect and manage overprice alerts.
 *
 * This service provides overprice detection features (#1272):
 * - Real-time price checking against regional benchmarks
 * - Alert persistence for audit trail
 * - Alert acknowledgment workflow
 * - Alert statistics and summaries
 *
 * Alert Levels:
 * - OK: Price within acceptable range (0-20% above median)
 * - ATTENTION: Price 20-40% above median - user should review
 * - WARNING: Price 40-60% above median - TCE may notice
 * - CRITICAL: Price >60% above median - High risk of TCE questioning
 *
 * Key Features:
 * - Configurable thresholds via environment
 * - Category matching by ID, code, or text similarity
 * - Fallback to national benchmark if regional unavailable
 * - Suggested price ranges based on percentiles
 *
 * @see RegionalBenchmarkService for benchmark data
 * @see Issue #1272 for implementation
 * @see Issue #1268 for parent epic (M13: Market Intelligence)
 */
@Injectable()
export class OverpriceAlertService {
  private readonly logger = new Logger(OverpriceAlertService.name);
  private readonly thresholds: AlertThresholdsDto;

  constructor(
    @InjectRepository(OverpriceAlert)
    private readonly alertRepo: Repository<OverpriceAlert>,
    @InjectRepository(ItemCategory)
    private readonly categoryRepo: Repository<ItemCategory>,
    private readonly benchmarkService: RegionalBenchmarkService,
    private readonly textSimilarityService: TextSimilarityService,
    private readonly configService: ConfigService,
  ) {
    // Load thresholds from config
    this.thresholds = {
      attention:
        this.configService.get<number>('OVERPRICE_THRESHOLD_ATTENTION') ||
        DEFAULT_THRESHOLDS.attention,
      warning:
        this.configService.get<number>('OVERPRICE_THRESHOLD_WARNING') ||
        DEFAULT_THRESHOLDS.warning,
      critical:
        this.configService.get<number>('OVERPRICE_THRESHOLD_CRITICAL') ||
        DEFAULT_THRESHOLDS.critical,
    };

    this.logger.log(
      `Initialized with thresholds: ATTENTION=${this.thresholds.attention}%, WARNING=${this.thresholds.warning}%, CRITICAL=${this.thresholds.critical}%`,
    );
  }

  /**
   * Check a price against the benchmark and optionally persist the alert.
   *
   * @param dto - Price check input
   * @returns CheckPriceResponseDto with alert details
   */
  async checkPrice(dto: CheckPriceDto): Promise<CheckPriceResponseDto> {
    const persistAlert = dto.persistAlert !== false; // Default to true

    // Try to find category
    let categoryId = dto.categoryId;
    let categoryCode: string | undefined;
    let categoryName: string | undefined;

    // Find category by code if provided
    if (!categoryId && dto.categoryCode) {
      const category = await this.categoryRepo.findOne({
        where: { code: dto.categoryCode },
      });
      if (category) {
        categoryId = category.id;
        categoryCode = category.code;
        categoryName = category.name;
      }
    }

    // If still no category, try text similarity matching
    if (!categoryId && dto.itemDescription) {
      const matchedCategory = await this.findCategoryByDescription(
        dto.itemDescription,
      );
      if (matchedCategory) {
        categoryId = matchedCategory.id;
        categoryCode = matchedCategory.code;
        categoryName = matchedCategory.name;
      }
    }

    // Get category details if we have an ID but not the name
    if (categoryId && !categoryName) {
      const category = await this.categoryRepo.findOne({
        where: { id: categoryId },
      });
      if (category) {
        categoryCode = category.code;
        categoryName = category.name;
      }
    }

    // If no category found, return response without benchmark
    if (!categoryId) {
      this.logger.warn(
        `No category found for item: ${dto.itemDescription.substring(0, 50)}...`,
      );
      return this.createNoBenchmarkResponse(dto);
    }

    // Get benchmark comparison
    try {
      const comparison = await this.benchmarkService.comparePriceToBenchmark({
        price: dto.price,
        categoryId,
        uf: dto.uf,
      });

      // Map risk to alert level
      const alertLevel = this.mapRiskToAlertLevel(comparison.deviation);

      // Calculate suggested price range
      const medianPrice = comparison.benchmark.medianPrice;
      const suggestedPriceLow = comparison.benchmark.priceRange.p25;
      const suggestedPriceHigh = comparison.benchmark.priceRange.p75;

      // Generate suggestion message
      const suggestion = this.generateSuggestion(
        dto.price,
        medianPrice,
        comparison.deviation,
        alertLevel,
        suggestedPriceLow,
        suggestedPriceHigh,
      );

      // Persist alert if requested
      let alertId: string | undefined;
      if (persistAlert) {
        const alert = await this.persistAlert({
          etpId: dto.etpId || null,
          categoryId,
          itemCode: dto.itemCode || null,
          itemDescription: dto.itemDescription,
          informedPrice: dto.price,
          medianPrice,
          percentageAbove: comparison.deviation,
          alertLevel,
          suggestion,
          uf: comparison.benchmark.uf,
          suggestedPriceLow,
          suggestedPriceHigh,
          benchmarkSampleCount: comparison.benchmark.sampleCount,
        });
        alertId = alert.id;
      }

      return {
        alertId,
        informedPrice: dto.price,
        medianPrice,
        percentageAbove: Math.round(comparison.deviation * 100) / 100,
        alertLevel,
        suggestion,
        suggestedPriceLow,
        suggestedPriceHigh,
        benchmarkSampleCount: comparison.benchmark.sampleCount,
        benchmarkUf: comparison.benchmark.uf,
        persisted: persistAlert,
        benchmarkAvailable: true,
        category: categoryId
          ? {
              id: categoryId,
              code: categoryCode || '',
              name: categoryName || '',
            }
          : undefined,
      };
    } catch (error) {
      // Benchmark not available
      if (error instanceof NotFoundException) {
        this.logger.warn(
          `Benchmark not found for category ${categoryId} in ${dto.uf}`,
        );
        return this.createNoBenchmarkResponse(dto, {
          id: categoryId,
          code: categoryCode || '',
          name: categoryName || '',
        });
      }
      throw error;
    }
  }

  /**
   * Find category by text similarity to description.
   */
  private async findCategoryByDescription(
    description: string,
  ): Promise<ItemCategory | null> {
    // Get active categories
    const categories = await this.categoryRepo.find({
      where: { active: true },
      select: ['id', 'code', 'name', 'description', 'keywords'],
    });

    if (categories.length === 0) {
      return null;
    }

    // Find best match
    let bestMatch: ItemCategory | null = null;
    let bestScore = 0;
    const threshold = 0.3; // Minimum similarity threshold

    for (const category of categories) {
      // Compare against category name and description using Jaccard similarity
      const nameScore = this.textSimilarityService.jaccardSimilarity(
        description.toLowerCase(),
        category.name.toLowerCase(),
      );

      let descScore = 0;
      if (category.description) {
        descScore = this.textSimilarityService.jaccardSimilarity(
          description.toLowerCase(),
          category.description.toLowerCase(),
        );
      }

      // Check keywords if available
      let keywordScore = 0;
      if (category.keywords && category.keywords.length > 0) {
        const keywordScores = category.keywords.map((kw) =>
          this.textSimilarityService.jaccardSimilarity(
            description.toLowerCase(),
            kw.toLowerCase(),
          ),
        );
        keywordScore = Math.max(...keywordScores);
      }

      // Take best score
      const score = Math.max(nameScore, descScore, keywordScore);

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = category;
      }
    }

    if (bestMatch) {
      this.logger.debug(
        `Matched category ${bestMatch.code} with score ${bestScore.toFixed(3)}`,
      );
    }

    return bestMatch;
  }

  /**
   * Map deviation percentage to alert level.
   */
  private mapRiskToAlertLevel(deviation: number): AlertLevel {
    if (deviation <= this.thresholds.attention) {
      return AlertLevel.OK;
    } else if (deviation <= this.thresholds.warning) {
      return AlertLevel.ATTENTION;
    } else if (deviation <= this.thresholds.critical) {
      return AlertLevel.WARNING;
    } else {
      return AlertLevel.CRITICAL;
    }
  }

  /**
   * Generate human-readable suggestion message.
   */
  private generateSuggestion(
    informedPrice: number,
    medianPrice: number,
    deviation: number,
    alertLevel: AlertLevel,
    suggestedLow: number,
    suggestedHigh: number,
  ): string {
    const formatCurrency = (value: number): string =>
      value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });

    const formattedInformed = formatCurrency(informedPrice);
    const formattedMedian = formatCurrency(medianPrice);
    const formattedLow = formatCurrency(suggestedLow);
    const formattedHigh = formatCurrency(suggestedHigh);
    const absDeviation = Math.abs(deviation).toFixed(1);

    if (deviation <= 0) {
      return `O preço informado (${formattedInformed}) está abaixo ou igual à mediana de mercado (${formattedMedian}). Excelente valor.`;
    }

    switch (alertLevel) {
      case AlertLevel.OK:
        return `O preço informado (${formattedInformed}) está ${absDeviation}% acima da mediana de mercado (${formattedMedian}), dentro da faixa aceitável.`;

      case AlertLevel.ATTENTION:
        return `O preço informado (${formattedInformed}) está ${absDeviation}% acima da mediana de mercado (${formattedMedian}). Atenção: considere negociar para a faixa ${formattedLow}-${formattedHigh}.`;

      case AlertLevel.WARNING:
        return `O preço informado (${formattedInformed}) está ${absDeviation}% acima da mediana de mercado (${formattedMedian}). Alerta: TCE pode questionar. Sugestão: ajustar para faixa ${formattedLow}-${formattedHigh}.`;

      case AlertLevel.CRITICAL:
        return `O preço informado (${formattedInformed}) está ${absDeviation}% acima da mediana de mercado (${formattedMedian}). CRÍTICO: Alta probabilidade de questionamento pelo TCE. Recomendação forte: ajustar para faixa ${formattedLow}-${formattedHigh}.`;

      default:
        return `O preço informado está ${absDeviation}% ${deviation > 0 ? 'acima' : 'abaixo'} da mediana de mercado.`;
    }
  }

  /**
   * Create response when benchmark is not available.
   */
  private createNoBenchmarkResponse(
    dto: CheckPriceDto,
    category?: { id: string; code: string; name: string },
  ): CheckPriceResponseDto {
    return {
      informedPrice: dto.price,
      medianPrice: 0,
      percentageAbove: 0,
      alertLevel: AlertLevel.OK,
      suggestion:
        'Não foi possível comparar o preço com benchmarks de mercado. Dados insuficientes ou categoria não identificada.',
      suggestedPriceLow: 0,
      suggestedPriceHigh: 0,
      benchmarkSampleCount: 0,
      benchmarkUf: dto.uf,
      persisted: false,
      benchmarkAvailable: false,
      category,
    };
  }

  /**
   * Persist an alert to the database.
   */
  private async persistAlert(
    data: Partial<OverpriceAlert>,
  ): Promise<OverpriceAlert> {
    const alert = this.alertRepo.create(data);
    return this.alertRepo.save(alert);
  }

  /**
   * Acknowledge an alert.
   *
   * @param alertId - Alert ID
   * @param userId - User acknowledging the alert
   * @param dto - Acknowledgment details
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string,
    dto: AcknowledgeAlertDto,
  ): Promise<AlertResponseDto> {
    const alert = await this.alertRepo.findOne({
      where: { id: alertId },
      relations: ['category'],
    });

    if (!alert) {
      throw new NotFoundException(`Alert not found: ${alertId}`);
    }

    if (alert.acknowledgedAt) {
      throw new BadRequestException('Alert has already been acknowledged');
    }

    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;
    alert.acknowledgeNote = dto.note || null;

    await this.alertRepo.save(alert);

    return this.toAlertResponse(alert);
  }

  /**
   * Get alerts for an ETP.
   *
   * @param etpId - ETP ID
   * @returns List of alerts
   */
  async getAlertsByEtp(etpId: string): Promise<AlertResponseDto[]> {
    const alerts = await this.alertRepo.find({
      where: { etpId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });

    return alerts.map((a) => this.toAlertResponse(a));
  }

  /**
   * List alerts with filters.
   *
   * @param query - Filter and pagination options
   * @returns Paginated alert list
   */
  async listAlerts(query: ListAlertsQueryDto): Promise<AlertListResponseDto> {
    const qb = this.alertRepo
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.category', 'category');

    // Apply filters
    if (query.etpId) {
      qb.andWhere('alert.etpId = :etpId', { etpId: query.etpId });
    }

    if (query.alertLevel) {
      qb.andWhere('alert.alertLevel = :alertLevel', {
        alertLevel: query.alertLevel,
      });
    }

    if (query.acknowledged !== undefined) {
      if (query.acknowledged) {
        qb.andWhere('alert.acknowledgedAt IS NOT NULL');
      } else {
        qb.andWhere('alert.acknowledgedAt IS NULL');
      }
    }

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    qb.orderBy('alert.createdAt', 'DESC').skip(skip).take(limit);

    const [alerts, total] = await qb.getManyAndCount();

    return {
      data: alerts.map((a) => this.toAlertResponse(a)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get alert by ID.
   *
   * @param alertId - Alert ID
   * @returns Alert details
   */
  async getAlertById(alertId: string): Promise<AlertResponseDto> {
    const alert = await this.alertRepo.findOne({
      where: { id: alertId },
      relations: ['category'],
    });

    if (!alert) {
      throw new NotFoundException(`Alert not found: ${alertId}`);
    }

    return this.toAlertResponse(alert);
  }

  /**
   * Get alert summary statistics.
   *
   * @param etpId - Optional ETP ID filter
   * @returns Alert summary
   */
  async getAlertSummary(etpId?: string): Promise<AlertSummaryDto> {
    const qb = this.alertRepo.createQueryBuilder('alert');

    if (etpId) {
      qb.where('alert.etpId = :etpId', { etpId });
    }

    // Count by level
    const levelCounts = await qb
      .clone()
      .select('alert.alertLevel', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('alert.alertLevel')
      .getRawMany();

    const byLevel = {
      ok: 0,
      attention: 0,
      warning: 0,
      critical: 0,
    };

    levelCounts.forEach((lc) => {
      const key = lc.level.toLowerCase() as keyof typeof byLevel;
      byLevel[key] = parseInt(lc.count);
    });

    // Count acknowledged/pending
    const acknowledged = await qb
      .clone()
      .where('alert.acknowledgedAt IS NOT NULL')
      .getCount();

    const totalAlerts = await qb.clone().getCount();
    const pending = totalAlerts - acknowledged;

    // Average percentage above
    const avgResult = await qb
      .clone()
      .select('AVG(alert.percentageAbove)', 'avg')
      .where('alert.percentageAbove > 0')
      .getRawOne();

    return {
      totalAlerts,
      byLevel,
      acknowledged,
      pending,
      avgPercentageAbove: parseFloat(avgResult?.avg || '0'),
    };
  }

  /**
   * Get current threshold configuration.
   */
  getThresholds(): AlertThresholdsDto {
    return { ...this.thresholds };
  }

  /**
   * Convert entity to response DTO.
   */
  private toAlertResponse(alert: OverpriceAlert): AlertResponseDto {
    return {
      id: alert.id,
      etpId: alert.etpId || undefined,
      categoryId: alert.categoryId || undefined,
      categoryCode: alert.category?.code,
      categoryName: alert.category?.name,
      itemCode: alert.itemCode || undefined,
      itemDescription: alert.itemDescription,
      informedPrice: Number(alert.informedPrice),
      medianPrice: Number(alert.medianPrice),
      percentageAbove: Number(alert.percentageAbove),
      alertLevel: alert.alertLevel,
      suggestion: alert.suggestion,
      uf: alert.uf,
      suggestedPriceLow: Number(alert.suggestedPriceLow),
      suggestedPriceHigh: Number(alert.suggestedPriceHigh),
      benchmarkSampleCount: alert.benchmarkSampleCount,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedBy: alert.acknowledgedBy || undefined,
      acknowledgeNote: alert.acknowledgeNote || undefined,
      createdAt: alert.createdAt,
    };
  }
}

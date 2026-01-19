import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../../entities/user.entity';
import {
  NormalizedContractItem,
  ClassificationMethod,
} from '../../../entities/normalized-contract-item.entity';
import { ItemCategory } from '../../../entities/item-category.entity';
import { ReviewItemDto, NormalizationStatsDto } from '../dto/review-item.dto';

/**
 * Controller for manual review and correction of normalized contract items.
 *
 * This controller provides REST endpoints for:
 * - Listing items pending manual review (low confidence)
 * - Correcting item categorization and description
 * - Viewing normalization statistics
 * - Listing available categories for assignment
 *
 * Security:
 * - All endpoints require authentication (JwtAuthGuard)
 * - Review operations require ADMIN or SYSTEM_ADMIN role
 * - Read-only operations available to all authenticated users
 *
 * Part of M13: Market Intelligence - Issue #1606.
 *
 * @see NormalizedContractItem entity for item data
 * @see ItemCategory entity for category taxonomy
 * @see NormalizationPipelineService for batch processing
 */
@ApiTags('market-intelligence/normalization')
@Controller('market-intelligence/normalization')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ItemNormalizationController {
  constructor(
    @InjectRepository(NormalizedContractItem)
    private readonly normalizedItemRepo: Repository<NormalizedContractItem>,
    @InjectRepository(ItemCategory)
    private readonly categoryRepo: Repository<ItemCategory>,
  ) {}

  // ============================================
  // PENDING REVIEW OPERATIONS
  // ============================================

  /**
   * Retrieves items pending manual review.
   *
   * Returns normalized items with low confidence scores that require
   * human verification. Items are sorted by confidence ascending (lowest first).
   *
   * @param query - Filter options (limit, confidence range, category type)
   * @returns Array of NormalizedContractItem with relations
   */
  @Get('pending-review')
  @Roles(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Get items pending manual review',
    description:
      'Returns normalized items with low confidence that need human verification. ' +
      'Items are sorted by confidence (lowest first) to prioritize uncertain classifications.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum items to return (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'minConfidence',
    required: false,
    type: Number,
    description: 'Minimum confidence threshold (default: 0)',
  })
  @ApiQuery({
    name: 'maxConfidence',
    required: false,
    type: Number,
    description: 'Maximum confidence threshold (default: 0.7)',
  })
  @ApiQuery({
    name: 'categoryType',
    required: false,
    enum: ['CATMAT', 'CATSER'],
    description: 'Filter by category type',
  })
  @ApiResponse({
    status: 200,
    description: 'Items pending review retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  async getPendingReview(
    @Query('limit') limit = 20,
    @Query('minConfidence') minConfidence = 0,
    @Query('maxConfidence') maxConfidence = 0.7,
    @Query('categoryType') categoryType?: 'CATMAT' | 'CATSER',
  ): Promise<NormalizedContractItem[]> {
    // Clamp limit to valid range
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeMinConf = Math.max(0, Math.min(1, minConfidence));
    const safeMaxConf = Math.max(0, Math.min(1, maxConfidence));

    const queryBuilder = this.normalizedItemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.originalItem', 'originalItem')
      .leftJoinAndSelect('item.category', 'category')
      .where('item.manuallyReviewed = :reviewed', { reviewed: false })
      .andWhere('item.confidence >= :minConf', { minConf: safeMinConf })
      .andWhere('item.confidence <= :maxConf', { maxConf: safeMaxConf })
      .orderBy('item.confidence', 'ASC')
      .take(safeLimit);

    // Filter by category type if specified
    if (categoryType) {
      queryBuilder.andWhere('category.type = :categoryType', { categoryType });
    }

    return queryBuilder.getMany();
  }

  // ============================================
  // REVIEW OPERATIONS
  // ============================================

  /**
   * Reviews and corrects a normalized item.
   *
   * Allows admin/system_admin users to manually correct:
   * - Category assignment (using categoryCode)
   * - Normalized description
   * - Add review notes
   *
   * After review:
   * - manuallyReviewed is set to true
   * - confidence is set to 1.0 (manual = 100% confidence)
   * - classificationMethod is updated to MANUAL
   * - reviewedBy and reviewedAt are recorded
   *
   * @param id - NormalizedContractItem UUID
   * @param dto - Review data with corrections
   * @param userId - Current user ID (from JWT)
   * @returns Updated NormalizedContractItem
   */
  @Patch(':id/review')
  @Roles(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Review and correct a normalized item',
    description:
      'Manually correct the category assignment or description of a normalized item. ' +
      'Sets manuallyReviewed=true and confidence=1.0 after review.',
  })
  @ApiParam({
    name: 'id',
    description: 'NormalizedContractItem UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Item reviewed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid category code' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async reviewItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewItemDto,
    @CurrentUser('id') userId: string,
  ): Promise<NormalizedContractItem> {
    // Find the item
    const item = await this.normalizedItemRepo.findOne({
      where: { id },
      relations: ['category', 'originalItem'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    // Update category if provided
    if (dto.categoryCode) {
      const newCategory = await this.categoryRepo.findOne({
        where: { code: dto.categoryCode, active: true },
      });

      if (!newCategory) {
        throw new BadRequestException(
          `Category with code ${dto.categoryCode} not found or inactive`,
        );
      }

      item.category = newCategory;
      item.categoryId = newCategory.id;
    }

    // Update normalized description if provided
    if (dto.normalizedDescription) {
      item.normalizedDescription = dto.normalizedDescription;
    }

    // Update review notes if provided
    if (dto.reviewNotes) {
      item.reviewNotes = dto.reviewNotes;
    }

    // Mark as manually reviewed
    item.manuallyReviewed = true;
    item.reviewedBy = userId;
    item.reviewedAt = new Date();
    item.confidence = 1.0; // Manual review = 100% confidence
    item.classificationMethod = ClassificationMethod.MANUAL;
    item.requiresReview = false;

    // Save and return
    return this.normalizedItemRepo.save(item);
  }

  // ============================================
  // CATEGORY OPERATIONS
  // ============================================

  /**
   * Lists available categories for item assignment.
   *
   * Returns active categories from the ItemCategory taxonomy.
   * Supports filtering by type (CATMAT/CATSER) and search term.
   *
   * @param query - Filter options (type, search, limit)
   * @returns Array of ItemCategory
   */
  @Get('categories')
  @ApiOperation({
    summary: 'List available categories',
    description:
      'Returns active categories from CATMAT/CATSER taxonomy for item assignment. ' +
      'Supports filtering by type and text search.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['CATMAT', 'CATSER'],
    description: 'Filter by category type',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for category name or code',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum categories to return (default: 50, max: 200)',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  async getCategories(
    @Query('type') type?: 'CATMAT' | 'CATSER',
    @Query('search') search?: string,
    @Query('limit') limit = 50,
  ): Promise<ItemCategory[]> {
    // Clamp limit to valid range
    const safeLimit = Math.min(Math.max(1, limit), 200);

    const queryBuilder = this.categoryRepo
      .createQueryBuilder('category')
      .where('category.active = :active', { active: true })
      .orderBy('category.code', 'ASC')
      .take(safeLimit);

    // Filter by type if specified
    if (type) {
      queryBuilder.andWhere('category.type = :type', { type });
    }

    // Search by name or code if specified
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(category.name ILIKE :search OR category.code ILIKE :search)',
        { search: searchTerm },
      );
    }

    return queryBuilder.getMany();
  }

  // ============================================
  // STATISTICS OPERATIONS
  // ============================================

  /**
   * Retrieves normalization statistics.
   *
   * Returns aggregate metrics about the normalization process:
   * - Total items processed
   * - Items manually reviewed
   * - Items pending review
   * - Items with low confidence
   * - Review accuracy rate
   * - Average confidence score
   *
   * @returns NormalizationStatsDto with aggregate metrics
   */
  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Get normalization statistics',
    description:
      'Returns aggregate metrics about the normalization process including ' +
      'total items, reviewed items, pending items, and confidence scores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: NormalizationStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires ADMIN role' })
  async getStats(): Promise<NormalizationStatsDto> {
    // Execute all count queries in parallel
    const [total, reviewed, lowConfidence, avgConfidenceResult] =
      await Promise.all([
        this.normalizedItemRepo.count(),
        this.normalizedItemRepo.count({ where: { manuallyReviewed: true } }),
        this.normalizedItemRepo.count({
          where: { confidence: LessThan(0.7) },
        }),
        this.normalizedItemRepo
          .createQueryBuilder('item')
          .select('AVG(item.confidence)', 'avgConfidence')
          .getRawOne(),
      ]);

    const averageConfidence = avgConfidenceResult?.avgConfidence
      ? parseFloat(avgConfidenceResult.avgConfidence)
      : 0;

    return {
      total,
      reviewed,
      pending: total - reviewed,
      lowConfidence,
      accuracy: total > 0 ? reviewed / total : 0,
      averageConfidence: Math.round(averageConfidence * 1000) / 1000,
    };
  }

  // ============================================
  // SINGLE ITEM OPERATIONS
  // ============================================

  /**
   * Retrieves a single normalized item by ID.
   *
   * @param id - NormalizedContractItem UUID
   * @returns NormalizedContractItem with relations
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get normalized item by ID',
    description:
      'Returns a single normalized item with its category and original item relations.',
  })
  @ApiParam({
    name: 'id',
    description: 'NormalizedContractItem UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Item retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async getItem(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NormalizedContractItem> {
    const item = await this.normalizedItemRepo.findOne({
      where: { id },
      relations: ['category', 'originalItem'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }
}

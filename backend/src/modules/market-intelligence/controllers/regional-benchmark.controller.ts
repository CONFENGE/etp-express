import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../entities/user.entity';
import { RegionalBenchmarkService } from '../services/regional-benchmark.service';
import {
  BenchmarkQueryDto,
  BenchmarkResponseDto,
  PriceComparisonDto,
  PriceComparisonResultDto,
  BenchmarkCalculationOptionsDto,
  BenchmarkStatsDto,
  RegionalBreakdownResponseDto,
} from '../dto/regional-benchmark.dto';

/**
 * Controller for regional price benchmarks.
 *
 * This controller provides REST endpoints for:
 * - Querying price benchmarks by category and region
 * - Comparing prices against benchmarks
 * - Triggering manual benchmark recalculation
 * - Viewing benchmark statistics
 *
 * Security:
 * - All endpoints require authentication (JwtAuthGuard)
 * - Calculate operations require ADMIN or SYSTEM_ADMIN role
 * - Read-only operations available to all authenticated users
 *
 * Part of M13: Market Intelligence - Issue #1271.
 *
 * @see PriceBenchmark entity for benchmark data
 * @see RegionalBenchmarkService for calculation logic
 */
@ApiTags('market-intelligence/benchmark')
@Controller('market-intelligence/benchmark')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RegionalBenchmarkController {
  constructor(private readonly benchmarkService: RegionalBenchmarkService) {}

  // ============================================
  // QUERY OPERATIONS
  // ============================================

  /**
   * Query benchmarks with filters.
   *
   * @param query - Filter and pagination options
   * @returns Paginated list of benchmarks
   */
  @Get()
  @ApiOperation({
    summary: 'Query benchmarks',
    description:
      'Retrieve price benchmarks with optional filters for category, region, and organization size.',
  })
  @ApiResponse({
    status: 200,
    description: 'Benchmarks retrieved successfully',
  })
  async getBenchmarks(
    @Query() query: BenchmarkQueryDto,
  ): Promise<{ data: BenchmarkResponseDto[]; total: number }> {
    return this.benchmarkService.getBenchmarks(query);
  }

  /**
   * Get benchmark statistics.
   *
   * @returns Statistics about benchmarks
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get benchmark statistics',
    description: 'Retrieve overall statistics about the benchmark database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: BenchmarkStatsDto,
  })
  async getStatistics(): Promise<BenchmarkStatsDto> {
    return this.benchmarkService.getStatistics();
  }

  /**
   * Compare a price against the benchmark.
   *
   * @param dto - Price comparison input
   * @returns Comparison result with risk assessment
   */
  @Get('compare')
  @ApiOperation({
    summary: 'Compare price to benchmark',
    description:
      'Compare an input price against the regional benchmark for a category. Returns deviation, percentile, risk level, and suggestions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparison completed successfully',
    type: PriceComparisonResultDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Benchmark not found for the specified category/region',
  })
  @ApiQuery({ name: 'price', type: Number, description: 'Price to compare' })
  @ApiQuery({
    name: 'categoryId',
    type: String,
    required: false,
    description: 'Category ID',
  })
  @ApiQuery({
    name: 'categoryCode',
    type: String,
    required: false,
    description: 'Category code (e.g., CATMAT-44122)',
  })
  @ApiQuery({
    name: 'uf',
    type: String,
    description: 'Brazilian state (2-letter code)',
  })
  @ApiQuery({
    name: 'orgaoPorte',
    required: false,
    description: 'Organization size',
  })
  async comparePriceToBenchmark(
    @Query() dto: PriceComparisonDto,
  ): Promise<PriceComparisonResultDto> {
    return this.benchmarkService.comparePriceToBenchmark(dto);
  }

  /**
   * Get national benchmark for a category.
   *
   * @param categoryId - Category ID or code
   * @returns National benchmark data
   */
  @Get(':categoryId')
  @ApiOperation({
    summary: 'Get category benchmark',
    description:
      'Retrieve the national (BR) benchmark for a specific category.',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'Category ID or code',
    example: 'CATMAT-44122',
  })
  @ApiResponse({
    status: 200,
    description: 'Benchmark retrieved successfully',
    type: BenchmarkResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Benchmark not found for the specified category',
  })
  async getBenchmarkByCategory(
    @Param('categoryId') categoryId: string,
  ): Promise<BenchmarkResponseDto> {
    return this.benchmarkService.getBenchmarkByCategory(categoryId);
  }

  /**
   * Get regional breakdown for a category.
   *
   * @param categoryId - Category ID or code
   * @returns Regional breakdown with all states
   */
  @Get(':categoryId/regional')
  @ApiOperation({
    summary: 'Get regional breakdown',
    description:
      'Retrieve benchmark breakdown by state for a specific category, including deviation from national median.',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'Category ID or code',
    example: 'CATMAT-44122',
  })
  @ApiResponse({
    status: 200,
    description: 'Regional breakdown retrieved successfully',
    type: RegionalBreakdownResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Benchmark not found for the specified category',
  })
  async getRegionalBreakdown(
    @Param('categoryId') categoryId: string,
  ): Promise<RegionalBreakdownResponseDto> {
    return this.benchmarkService.getRegionalBreakdown(categoryId);
  }

  // ============================================
  // ADMIN OPERATIONS
  // ============================================

  /**
   * Trigger manual benchmark recalculation.
   * Requires ADMIN or SYSTEM_ADMIN role.
   *
   * @param options - Calculation options
   * @returns Number of benchmarks created/updated
   */
  @Post('calculate')
  @Roles(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Recalculate benchmarks',
    description:
      'Trigger manual recalculation of benchmarks. Can be scoped to specific category or region. Requires ADMIN role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recalculation completed',
    schema: {
      type: 'object',
      properties: {
        benchmarksUpdated: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires ADMIN role',
  })
  async calculateBenchmarks(
    @Body() options: BenchmarkCalculationOptionsDto,
  ): Promise<{ benchmarksUpdated: number; message: string }> {
    const count = await this.benchmarkService.calculateBenchmarks(options);
    return {
      benchmarksUpdated: count,
      message: `Successfully created/updated ${count} benchmarks`,
    };
  }
}

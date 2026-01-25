import {
  Controller,
  Get,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../../common/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../../../common/guards/api-key-throttler.guard';
import { RegionalBenchmarkService } from '../services/regional-benchmark.service';
import { ItemNormalizationService } from '../services/item-normalization.service';
import { ItemCategory } from '../../../entities/item-category.entity';
import {
  BenchmarkQueryDto,
  BenchmarkResponseDto,
} from '../dto/regional-benchmark.dto';
import {
  PublicPriceSearchDto,
  PublicPriceSearchResponseDto,
  PublicCategoriesResponseDto,
} from '../dto/public-prices.dto';

/**
 * PublicPricesController - Public API for third-party price data access.
 *
 * Provides monetizable endpoints for external clients to query:
 * - Regional price benchmarks by category
 * - Search for normalized price items
 * - Available CATMAT/CATSER categories
 *
 * Authentication: API Key required (X-API-Key header)
 * Rate Limiting: Based on plan (Free: 100/month, Pro: 5000/month, Enterprise: unlimited)
 *
 * Part of issue #1685 - M13: Market Intelligence
 *
 * @see Issue #1685
 * @see Issue #1275 (parent)
 */
@ApiTags('Public API - Prices')
@Controller('api/v1/prices')
@ApiBearerAuth('X-API-Key')
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
export class PublicPricesController {
  private readonly logger = new Logger(PublicPricesController.name);

  constructor(
    private readonly regionalBenchmarkService: RegionalBenchmarkService,
    private readonly itemNormalizationService: ItemNormalizationService,
  ) {}

  /**
   * GET /api/v1/prices/benchmark
   *
   * Retrieve regional price benchmarks filtered by category, region, and org size.
   *
   * @param query - Filter parameters (categoryId, categoryCode, uf, orgaoPorte, periodMonths, page, limit)
   * @returns Paginated list of price benchmarks with statistics (median, avg, min, max, quartiles)
   *
   * @example
   * ```
   * GET /api/v1/prices/benchmark?categoryCode=CATMAT-44122&uf=SP&orgaoPorte=MEDIUM&limit=10
   * ```
   */
  @Get('benchmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get regional price benchmarks',
    description: `
Retrieve statistical price benchmarks filtered by category, region, and organization size.

**Use Cases:**
- Price estimation for procurement planning
- Overprice detection
- Market analysis by region
- Historical trend analysis

**Filters:**
- \`categoryId\`: UUID of category (CATMAT/CATSER)
- \`categoryCode\`: Alternative to categoryId (e.g., "CATMAT-44122")
- \`uf\`: Brazilian state code (e.g., "SP", "RJ") or "BR" for national
- \`orgaoPorte\`: Organization size (SMALL/MEDIUM/LARGE/TODOS)
- \`periodMonths\`: Period for benchmark calculation (default: 12 months)
- \`page\`: Pagination page number (default: 1)
- \`limit\`: Results per page (max: 100, default: 20)

**Statistics Returned:**
- \`median\`: Median price (most reliable indicator)
- \`average\`: Average price
- \`min\` / \`max\`: Price range
- \`p25\` / \`p75\`: 25th and 75th percentiles (quartiles)
- \`stdDev\`: Standard deviation
- \`sampleSize\`: Number of contracts analyzed

**Confidence Levels:**
- \`HIGH\`: 50+ contracts, low variance
- \`MEDIUM\`: 10-49 contracts
- \`LOW\`: 5-9 contracts
- \`UNRELIABLE\`: <5 contracts
    `,
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Filter by category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'categoryCode',
    required: false,
    type: String,
    description: 'Filter by category code (CATMAT/CATSER)',
    example: 'CATMAT-44122',
  })
  @ApiQuery({
    name: 'uf',
    required: false,
    type: String,
    description:
      'Brazilian state (2-letter code) or "BR" for national benchmark',
    example: 'SP',
  })
  @ApiQuery({
    name: 'orgaoPorte',
    required: false,
    enum: ['SMALL', 'MEDIUM', 'LARGE', 'TODOS'],
    description: 'Organization size filter',
  })
  @ApiQuery({
    name: 'periodMonths',
    required: false,
    type: Number,
    description: 'Period in months for benchmark calculation (1-60)',
    example: 12,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Results per page (max 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'List of price benchmarks retrieved successfully',
    type: [BenchmarkResponseDto],
    content: {
      'application/json': {
        example: {
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              categoryId: '660e8400-e29b-41d4-a716-446655440001',
              categoryCode: 'CATMAT-44122',
              categoryName: 'Microcomputador',
              uf: 'SP',
              ufName: 'São Paulo',
              orgaoPorte: 'MEDIUM',
              median: 3500.0,
              average: 3650.0,
              min: 2800.0,
              max: 4200.0,
              priceRange: {
                min: 2800.0,
                max: 4200.0,
                p25: 3200.0,
                p75: 3900.0,
              },
              stdDev: 450.0,
              sampleSize: 87,
              confidence: 'HIGH',
              period: {
                start: '2025-01-25T00:00:00.000Z',
                end: '2026-01-25T00:00:00.000Z',
              },
              lastCalculatedAt: '2026-01-25T04:00:00.000Z',
            },
          ],
          total: 156,
          page: 1,
          limit: 20,
          totalPages: 8,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - API Key missing or invalid',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - API quota exceeded',
  })
  async getBenchmark(@Query() query: BenchmarkQueryDto): Promise<{
    data: BenchmarkResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logger.log(
      `Public API: GET /prices/benchmark - filters: ${JSON.stringify(query)}`,
    );

    const { data, total } =
      await this.regionalBenchmarkService.getBenchmarks(query);

    // Calculate pagination metadata
    const limit = query.limit || 20;
    const page = query.page || 1;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * GET /api/v1/prices/search
   *
   * Search for normalized price items across all sources.
   *
   * @param query - Search filters (query text, category, limit, offset)
   * @returns List of normalized contract items with prices
   *
   * @example
   * ```
   * GET /api/v1/prices/search?query=microcomputador&category=CATMAT-44122&limit=50
   * ```
   */
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search normalized price items',
    description: `
Search for specific items with historical prices from government contracts.

**Use Cases:**
- Find actual prices paid for similar items
- Research market prices by description
- Validate price estimates
- Discover item specifications

**Search Behavior:**
- Full-text search on item descriptions
- Fuzzy matching for similar terms
- Results sorted by relevance (similarity score)

**Filters:**
- \`query\`: Search query (item description)
- \`category\`: Filter by category code (e.g., "CATMAT-44122")
- \`limit\`: Max results (default: 20, max: 100)
- \`offset\`: Pagination offset (default: 0)

**Response:**
- \`description\`: Normalized item description
- \`categoryCode\`: CATMAT/CATSER code
- \`categoryName\`: Category name
- \`price\`: Unit price (BRL)
- \`unit\`: Unit of measurement
- \`contractDate\`: Contract signature date
- \`uf\`: Brazilian state of the contracting agency
- \`similarity\`: Relevance score (0-1)
    `,
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Search query for item description',
    example: 'microcomputador',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category code',
    example: 'CATMAT-44122',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum results to return (max 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Pagination offset',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with normalized items',
    type: PublicPriceSearchResponseDto,
    content: {
      'application/json': {
        example: {
          data: [
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              description: 'Microcomputador Intel Core i5 8GB RAM 256GB SSD',
              categoryCode: 'CATMAT-44122',
              categoryName: 'Microcomputador',
              price: 3200.0,
              unit: 'UN',
              contractDate: '2025-11-15T00:00:00.000Z',
              uf: 'SP',
              similarity: 0.92,
            },
            {
              id: '880e8400-e29b-41d4-a716-446655440003',
              description:
                'Microcomputador AMD Ryzen 5 16GB RAM 512GB SSD Windows 11',
              categoryCode: 'CATMAT-44122',
              categoryName: 'Microcomputador',
              price: 3800.0,
              unit: 'UN',
              contractDate: '2025-10-20T00:00:00.000Z',
              uf: 'RJ',
              similarity: 0.88,
            },
          ],
          total: 234,
          limit: 20,
          offset: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Missing or invalid query parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - API Key missing or invalid',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - API quota exceeded',
  })
  async searchPrices(
    @Query() query: PublicPriceSearchDto,
  ): Promise<PublicPriceSearchResponseDto> {
    this.logger.log(
      `Public API: GET /prices/search - query: "${query.query}", category: ${query.category || 'all'}`,
    );

    // TODO: Implement search logic in next sub-issue
    // For now, return placeholder response
    // This will be implemented after ItemNormalizationService.search() is created
    this.logger.warn(
      'Search endpoint not fully implemented - returning empty results',
    );

    return {
      data: [],
      total: 0,
      limit: query.limit || 20,
      offset: query.offset || 0,
    };
  }

  /**
   * GET /api/v1/prices/categories
   *
   * Retrieve list of available CATMAT/CATSER categories with price data.
   *
   * @returns List of categories with metadata
   *
   * @example
   * ```
   * GET /api/v1/prices/categories
   * ```
   */
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get available price categories',
    description: `
Retrieve list of CATMAT/CATSER categories that have price benchmark data available.

**Use Cases:**
- Discover available categories for price queries
- Build category filters in UI
- Validate category codes before querying

**Response:**
- \`id\`: Category UUID
- \`code\`: CATMAT/CATSER code
- \`name\`: Category name
- \`type\`: CATMAT (materials) or CATSER (services)
- \`benchmarkCount\`: Number of benchmarks available
- \`active\`: Whether category is active for queries

**Sorting:**
- Results sorted by category type (CATMAT first) then alphabetically by name
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories retrieved successfully',
    type: PublicCategoriesResponseDto,
    content: {
      'application/json': {
        example: {
          data: [
            {
              id: '660e8400-e29b-41d4-a716-446655440001',
              code: 'CATMAT-44122',
              name: 'Microcomputador',
              type: 'CATMAT',
              benchmarkCount: 156,
              active: true,
            },
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              code: 'CATMAT-45001',
              name: 'Impressora',
              type: 'CATMAT',
              benchmarkCount: 98,
              active: true,
            },
            {
              id: '880e8400-e29b-41d4-a716-446655440003',
              code: 'CATSER-17012',
              name: 'Serviços de Limpeza',
              type: 'CATSER',
              benchmarkCount: 72,
              active: true,
            },
          ],
          total: 245,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - API Key missing or invalid',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - API quota exceeded',
  })
  async getCategories(): Promise<PublicCategoriesResponseDto> {
    this.logger.log('Public API: GET /prices/categories');

    const categories: ItemCategory[] =
      await this.itemNormalizationService.getCategories();

    // Map to public response format
    const data = categories.map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
      type: category.type,
      benchmarkCount: 0, // TODO: Count from benchmarks table in #1686
      active: category.active !== false,
    }));

    return {
      data,
      total: data.length,
    };
  }
}

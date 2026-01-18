import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  JurisprudenciaService,
  JurisprudenciaSearchResult,
  JurisprudenciaListResult,
  JurisprudenciaStats,
  JurisprudenciaItem,
} from './services/jurisprudencia.service';
import {
  JurisprudenciaSearchDto,
  JurisprudenciaThemeSearchDto,
} from './dto/jurisprudencia-search.dto';
import { Tribunal } from './interfaces/jurisprudencia.interface';

/**
 * JurisprudenciaController - REST API for jurisprudence search and retrieval.
 *
 * Provides endpoints for:
 * - Semantic search via TreeSearchService (POST /search)
 * - Theme-based search (POST /search/theme)
 * - Filter by tribunal (GET /tribunal/:tribunal)
 * - List all with pagination (GET /)
 * - Get statistics (GET /stats)
 * - Get specific item (GET /:id)
 *
 * All endpoints require JWT authentication.
 *
 * @see Issue #1581 - [JURIS-1540e] Criar API de busca por jurisprudencia
 * @see JurisprudenciaService - Business logic for jurisprudence operations
 */
@ApiTags('pageindex/jurisprudencia')
@Controller('pageindex/jurisprudencia')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JurisprudenciaController {
  constructor(private readonly jurisprudenciaService: JurisprudenciaService) {}

  /**
   * Search jurisprudence by natural language query.
   *
   * Uses TreeSearchService for reasoning-based semantic search
   * through the hierarchical tree structure.
   *
   * @example POST /api/pageindex/jurisprudencia/search
   * {
   *   "query": "dispensa de licitação valores",
   *   "tribunal": "TCU",
   *   "limit": 10
   * }
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search jurisprudence by text',
    description:
      'Performs semantic search using LLM reasoning through the document tree. ' +
      'Returns matching sumulas and acordaos from TCE-SP and TCU.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with matching jurisprudence items',
  })
  @ApiResponse({
    status: 404,
    description: 'Jurisprudence data not found (seeder not run)',
  })
  async searchByText(
    @Body() dto: JurisprudenciaSearchDto,
  ): Promise<JurisprudenciaSearchResult> {
    return this.jurisprudenciaService.searchByText(dto.query, {
      tribunal: dto.tribunal,
      limit: dto.limit,
      minConfidence: dto.minConfidence,
      includeContent: dto.includeContent,
    });
  }

  /**
   * Search jurisprudence by theme.
   *
   * Directly navigates to the theme node in the tree structure.
   * Use this when you know the specific category you want.
   *
   * @example POST /api/pageindex/jurisprudencia/search/theme
   * {
   *   "theme": "Lei 14.133/2021 > ETP",
   *   "tribunal": "TCU",
   *   "limit": 20
   * }
   */
  @Post('search/theme')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search jurisprudence by theme',
    description:
      'Searches for jurisprudence under a specific theme category. ' +
      'Themes include: Licitacao, Contratos, Lei 14.133/2021, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results with matching jurisprudence items',
  })
  @ApiResponse({
    status: 404,
    description: 'Jurisprudence data not found (seeder not run)',
  })
  async searchByTheme(
    @Body() dto: JurisprudenciaThemeSearchDto,
  ): Promise<JurisprudenciaSearchResult> {
    return this.jurisprudenciaService.searchByTheme(dto.theme, {
      tribunal: dto.tribunal,
      limit: dto.limit,
    });
  }

  /**
   * List all indexed jurisprudence with pagination.
   *
   * @example GET /api/pageindex/jurisprudencia?limit=20&offset=0
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all jurisprudence',
    description: 'Returns a paginated list of all indexed jurisprudence items.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of items to return (default: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of items to skip (default: 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of jurisprudence items',
  })
  @ApiResponse({
    status: 404,
    description: 'Jurisprudence data not found (seeder not run)',
  })
  async listAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<JurisprudenciaListResult> {
    return this.jurisprudenciaService.listAll({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * Get jurisprudence statistics.
   *
   * @example GET /api/pageindex/jurisprudencia/stats
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get jurisprudence statistics',
    description:
      'Returns statistics about indexed jurisprudence including counts by tribunal and available themes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics about indexed jurisprudence',
  })
  @ApiResponse({
    status: 404,
    description: 'Jurisprudence data not found (seeder not run)',
  })
  async getStats(): Promise<JurisprudenciaStats> {
    return this.jurisprudenciaService.getStats();
  }

  /**
   * Get available search themes.
   *
   * @example GET /api/pageindex/jurisprudencia/themes
   */
  @Get('themes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get available themes',
    description:
      'Returns a list of available themes for filtering jurisprudence searches.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available themes',
  })
  async getThemes(): Promise<{ themes: string[] }> {
    const themes = this.jurisprudenciaService.getAvailableThemes();
    return { themes };
  }

  /**
   * Get jurisprudence by tribunal.
   *
   * @example GET /api/pageindex/jurisprudencia/tribunal/TCU?limit=20&offset=0
   */
  @Get('tribunal/:tribunal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get jurisprudence by tribunal',
    description: 'Returns jurisprudence filtered by tribunal (TCE-SP or TCU).',
  })
  @ApiParam({
    name: 'tribunal',
    description: 'Tribunal to filter by',
    enum: ['TCE-SP', 'TCU'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of items to return (default: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of items to skip (default: 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of jurisprudence items for the tribunal',
  })
  @ApiResponse({
    status: 404,
    description: 'Jurisprudence data not found (seeder not run)',
  })
  async getByTribunal(
    @Param('tribunal') tribunal: Tribunal,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<JurisprudenciaListResult> {
    // Validate tribunal parameter
    if (!['TCE-SP', 'TCU'].includes(tribunal)) {
      throw new NotFoundException(
        `Invalid tribunal: ${tribunal}. Must be TCE-SP or TCU.`,
      );
    }

    return this.jurisprudenciaService.getByTribunal(tribunal, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * Get a specific jurisprudence item by ID.
   *
   * @example GET /api/pageindex/jurisprudencia/tcu-acordao-247
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get jurisprudence by ID',
    description:
      'Returns a specific jurisprudence item by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description:
      'Jurisprudence item ID (e.g., tcesp-sumula-1, tcu-acordao-247)',
  })
  @ApiResponse({
    status: 200,
    description: 'Jurisprudence item details',
  })
  @ApiResponse({
    status: 404,
    description: 'Jurisprudence item not found',
  })
  async getById(@Param('id') id: string): Promise<JurisprudenciaItem> {
    const item = await this.jurisprudenciaService.getById(id);

    if (!item) {
      throw new NotFoundException(`Jurisprudence item ${id} not found`);
    }

    return item;
  }
}

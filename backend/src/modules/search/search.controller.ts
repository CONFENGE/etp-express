import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * SearchController - API for searching similar contracts and legal references.
 *
 * Multi-Tenancy (MT): All endpoints extract organizationId from JWT.
 * Results are isolated per tenant to prevent cross-tenant data leakage.
 *
 * @see Issue #649 for multi-tenancy implementation
 */
@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('similar-contracts')
  @ApiOperation({
    summary: 'Buscar contratações similares',
    description:
      'Busca contratações similares usando Exa AI. Resultados isolados por organização.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Query de busca (objeto da contratação)',
  })
  @ApiResponse({ status: 200, description: 'Resultados da busca' })
  async searchSimilarContracts(
    @Query('q') query: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.searchService.searchSimilarContracts(query, organizationId);
  }

  @Get('legal-references')
  @ApiOperation({
    summary: 'Buscar referências legais',
    description: 'Busca referências legais relacionadas a um tópico',
  })
  @ApiQuery({
    name: 'topic',
    required: true,
    description: 'Tópico para buscar referências legais',
  })
  @ApiResponse({ status: 200, description: 'Referências legais encontradas' })
  async searchLegalReferences(@Query('topic') topic: string) {
    return this.searchService.searchLegalReferences(topic);
  }

  @Get('contracts')
  @ApiOperation({
    summary: 'Listar todas as contratações salvas',
    description: 'Lista contratações da organização do usuário autenticado.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limite de resultados',
  })
  @ApiResponse({ status: 200, description: 'Lista de contratações' })
  async getAllContracts(
    @Query('limit') limit: number | undefined,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const contracts = await this.searchService.getAllContracts(
      organizationId,
      limit,
    );
    return {
      data: contracts,
      disclaimer: DISCLAIMER,
    };
  }

  @Get('contracts/:id')
  @ApiOperation({
    summary: 'Obter contratação por ID',
    description:
      'Retorna contratação se pertencer à organização do usuário autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Dados da contratação' })
  @ApiResponse({ status: 404, description: 'Contratação não encontrada' })
  async getContract(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    const contract = await this.searchService.getContractById(
      id,
      organizationId,
    );
    return {
      data: contract,
      disclaimer: DISCLAIMER,
    };
  }
}

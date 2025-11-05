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

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('similar-contracts')
  @ApiOperation({
    summary: 'Buscar contratações similares',
    description: 'Busca contratações similares usando Perplexity AI',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Query de busca (objeto da contratação)' })
  @ApiResponse({ status: 200, description: 'Resultados da busca' })
  async searchSimilarContracts(@Query('q') query: string) {
    return this.searchService.searchSimilarContracts(query);
  }

  @Get('legal-references')
  @ApiOperation({
    summary: 'Buscar referências legais',
    description: 'Busca referências legais relacionadas a um tópico',
  })
  @ApiQuery({ name: 'topic', required: true, description: 'Tópico para buscar referências legais' })
  @ApiResponse({ status: 200, description: 'Referências legais encontradas' })
  async searchLegalReferences(@Query('topic') topic: string) {
    return this.searchService.searchLegalReferences(topic);
  }

  @Get('contracts')
  @ApiOperation({ summary: 'Listar todas as contratações salvas' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limite de resultados' })
  @ApiResponse({ status: 200, description: 'Lista de contratações' })
  async getAllContracts(@Query('limit') limit?: number) {
    const contracts = await this.searchService.getAllContracts(limit);
    return {
      data: contracts,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: 'Obter contratação por ID' })
  @ApiResponse({ status: 200, description: 'Dados da contratação' })
  @ApiResponse({ status: 404, description: 'Contratação não encontrada' })
  async getContract(@Param('id') id: string) {
    const contract = await this.searchService.getContractById(id);
    return {
      data: contract,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }
}

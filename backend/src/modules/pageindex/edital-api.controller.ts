/**
 * Edital API Controller
 *
 * REST API endpoints for edital extraction and comparison.
 *
 * Endpoints:
 * - POST /api/edital/extract - Extract structured data from PDF edital
 * - POST /api/edital/compare - Compare two extracted editais
 *
 * @module modules/pageindex
 * @see Issue #1698 - Create REST API for edital extraction and comparison
 */

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EditalExtractionService } from './services/edital-extraction.service';
import { EditalComparisonService } from './services/edital-comparison.service';
import {
  EditalExtractedData,
} from './dto/edital-extracted-data.dto';

/**
 * DTO for extraction request
 */
class ExtractEditalDto {
  /**
   * URL of the PDF edital to extract
   */
  pdfUrl: string;

  /**
   * Optional: Path to local PDF file (for testing)
   */
  localPath?: string;
}

/**
 * DTO for comparison request
 */
class CompareEditaisDto {
  /**
   * First edital extracted data
   */
  editalA: EditalExtractedData;

  /**
   * Second edital extracted data
   */
  editalB: EditalExtractedData;
}

/**
 * EditalApiController - REST API for edital operations
 */
@ApiTags('edital')
@Controller('api/edital')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EditalApiController {
  constructor(
    private readonly extractionService: EditalExtractionService,
    private readonly comparisonService: EditalComparisonService,
  ) {}

  /**
   * Extract structured data from PDF edital.
   *
   * @param dto - Extraction request with PDF URL or local path
   * @returns Extracted edital data
   */
  @Post('extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extract structured data from PDF edital',
    description:
      'Uses AI to extract structured information from a procurement edital PDF, including items, quantities, and prices.',
  })
  @ApiBody({
    type: ExtractEditalDto,
    description: 'PDF URL or local path to extract',
    examples: {
      url: {
        summary: 'Extract from URL',
        value: {
          pdfUrl: 'https://example.com/edital.pdf',
        },
      },
      local: {
        summary: 'Extract from local file',
        value: {
          localPath: '/path/to/edital.pdf',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Extraction completed successfully',
    schema: {
      example: {
        tipo: 'Pregao Eletronico',
        numero: '001/2025',
        objeto: 'Aquisicao de equipamentos de informatica',
        dataAbertura: '2025-02-15',
        valorTotal: 150000.0,
        lotes: [
          {
            numero: 1,
            descricao: 'Computadores e perifericos',
            itens: [
              {
                codigo: '001',
                descricao: 'Computador Desktop',
                quantidade: 10,
                unidade: 'UN',
                precoUnitario: 3500.0,
                precoTotal: 35000.0,
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or extraction failed',
  })
  async extractEdital(@Body() dto: ExtractEditalDto): Promise<EditalExtractedData> {
    if (!dto.pdfUrl && !dto.localPath) {
      throw new BadRequestException(
        'Either pdfUrl or localPath must be provided',
      );
    }

    // For now, we use the EditalExtractionService
    // In the future, this could be enhanced with PDF download and processing
    if (dto.localPath) {
      return this.extractionService.extractFromPath(dto.localPath);
    }

    // TODO: Implement URL download and extraction
    throw new BadRequestException(
      'URL extraction not yet implemented. Use localPath for now.',
    );
  }

  /**
   * Compare two extracted editais.
   *
   * @param dto - Comparison request with two edital datasets
   * @returns Detailed comparison result
   */
  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Compare two extracted editais',
    description:
      'Performs side-by-side comparison of two editais, identifying price differences, unique items, and competitive insights.',
  })
  @ApiBody({
    type: CompareEditaisDto,
    description: 'Two edital datasets to compare',
    examples: {
      simple: {
        summary: 'Simple comparison',
        value: {
          editalA: {
            tipo: 'Pregao Eletronico',
            numero: '001/2025',
            objeto: 'Aquisicao de equipamentos',
            valorTotal: 100000,
            lotes: [
              {
                numero: 1,
                descricao: 'Equipamentos',
                itens: [
                  {
                    codigo: '001',
                    descricao: 'Notebook',
                    quantidade: 5,
                    unidade: 'UN',
                    precoUnitario: 3500.0,
                    precoTotal: 17500.0,
                  },
                ],
              },
            ],
          },
          editalB: {
            tipo: 'Pregao Eletronico',
            numero: '002/2025',
            objeto: 'Aquisicao de equipamentos',
            valorTotal: 110000,
            lotes: [
              {
                numero: 1,
                descricao: 'Equipamentos',
                itens: [
                  {
                    codigo: '001',
                    descricao: 'Notebook',
                    quantidade: 5,
                    unidade: 'UN',
                    precoUnitario: 3800.0,
                    precoTotal: 19000.0,
                  },
                ],
              },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Comparison completed successfully',
    schema: {
      example: {
        summary: {
          totalItemsA: 5,
          totalItemsB: 5,
          matchingItems: 4,
          uniqueToA: 1,
          uniqueToB: 1,
          averagePriceDifferencePercent: 8.5,
        },
        itemComparisons: [
          {
            codigo: '001',
            descricao: 'Notebook',
            status: 'price_difference',
            quantidadeA: 5,
            quantidadeB: 5,
            precoUnitarioA: 3500.0,
            precoUnitarioB: 3800.0,
            priceDifferencePercent: 8.57,
            priceDifferenceAbsolute: 300.0,
          },
        ],
        insights: [
          'Similaridade de escopo: 80.0% (4 itens comuns de 5 totais)',
          'Edital B tem precos mais competitivos em 2 de 4 itens com diferenca significativa',
        ],
        metadata: {
          editalA: {
            tipo: 'Pregao Eletronico',
            objeto: 'Aquisicao de equipamentos',
            valorTotal: 100000,
          },
          editalB: {
            tipo: 'Pregao Eletronico',
            objeto: 'Aquisicao de equipamentos',
            valorTotal: 110000,
          },
          comparedAt: '2025-01-31T10:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or comparison failed',
  })
  async compareEditais(@Body() dto: CompareEditaisDto) {
    if (!dto.editalA || !dto.editalB) {
      throw new BadRequestException('Both editalA and editalB must be provided');
    }

    return this.comparisonService.compareEditais(dto.editalA, dto.editalB);
  }
}

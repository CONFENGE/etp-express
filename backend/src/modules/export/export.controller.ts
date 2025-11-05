import { Controller, Get, Param, Res, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService, ExportFormat } from './export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('export')
@Controller('export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('etp/:id/pdf')
  @ApiOperation({
    summary: 'Exportar ETP para PDF',
    description: 'Gera um documento PDF completo do ETP com todas as seções',
  })
  @ApiResponse({ status: 200, description: 'PDF gerado com sucesso' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async exportPDF(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.exportService.exportToPDF(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ETP-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Get('etp/:id/json')
  @ApiOperation({
    summary: 'Exportar ETP para JSON',
    description: 'Exporta o ETP e todas as seções em formato JSON',
  })
  @ApiResponse({ status: 200, description: 'JSON gerado com sucesso' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async exportJSON(@Param('id') id: string, @Res() res: Response) {
    const jsonData = await this.exportService.exportToJSON(id);

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="ETP-${id}.json"`,
    });

    res.json(jsonData);
  }

  @Get('etp/:id/xml')
  @ApiOperation({
    summary: 'Exportar ETP para XML',
    description: 'Exporta o ETP e todas as seções em formato XML',
  })
  @ApiResponse({ status: 200, description: 'XML gerado com sucesso' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async exportXML(@Param('id') id: string, @Res() res: Response) {
    const xmlData = await this.exportService.exportToXML(id);

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="ETP-${id}.xml"`,
    });

    res.send(xmlData);
  }

  @Get('etp/:id')
  @ApiOperation({
    summary: 'Exportar ETP em formato especificado',
    description: 'Exporta o ETP no formato escolhido (pdf, json, xml)',
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormat,
    required: false,
    description: 'Formato de exportação',
  })
  @ApiResponse({ status: 200, description: 'Exportação concluída' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async exportETP(
    @Param('id') id: string,
    @Query('format') format: ExportFormat = ExportFormat.PDF,
    @Res() res: Response,
  ) {
    switch (format) {
      case ExportFormat.JSON:
        return this.exportJSON(id, res);
      case ExportFormat.XML:
        return this.exportXML(id, res);
      case ExportFormat.PDF:
      default:
        return this.exportPDF(id, res);
    }
  }
}

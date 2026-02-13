import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { ExportFormat } from '../../enums/export-format.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  RequireOwnership,
  ResourceType,
} from '../../common/decorators/require-ownership.decorator';
import { S3Service } from '../storage/s3.service';

@ApiTags('export')
@Controller('export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly s3Service: S3Service,
  ) {}

  @Get('etp/:id/pdf')
  @RequireOwnership({
    resourceType: ResourceType.ETP,
    validateOwnership: false,
  })
  @ApiOperation({
    summary: 'Exportar ETP para PDF',
    description: 'Gera um documento PDF completo do ETP com todas as seções',
  })
  @ApiResponse({ status: 200, description: 'PDF gerado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao ETP' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async exportPDF(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;
    const pdfBuffer = await this.exportService.exportToPDF(id, userId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ETP-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Get('etp/:id/json')
  @RequireOwnership({
    resourceType: ResourceType.ETP,
    validateOwnership: false,
  })
  @ApiOperation({
    summary: 'Exportar ETP para JSON',
    description: 'Exporta o ETP e todas as seções em formato JSON',
  })
  @ApiResponse({ status: 200, description: 'JSON gerado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao ETP' })
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
  @RequireOwnership({
    resourceType: ResourceType.ETP,
    validateOwnership: false,
  })
  @ApiOperation({
    summary: 'Exportar ETP para XML',
    description: 'Exporta o ETP e todas as seções em formato XML',
  })
  @ApiResponse({ status: 200, description: 'XML gerado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao ETP' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async exportXML(@Param('id') id: string, @Res() res: Response) {
    const xmlData = await this.exportService.exportToXML(id);

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="ETP-${id}.xml"`,
    });

    res.send(xmlData);
  }

  @Get('etp/:id/docx')
  @RequireOwnership({
    resourceType: ResourceType.ETP,
    validateOwnership: false,
  })
  @ApiOperation({
    summary: 'Exportar ETP para DOCX',
    description:
      'Gera um documento Word (.docx) completo do ETP com todas as seções',
  })
  @ApiResponse({ status: 200, description: 'DOCX gerado com sucesso' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao ETP' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async exportDOCX(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;
    const docxBuffer = await this.exportService.exportToDocx(id, userId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="ETP-${id}.docx"`,
      'Content-Length': docxBuffer.length,
    });

    res.send(docxBuffer);
  }

  @Get('etp/:id/preview')
  @RequireOwnership({
    resourceType: ResourceType.ETP,
    validateOwnership: false,
  })
  @ApiOperation({
    summary: 'Preview do ETP em PDF',
    description:
      'Gera um PDF para visualização prévia no browser (Content-Disposition: inline)',
  })
  @ApiResponse({ status: 200, description: 'PDF gerado para preview' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao ETP' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async previewPDF(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.exportService.exportToPDF(id);

    res.set({
      'Content-Type': 'application/pdf',
      // inline instead of attachment for browser preview
      'Content-Disposition': `inline; filename="ETP-${id}-preview.pdf"`,
      'Content-Length': pdfBuffer.length,
      // Cache for 5 minutes to improve UX on repeated previews
      'Cache-Control': 'private, max-age=300',
    });

    res.send(pdfBuffer);
  }

  @Get('etp/:id')
  @RequireOwnership({
    resourceType: ResourceType.ETP,
    validateOwnership: false,
  })
  @ApiOperation({
    summary: 'Exportar ETP em formato especificado',
    description: 'Exporta o ETP no formato escolhido (pdf, json, xml, docx)',
  })
  @ApiQuery({
    name: 'format',
    enum: ExportFormat,
    required: false,
    description: 'Formato de exportação',
  })
  @ApiResponse({ status: 200, description: 'Exportação concluída' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao ETP' })
  @ApiResponse({ status: 404, description: 'ETP não encontrado' })
  async exportETP(
    @Param('id') id: string,
    @Query('format') format: ExportFormat = ExportFormat.PDF,
    @Req() req: any,
    @Res() res: Response,
  ) {
    switch (format) {
      case ExportFormat.JSON:
        return this.exportJSON(id, res);
      case ExportFormat.XML:
        return this.exportXML(id, res);
      case ExportFormat.DOCX:
        return this.exportDOCX(id, req, res);
      case ExportFormat.PDF:
      default:
        return this.exportPDF(id, req, res);
    }
  }

  @Get('share/:exportId')
  @ApiOperation({
    summary: 'Gerar link de compartilhamento para export',
    description:
      'Gera uma signed URL temporária para compartilhar um export armazenado no S3',
  })
  @ApiParam({ name: 'exportId', description: 'ID do ExportMetadata' })
  @ApiQuery({
    name: 'expiresIn',
    required: false,
    description:
      'Tempo de expiração em segundos (padrão: 3600, máximo: 604800)',
  })
  @ApiResponse({ status: 200, description: 'Signed URL gerada com sucesso' })
  @ApiResponse({ status: 404, description: 'Export não encontrado' })
  async getShareLink(
    @Param('exportId') exportId: string,
    @Query('expiresIn') expiresInParam?: string,
    @Req() req?: any,
  ) {
    const MAX_EXPIRATION = 604800; // 7 days
    const DEFAULT_EXPIRATION = 3600; // 1 hour

    const expiresIn = Math.min(
      expiresInParam
        ? parseInt(expiresInParam, 10) || DEFAULT_EXPIRATION
        : DEFAULT_EXPIRATION,
      MAX_EXPIRATION,
    );

    const organizationId = req?.user?.organizationId;
    if (!organizationId) {
      throw new NotFoundException('Export not found');
    }

    const metadata = await this.exportService.getExportMetadata(
      exportId,
      organizationId,
    );

    if (!metadata) {
      throw new NotFoundException('Export not found');
    }

    const signedUrl = await this.s3Service.getSignedUrl(
      metadata.s3Key,
      expiresIn,
    );

    return {
      url: signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      format: metadata.format,
      version: metadata.version,
    };
  }

  @Post('track/:exportId')
  @ApiOperation({
    summary: 'Registrar acesso a um export',
    description: 'Incrementa o contador de downloads e atualiza lastAccessedAt',
  })
  @ApiParam({ name: 'exportId', description: 'ID do ExportMetadata' })
  @ApiResponse({ status: 201, description: 'Acesso registrado' })
  async trackAccess(@Param('exportId') exportId: string) {
    await this.exportService.trackExportAccess(exportId);
    return { success: true };
  }

  @Get('history/:etpId')
  @RequireOwnership({
    resourceType: ResourceType.ETP,
    validateOwnership: false,
  })
  @ApiOperation({
    summary: 'Get export history for an ETP',
    description: 'Returns paginated list of all exports for an ETP',
  })
  @ApiParam({ name: 'etpId', description: 'ETP ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Filter by format (pdf, docx, json)',
  })
  @ApiResponse({ status: 200, description: 'Export history retrieved' })
  @ApiResponse({ status: 403, description: 'Acesso negado ao ETP' })
  async getExportHistory(
    @Param('etpId') etpId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('format') format?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.user?.organizationId;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    return this.exportService.getExportHistory(
      etpId,
      organizationId,
      pageNum,
      limitNum,
      format,
    );
  }

  @Get('download/:exportId')
  @ApiOperation({
    summary: 'Download a previous export by ID',
    description: 'Generates signed URL and redirects to S3 download',
  })
  @ApiParam({ name: 'exportId', description: 'ExportMetadata ID' })
  @ApiResponse({ status: 302, description: 'Redirects to S3 signed URL' })
  @ApiResponse({ status: 404, description: 'Export not found' })
  async downloadPrevious(
    @Param('exportId') exportId: string,
    @Res() res: Response,
    @Req() req?: any,
  ) {
    const organizationId = req?.user?.organizationId;
    if (!organizationId) {
      throw new NotFoundException('Export not found');
    }

    const metadata = await this.exportService.getExportMetadata(
      exportId,
      organizationId,
    );

    if (!metadata) {
      throw new NotFoundException('Export not found');
    }

    // Track access
    await this.exportService.trackExportAccess(exportId);

    // Generate signed URL (1 hour expiration)
    const signedUrl = await this.s3Service.getSignedUrl(metadata.s3Key, 3600);

    // Redirect to S3
    res.redirect(signedUrl);
  }

  @Post('cleanup')
  @ApiOperation({
    summary: 'Trigger manual cleanup of old exports',
    description:
      'Manually triggers cleanup job to delete exports older than retention period',
  })
  @ApiQuery({
    name: 'retentionDays',
    required: false,
    description: 'Number of days to retain exports (default: from env)',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    description:
      'If true, logs what would be deleted without actually deleting (default: false)',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Optional organization filter',
  })
  @ApiResponse({
    status: 201,
    description: 'Cleanup job completed',
  })
  async triggerCleanup(
    @Query('retentionDays') retentionDays?: string,
    @Query('dryRun') dryRun?: string,
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    const retention = retentionDays ? parseInt(retentionDays, 10) : undefined;
    const dry = dryRun === 'true';

    // If organizationId not provided, use user's organization
    const orgId = organizationId || req?.user?.organizationId;

    const result = await this.exportService.triggerCleanup(
      retention,
      dry,
      orgId,
    );

    return {
      success: true,
      deletedCount: result.deletedCount,
      s3DeletedCount: result.s3DeletedCount,
      deletedIds: result.deletedIds,
      errors: result.errors,
      dryRun: result.dryRun,
    };
  }
}

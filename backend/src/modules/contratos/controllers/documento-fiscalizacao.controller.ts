import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DocumentoFiscalizacaoService } from '../services/documento-fiscalizacao.service';
import { CreateDocumentoFiscalizacaoDto } from '../dto/create-documento-fiscalizacao.dto';
import {
  DocumentoFiscalizacao,
  DocumentoFiscalizacaoTipo,
} from '../../../entities/documento-fiscalizacao.entity';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../entities/user.entity';

/**
 * Controller para gerenciamento de documentos de fiscalização.
 *
 * Endpoints disponíveis:
 * - POST /medicoes/:id/documentos - Upload para medição
 * - POST /ocorrencias/:id/documentos - Upload para ocorrência
 * - POST /atestes/:id/documentos - Upload para ateste
 * - GET /:tipo/:id/documentos - Listar documentos
 * - GET /documentos/:id/download - Download de documento
 * - DELETE /documentos/:id - Remover documento
 *
 * @see Issue #1644 - [FISC-1286d] Add document upload to fiscalização entities
 */
@ApiTags('Documentos de Fiscalização')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contratos')
export class DocumentoFiscalizacaoController {
  constructor(
    private readonly documentoService: DocumentoFiscalizacaoService,
  ) {}

  /**
   * Upload de documento para medição.
   *
   * @param medicaoId - UUID da medição
   * @param file - Arquivo enviado via multipart/form-data
   * @param user - Usuário autenticado
   * @returns Documento criado
   */
  @Post('medicoes/:id/documentos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de documento para medição' })
  @ApiParam({ name: 'id', description: 'UUID da medição' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo (PDF, JPEG, PNG, DOCX, XLSX, máx 10MB)',
        },
        contratoId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID do contrato',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documento criado com sucesso',
    type: DocumentoFiscalizacao,
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou limite excedido',
  })
  async uploadMedicaoDocumento(
    @Param('id', ParseUUIDPipe) medicaoId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('contratoId', ParseUUIDPipe) contratoId: string,
    @CurrentUser() user: User,
  ): Promise<DocumentoFiscalizacao> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    return this.handleUpload('medicao', medicaoId, contratoId, file, user.id);
  }

  /**
   * Upload de documento para ocorrência.
   *
   * @param ocorrenciaId - UUID da ocorrência
   * @param file - Arquivo enviado via multipart/form-data
   * @param user - Usuário autenticado
   * @returns Documento criado
   */
  @Post('ocorrencias/:id/documentos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de documento para ocorrência' })
  @ApiParam({ name: 'id', description: 'UUID da ocorrência' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo (PDF, JPEG, PNG, DOCX, XLSX, máx 10MB)',
        },
        contratoId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID do contrato',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documento criado com sucesso',
    type: DocumentoFiscalizacao,
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou limite excedido',
  })
  async uploadOcorrenciaDocumento(
    @Param('id', ParseUUIDPipe) ocorrenciaId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('contratoId', ParseUUIDPipe) contratoId: string,
    @CurrentUser() user: User,
  ): Promise<DocumentoFiscalizacao> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    return this.handleUpload(
      'ocorrencia',
      ocorrenciaId,
      contratoId,
      file,
      user.id,
    );
  }

  /**
   * Upload de documento para ateste.
   *
   * @param atesteId - UUID do ateste
   * @param file - Arquivo enviado via multipart/form-data
   * @param user - Usuário autenticado
   * @returns Documento criado
   */
  @Post('atestes/:id/documentos')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload de documento para ateste' })
  @ApiParam({ name: 'id', description: 'UUID do ateste' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo (PDF, JPEG, PNG, DOCX, XLSX, máx 10MB)',
        },
        contratoId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID do contrato',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documento criado com sucesso',
    type: DocumentoFiscalizacao,
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo inválido ou limite excedido',
  })
  async uploadAtesteDocumento(
    @Param('id', ParseUUIDPipe) atesteId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('contratoId', ParseUUIDPipe) contratoId: string,
    @CurrentUser() user: User,
  ): Promise<DocumentoFiscalizacao> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    return this.handleUpload('ateste', atesteId, contratoId, file, user.id);
  }

  /**
   * Listar documentos de uma entidade.
   *
   * @param tipo - Tipo da entidade (medicao, ocorrencia, ateste)
   * @param id - UUID da entidade
   * @returns Lista de documentos
   */
  @Get(':tipo/:id/documentos')
  @ApiOperation({ summary: 'Listar documentos de uma entidade' })
  @ApiParam({
    name: 'tipo',
    description: 'Tipo da entidade',
    enum: ['medicao', 'ocorrencia', 'ateste'],
  })
  @ApiParam({ name: 'id', description: 'UUID da entidade' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos',
    type: [DocumentoFiscalizacao],
  })
  async listDocumentos(
    @Param('tipo') tipo: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentoFiscalizacao[]> {
    // Validar tipo
    const validTypes = ['medicao', 'ocorrencia', 'ateste'];
    if (!validTypes.includes(tipo)) {
      throw new BadRequestException(
        `Tipo inválido. Tipos aceitos: ${validTypes.join(', ')}`,
      );
    }

    return this.documentoService.findByEntidade(tipo, id);
  }

  /**
   * Download de documento.
   *
   * @param id - UUID do documento
   * @param res - Response object do Express
   */
  @Get('documentos/:id/download')
  @ApiOperation({ summary: 'Download de documento' })
  @ApiParam({ name: 'id', description: 'UUID do documento' })
  @ApiResponse({
    status: 200,
    description: 'Arquivo baixado',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  async downloadDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const documento = await this.documentoService.findOne(id);
    const file = await this.documentoService.readFile(documento.caminhoArquivo);

    res.set({
      'Content-Type': documento.mimeType,
      'Content-Disposition': `attachment; filename="${documento.nomeArquivo}"`,
      'Content-Length': documento.tamanho,
    });

    res.send(file);
  }

  /**
   * Remover documento.
   *
   * Apenas o usuário que fez upload ou fiscal/gestor podem remover.
   *
   * @param id - UUID do documento
   * @param user - Usuário autenticado
   */
  @Delete('documentos/:id')
  @ApiOperation({ summary: 'Remover documento' })
  @ApiParam({ name: 'id', description: 'UUID do documento' })
  @ApiResponse({ status: 200, description: 'Documento removido' })
  @ApiResponse({ status: 403, description: 'Sem permissão para remover' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  async removeDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    await this.documentoService.remove(id, user.id);
    return { message: 'Documento removido com sucesso' };
  }

  /**
   * Handler privado para processamento de upload.
   *
   * @param tipo - Tipo da entidade
   * @param entidadeId - UUID da entidade
   * @param contratoId - UUID do contrato
   * @param file - Arquivo enviado
   * @param userId - UUID do usuário
   * @returns Documento criado
   */
  private async handleUpload(
    tipo: string,
    entidadeId: string,
    contratoId: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<DocumentoFiscalizacao> {
    // Gerar caminho de storage
    const storagePath = this.documentoService.generateStoragePath(
      contratoId,
      tipo,
      entidadeId,
      file.originalname,
    );

    // Salvar arquivo no storage
    await this.documentoService.saveFile(file.buffer, storagePath);

    // Criar registro no banco
    const dto: CreateDocumentoFiscalizacaoDto = {
      tipoEntidade: tipo as DocumentoFiscalizacaoTipo,
      entidadeId,
      nomeArquivo: file.originalname,
      caminhoArquivo: storagePath,
      tamanho: file.size,
      mimeType: file.mimetype,
      uploadedById: userId,
    };

    return this.documentoService.create(dto);
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentoFiscalizacao,
  DocumentoFiscalizacaoTipo,
} from '../../../entities/documento-fiscalizacao.entity';
import { CreateDocumentoFiscalizacaoDto } from '../dto/create-documento-fiscalizacao.dto';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Serviço de gerenciamento de documentos de fiscalização.
 *
 * Responsável por:
 * - Upload e armazenamento de documentos comprobatórios
 * - Validação de tipos e tamanhos de arquivos
 * - Controle de limite de arquivos por entidade
 * - Download e remoção de documentos
 *
 * **Validações:**
 * - Tipos permitidos: PDF, JPEG, PNG, DOCX, XLSX
 * - Tamanho máximo: 10MB por arquivo
 * - Máximo 5 arquivos por entidade
 *
 * @see Issue #1644 - [FISC-1286d] Add document upload to fiscalização entities
 */
@Injectable()
export class DocumentoFiscalizacaoService {
  private readonly logger = new Logger(DocumentoFiscalizacaoService.name);

  /**
   * MIME types permitidos para upload.
   */
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf', // PDF
    'image/jpeg', // JPEG
    'image/png', // PNG
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  ];

  /**
   * Tamanho máximo permitido: 10MB
   */
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB em bytes

  /**
   * Máximo de arquivos permitidos por entidade
   */
  private readonly MAX_FILES_PER_ENTITY = 5;

  /**
   * Diretório base para storage de documentos.
   * Em produção, usar storage em nuvem (S3, GCS, etc.)
   */
  private readonly STORAGE_BASE_PATH = process.env.STORAGE_PATH || './storage';

  constructor(
    @InjectRepository(DocumentoFiscalizacao)
    private readonly documentoRepository: Repository<DocumentoFiscalizacao>,
  ) {}

  /**
   * Criar registro de documento após upload.
   *
   * @param dto - Dados do documento
   * @returns Documento criado
   * @throws BadRequestException - Tipo ou tamanho inválido
   * @throws BadRequestException - Limite de arquivos excedido
   */
  async create(
    dto: CreateDocumentoFiscalizacaoDto,
  ): Promise<DocumentoFiscalizacao> {
    // Validar MIME type
    if (!this.ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. Tipos aceitos: PDF, JPEG, PNG, DOCX, XLSX`,
      );
    }

    // Validar tamanho
    if (dto.tamanho > this.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Arquivo excede o tamanho máximo de 10MB. Tamanho recebido: ${(dto.tamanho / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    // Verificar limite de arquivos por entidade
    const existingCount = await this.documentoRepository.count({
      where: {
        tipoEntidade: dto.tipoEntidade,
        entidadeId: dto.entidadeId,
      },
    });

    if (existingCount >= this.MAX_FILES_PER_ENTITY) {
      throw new BadRequestException(
        `Limite de ${this.MAX_FILES_PER_ENTITY} arquivos por entidade atingido.`,
      );
    }

    // Criar documento
    const documento = this.documentoRepository.create(dto);
    const saved = await this.documentoRepository.save(documento);

    this.logger.log(
      `Documento ${saved.id} criado para ${dto.tipoEntidade} ${dto.entidadeId}`,
    );

    return saved;
  }

  /**
   * Listar documentos de uma entidade.
   *
   * @param tipoEntidade - Tipo da entidade (medicao, ocorrencia, ateste)
   * @param entidadeId - UUID da entidade
   * @returns Lista de documentos
   */
  async findByEntidade(
    tipoEntidade: string,
    entidadeId: string,
  ): Promise<DocumentoFiscalizacao[]> {
    return this.documentoRepository.find({
      where: {
        tipoEntidade: tipoEntidade as DocumentoFiscalizacaoTipo,
        entidadeId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Buscar documento por ID.
   *
   * @param id - UUID do documento
   * @returns Documento encontrado
   * @throws NotFoundException - Documento não encontrado
   */
  async findOne(id: string): Promise<DocumentoFiscalizacao> {
    const documento = await this.documentoRepository.findOne({
      where: { id },
    });

    if (!documento) {
      throw new NotFoundException(`Documento ${id} não encontrado`);
    }

    return documento;
  }

  /**
   * Remover documento.
   *
   * Valida permissões antes de remover:
   * - Apenas o uploader ou fiscal/gestor pode remover
   *
   * @param id - UUID do documento
   * @param userId - UUID do usuário solicitando remoção
   * @throws NotFoundException - Documento não encontrado
   * @throws ForbiddenException - Usuário sem permissão
   */
  async remove(id: string, userId: string): Promise<void> {
    const documento = await this.findOne(id);

    // Validar permissão: apenas o uploader pode remover
    // Em produção, adicionar validação de role (fiscal/gestor também podem)
    if (documento.uploadedById !== userId) {
      throw new ForbiddenException(
        'Apenas o usuário que fez upload pode remover o documento',
      );
    }

    // Remover arquivo físico do storage
    try {
      await this.deleteFile(documento.caminhoArquivo);
    } catch (error) {
      this.logger.warn(
        `Falha ao remover arquivo físico ${documento.caminhoArquivo}: ${error.message}`,
      );
      // Continuar com remoção do registro mesmo se arquivo físico falhar
    }

    // Remover registro do banco
    await this.documentoRepository.remove(documento);

    this.logger.log(`Documento ${id} removido por usuário ${userId}`);
  }

  /**
   * Gerar caminho de storage para arquivo.
   *
   * Formato: contracts/{contratoId}/fiscalizacao/{tipo}/{entidadeId}/{filename}
   *
   * @param contratoId - UUID do contrato
   * @param tipo - Tipo da entidade
   * @param entidadeId - UUID da entidade
   * @param filename - Nome do arquivo
   * @returns Caminho completo do arquivo
   */
  generateStoragePath(
    contratoId: string,
    tipo: string,
    entidadeId: string,
    filename: string,
  ): string {
    return path.join(
      'contracts',
      contratoId,
      'fiscalizacao',
      tipo,
      entidadeId,
      filename,
    );
  }

  /**
   * Salvar arquivo no storage.
   *
   * Em produção, usar cloud storage (S3, GCS, etc.).
   *
   * @param file - Buffer do arquivo
   * @param storagePath - Caminho onde salvar
   */
  async saveFile(file: Buffer, storagePath: string): Promise<void> {
    const fullPath = path.join(this.STORAGE_BASE_PATH, storagePath);
    const directory = path.dirname(fullPath);

    // Criar diretórios se não existirem
    await fs.mkdir(directory, { recursive: true });

    // Salvar arquivo
    await fs.writeFile(fullPath, file);

    this.logger.log(`Arquivo salvo em ${fullPath}`);
  }

  /**
   * Ler arquivo do storage.
   *
   * @param storagePath - Caminho do arquivo
   * @returns Buffer do arquivo
   * @throws NotFoundException - Arquivo não encontrado
   */
  async readFile(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(this.STORAGE_BASE_PATH, storagePath);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      this.logger.error(`Erro ao ler arquivo ${fullPath}: ${error.message}`);
      throw new NotFoundException('Arquivo não encontrado no storage');
    }
  }

  /**
   * Deletar arquivo do storage.
   *
   * @param storagePath - Caminho do arquivo
   */
  private async deleteFile(storagePath: string): Promise<void> {
    const fullPath = path.join(this.STORAGE_BASE_PATH, storagePath);
    await fs.unlink(fullPath);
  }
}

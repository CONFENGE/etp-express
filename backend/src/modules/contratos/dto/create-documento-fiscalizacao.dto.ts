import {
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentoFiscalizacaoTipo } from '../../../entities/documento-fiscalizacao.entity';

/**
 * DTO para criação de documento de fiscalização.
 *
 * Valida metadados do arquivo antes de persisti-lo no banco.
 * O upload físico do arquivo é tratado separadamente via multipart/form-data.
 */
export class CreateDocumentoFiscalizacaoDto {
  @ApiProperty({
    description: 'Tipo da entidade (medicao, ocorrencia ou ateste)',
    enum: DocumentoFiscalizacaoTipo,
    example: DocumentoFiscalizacaoTipo.MEDICAO,
  })
  @IsEnum(DocumentoFiscalizacaoTipo)
  @IsNotEmpty()
  tipoEntidade: DocumentoFiscalizacaoTipo;

  @ApiProperty({
    description: 'UUID da entidade (medicao, ocorrencia ou ateste)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  entidadeId: string;

  @ApiProperty({
    description: 'Nome original do arquivo',
    example: 'boletim-medicao-janeiro-2024.pdf',
  })
  @IsString()
  @IsNotEmpty()
  nomeArquivo: string;

  @ApiProperty({
    description: 'Caminho do arquivo no storage',
    example: 'contracts/uuid/fiscalizacao/medicao/uuid/arquivo.pdf',
  })
  @IsString()
  @IsNotEmpty()
  caminhoArquivo: string;

  @ApiProperty({
    description: 'Tamanho do arquivo em bytes',
    example: 2048576,
    maximum: 10485760, // 10MB
  })
  @IsNumber()
  @IsNotEmpty()
  tamanho: number;

  @ApiProperty({
    description: 'MIME type do arquivo',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({
    description: 'UUID do usuário que está fazendo o upload',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  uploadedById: string;
}

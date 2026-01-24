import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create documentos_fiscalizacao table for Document Management.
 *
 * @description
 * Creates table for storing DocumentoFiscalizacao (Inspection Documents):
 * - documentos_fiscalizacao: Supporting documents for measurements, occurrences, and attestations
 *
 * Features:
 * - Polymorphic relationship to medicoes, ocorrencias, or atestes
 * - File metadata storage (name, path, size, MIME type)
 * - Upload user tracking
 * - Support for PDF, JPEG, PNG, DOCX, XLSX
 * - Max 10MB per file, max 5 files per entity
 *
 * @see Issue #1644 - [FISC-1286d] Add document upload to fiscalização entities
 * @see Issue #1286 - [Contratos-c] Módulo de fiscalização
 * @see Lei 14.133/2021 Art. 117 - Contract Inspection
 * @see Lei 14.133/2021 Art. 140 - Documentation requirements
 */
export class CreateDocumentosFiscalizacaoTable1769900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for document entity type
    await queryRunner.query(`
      CREATE TYPE "documento_fiscalizacao_tipo_enum" AS ENUM (
        'medicao',
        'ocorrencia',
        'ateste'
      )
    `);

    // Create documentos_fiscalizacao table
    await queryRunner.createTable(
      new Table({
        name: 'documentos_fiscalizacao',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'tipoEntidade',
            type: 'enum',
            enum: ['medicao', 'ocorrencia', 'ateste'],
            enumName: 'documento_fiscalizacao_tipo_enum',
            isNullable: false,
            comment: 'Type of entity this document belongs to',
          },
          {
            name: 'entidadeId',
            type: 'uuid',
            isNullable: false,
            comment: 'UUID of the entity (medicao/ocorrencia/ateste)',
          },
          {
            name: 'nomeArquivo',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Original filename as uploaded by user',
          },
          {
            name: 'caminhoArquivo',
            type: 'varchar',
            length: '500',
            isNullable: false,
            comment: 'Full path to file in storage',
          },
          {
            name: 'tamanho',
            type: 'int',
            isNullable: false,
            comment: 'File size in bytes (max 10MB = 10485760 bytes)',
          },
          {
            name: 'mimeType',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'MIME type of the file (PDF, JPEG, PNG, DOCX, XLSX)',
          },
          {
            name: 'uploadedById',
            type: 'uuid',
            isNullable: false,
            comment: 'User who uploaded the document',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: 'Upload timestamp',
          },
        ],
      }),
      true,
    );

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'documentos_fiscalizacao',
      new TableIndex({
        name: 'IDX_documentos_fiscalizacao_entidade',
        columnNames: ['tipoEntidade', 'entidadeId'],
      }),
    );

    await queryRunner.createIndex(
      'documentos_fiscalizacao',
      new TableIndex({
        name: 'IDX_documentos_fiscalizacao_uploadedBy',
        columnNames: ['uploadedById'],
      }),
    );

    await queryRunner.createIndex(
      'documentos_fiscalizacao',
      new TableIndex({
        name: 'IDX_documentos_fiscalizacao_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    // Add foreign key for uploadedBy (User)
    await queryRunner.createForeignKey(
      'documentos_fiscalizacao',
      new TableForeignKey({
        columnNames: ['uploadedById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        name: 'FK_documentos_fiscalizacao_uploadedBy',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey(
      'documentos_fiscalizacao',
      'FK_documentos_fiscalizacao_uploadedBy',
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'documentos_fiscalizacao',
      'IDX_documentos_fiscalizacao_createdAt',
    );

    await queryRunner.dropIndex(
      'documentos_fiscalizacao',
      'IDX_documentos_fiscalizacao_uploadedBy',
    );

    await queryRunner.dropIndex(
      'documentos_fiscalizacao',
      'IDX_documentos_fiscalizacao_entidade',
    );

    // Drop table
    await queryRunner.dropTable('documentos_fiscalizacao');

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE "documento_fiscalizacao_tipo_enum"
    `);
  }
}

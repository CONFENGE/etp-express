import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create document_trees table for PageIndex hierarchical indexing.
 *
 * @description
 * Creates table for storing hierarchical document structures:
 * - document_trees: Indexed documents with tree structure for RAG reasoning
 *
 * Features:
 * - JSONB storage for tree structure (efficient querying)
 * - Status tracking for async indexing operations
 * - Performance metrics (processing time, node count)
 * - Composite indexes for filtering and queue management
 *
 * @see Issue #1551 - [PI-1538b] Criar DocumentTree entity e migrations
 * @see Issue #1538 - feat(backend): Criar modulo PageIndex
 * @see https://github.com/VectifyAI/PageIndex
 */
export class CreateDocumentTreesTable1768800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for document tree status
    await queryRunner.query(`
      CREATE TYPE "document_tree_status_enum" AS ENUM ('pending', 'processing', 'indexed', 'error')
    `);

    // Create enum for document type (if not exists - may already exist from pageindex module)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type_enum') THEN
          CREATE TYPE "document_type_enum" AS ENUM (
            'legislation',
            'contract',
            'edital',
            'tr',
            'etp',
            'other'
          );
        END IF;
      END
      $$;
    `);

    // Create document_trees table
    await queryRunner.createTable(
      new Table({
        name: 'document_trees',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'documentName',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'documentPath',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'sourceUrl',
            type: 'varchar',
            length: '2000',
            isNullable: true,
          },
          {
            name: 'documentType',
            type: 'document_type_enum',
            default: "'other'",
            isNullable: false,
          },
          {
            name: 'treeStructure',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'document_tree_status_enum',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'nodeCount',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'maxDepth',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'processingTimeMs',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'indexedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create index for filtering by type and status
    await queryRunner.createIndex(
      'document_trees',
      new TableIndex({
        name: 'IDX_document_trees_type_status',
        columnNames: ['documentType', 'status'],
      }),
    );

    // Create index for processing queue (pending/processing by creation order)
    await queryRunner.createIndex(
      'document_trees',
      new TableIndex({
        name: 'IDX_document_trees_status_created',
        columnNames: ['status', 'createdAt'],
      }),
    );

    // Create GIN index on treeStructure for JSONB queries
    await queryRunner.query(`
      CREATE INDEX "IDX_document_trees_tree_structure"
      ON "document_trees" USING GIN ("treeStructure" jsonb_path_ops)
      WHERE "treeStructure" IS NOT NULL
    `);

    // Create index on documentName for search
    await queryRunner.createIndex(
      'document_trees',
      new TableIndex({
        name: 'IDX_document_trees_name',
        columnNames: ['documentName'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('document_trees', 'IDX_document_trees_name');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_document_trees_tree_structure"',
    );
    await queryRunner.dropIndex(
      'document_trees',
      'IDX_document_trees_status_created',
    );
    await queryRunner.dropIndex(
      'document_trees',
      'IDX_document_trees_type_status',
    );

    // Drop table
    await queryRunner.dropTable('document_trees');

    // Drop enum types
    await queryRunner.query('DROP TYPE IF EXISTS "document_tree_status_enum"');
    // Note: document_type_enum might be used by other tables, so we don't drop it
  }
}

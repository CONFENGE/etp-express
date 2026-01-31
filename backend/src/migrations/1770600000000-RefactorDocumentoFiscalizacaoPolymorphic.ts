import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
  TableCheck,
} from 'typeorm';

/**
 * Migration: Refactor DocumentoFiscalizacao from polymorphic to explicit FKs
 *
 * Technical Debt: DB-02 - Polymorphic relationship without FK
 * Issue: #1723 - TD-008: Database schema improvements & LGPD compliance
 *
 * Changes:
 * 1. Add explicit FK columns: medicaoId, ocorrenciaId, atesteId (all nullable)
 * 2. Backfill from polymorphic columns (tipoEntidade + entidadeId)
 * 3. Add CHECK constraint: exactly one FK must be non-null
 * 4. Drop old polymorphic columns (tipoEntidade, entidadeId)
 * 5. Drop old polymorphic enum type
 *
 * Benefits:
 * - Proper referential integrity with FKs
 * - Query optimizer can use indexes
 * - Cascading deletes work properly
 * - No orphaned records from deleted entities
 *
 * Rollback: Safe - polymorphic pattern can be restored from explicit FKs
 */
export class RefactorDocumentoFiscalizacaoPolymorphic1770600000000
  implements MigrationInterface
{
  name = 'RefactorDocumentoFiscalizacaoPolymorphic1770600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // 1. Add explicit FK columns (nullable initially)
    // ==================================================
    await queryRunner.addColumn(
      'documentos_fiscalizacao',
      new TableColumn({
        name: 'medicaoId',
        type: 'uuid',
        isNullable: true,
        comment: 'FK to medicoes table (mutually exclusive with other FKs)',
      }),
    );

    await queryRunner.addColumn(
      'documentos_fiscalizacao',
      new TableColumn({
        name: 'ocorrenciaId',
        type: 'uuid',
        isNullable: true,
        comment: 'FK to ocorrencias table (mutually exclusive with other FKs)',
      }),
    );

    await queryRunner.addColumn(
      'documentos_fiscalizacao',
      new TableColumn({
        name: 'atesteId',
        type: 'uuid',
        isNullable: true,
        comment: 'FK to atestes table (mutually exclusive with other FKs)',
      }),
    );

    // ==================================================
    // 2. Backfill from polymorphic columns
    // ==================================================

    // Backfill medicaoId (tipoEntidade = 'medicao')
    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao"
      SET "medicaoId" = "entidadeId"
      WHERE "tipoEntidade" = 'medicao';
    `);

    // Backfill ocorrenciaId (tipoEntidade = 'ocorrencia')
    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao"
      SET "ocorrenciaId" = "entidadeId"
      WHERE "tipoEntidade" = 'ocorrencia';
    `);

    // Backfill atesteId (tipoEntidade = 'ateste')
    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao"
      SET "atesteId" = "entidadeId"
      WHERE "tipoEntidade" = 'ateste';
    `);

    // Verify backfill: all records should have exactly one FK set
    const verifyResult = await queryRunner.query(`
      SELECT COUNT(*) as invalid_count
      FROM "documentos_fiscalizacao"
      WHERE (
        CASE WHEN "medicaoId" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN "ocorrenciaId" IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN "atesteId" IS NOT NULL THEN 1 ELSE 0 END
      ) != 1;
    `);

    if (parseInt(verifyResult[0].invalid_count) > 0) {
      throw new Error(
        `Backfill validation failed: ${verifyResult[0].invalid_count} records do not have exactly one FK set`,
      );
    }

    // ==================================================
    // 3. Add CHECK constraint (PostgreSQL-specific)
    // ==================================================
    // Ensures exactly one FK is non-null using num_nonnulls()
    await queryRunner.createCheckConstraint(
      'documentos_fiscalizacao',
      new TableCheck({
        name: 'CHK_documentos_fiscalizacao_exactly_one_fk',
        expression: `num_nonnulls("medicaoId", "ocorrenciaId", "atesteId") = 1`,
      }),
    );

    // ==================================================
    // 4. Add foreign keys
    // ==================================================
    await queryRunner.createForeignKey(
      'documentos_fiscalizacao',
      new TableForeignKey({
        name: 'FK_documentos_fiscalizacao_medicaoId',
        columnNames: ['medicaoId'],
        referencedTableName: 'medicoes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // Delete documents when medicao is deleted
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'documentos_fiscalizacao',
      new TableForeignKey({
        name: 'FK_documentos_fiscalizacao_ocorrenciaId',
        columnNames: ['ocorrenciaId'],
        referencedTableName: 'ocorrencias',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // Delete documents when ocorrencia is deleted
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'documentos_fiscalizacao',
      new TableForeignKey({
        name: 'FK_documentos_fiscalizacao_atesteId',
        columnNames: ['atesteId'],
        referencedTableName: 'atestes',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // Delete documents when ateste is deleted
        onUpdate: 'CASCADE',
      }),
    );

    // ==================================================
    // 5. Add indexes for foreign keys
    // ==================================================
    await queryRunner.createIndex(
      'documentos_fiscalizacao',
      new TableIndex({
        name: 'IDX_documentos_fiscalizacao_medicaoId',
        columnNames: ['medicaoId'],
      }),
    );

    await queryRunner.createIndex(
      'documentos_fiscalizacao',
      new TableIndex({
        name: 'IDX_documentos_fiscalizacao_ocorrenciaId',
        columnNames: ['ocorrenciaId'],
      }),
    );

    await queryRunner.createIndex(
      'documentos_fiscalizacao',
      new TableIndex({
        name: 'IDX_documentos_fiscalizacao_atesteId',
        columnNames: ['atesteId'],
      }),
    );

    // ==================================================
    // 6. Drop old polymorphic index
    // ==================================================
    await queryRunner.dropIndex(
      'documentos_fiscalizacao',
      'IDX_documentos_fiscalizacao_entidade',
    );

    // ==================================================
    // 7. Drop old polymorphic columns
    // ==================================================
    await queryRunner.dropColumn('documentos_fiscalizacao', 'tipoEntidade');
    await queryRunner.dropColumn('documentos_fiscalizacao', 'entidadeId');

    // ==================================================
    // 8. Drop old enum type
    // ==================================================
    await queryRunner.query(`
      DROP TYPE IF EXISTS "documento_fiscalizacao_tipo_enum";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================================================
    // Rollback: Restore polymorphic pattern
    // ==================================================

    // 1. Recreate enum type
    await queryRunner.query(`
      CREATE TYPE "documento_fiscalizacao_tipo_enum" AS ENUM (
        'medicao',
        'ocorrencia',
        'ateste'
      );
    `);

    // 2. Add polymorphic columns back
    await queryRunner.addColumn(
      'documentos_fiscalizacao',
      new TableColumn({
        name: 'tipoEntidade',
        type: 'enum',
        enum: ['medicao', 'ocorrencia', 'ateste'],
        enumName: 'documento_fiscalizacao_tipo_enum',
        isNullable: true, // Temporarily nullable for backfill
      }),
    );

    await queryRunner.addColumn(
      'documentos_fiscalizacao',
      new TableColumn({
        name: 'entidadeId',
        type: 'uuid',
        isNullable: true, // Temporarily nullable for backfill
      }),
    );

    // 3. Backfill polymorphic columns from explicit FKs
    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao"
      SET
        "tipoEntidade" = 'medicao',
        "entidadeId" = "medicaoId"
      WHERE "medicaoId" IS NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao"
      SET
        "tipoEntidade" = 'ocorrencia',
        "entidadeId" = "ocorrenciaId"
      WHERE "ocorrenciaId" IS NOT NULL;
    `);

    await queryRunner.query(`
      UPDATE "documentos_fiscalizacao"
      SET
        "tipoEntidade" = 'ateste',
        "entidadeId" = "atesteId"
      WHERE "atesteId" IS NOT NULL;
    `);

    // 4. Make polymorphic columns NOT NULL
    await queryRunner.query(`
      ALTER TABLE "documentos_fiscalizacao"
      ALTER COLUMN "tipoEntidade" SET NOT NULL,
      ALTER COLUMN "entidadeId" SET NOT NULL;
    `);

    // 5. Recreate polymorphic index
    await queryRunner.createIndex(
      'documentos_fiscalizacao',
      new TableIndex({
        name: 'IDX_documentos_fiscalizacao_entidade',
        columnNames: ['tipoEntidade', 'entidadeId'],
      }),
    );

    // 6. Drop new indexes
    await queryRunner.dropIndex(
      'documentos_fiscalizacao',
      'IDX_documentos_fiscalizacao_atesteId',
    );
    await queryRunner.dropIndex(
      'documentos_fiscalizacao',
      'IDX_documentos_fiscalizacao_ocorrenciaId',
    );
    await queryRunner.dropIndex(
      'documentos_fiscalizacao',
      'IDX_documentos_fiscalizacao_medicaoId',
    );

    // 7. Drop foreign keys
    await queryRunner.dropForeignKey(
      'documentos_fiscalizacao',
      'FK_documentos_fiscalizacao_atesteId',
    );
    await queryRunner.dropForeignKey(
      'documentos_fiscalizacao',
      'FK_documentos_fiscalizacao_ocorrenciaId',
    );
    await queryRunner.dropForeignKey(
      'documentos_fiscalizacao',
      'FK_documentos_fiscalizacao_medicaoId',
    );

    // 8. Drop CHECK constraint
    await queryRunner.dropCheckConstraint(
      'documentos_fiscalizacao',
      'CHK_documentos_fiscalizacao_exactly_one_fk',
    );

    // 9. Drop explicit FK columns
    await queryRunner.dropColumn('documentos_fiscalizacao', 'atesteId');
    await queryRunner.dropColumn('documentos_fiscalizacao', 'ocorrenciaId');
    await queryRunner.dropColumn('documentos_fiscalizacao', 'medicaoId');
  }
}

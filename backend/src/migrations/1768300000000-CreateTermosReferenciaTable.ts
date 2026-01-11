import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create termos_referencia table for TR module.
 *
 * @description
 * Creates table for storing Termos de Referencia (TR):
 * - termos_referencia: Reference documents generated from ETPs
 *
 * Features:
 * - TR linked to source ETP (1:N relationship - one ETP can have multiple TR versions)
 * - Multi-tenant isolation via organizationId
 * - Complete TR structure per Lei 14.133/2021
 * - Version tracking for TR revisions
 * - Cascade delete when ETP is deleted
 *
 * @see Issue #1248 - [TR-a] Criar entity TermoReferencia e relacionamentos
 * @see Issue #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
export class CreateTermosReferenciaTable1768300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for TR status
    await queryRunner.query(`
      CREATE TYPE "termo_referencia_status_enum" AS ENUM ('draft', 'review', 'approved', 'archived')
    `);

    // Create termos_referencia table
    await queryRunner.createTable(
      new Table({
        name: 'termos_referencia',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          // Relationship with ETP
          {
            name: 'etpId',
            type: 'uuid',
            isNullable: false,
          },
          // Multi-tenancy
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
          },
          // Required field - objeto
          {
            name: 'objeto',
            type: 'text',
            isNullable: false,
          },
          // Lei 14.133/2021 required fields
          {
            name: 'fundamentacaoLegal',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'descricaoSolucao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'requisitosContratacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'modeloExecucao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'modeloGestao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'criteriosSelecao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'valorEstimado',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'dotacaoOrcamentaria',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'prazoVigencia',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'obrigacoesContratante',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'obrigacoesContratada',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sancoesPenalidades',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cronograma',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'especificacoesTecnicas',
            type: 'jsonb',
            isNullable: true,
          },
          // Additional fields
          {
            name: 'localExecucao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'garantiaContratual',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'condicoesPagamento',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'subcontratacao',
            type: 'text',
            isNullable: true,
          },
          // Metadata and control
          {
            name: 'status',
            type: 'termo_referencia_status_enum',
            default: "'draft'",
            isNullable: false,
          },
          {
            name: 'versao',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: false,
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

    // Create foreign key for ETP relationship
    await queryRunner.createForeignKey(
      'termos_referencia',
      new TableForeignKey({
        name: 'FK_termos_referencia_etp',
        columnNames: ['etpId'],
        referencedTableName: 'etps',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for Organization relationship
    await queryRunner.createForeignKey(
      'termos_referencia',
      new TableForeignKey({
        name: 'FK_termos_referencia_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for User relationship
    await queryRunner.createForeignKey(
      'termos_referencia',
      new TableForeignKey({
        name: 'FK_termos_referencia_user',
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create index for organization queries (multi-tenant)
    await queryRunner.createIndex(
      'termos_referencia',
      new TableIndex({
        name: 'IDX_termos_referencia_organization',
        columnNames: ['organizationId'],
      }),
    );

    // Create composite index for ETP + version queries
    await queryRunner.createIndex(
      'termos_referencia',
      new TableIndex({
        name: 'IDX_termos_referencia_etp_versao',
        columnNames: ['etpId', 'versao'],
      }),
    );

    // Create index for status filtering
    await queryRunner.createIndex(
      'termos_referencia',
      new TableIndex({
        name: 'IDX_termos_referencia_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'termos_referencia',
      'IDX_termos_referencia_status',
    );
    await queryRunner.dropIndex(
      'termos_referencia',
      'IDX_termos_referencia_etp_versao',
    );
    await queryRunner.dropIndex(
      'termos_referencia',
      'IDX_termos_referencia_organization',
    );

    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'termos_referencia',
      'FK_termos_referencia_user',
    );
    await queryRunner.dropForeignKey(
      'termos_referencia',
      'FK_termos_referencia_organization',
    );
    await queryRunner.dropForeignKey(
      'termos_referencia',
      'FK_termos_referencia_etp',
    );

    // Drop table
    await queryRunner.dropTable('termos_referencia');

    // Drop enum type
    await queryRunner.query('DROP TYPE "termo_referencia_status_enum"');
  }
}

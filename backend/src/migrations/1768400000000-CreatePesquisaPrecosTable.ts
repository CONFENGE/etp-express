import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create pesquisas_precos table for Price Research module.
 *
 * @description
 * Creates table for storing Pesquisa de Precos (Price Research):
 * - pesquisas_precos: Price research documents per IN SEGES/ME n 65/2021
 *
 * Features:
 * - Optional link to ETP (price research during ETP elaboration)
 * - Optional link to TR (price research for reference term)
 * - Multi-tenant isolation via organizationId
 * - Complete structure per IN 65/2021 requirements
 * - Statistical calculations stored (mean, median, min)
 * - Items and sources stored as JSONB
 * - Version tracking for research revisions
 *
 * @see Issue #1255 - [Pesquisa-a] Criar entity PesquisaPrecos com metodologia
 * @see Issue #1254 - [Pesquisa] Modulo de Pesquisa de Precos - EPIC
 * @see IN SEGES/ME n 65/2021 - Pesquisa de precos para contratacoes
 */
export class CreatePesquisaPrecosTable1768400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for metodologia
    await queryRunner.query(`
      CREATE TYPE "metodologia_pesquisa_enum" AS ENUM (
        'PAINEL_PRECOS',
        'CONTRATACOES_SIMILARES',
        'MIDIA_ESPECIALIZADA',
        'SITES_ELETRONICOS',
        'PESQUISA_FORNECEDORES',
        'NOTAS_FISCAIS'
      )
    `);

    // Create enum for status
    await queryRunner.query(`
      CREATE TYPE "pesquisa_precos_status_enum" AS ENUM (
        'draft',
        'completed',
        'approved',
        'archived'
      )
    `);

    // Create pesquisas_precos table
    await queryRunner.createTable(
      new Table({
        name: 'pesquisas_precos',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          // Optional relationship with ETP
          {
            name: 'etpId',
            type: 'uuid',
            isNullable: true,
          },
          // Optional relationship with TR
          {
            name: 'termoReferenciaId',
            type: 'uuid',
            isNullable: true,
          },
          // Multi-tenancy
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
          },
          // Identification
          {
            name: 'titulo',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'descricao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'numeroProcesso',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          // Methodology (IN 65/2021)
          {
            name: 'metodologia',
            type: 'metodologia_pesquisa_enum',
            default: "'PAINEL_PRECOS'",
            isNullable: false,
          },
          {
            name: 'metodologiasComplementares',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'justificativaMetodologia',
            type: 'text',
            isNullable: true,
          },
          // Sources consulted
          {
            name: 'fontesConsultadas',
            type: 'jsonb',
            isNullable: true,
          },
          // Researched items
          {
            name: 'itens',
            type: 'jsonb',
            isNullable: true,
          },
          // Statistical calculations
          {
            name: 'valorTotalEstimado',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'mediaGeral',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'medianaGeral',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'menorPrecoTotal',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'coeficienteVariacao',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          // Acceptability criteria (Art. 14)
          {
            name: 'criterioAceitabilidade',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'justificativaCriterio',
            type: 'text',
            isNullable: true,
          },
          // Comparative price map
          {
            name: 'mapaComparativo',
            type: 'jsonb',
            isNullable: true,
          },
          // Metadata and control
          {
            name: 'status',
            type: 'pesquisa_precos_status_enum',
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
            name: 'dataValidade',
            type: 'date',
            isNullable: true,
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

    // Create foreign key for ETP relationship (optional)
    await queryRunner.createForeignKey(
      'pesquisas_precos',
      new TableForeignKey({
        name: 'FK_pesquisas_precos_etp',
        columnNames: ['etpId'],
        referencedTableName: 'etps',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for TR relationship (optional)
    await queryRunner.createForeignKey(
      'pesquisas_precos',
      new TableForeignKey({
        name: 'FK_pesquisas_precos_termo_referencia',
        columnNames: ['termoReferenciaId'],
        referencedTableName: 'termos_referencia',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for Organization relationship
    await queryRunner.createForeignKey(
      'pesquisas_precos',
      new TableForeignKey({
        name: 'FK_pesquisas_precos_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for User relationship
    await queryRunner.createForeignKey(
      'pesquisas_precos',
      new TableForeignKey({
        name: 'FK_pesquisas_precos_user',
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create index for organization queries (multi-tenant)
    await queryRunner.createIndex(
      'pesquisas_precos',
      new TableIndex({
        name: 'IDX_pesquisas_precos_organization',
        columnNames: ['organizationId'],
      }),
    );

    // Create index for ETP queries
    await queryRunner.createIndex(
      'pesquisas_precos',
      new TableIndex({
        name: 'IDX_pesquisas_precos_etp',
        columnNames: ['etpId'],
      }),
    );

    // Create index for TR queries
    await queryRunner.createIndex(
      'pesquisas_precos',
      new TableIndex({
        name: 'IDX_pesquisas_precos_termo_referencia',
        columnNames: ['termoReferenciaId'],
      }),
    );

    // Create index for status filtering
    await queryRunner.createIndex(
      'pesquisas_precos',
      new TableIndex({
        name: 'IDX_pesquisas_precos_status',
        columnNames: ['status'],
      }),
    );

    // Create composite index for org + status queries
    await queryRunner.createIndex(
      'pesquisas_precos',
      new TableIndex({
        name: 'IDX_pesquisas_precos_org_status',
        columnNames: ['organizationId', 'status'],
      }),
    );

    // Create index for methodology filtering
    await queryRunner.createIndex(
      'pesquisas_precos',
      new TableIndex({
        name: 'IDX_pesquisas_precos_metodologia',
        columnNames: ['metodologia'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'pesquisas_precos',
      'IDX_pesquisas_precos_metodologia',
    );
    await queryRunner.dropIndex(
      'pesquisas_precos',
      'IDX_pesquisas_precos_org_status',
    );
    await queryRunner.dropIndex(
      'pesquisas_precos',
      'IDX_pesquisas_precos_status',
    );
    await queryRunner.dropIndex(
      'pesquisas_precos',
      'IDX_pesquisas_precos_termo_referencia',
    );
    await queryRunner.dropIndex('pesquisas_precos', 'IDX_pesquisas_precos_etp');
    await queryRunner.dropIndex(
      'pesquisas_precos',
      'IDX_pesquisas_precos_organization',
    );

    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'pesquisas_precos',
      'FK_pesquisas_precos_user',
    );
    await queryRunner.dropForeignKey(
      'pesquisas_precos',
      'FK_pesquisas_precos_organization',
    );
    await queryRunner.dropForeignKey(
      'pesquisas_precos',
      'FK_pesquisas_precos_termo_referencia',
    );
    await queryRunner.dropForeignKey(
      'pesquisas_precos',
      'FK_pesquisas_precos_etp',
    );

    // Drop table
    await queryRunner.dropTable('pesquisas_precos');

    // Drop enum types
    await queryRunner.query('DROP TYPE "pesquisa_precos_status_enum"');
    await queryRunner.query('DROP TYPE "metodologia_pesquisa_enum"');
  }
}

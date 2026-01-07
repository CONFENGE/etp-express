import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create termos_referencia table.
 *
 * @description
 * Creates the TermoReferencia entity table with all fields required for
 * generating Termos de Referência compliant with Lei 14.133/2021.
 *
 * The table includes:
 * - Relationship with ETP (source document)
 * - Object definition and technical specifications
 * - Bidding parameters (modality, judgment criteria, execution regime)
 * - Schedules and deadlines
 * - Contractual conditions and obligations
 * - Penalties and sustainability criteria
 * - Multi-tenancy support (organizationId)
 *
 * @see Issue #1248 - [TR-a] Criar entity TermoReferencia e relacionamentos
 * @see Milestone M10 - Termo de Referência
 */
export class CreateTermosReferenciaTable1736348400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "termo_referencia_status_enum" AS ENUM ('draft', 'in_progress', 'review', 'approved', 'archived')
    `);

    await queryRunner.query(`
      CREATE TYPE "modalidade_licitacao_enum" AS ENUM ('PREGAO', 'CONCORRENCIA', 'CONCURSO', 'LEILAO', 'DIALOGO_COMPETITIVO', 'DISPENSA', 'INEXIGIBILIDADE')
    `);

    await queryRunner.query(`
      CREATE TYPE "criterio_julgamento_enum" AS ENUM ('MENOR_PRECO', 'MAIOR_DESCONTO', 'MELHOR_TECNICA', 'TECNICA_PRECO', 'MAIOR_LANCE', 'MAIOR_RETORNO_ECONOMICO')
    `);

    await queryRunner.query(`
      CREATE TYPE "regime_execucao_enum" AS ENUM ('EMPREITADA_PRECO_GLOBAL', 'EMPREITADA_PRECO_UNITARIO', 'TAREFA', 'EMPREITADA_INTEGRAL', 'CONTRATACAO_INTEGRADA', 'CONTRATACAO_SEMI_INTEGRADA', 'FORNECIMENTO_INSTALACAO')
    `);

    // Create termos_referencia table
    await queryRunner.createTable(
      new Table({
        name: 'termos_referencia',
        columns: [
          // Primary Key
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          // ETP Relationship (required)
          {
            name: 'etpId',
            type: 'uuid',
            isNullable: false,
          },
          // Identification
          {
            name: 'numeroTR',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'numeroProcesso',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'titulo',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          // Object Definition
          {
            name: 'objeto',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'naturezaObjeto',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'justificativa',
            type: 'text',
            isNullable: true,
          },
          // Technical Specifications
          {
            name: 'especificacoes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'requisitosTecnicos',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'requisitosQualificacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'normasAplicaveis',
            type: 'jsonb',
            isNullable: true,
          },
          // Values and Quantities
          {
            name: 'valorEstimado',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'quantidade',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'unidadeMedida',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'metodologiaPrecos',
            type: 'text',
            isNullable: true,
          },
          // Bidding Parameters
          {
            name: 'modalidade',
            type: 'modalidade_licitacao_enum',
            isNullable: true,
          },
          {
            name: 'criterioJulgamento',
            type: 'criterio_julgamento_enum',
            isNullable: true,
          },
          {
            name: 'regimeExecucao',
            type: 'regime_execucao_enum',
            isNullable: true,
          },
          {
            name: 'justificativaModalidade',
            type: 'text',
            isNullable: true,
          },
          // Deadlines and Schedule
          {
            name: 'prazoVigencia',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'prazoExecucao',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'permiteProrrogacao',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'cronograma',
            type: 'jsonb',
            isNullable: true,
          },
          // Contractual Conditions
          {
            name: 'formaPagamento',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'dotacaoOrcamentaria',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'localEntrega',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'garantiaContratual',
            type: 'jsonb',
            isNullable: true,
          },
          // Obligations and Responsibilities
          {
            name: 'obrigacoes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'modeloGestao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'indicadoresDesempenho',
            type: 'jsonb',
            isNullable: true,
          },
          // Penalties
          {
            name: 'penalidades',
            type: 'jsonb',
            isNullable: true,
          },
          // Sustainability
          {
            name: 'criteriosSustentabilidade',
            type: 'text',
            isNullable: true,
          },
          // Legal Foundation
          {
            name: 'fundamentacaoLegal',
            type: 'jsonb',
            isNullable: true,
          },
          // Metadata and Control
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
            name: 'completionPercentage',
            type: 'float',
            default: 0,
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          // Multi-Tenancy
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
          },
          // Audit Fields
          {
            name: 'created_by',
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

    // Create foreign key to ETPs table
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

    // Create foreign key to Organizations table
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

    // Create foreign key to Users table
    await queryRunner.createForeignKey(
      'termos_referencia',
      new TableForeignKey({
        name: 'FK_termos_referencia_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'termos_referencia',
      new TableIndex({
        name: 'IDX_termos_referencia_etpId',
        columnNames: ['etpId'],
      }),
    );

    await queryRunner.createIndex(
      'termos_referencia',
      new TableIndex({
        name: 'IDX_termos_referencia_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.createIndex(
      'termos_referencia',
      new TableIndex({
        name: 'IDX_termos_referencia_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'termos_referencia',
      new TableIndex({
        name: 'IDX_termos_referencia_created_by',
        columnNames: ['created_by'],
      }),
    );

    // Composite index for common query pattern (org + status)
    await queryRunner.createIndex(
      'termos_referencia',
      new TableIndex({
        name: 'IDX_termos_referencia_org_status',
        columnNames: ['organizationId', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'termos_referencia',
      'IDX_termos_referencia_org_status',
    );
    await queryRunner.dropIndex(
      'termos_referencia',
      'IDX_termos_referencia_created_by',
    );
    await queryRunner.dropIndex(
      'termos_referencia',
      'IDX_termos_referencia_status',
    );
    await queryRunner.dropIndex(
      'termos_referencia',
      'IDX_termos_referencia_organizationId',
    );
    await queryRunner.dropIndex(
      'termos_referencia',
      'IDX_termos_referencia_etpId',
    );

    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'termos_referencia',
      'FK_termos_referencia_created_by',
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

    // Drop enum types
    await queryRunner.query('DROP TYPE "regime_execucao_enum"');
    await queryRunner.query('DROP TYPE "criterio_julgamento_enum"');
    await queryRunner.query('DROP TYPE "modalidade_licitacao_enum"');
    await queryRunner.query('DROP TYPE "termo_referencia_status_enum"');
  }
}

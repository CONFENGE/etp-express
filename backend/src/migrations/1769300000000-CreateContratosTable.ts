import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create contratos table for Contract management module.
 *
 * @description
 * Creates table for storing Contrato (Public Contract):
 * - contratos: Contracts per Lei 14.133/2021 Art. 90-129
 *
 * Features:
 * - Link to Edital (document chain ETP → TR → Edital → Contrato)
 * - Multi-tenant isolation via organizationId
 * - Complete lifecycle from minuta to encerrado
 * - Contract administrator and inspector assignment
 * - Full contract terms and conditions
 * - Audit trail for contract changes
 *
 * @see Issue #1284 - [Contratos-a] Criar entity Contrato com ciclo de vida
 * @see Issue #1283 - [Contratos] Modulo de Gestao de Contratos - EPIC
 * @see Lei 14.133/2021 Art. 90-129 - Contratos Administrativos
 */
export class CreateContratosTable1769300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for contrato status
    await queryRunner.query(`
      CREATE TYPE "contrato_status_enum" AS ENUM (
        'minuta',
        'assinado',
        'em_execucao',
        'aditivado',
        'suspenso',
        'rescindido',
        'encerrado'
      )
    `);

    // Create contratos table
    await queryRunner.createTable(
      new Table({
        name: 'contratos',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          // Relationship with Edital (optional)
          {
            name: 'editalId',
            type: 'uuid',
            isNullable: true,
          },
          // Multi-tenancy
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
          },
          // Identification (Art. 92)
          {
            name: 'numero',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'numeroProcesso',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          // Object (Art. 92, I)
          {
            name: 'objeto',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'descricaoObjeto',
            type: 'text',
            isNullable: true,
          },
          // Contracted party data (Art. 92, II)
          {
            name: 'contratadoCnpj',
            type: 'varchar',
            length: '18',
            isNullable: false,
          },
          {
            name: 'contratadoRazaoSocial',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'contratadoNomeFantasia',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contratadoEndereco',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contratadoTelefone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'contratadoEmail',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // Values (Art. 92, III)
          {
            name: 'valorGlobal',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'valorUnitario',
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
            name: 'quantidadeContratada',
            type: 'decimal',
            precision: 15,
            scale: 3,
            isNullable: true,
          },
          // Validity period (Art. 92, IV and V)
          {
            name: 'vigenciaInicio',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'vigenciaFim',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'prazoExecucao',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'possibilidadeProrrogacao',
            type: 'text',
            isNullable: true,
          },
          // Contract management (Art. 117)
          {
            name: 'gestorResponsavelId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'fiscalResponsavelId',
            type: 'uuid',
            isNullable: false,
          },
          // Clauses and conditions
          {
            name: 'dotacaoOrcamentaria',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'fonteRecursos',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'condicoesPagamento',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'garantiaContratual',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reajusteContratual',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sancoesAdministrativas',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fundamentacaoLegal',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'localEntrega',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'clausulas',
            type: 'jsonb',
            isNullable: true,
          },
          // Status and control
          {
            name: 'status',
            type: 'contrato_status_enum',
            default: "'minuta'",
            isNullable: false,
          },
          {
            name: 'dataAssinatura',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'dataPublicacao',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'referenciaPublicacao',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'versao',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'observacoesInternas',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'motivoRescisao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'dataRescisao',
            type: 'date',
            isNullable: true,
          },
          // Audit
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

    // Create foreign key for Edital relationship (optional)
    await queryRunner.createForeignKey(
      'contratos',
      new TableForeignKey({
        name: 'FK_contratos_edital',
        columnNames: ['editalId'],
        referencedTableName: 'editais',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for Organization relationship
    await queryRunner.createForeignKey(
      'contratos',
      new TableForeignKey({
        name: 'FK_contratos_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for Gestor Responsavel
    await queryRunner.createForeignKey(
      'contratos',
      new TableForeignKey({
        name: 'FK_contratos_gestor_responsavel',
        columnNames: ['gestorResponsavelId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create foreign key for Fiscal Responsavel
    await queryRunner.createForeignKey(
      'contratos',
      new TableForeignKey({
        name: 'FK_contratos_fiscal_responsavel',
        columnNames: ['fiscalResponsavelId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // Create foreign key for User (creator) relationship
    await queryRunner.createForeignKey(
      'contratos',
      new TableForeignKey({
        name: 'FK_contratos_created_by',
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create index for organization queries (multi-tenant)
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_organization',
        columnNames: ['organizationId'],
      }),
    );

    // Create index for Edital queries
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_edital',
        columnNames: ['editalId'],
      }),
    );

    // Create index for status filtering
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_status',
        columnNames: ['status'],
      }),
    );

    // Create composite index for org + status queries
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_org_status',
        columnNames: ['organizationId', 'status'],
      }),
    );

    // Create index for numero (unique per organization)
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_numero',
        columnNames: ['numero'],
      }),
    );

    // Create composite index for org + numero (unique constraint)
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_org_numero',
        columnNames: ['organizationId', 'numero'],
        isUnique: true,
      }),
    );

    // Create index for CNPJ queries
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_cnpj',
        columnNames: ['contratadoCnpj'],
      }),
    );

    // Create index for vigenciaFim (expiring contracts)
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_vigencia_fim',
        columnNames: ['vigenciaFim'],
      }),
    );

    // Create index for gestor responsavel queries
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_gestor',
        columnNames: ['gestorResponsavelId'],
      }),
    );

    // Create index for fiscal responsavel queries
    await queryRunner.createIndex(
      'contratos',
      new TableIndex({
        name: 'IDX_contratos_fiscal',
        columnNames: ['fiscalResponsavelId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('contratos', 'IDX_contratos_fiscal');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_gestor');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_vigencia_fim');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_cnpj');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_org_numero');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_numero');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_org_status');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_status');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_edital');
    await queryRunner.dropIndex('contratos', 'IDX_contratos_organization');

    // Drop foreign keys
    await queryRunner.dropForeignKey('contratos', 'FK_contratos_created_by');
    await queryRunner.dropForeignKey(
      'contratos',
      'FK_contratos_fiscal_responsavel',
    );
    await queryRunner.dropForeignKey(
      'contratos',
      'FK_contratos_gestor_responsavel',
    );
    await queryRunner.dropForeignKey('contratos', 'FK_contratos_organization');
    await queryRunner.dropForeignKey('contratos', 'FK_contratos_edital');

    // Drop table
    await queryRunner.dropTable('contratos');

    // Drop enum type
    await queryRunner.query('DROP TYPE "contrato_status_enum"');
  }
}

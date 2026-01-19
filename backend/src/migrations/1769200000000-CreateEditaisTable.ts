import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create editais table for Edital module.
 *
 * @description
 * Creates table for storing Edital (Public Bidding Notice):
 * - editais: Bidding documents per Lei 14.133/2021
 *
 * Features:
 * - Link to ETP, TR, and PesquisaPrecos (document chain)
 * - Multi-tenant isolation via organizationId
 * - Complete structure per Lei 14.133/2021 Art. 25
 * - Support for all bidding modalities (Art. 28)
 * - Judgment criteria (Art. 33)
 * - Dispute modes (Art. 56)
 * - Lifecycle status tracking
 *
 * @see Issue #1277 - [Edital-a] Criar entity Edital com estrutura completa
 * @see Issue #1276 - [Edital] Modulo de Geracao de Edital - EPIC
 * @see Lei 14.133/2021 - Nova Lei de Licitacoes, Art. 25
 */
export class CreateEditaisTable1769200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for modalidade de licitacao (Art. 28)
    await queryRunner.query(`
      CREATE TYPE "modalidade_licitacao_enum" AS ENUM (
        'PREGAO',
        'CONCORRENCIA',
        'CONCURSO',
        'LEILAO',
        'DIALOGO_COMPETITIVO'
      )
    `);

    // Create enum for tipo de contratacao direta (Arts. 74-75)
    await queryRunner.query(`
      CREATE TYPE "tipo_contratacao_direta_enum" AS ENUM (
        'INEXIGIBILIDADE',
        'DISPENSA'
      )
    `);

    // Create enum for criterio de julgamento (Art. 33)
    await queryRunner.query(`
      CREATE TYPE "criterio_julgamento_enum" AS ENUM (
        'MENOR_PRECO',
        'MAIOR_DESCONTO',
        'MELHOR_TECNICA',
        'TECNICA_PRECO',
        'MAIOR_LANCE',
        'MAIOR_RETORNO_ECONOMICO'
      )
    `);

    // Create enum for modo de disputa (Art. 56)
    await queryRunner.query(`
      CREATE TYPE "modo_disputa_enum" AS ENUM (
        'ABERTO',
        'FECHADO',
        'ABERTO_FECHADO'
      )
    `);

    // Create enum for edital status
    await queryRunner.query(`
      CREATE TYPE "edital_status_enum" AS ENUM (
        'draft',
        'review',
        'approved',
        'published',
        'suspended',
        'revoked',
        'closed',
        'archived'
      )
    `);

    // Create editais table
    await queryRunner.createTable(
      new Table({
        name: 'editais',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          // Relationship with ETP (optional)
          {
            name: 'etpId',
            type: 'uuid',
            isNullable: true,
          },
          // Relationship with TR (optional)
          {
            name: 'termoReferenciaId',
            type: 'uuid',
            isNullable: true,
          },
          // Relationship with PesquisaPrecos (optional)
          {
            name: 'pesquisaPrecosId',
            type: 'uuid',
            isNullable: true,
          },
          // Multi-tenancy
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
          },
          // Identification (Art. 25, caput)
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
          {
            name: 'uasg',
            type: 'varchar',
            length: '6',
            isNullable: true,
          },
          // Object (Art. 25, I)
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
          // Modality and Type (Art. 25, II e III)
          {
            name: 'modalidade',
            type: 'modalidade_licitacao_enum',
            isNullable: true,
          },
          {
            name: 'tipoContratacaoDireta',
            type: 'tipo_contratacao_direta_enum',
            isNullable: true,
          },
          {
            name: 'criterioJulgamento',
            type: 'criterio_julgamento_enum',
            default: "'MENOR_PRECO'",
            isNullable: false,
          },
          {
            name: 'modoDisputa',
            type: 'modo_disputa_enum',
            default: "'ABERTO'",
            isNullable: false,
          },
          // Participation conditions (Art. 25, IV)
          {
            name: 'condicoesParticipacao',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'exclusividadeMeEpp',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'valorLimiteMeEpp',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'cotaReservadaMeEpp',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'exigenciaConsorcio',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          // Qualification requirements (Art. 25, V)
          {
            name: 'requisitosHabilitacao',
            type: 'jsonb',
            isNullable: true,
          },
          // Sanctions (Art. 25, VI)
          {
            name: 'sancoesAdministrativas',
            type: 'text',
            isNullable: true,
          },
          // Contract duration (Art. 25, VII)
          {
            name: 'prazoVigencia',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'possibilidadeProrrogacao',
            type: 'text',
            isNullable: true,
          },
          // Budget allocation (Art. 25, VIII)
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
          // Values (Art. 25, IX)
          {
            name: 'valorEstimado',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'sigiloOrcamento',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          // Process deadlines
          {
            name: 'prazos',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'dataSessaoPublica',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'localSessaoPublica',
            type: 'text',
            isNullable: true,
          },
          // Clauses and annexes
          {
            name: 'clausulas',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'anexos',
            type: 'jsonb',
            isNullable: true,
          },
          // Additional information
          {
            name: 'fundamentacaoLegal',
            type: 'text',
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
            name: 'localEntrega',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sistemaEletronico',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'linkSistemaEletronico',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          // Metadata and control
          {
            name: 'status',
            type: 'edital_status_enum',
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
            name: 'observacoesInternas',
            type: 'text',
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
          // Audit
          {
            name: 'createdById',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'approvedById',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'approvedAt',
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

    // Create foreign key for ETP relationship (optional)
    await queryRunner.createForeignKey(
      'editais',
      new TableForeignKey({
        name: 'FK_editais_etp',
        columnNames: ['etpId'],
        referencedTableName: 'etps',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for TR relationship (optional)
    await queryRunner.createForeignKey(
      'editais',
      new TableForeignKey({
        name: 'FK_editais_termo_referencia',
        columnNames: ['termoReferenciaId'],
        referencedTableName: 'termos_referencia',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for PesquisaPrecos relationship (optional)
    await queryRunner.createForeignKey(
      'editais',
      new TableForeignKey({
        name: 'FK_editais_pesquisa_precos',
        columnNames: ['pesquisaPrecosId'],
        referencedTableName: 'pesquisas_precos',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for Organization relationship
    await queryRunner.createForeignKey(
      'editais',
      new TableForeignKey({
        name: 'FK_editais_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for User (creator) relationship
    await queryRunner.createForeignKey(
      'editais',
      new TableForeignKey({
        name: 'FK_editais_created_by',
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create foreign key for User (approver) relationship
    await queryRunner.createForeignKey(
      'editais',
      new TableForeignKey({
        name: 'FK_editais_approved_by',
        columnNames: ['approvedById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Create index for organization queries (multi-tenant)
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_organization',
        columnNames: ['organizationId'],
      }),
    );

    // Create index for ETP queries
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_etp',
        columnNames: ['etpId'],
      }),
    );

    // Create index for TR queries
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_termo_referencia',
        columnNames: ['termoReferenciaId'],
      }),
    );

    // Create index for PesquisaPrecos queries
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_pesquisa_precos',
        columnNames: ['pesquisaPrecosId'],
      }),
    );

    // Create index for status filtering
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_status',
        columnNames: ['status'],
      }),
    );

    // Create composite index for org + status queries
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_org_status',
        columnNames: ['organizationId', 'status'],
      }),
    );

    // Create index for modalidade filtering
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_modalidade',
        columnNames: ['modalidade'],
      }),
    );

    // Create index for numero (unique per organization)
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_numero',
        columnNames: ['numero'],
      }),
    );

    // Create composite index for org + numero (unique constraint)
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_org_numero',
        columnNames: ['organizationId', 'numero'],
        isUnique: true,
      }),
    );

    // Create index for dataSessaoPublica (upcoming sessions)
    await queryRunner.createIndex(
      'editais',
      new TableIndex({
        name: 'IDX_editais_sessao_publica',
        columnNames: ['dataSessaoPublica'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('editais', 'IDX_editais_sessao_publica');
    await queryRunner.dropIndex('editais', 'IDX_editais_org_numero');
    await queryRunner.dropIndex('editais', 'IDX_editais_numero');
    await queryRunner.dropIndex('editais', 'IDX_editais_modalidade');
    await queryRunner.dropIndex('editais', 'IDX_editais_org_status');
    await queryRunner.dropIndex('editais', 'IDX_editais_status');
    await queryRunner.dropIndex('editais', 'IDX_editais_pesquisa_precos');
    await queryRunner.dropIndex('editais', 'IDX_editais_termo_referencia');
    await queryRunner.dropIndex('editais', 'IDX_editais_etp');
    await queryRunner.dropIndex('editais', 'IDX_editais_organization');

    // Drop foreign keys
    await queryRunner.dropForeignKey('editais', 'FK_editais_approved_by');
    await queryRunner.dropForeignKey('editais', 'FK_editais_created_by');
    await queryRunner.dropForeignKey('editais', 'FK_editais_organization');
    await queryRunner.dropForeignKey('editais', 'FK_editais_pesquisa_precos');
    await queryRunner.dropForeignKey('editais', 'FK_editais_termo_referencia');
    await queryRunner.dropForeignKey('editais', 'FK_editais_etp');

    // Drop table
    await queryRunner.dropTable('editais');

    // Drop enum types
    await queryRunner.query('DROP TYPE "edital_status_enum"');
    await queryRunner.query('DROP TYPE "modo_disputa_enum"');
    await queryRunner.query('DROP TYPE "criterio_julgamento_enum"');
    await queryRunner.query('DROP TYPE "tipo_contratacao_direta_enum"');
    await queryRunner.query('DROP TYPE "modalidade_licitacao_enum"');
  }
}

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create edital_templates table.
 *
 * @description
 * Creates table for storing EditalTemplate (Edital Templates):
 * - edital_templates: Pre-configured bidding notice templates per modality
 *
 * Features:
 * - Templates for 4 modalities: PREGAO, CONCORRENCIA, DISPENSA, INEXIGIBILIDADE
 * - Structured sections with default text models
 * - Configurable clauses with placeholders
 * - Dynamic fields specific to each modality
 * - Legal references per Lei 14.133/2021
 * - Version control and active/inactive status
 *
 * @see Issue #1278 - [Edital-b] Templates de edital por modalidade
 * @see Issue #1276 - [Edital] Modulo de Geracao de Edital - EPIC
 * @see Lei 14.133/2021 Art. 25 - Requisitos obrigatorios do edital
 * @see Lei 14.133/2021 Art. 28 - Modalidades de licitacao
 */
export class CreateEditalTemplatesTable1769400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for edital template modalidade
    await queryRunner.query(`
      CREATE TYPE "edital_template_modalidade_enum" AS ENUM (
        'PREGAO',
        'CONCORRENCIA',
        'DISPENSA',
        'INEXIGIBILIDADE'
      )
    `);

    // Create edital_templates table
    await queryRunner.createTable(
      new Table({
        name: 'edital_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
            comment: 'Nome do template (ex: Template de Pregao Eletronico)',
          },
          {
            name: 'modalidade',
            type: 'edital_template_modalidade_enum',
            isNullable: false,
            comment:
              'Modalidade do template (PREGAO, CONCORRENCIA, DISPENSA, INEXIGIBILIDADE)',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
            comment: 'Descricao detalhada do template e quando utiliza-lo',
          },
          {
            name: 'secoes',
            type: 'jsonb',
            isNullable: false,
            comment:
              'Secoes padrao do edital estruturadas com texto modelo e metadados',
          },
          {
            name: 'clausulas',
            type: 'jsonb',
            isNullable: false,
            comment:
              'Clausulas contratuais padrao configuráveis com placeholders',
          },
          {
            name: 'specificFields',
            type: 'jsonb',
            isNullable: false,
            comment:
              'Campos especificos para esta modalidade (labels, tipos, validacoes)',
          },
          {
            name: 'legalReferences',
            type: 'jsonb',
            isNullable: false,
            comment: 'Referencias legais aplicaveis (Lei 14.133/2021, INs)',
          },
          {
            name: 'defaultPreambulo',
            type: 'text',
            isNullable: true,
            comment: 'Texto padrao do preambulo do edital',
          },
          {
            name: 'defaultFundamentacaoLegal',
            type: 'text',
            isNullable: true,
            comment: 'Texto padrao da fundamentacao legal',
          },
          {
            name: 'defaultCondicoesParticipacao',
            type: 'text',
            isNullable: true,
            comment: 'Texto padrao de condicoes de participacao',
          },
          {
            name: 'defaultRequisitosHabilitacao',
            type: 'text',
            isNullable: true,
            comment: 'Texto padrao de requisitos de habilitacao',
          },
          {
            name: 'defaultSancoesAdministrativas',
            type: 'text',
            isNullable: true,
            comment: 'Texto padrao de sancoes administrativas',
          },
          {
            name: 'defaultCondicoesPagamento',
            type: 'text',
            isNullable: true,
            comment: 'Texto padrao de condicoes de pagamento',
          },
          {
            name: 'defaultGarantiaContratual',
            type: 'text',
            isNullable: true,
            comment: 'Texto padrao de garantia contratual',
          },
          {
            name: 'defaultReajusteContratual',
            type: 'text',
            isNullable: true,
            comment: 'Texto padrao de reajuste contratual',
          },
          {
            name: 'instructions',
            type: 'text',
            isNullable: true,
            comment:
              'Observacoes e instrucoes para uso do template pelo agente publico',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: 'Indica se o template esta ativo e disponivel para uso',
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
            isNullable: false,
            comment:
              'Versao do template (incrementado a cada atualizacao para controle de mudancas)',
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

    // Create index for modalidade (frequent filter)
    await queryRunner.createIndex(
      'edital_templates',
      new TableIndex({
        name: 'IDX_edital_templates_modalidade',
        columnNames: ['modalidade'],
      }),
    );

    // Create index for isActive (filter active templates)
    await queryRunner.createIndex(
      'edital_templates',
      new TableIndex({
        name: 'IDX_edital_templates_isActive',
        columnNames: ['isActive'],
      }),
    );

    // Create composite index for active templates by modalidade (most common query)
    await queryRunner.createIndex(
      'edital_templates',
      new TableIndex({
        name: 'IDX_edital_templates_modalidade_isActive',
        columnNames: ['modalidade', 'isActive'],
      }),
    );

    // Create index for updatedAt (versioning and audit)
    await queryRunner.createIndex(
      'edital_templates',
      new TableIndex({
        name: 'IDX_edital_templates_updatedAt',
        columnNames: ['updatedAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (indexes are dropped automatically)
    await queryRunner.dropTable('edital_templates', true);

    // Drop enum
    await queryRunner.query(
      `DROP TYPE IF EXISTS "edital_template_modalidade_enum"`,
    );
  }
}

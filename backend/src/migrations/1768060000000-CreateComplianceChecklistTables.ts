import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create compliance checklist tables.
 *
 * @description
 * Creates tables for TCU/TCE compliance validation:
 * - compliance_checklists: Checklists by standard (TCU, TCE) and ETP type
 * - compliance_checklist_items: Individual requirements within checklists
 *
 * These tables store validation rules based on:
 * - Lei 14.133/2021 (Art. 18 - ETP requirements)
 * - IN SEGES 58/2022 (ETP Digital regulation)
 * - IN SEGES 65/2021 (Price research methodology)
 * - Common rejection reasons from TCU audits
 *
 * @see Issue #1383 - [TCU-1163b] Criar entity ComplianceChecklist e service de validacao
 * @see Issue #1163 - [Conformidade] Templates baseados em modelos TCU/TCES
 * @see docs/compliance/TCU_REQUIREMENTS.md
 * @see docs/compliance/COMMON_REJECTIONS.md
 */
export class CreateComplianceChecklistTables1768060000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for compliance standards
    await queryRunner.query(`
      CREATE TYPE "compliance_standard_enum" AS ENUM (
        'TCU', 'TCE_SP', 'TCE_RJ', 'TCE_MG', 'TCE_RS', 'GENERIC'
      )
    `);

    // Create enum for checklist item types
    await queryRunner.query(`
      CREATE TYPE "checklist_item_type_enum" AS ENUM (
        'MANDATORY', 'RECOMMENDED', 'OPTIONAL'
      )
    `);

    // Create enum for checklist item categories
    await queryRunner.query(`
      CREATE TYPE "checklist_item_category_enum" AS ENUM (
        'IDENTIFICATION', 'JUSTIFICATION', 'REQUIREMENTS',
        'PRICING', 'RISKS', 'CONCLUSION', 'DOCUMENTATION'
      )
    `);

    // Create compliance_checklists table
    await queryRunner.createTable(
      new Table({
        name: 'compliance_checklists',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'standard',
            type: 'compliance_standard_enum',
            default: "'TCU'",
            isNullable: false,
          },
          {
            name: 'templateType',
            type: 'etp_template_type_enum',
            isNullable: false,
          },
          {
            name: 'legalBasis',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'version',
            type: 'varchar',
            length: '20',
            default: "'1.0'",
            isNullable: false,
          },
          {
            name: 'minimumScore',
            type: 'int',
            default: 70,
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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

    // Create indexes for compliance_checklists
    await queryRunner.createIndex(
      'compliance_checklists',
      new TableIndex({
        name: 'IDX_compliance_checklists_standard',
        columnNames: ['standard'],
      }),
    );

    await queryRunner.createIndex(
      'compliance_checklists',
      new TableIndex({
        name: 'IDX_compliance_checklists_templateType',
        columnNames: ['templateType'],
      }),
    );

    await queryRunner.createIndex(
      'compliance_checklists',
      new TableIndex({
        name: 'IDX_compliance_checklists_isActive',
        columnNames: ['isActive'],
      }),
    );

    await queryRunner.createIndex(
      'compliance_checklists',
      new TableIndex({
        name: 'IDX_compliance_checklists_standard_templateType_isActive',
        columnNames: ['standard', 'templateType', 'isActive'],
      }),
    );

    // Create compliance_checklist_items table
    await queryRunner.createTable(
      new Table({
        name: 'compliance_checklist_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'checklistId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'requirement',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'checklist_item_type_enum',
            default: "'RECOMMENDED'",
            isNullable: false,
          },
          {
            name: 'category',
            type: 'checklist_item_category_enum',
            default: "'JUSTIFICATION'",
            isNullable: false,
          },
          {
            name: 'weight',
            type: 'int',
            default: 10,
            isNullable: false,
          },
          {
            name: 'etpFieldsRequired',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'sectionRequired',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'keywords',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'validationRegex',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'minLength',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'fixSuggestion',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'legalReference',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'rejectionCode',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'order',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign key for checklist relationship
    await queryRunner.createForeignKey(
      'compliance_checklist_items',
      new TableForeignKey({
        name: 'FK_compliance_checklist_items_checklist',
        columnNames: ['checklistId'],
        referencedTableName: 'compliance_checklists',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for compliance_checklist_items
    await queryRunner.createIndex(
      'compliance_checklist_items',
      new TableIndex({
        name: 'IDX_compliance_checklist_items_checklistId',
        columnNames: ['checklistId'],
      }),
    );

    await queryRunner.createIndex(
      'compliance_checklist_items',
      new TableIndex({
        name: 'IDX_compliance_checklist_items_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'compliance_checklist_items',
      new TableIndex({
        name: 'IDX_compliance_checklist_items_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'compliance_checklist_items',
      new TableIndex({
        name: 'IDX_compliance_checklist_items_isActive',
        columnNames: ['isActive'],
      }),
    );

    await queryRunner.createIndex(
      'compliance_checklist_items',
      new TableIndex({
        name: 'IDX_compliance_checklist_items_order',
        columnNames: ['checklistId', 'order'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes from compliance_checklist_items
    await queryRunner.dropIndex(
      'compliance_checklist_items',
      'IDX_compliance_checklist_items_order',
    );
    await queryRunner.dropIndex(
      'compliance_checklist_items',
      'IDX_compliance_checklist_items_isActive',
    );
    await queryRunner.dropIndex(
      'compliance_checklist_items',
      'IDX_compliance_checklist_items_category',
    );
    await queryRunner.dropIndex(
      'compliance_checklist_items',
      'IDX_compliance_checklist_items_type',
    );
    await queryRunner.dropIndex(
      'compliance_checklist_items',
      'IDX_compliance_checklist_items_checklistId',
    );

    // Drop foreign key
    await queryRunner.dropForeignKey(
      'compliance_checklist_items',
      'FK_compliance_checklist_items_checklist',
    );

    // Drop compliance_checklist_items table
    await queryRunner.dropTable('compliance_checklist_items');

    // Drop indexes from compliance_checklists
    await queryRunner.dropIndex(
      'compliance_checklists',
      'IDX_compliance_checklists_standard_templateType_isActive',
    );
    await queryRunner.dropIndex(
      'compliance_checklists',
      'IDX_compliance_checklists_isActive',
    );
    await queryRunner.dropIndex(
      'compliance_checklists',
      'IDX_compliance_checklists_templateType',
    );
    await queryRunner.dropIndex(
      'compliance_checklists',
      'IDX_compliance_checklists_standard',
    );

    // Drop compliance_checklists table
    await queryRunner.dropTable('compliance_checklists');

    // Drop enum types
    await queryRunner.query('DROP TYPE "checklist_item_category_enum"');
    await queryRunner.query('DROP TYPE "checklist_item_type_enum"');
    await queryRunner.query('DROP TYPE "compliance_standard_enum"');
  }
}

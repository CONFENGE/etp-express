import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration: CreateTenantBrandingTable
 * Issue: #1294 - White-label customization system
 *
 * Creates tenant_brandings table for white-label customization.
 * Allows organizations to customize logo, colors, domain, and footer.
 */
export class CreateTenantBrandingTable1738347600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tenant_brandings table
    await queryRunner.createTable(
      new Table({
        name: 'tenant_brandings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organizationId',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'logoUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'primaryColor',
            type: 'varchar',
            length: '7',
            isNullable: true,
            comment: 'Primary brand color in HEX format (e.g., #0066cc)',
          },
          {
            name: 'secondaryColor',
            type: 'varchar',
            length: '7',
            isNullable: true,
            comment: 'Secondary brand color in HEX format',
          },
          {
            name: 'accentColor',
            type: 'varchar',
            length: '7',
            isNullable: true,
            comment: 'Accent brand color in HEX format',
          },
          {
            name: 'customDomain',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
            comment: 'Custom domain/subdomain for white-label',
          },
          {
            name: 'footerText',
            type: 'text',
            isNullable: true,
            comment: 'Custom footer text',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            comment: 'Whether this branding configuration is active',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add foreign key to organizations table
    await queryRunner.createForeignKey(
      'tenant_brandings',
      new TableForeignKey({
        name: 'FK_tenant_brandings_organizationId',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index on customDomain for fast lookup
    await queryRunner.query(`
      CREATE INDEX "IDX_tenant_brandings_customDomain"
      ON "tenant_brandings" ("customDomain")
      WHERE "customDomain" IS NOT NULL;
    `);

    // Create index on isActive for filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_tenant_brandings_isActive"
      ON "tenant_brandings" ("isActive");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenant_brandings_isActive"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tenant_brandings_customDomain"`,
    );

    // Drop foreign key
    await queryRunner.dropForeignKey(
      'tenant_brandings',
      'FK_tenant_brandings_organizationId',
    );

    // Drop table
    await queryRunner.dropTable('tenant_brandings');
  }
}

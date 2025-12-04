import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add organizationId column to users table and remove orgao field.
 *
 * Changes:
 * - Add organizationId UUID column with NOT NULL constraint
 * - Add foreign key constraint to organizations table (ON DELETE RESTRICT)
 * - Create index on organizationId for efficient queries
 * - Remove orgao column (breaking change - field replaced by organization relation)
 *
 * @remarks
 * Part of issue #355 (MT-02) - Associação de Usuários (User-Org Relation)
 * Depends on: #354 (MT-01) - CreateOrganizations migration must run first
 *
 * BREAKING CHANGE: The 'orgao' field is completely removed. Applications must
 * update to use user.organization.name instead of user.orgao.
 */
export class AddOrganizationToUsers1733098000000 implements MigrationInterface {
  name = 'AddOrganizationToUsers1733098000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists (idempotency)
    const table = await queryRunner.getTable('users');
    const hasOrganizationIdColumn = table?.columns.some(
      (col) => col.name === 'organizationId',
    );

    // Step 1: Add organizationId column (nullable temporarily) - only if not exists
    if (!hasOrganizationIdColumn) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "organizationId" uuid;
      `);
    }

    // Step 2: Create a default organization for existing users
    // This ensures data integrity during migration
    const defaultOrgResult = await queryRunner.query(`
      INSERT INTO "organizations" (
        "name",
        "cnpj",
        "domainWhitelist",
        "isActive"
      )
      VALUES (
        'Organização Padrão (Migração)',
        '00.000.000/0000-00',
        ARRAY['legacy.gov.br']::text[],
        true
      )
      ON CONFLICT ("cnpj") DO NOTHING
      RETURNING "id";
    `);

    const defaultOrgId =
      defaultOrgResult.length > 0
        ? defaultOrgResult[0].id
        : (
            await queryRunner.query(`
          SELECT "id" FROM "organizations"
          WHERE "cnpj" = '00.000.000/0000-00';
        `)
          )[0].id;

    // Step 3: Update all existing users to have the default organization (always safe)
    await queryRunner.query(`
      UPDATE "users"
      SET "organizationId" = '${defaultOrgId}'
      WHERE "organizationId" IS NULL;
    `);

    // Step 4: Make organizationId NOT NULL (only if column was just created)
    if (!hasOrganizationIdColumn) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ALTER COLUMN "organizationId" SET NOT NULL;
      `);
    }

    // Step 5: Add foreign key constraint with ON DELETE RESTRICT (idempotent)
    // RESTRICT prevents deletion of an organization that has users
    const hasForeignKey = table?.foreignKeys.some(
      (fk) => fk.name === 'FK_users_organizationId',
    );

    if (!hasForeignKey) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_organizationId"
        FOREIGN KEY ("organizationId")
        REFERENCES "organizations"("id")
        ON DELETE RESTRICT;
      `);
    }

    // Step 6: Create index on organizationId for efficient filtering (idempotent)
    const hasIndex = table?.indices.some(
      (idx) => idx.name === 'IDX_users_organizationId',
    );

    if (!hasIndex) {
      await queryRunner.query(`
        CREATE INDEX "IDX_users_organizationId"
        ON "users" ("organizationId");
      `);
    }

    // Step 7: Remove orgao column (breaking change) - always safe with IF EXISTS
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "orgao";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Re-add orgao column
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "orgao" character varying;
    `);

    // Step 2: Populate orgao from organization.name (best-effort recovery)
    await queryRunner.query(`
      UPDATE "users" u
      SET "orgao" = o."name"
      FROM "organizations" o
      WHERE u."organizationId" = o."id";
    `);

    // Step 3: Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_organizationId";
    `);

    // Step 4: Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "FK_users_organizationId";
    `);

    // Step 5: Drop organizationId column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "organizationId";
    `);

    // Note: Default organization created during migration is NOT deleted
    // to prevent data loss. Manual cleanup may be required.
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create the authorized_domains table for M8: Gestão de Domínios Institucionais.
 *
 * Features:
 * - Unique domain constraint for institutional domain identification
 * - maxUsers limit (default 10) for domain quota management
 * - domainManagerId for local administrator assignment
 * - organizationId for billing and data isolation linkage
 *
 * Also adds authorizedDomainId column to users table for user-domain assignment.
 *
 * @remarks
 * Part of issue #465 (M8) - Criar entidade AuthorizedDomain
 */
export class CreateAuthorizedDomains1733450000000 implements MigrationInterface {
  name = 'CreateAuthorizedDomains1733450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if authorized_domains table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'authorized_domains'
      );
    `);

    if (!tableExists[0].exists) {
      // Create authorized_domains table
      await queryRunner.query(`
        CREATE TABLE "authorized_domains" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "domain" character varying NOT NULL,
          "institutionName" character varying NOT NULL,
          "isActive" boolean NOT NULL DEFAULT true,
          "maxUsers" integer NOT NULL DEFAULT 10,
          "domainManagerId" uuid,
          "organizationId" uuid,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_authorized_domains" PRIMARY KEY ("id"),
          CONSTRAINT "UQ_authorized_domains_domain" UNIQUE ("domain")
        );
      `);

      // Create index on domain for efficient lookups
      await queryRunner.query(`
        CREATE UNIQUE INDEX "IDX_authorized_domains_domain"
        ON "authorized_domains" ("domain");
      `);

      // Create index on isActive for filtering active domains
      await queryRunner.query(`
        CREATE INDEX "IDX_authorized_domains_isActive"
        ON "authorized_domains" ("isActive");
      `);

      // Create index on createdAt for ordering
      await queryRunner.query(`
        CREATE INDEX "IDX_authorized_domains_createdAt"
        ON "authorized_domains" ("createdAt" DESC);
      `);

      // Add foreign key to users table (domainManagerId)
      await queryRunner.query(`
        ALTER TABLE "authorized_domains"
        ADD CONSTRAINT "FK_authorized_domains_domainManager"
        FOREIGN KEY ("domainManagerId") REFERENCES "users"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);

      // Add foreign key to organizations table
      await queryRunner.query(`
        ALTER TABLE "authorized_domains"
        ADD CONSTRAINT "FK_authorized_domains_organization"
        FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
    }

    // Add authorizedDomainId column to users table if not exists
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'authorizedDomainId'
      );
    `);

    if (!columnExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "authorizedDomainId" uuid;
      `);

      // Add foreign key constraint
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD CONSTRAINT "FK_users_authorizedDomain"
        FOREIGN KEY ("authorizedDomainId") REFERENCES "authorized_domains"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);

      // Create index for efficient user lookup by domain
      await queryRunner.query(`
        CREATE INDEX "IDX_users_authorizedDomainId"
        ON "users" ("authorizedDomainId");
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove authorizedDomainId from users
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_authorizedDomain";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_users_authorizedDomainId";`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "authorizedDomainId";`,
    );

    // Drop foreign keys from authorized_domains
    await queryRunner.query(
      `ALTER TABLE "authorized_domains" DROP CONSTRAINT IF EXISTS "FK_authorized_domains_organization";`,
    );
    await queryRunner.query(
      `ALTER TABLE "authorized_domains" DROP CONSTRAINT IF EXISTS "FK_authorized_domains_domainManager";`,
    );

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_authorized_domains_createdAt";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_authorized_domains_isActive";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_authorized_domains_domain";`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "authorized_domains";`);
  }
}

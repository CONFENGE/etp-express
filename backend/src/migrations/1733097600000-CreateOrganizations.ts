import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create the organizations table for Multi-Tenancy B2G architecture.
 *
 * Features:
 * - CNPJ unique constraint for organization identification
 * - domainWhitelist text[] with GIN index for efficient domain lookup
 * - isActive boolean for Kill Switch functionality
 * - stripeCustomerId for billing integration
 *
 * @remarks
 * Part of issue #354 (MT-01) - Infrastructure de Dados (Schema Organization)
 */
export class CreateOrganizations1733097600000 implements MigrationInterface {
 name = 'CreateOrganizations1733097600000';

 public async up(queryRunner: QueryRunner): Promise<void> {
 // Check if table exists
 const tableExists = await queryRunner.query(`
 SELECT EXISTS (
 SELECT FROM information_schema.tables
 WHERE table_schema = 'public'
 AND table_name = 'organizations'
 );
 `);

 if (!tableExists[0].exists) {
 // Create organizations table
 await queryRunner.query(`
 CREATE TABLE "organizations" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "name" character varying NOT NULL,
 "cnpj" character varying NOT NULL,
 "domainWhitelist" text array NOT NULL,
 "isActive" boolean NOT NULL DEFAULT true,
 "stripeCustomerId" character varying,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
 CONSTRAINT "UQ_organizations_cnpj" UNIQUE ("cnpj")
 );
 `);

 // Create GIN index on domainWhitelist for efficient domain lookup
 // Used by OrganizationsService.findByDomain() in AuthService.register
 await queryRunner.query(`
 CREATE INDEX "IDX_organizations_domainWhitelist"
 ON "organizations" USING GIN ("domainWhitelist");
 `);

 // Create index on isActive for filtering active organizations
 await queryRunner.query(`
 CREATE INDEX "IDX_organizations_isActive"
 ON "organizations" ("isActive");
 `);

 // Create index on createdAt for ordering
 await queryRunner.query(`
 CREATE INDEX "IDX_organizations_createdAt"
 ON "organizations" ("createdAt" DESC);
 `);
 }
 }

 public async down(queryRunner: QueryRunner): Promise<void> {
 // Drop indexes
 await queryRunner.query(
 `DROP INDEX IF EXISTS "IDX_organizations_createdAt";`,
 );
 await queryRunner.query(
 `DROP INDEX IF EXISTS "IDX_organizations_isActive";`,
 );
 await queryRunner.query(
 `DROP INDEX IF EXISTS "IDX_organizations_domainWhitelist";`,
 );

 // Drop table
 await queryRunner.query(`DROP TABLE IF EXISTS "organizations";`);
 }
}

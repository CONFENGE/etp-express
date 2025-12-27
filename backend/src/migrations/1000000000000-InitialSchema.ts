import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial database schema creation.
 *
 * This migration creates all base tables required by the application.
 * It was created to resolve issue #396 where the Railway database had no schema.
 *
 * IMPORTANT: This migration must run BEFORE all other migrations.
 * Timestamp 0000000000000 ensures it executes first.
 *
 * Tables created:
 * - organizations
 * - users
 * - etps
 * - etp_versions
 * - etp_sections
 * - section_templates
 * - legislation
 * - audit_logs
 * - analytics_events
 * - secret_access_logs
 * - similar_contracts
 */
export class InitialSchema1000000000000 implements MigrationInterface {
  name = 'InitialSchema1000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users_role_enum type for role column (matches User entity)
    await queryRunner.query(`
 DO $$
 BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
 CREATE TYPE "users_role_enum" AS ENUM ('system_admin', 'domain_manager', 'admin', 'user', 'viewer', 'demo');
 END IF;
 END
 $$;
 `);

    // Create organizations table (Multi-Tenancy)
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "organizations" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "name" character varying NOT NULL,
 "cnpj" character varying NOT NULL,
 "domainWhitelist" text array NOT NULL,
 "isActive" boolean NOT NULL DEFAULT true,
 "stripeCustomerId" character varying,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "UQ_organizations_cnpj" UNIQUE ("cnpj"),
 CONSTRAINT "PK_organizations_id" PRIMARY KEY ("id")
 )
 `);

    // Create users table
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "users" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "email" character varying NOT NULL,
 "password" character varying NOT NULL,
 "name" character varying NOT NULL,
 "organizationId" uuid NOT NULL,
 "cargo" character varying,
 "role" "users_role_enum" NOT NULL DEFAULT 'user',
 "isActive" boolean NOT NULL DEFAULT true,
 "mustChangePassword" boolean NOT NULL DEFAULT false,
 "lastLoginAt" TIMESTAMP,
 "lgpdConsentAt" TIMESTAMP,
 "lgpdConsentVersion" character varying,
 "internationalTransferConsentAt" TIMESTAMP,
 "deletedAt" TIMESTAMP,
 "authorizedDomainId" uuid,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "UQ_users_email" UNIQUE ("email"),
 CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
 CONSTRAINT "FK_users_organizationId" FOREIGN KEY ("organizationId")
 REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
 )
 `);

    // Create index on users.organizationId for performance
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_users_organizationId" ON "users" ("organizationId")
 `);

    // Create etps table
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "etps" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "metadata" jsonb NOT NULL,
 "sections" jsonb NOT NULL DEFAULT '{}',
 "status" character varying NOT NULL DEFAULT 'draft',
 "version" integer NOT NULL DEFAULT 1,
 "organizationId" uuid NOT NULL,
 "created_by" uuid,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_etps_id" PRIMARY KEY ("id"),
 CONSTRAINT "FK_etps_organizationId" FOREIGN KEY ("organizationId")
 REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
 CONSTRAINT "FK_etps_created_by" FOREIGN KEY ("created_by")
 REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
 )
 `);

    // Create indexes on etps for performance
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_etps_organizationId" ON "etps" ("organizationId")
 `);
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_etps_created_by" ON "etps" ("created_by")
 `);
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_etps_status" ON "etps" ("status")
 `);

    // Create etp_versions table
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "etp_versions" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "etp_id" uuid NOT NULL,
 "versionNumber" integer NOT NULL,
 "metadata" jsonb NOT NULL,
 "sections" jsonb NOT NULL DEFAULT '{}',
 "createdById" uuid,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_etp_versions_id" PRIMARY KEY ("id"),
 CONSTRAINT "FK_etp_versions_etp_id" FOREIGN KEY ("etp_id")
 REFERENCES "etps"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
 CONSTRAINT "FK_etp_versions_createdById" FOREIGN KEY ("createdById")
 REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
 )
 `);

    // Create etp_sections table
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "etp_sections" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "etp_id" uuid NOT NULL,
 "sectionName" character varying NOT NULL,
 "content" text NOT NULL,
 "order" integer NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_etp_sections_id" PRIMARY KEY ("id"),
 CONSTRAINT "FK_etp_sections_etp_id" FOREIGN KEY ("etp_id")
 REFERENCES "etps"("id") ON DELETE CASCADE ON UPDATE NO ACTION
 )
 `);

    // Create section_templates table
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "section_templates" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "name" character varying NOT NULL,
 "template" text NOT NULL,
 "order" integer NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_section_templates_id" PRIMARY KEY ("id")
 )
 `);

    // Create legislation table (RAG module)
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "legislation" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "title" character varying NOT NULL,
 "content" text NOT NULL,
 "source" character varying,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_legislation_id" PRIMARY KEY ("id")
 )
 `);

    // Create audit_logs table (LGPD compliance)
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "audit_logs" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "userId" uuid,
 "action" character varying NOT NULL,
 "entityType" character varying NOT NULL,
 "entityId" character varying,
 "changes" jsonb,
 "ipAddress" character varying,
 "userAgent" character varying,
 "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id"),
 CONSTRAINT "FK_audit_logs_userId" FOREIGN KEY ("userId")
 REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
 )
 `);

    // Create index on audit_logs for performance
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_audit_logs_userId" ON "audit_logs" ("userId")
 `);
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp")
 `);

    // Create analytics_events table
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "analytics_events" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "userId" uuid,
 "eventType" character varying NOT NULL,
 "eventData" jsonb,
 "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_analytics_events_id" PRIMARY KEY ("id"),
 CONSTRAINT "FK_analytics_events_userId" FOREIGN KEY ("userId")
 REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
 )
 `);

    // Create index on analytics_events for performance
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_analytics_events_userId" ON "analytics_events" ("userId")
 `);
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_analytics_events_eventType" ON "analytics_events" ("eventType")
 `);

    // Create secret_access_logs table (Security)
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "secret_access_logs" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "secretKey" character varying NOT NULL,
 "accessedBy" character varying,
 "accessType" character varying NOT NULL,
 "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_secret_access_logs_id" PRIMARY KEY ("id")
 )
 `);

    // Create index on secret_access_logs for performance
    await queryRunner.query(`
 CREATE INDEX IF NOT EXISTS "IDX_secret_access_logs_timestamp" ON "secret_access_logs" ("timestamp")
 `);

    // Create similar_contracts table
    await queryRunner.query(`
 CREATE TABLE IF NOT EXISTS "similar_contracts" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "title" character varying NOT NULL,
 "description" text,
 "metadata" jsonb,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_similar_contracts_id" PRIMARY KEY ("id")
 )
 `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "similar_contracts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "secret_access_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "legislation"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "section_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "etp_sections"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "etp_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "etps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
  }
}

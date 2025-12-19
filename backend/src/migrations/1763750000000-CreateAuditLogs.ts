import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1763750000000 implements MigrationInterface {
  name = 'CreateAuditLogs1763750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type for audit actions
    await queryRunner.query(`
 DO $$ BEGIN
 CREATE TYPE "audit_action_enum" AS ENUM (
 'create',
 'update',
 'delete',
 'generate',
 'export',
 'version',
 'status_change',
 'user_data_export',
 'account_deletion_soft',
 'account_deletion_hard',
 'account_deletion_cancelled',
 'login',
 'logout',
 'login_failed',
 'profile_view',
 'profile_update',
 'password_change',
 'data_access'
 );
 EXCEPTION
 WHEN duplicate_object THEN null;
 END $$;
 `);

    // Check if table exists
    const tableExists = await queryRunner.query(`
 SELECT EXISTS (
 SELECT FROM information_schema.tables
 WHERE table_schema = 'public'
 AND table_name = 'audit_logs'
 );
 `);

    if (!tableExists[0].exists) {
      // Create audit_logs table
      await queryRunner.query(`
 CREATE TABLE "audit_logs" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "action" "audit_action_enum" NOT NULL,
 "entityType" character varying NOT NULL,
 "entityId" character varying,
 "changes" jsonb,
 "description" text,
 "ipAddress" character varying,
 "userAgent" character varying,
 "user_id" uuid NOT NULL,
 "etp_id" uuid,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
 );
 `);

      // Add foreign key constraints
      await queryRunner.query(`
 ALTER TABLE "audit_logs"
 ADD CONSTRAINT "FK_audit_logs_user"
 FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
 `);

      await queryRunner.query(`
 ALTER TABLE "audit_logs"
 ADD CONSTRAINT "FK_audit_logs_etp"
 FOREIGN KEY ("etp_id") REFERENCES "etps"("id") ON DELETE SET NULL;
 `);

      // Create indexes for common queries
      await queryRunner.query(`
 CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("user_id");
 `);

      await queryRunner.query(`
 CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action");
 `);

      await queryRunner.query(`
 CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt" DESC);
 `);

      await queryRunner.query(`
 CREATE INDEX "IDX_audit_logs_entityType_entityId" ON "audit_logs" ("entityType", "entityId");
 `);
    } else {
      // Table exists, just add new enum values if needed
      await queryRunner.query(`
 DO $$ BEGIN
 ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'login';
 EXCEPTION WHEN duplicate_object THEN null; END $$;
 `);
      await queryRunner.query(`
 DO $$ BEGIN
 ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'logout';
 EXCEPTION WHEN duplicate_object THEN null; END $$;
 `);
      await queryRunner.query(`
 DO $$ BEGIN
 ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'login_failed';
 EXCEPTION WHEN duplicate_object THEN null; END $$;
 `);
      await queryRunner.query(`
 DO $$ BEGIN
 ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'profile_view';
 EXCEPTION WHEN duplicate_object THEN null; END $$;
 `);
      await queryRunner.query(`
 DO $$ BEGIN
 ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'profile_update';
 EXCEPTION WHEN duplicate_object THEN null; END $$;
 `);
      await queryRunner.query(`
 DO $$ BEGIN
 ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'password_change';
 EXCEPTION WHEN duplicate_object THEN null; END $$;
 `);
      await queryRunner.query(`
 DO $$ BEGIN
 ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'data_access';
 EXCEPTION WHEN duplicate_object THEN null; END $$;
 `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_audit_logs_entityType_entityId";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_createdAt";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_action";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_user_id";`);

    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_audit_logs_etp";`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "FK_audit_logs_user";`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);

    // Note: We don't drop the enum type as it might cause issues with other tables
    // that might use it in the future
  }
}

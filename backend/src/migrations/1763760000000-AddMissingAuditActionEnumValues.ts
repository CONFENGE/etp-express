import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingAuditActionEnumValues1763760000000 implements MigrationInterface {
  name = 'AddMissingAuditActionEnumValues1763760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing enum values that were added to AuditAction enum in code
    // but not included in the original migration (1763750000000-CreateAuditLogs.ts)
    // These values are required for:
    // - password_reset_request: forgot password flow (#587)
    // - tenant_blocked: Multi-Tenancy B2G events (MT-04)

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'password_reset_request';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "audit_action_enum" ADD VALUE IF NOT EXISTS 'tenant_blocked';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing values from an enum type
    // To revert, the enum type would need to be recreated entirely
    // This is intentionally left empty as a no-op
  }
}

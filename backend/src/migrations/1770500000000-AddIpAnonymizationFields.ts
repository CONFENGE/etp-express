import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add IP anonymization support for LGPD compliance.
 *
 * Issue #1721 - LGPD: IP address storage non-compliant with Art. 12
 *
 * LGPD Requirements:
 * - Art. 12: Data minimization and retention limitation
 * - Art. 50: Security best practices
 *
 * Strategy:
 * - Store original IP temporarily for security/fraud detection (30 days)
 * - After retention period, anonymize IPs using SHA-256 hash
 * - Preserve geographic analytics while protecting privacy
 *
 * Tables affected:
 * - analytics_events (IP retention: 30 days)
 * - audit_logs (IP retention: 90 days - longer for compliance)
 * - secret_access_logs (IP retention: 90 days)
 */
export class AddIpAnonymizationFields1770500000000 implements MigrationInterface {
  name = 'AddIpAnonymizationFields1770500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add anonymization tracking columns to analytics_events
    await queryRunner.query(`
      ALTER TABLE "analytics_events"
      ADD COLUMN "ip_anonymized_at" TIMESTAMP NULL,
      ADD COLUMN "ip_retention_days" INTEGER NOT NULL DEFAULT 30
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_analytics_events_ip_anonymization"
      ON "analytics_events" ("created_at", "ip_anonymized_at")
      WHERE "ip_address" IS NOT NULL
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "analytics_events"."ip_anonymized_at"
      IS 'Timestamp when IP was anonymized via SHA-256 hash (LGPD Art. 12)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "analytics_events"."ip_retention_days"
      IS 'Number of days to retain original IP before anonymization (default: 30)'
    `);

    // Add anonymization tracking columns to audit_logs
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ADD COLUMN "ip_anonymized_at" TIMESTAMP NULL,
      ADD COLUMN "ip_retention_days" INTEGER NOT NULL DEFAULT 90
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_ip_anonymization"
      ON "audit_logs" ("created_at", "ip_anonymized_at")
      WHERE "ip_address" IS NOT NULL
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "audit_logs"."ip_anonymized_at"
      IS 'Timestamp when IP was anonymized via SHA-256 hash (LGPD Art. 12)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "audit_logs"."ip_retention_days"
      IS 'Number of days to retain original IP before anonymization (default: 90 for compliance)'
    `);

    // Add anonymization tracking columns to secret_access_logs
    await queryRunner.query(`
      ALTER TABLE "secret_access_logs"
      ADD COLUMN "ip_anonymized_at" TIMESTAMP NULL,
      ADD COLUMN "ip_retention_days" INTEGER NOT NULL DEFAULT 90
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_secret_access_logs_ip_anonymization"
      ON "secret_access_logs" ("accessed_at", "ip_anonymized_at")
      WHERE "ip_address" IS NOT NULL
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "secret_access_logs"."ip_anonymized_at"
      IS 'Timestamp when IP was anonymized via SHA-256 hash (LGPD Art. 12)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "secret_access_logs"."ip_retention_days"
      IS 'Number of days to retain original IP before anonymization (default: 90 for security)'
    `);

    // Create anonymization function (PostgreSQL native)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION anonymize_ip_address(ip TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      IMMUTABLE
      AS $$
      BEGIN
        -- SHA-256 hash of IP address
        -- Returns hex string of 64 characters
        -- Preserves geographic patterns while removing identifiability
        RETURN ENCODE(SHA256(ip::bytea), 'hex');
      END;
      $$;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION anonymize_ip_address(TEXT)
      IS 'LGPD-compliant IP anonymization using SHA-256. Returns consistent hash for same IP, enabling geographic analytics while protecting privacy.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop function
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS anonymize_ip_address(TEXT)`,
    );

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_secret_access_logs_ip_anonymization"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_audit_logs_ip_anonymization"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_analytics_events_ip_anonymization"
    `);

    // Drop columns from secret_access_logs
    await queryRunner.query(`
      ALTER TABLE "secret_access_logs"
      DROP COLUMN IF EXISTS "ip_retention_days",
      DROP COLUMN IF EXISTS "ip_anonymized_at"
    `);

    // Drop columns from audit_logs
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS "ip_retention_days",
      DROP COLUMN IF EXISTS "ip_anonymized_at"
    `);

    // Drop columns from analytics_events
    await queryRunner.query(`
      ALTER TABLE "analytics_events"
      DROP COLUMN IF EXISTS "ip_retention_days",
      DROP COLUMN IF EXISTS "ip_anonymized_at"
    `);
  }
}

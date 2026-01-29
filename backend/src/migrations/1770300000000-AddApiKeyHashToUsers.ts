import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * TD-001 Security Hardening: Add apiKeyHash column for secure API key storage.
 *
 * This migration adds a hashed API key column to support transitioning
 * from plaintext API key storage to bcrypt-hashed storage.
 *
 * Transition plan:
 * - Phase 1 (this migration): Add apiKeyHash column
 * - Phase 2: Backfill hashes for existing API keys
 * - Phase 3: Remove plaintext apiKey column (future migration)
 */
export class AddApiKeyHashToUsers1770300000000 implements MigrationInterface {
  name = 'AddApiKeyHashToUsers1770300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column already exists (idempotent)
    const table = await queryRunner.getTable('users');
    const hasColumn = table?.columns.find((c) => c.name === 'apiKeyHash');

    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD COLUMN "apiKeyHash" varchar NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const hasColumn = table?.columns.find((c) => c.name === 'apiKeyHash');

    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "apiKeyHash"`);
    }
  }
}

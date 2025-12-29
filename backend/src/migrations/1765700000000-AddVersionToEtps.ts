import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to add version column for optimistic locking (Issue #1059).
 *
 * The version column is used by TypeORM's @VersionColumn() decorator
 * to implement optimistic locking. It automatically increments on each
 * save operation, allowing the backend to detect concurrent updates.
 *
 * @see backend/src/entities/etp.entity.ts - @VersionColumn() decorator
 * @see backend/src/modules/etps/etps.service.ts - Version validation logic
 */
export class AddVersionToEtps1765700000000 implements MigrationInterface {
  name = 'AddVersionToEtps1765700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add version column with default value of 1
    // TypeORM's @VersionColumn() expects integer type
    await queryRunner.query(`
      ALTER TABLE "etps"
      ADD COLUMN "version" integer NOT NULL DEFAULT 1
    `);

    // Create index for faster queries filtering by version (optional optimization)
    // This can help with debugging concurrent update issues
    await queryRunner.query(`
      CREATE INDEX "IDX_etps_version" ON "etps" ("version")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_etps_version"`);
    await queryRunner.query(`ALTER TABLE "etps" DROP COLUMN "version"`);
  }
}

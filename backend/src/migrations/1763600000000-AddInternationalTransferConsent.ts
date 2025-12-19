import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add internationalTransferConsentAt column to users table (LGPD Art. 33)
 *
 * IDEMPOTENT: Uses check-before-create pattern to prevent crash loops on redeploys.
 * Pattern proven in #402, #403, #404, #405, #406, #407.
 */
export class AddInternationalTransferConsent1763600000000 implements MigrationInterface {
 name = 'AddInternationalTransferConsent1763600000000';

 public async up(queryRunner: QueryRunner): Promise<void> {
 // Check if internationalTransferConsentAt column already exists
 const columnExists = await queryRunner.query(`
 SELECT column_name
 FROM information_schema.columns
 WHERE table_name = 'users'
 AND column_name = 'internationalTransferConsentAt';
 `);

 if (columnExists.length === 0) {
 await queryRunner.query(`
 ALTER TABLE "users"
 ADD "internationalTransferConsentAt" TIMESTAMP;
 `);
 }
 }

 public async down(queryRunner: QueryRunner): Promise<void> {
 // Check if column exists before dropping (idempotent down)
 const columnExists = await queryRunner.query(`
 SELECT column_name
 FROM information_schema.columns
 WHERE table_name = 'users'
 AND column_name = 'internationalTransferConsentAt';
 `);

 if (columnExists.length > 0) {
 await queryRunner.query(`
 ALTER TABLE "users"
 DROP COLUMN "internationalTransferConsentAt";
 `);
 }
 }
}

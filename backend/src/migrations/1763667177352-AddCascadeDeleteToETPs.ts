import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCascadeDeleteToETPs1763667177352 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing constraint if exists (for idempotency)
    await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'FK_etps_created_by'
                ) THEN
                    ALTER TABLE "etps" DROP CONSTRAINT "FK_etps_created_by";
                END IF;
            END $$;
        `);

    // Add new constraint with CASCADE
    await queryRunner.query(`
            ALTER TABLE "etps"
            ADD CONSTRAINT "FK_etps_created_by"
            FOREIGN KEY ("created_by")
            REFERENCES "users"("id")
            ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to default behavior (NO ACTION)
    await queryRunner.query(`
            ALTER TABLE "etps"
            DROP CONSTRAINT IF EXISTS "FK_etps_created_by"
        `);

    await queryRunner.query(`
            ALTER TABLE "etps"
            ADD CONSTRAINT "FK_etps_created_by"
            FOREIGN KEY ("created_by")
            REFERENCES "users"("id")
        `);
  }
}

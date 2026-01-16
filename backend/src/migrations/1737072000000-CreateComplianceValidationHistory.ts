import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration para criar tabela de histórico de validações de conformidade.
 *
 * Issue #1264 - [Compliance-c] Criar relatório de conformidade
 */
export class CreateComplianceValidationHistory1737072000000 implements MigrationInterface {
  name = 'CreateComplianceValidationHistory1737072000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension exists
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "compliance_validation_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "etp_id" uuid NOT NULL,
        "checklist_id" uuid NOT NULL,
        "checklist_name" varchar(255) NOT NULL,
        "score" integer NOT NULL,
        "minimum_score" integer NOT NULL,
        "status" varchar(20) NOT NULL,
        "total_items" integer NOT NULL,
        "passed_items" integer NOT NULL,
        "failed_items" integer NOT NULL,
        "validation_snapshot" jsonb NOT NULL,
        "validated_at" TIMESTAMP NOT NULL,
        "validated_by_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_compliance_validation_history" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for efficient queries
    await queryRunner.query(`
      CREATE INDEX "idx_validation_history_etp" ON "compliance_validation_history" ("etp_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_validation_history_date" ON "compliance_validation_history" ("validated_at" DESC)
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "compliance_validation_history"
      ADD CONSTRAINT "FK_validation_history_etp"
      FOREIGN KEY ("etp_id") REFERENCES "etp"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "compliance_validation_history"
      ADD CONSTRAINT "FK_validation_history_checklist"
      FOREIGN KEY ("checklist_id") REFERENCES "compliance_checklist"("id") ON DELETE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "compliance_validation_history"
      ADD CONSTRAINT "FK_validation_history_user"
      FOREIGN KEY ("validated_by_id") REFERENCES "user"("id") ON DELETE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "compliance_validation_history" DROP CONSTRAINT "FK_validation_history_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_validation_history" DROP CONSTRAINT "FK_validation_history_checklist"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_validation_history" DROP CONSTRAINT "FK_validation_history_etp"`,
    );
    await queryRunner.query(`DROP INDEX "idx_validation_history_date"`);
    await queryRunner.query(`DROP INDEX "idx_validation_history_etp"`);
    await queryRunner.query(`DROP TABLE "compliance_validation_history"`);
  }
}

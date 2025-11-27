import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInternationalTransferConsent1763600000000 implements MigrationInterface {
  name = 'AddInternationalTransferConsent1763600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "internationalTransferConsentAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "internationalTransferConsentAt"`,
    );
  }
}

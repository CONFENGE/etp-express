import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration to add LGPD consent tracking fields to users table.
 *
 * @description
 * Adds fields required for LGPD compliance:
 * - lgpdConsentAt: Timestamp when user consented (Art. 7º, I)
 * - lgpdConsentVersion: Version of terms accepted (Art. 8º, §4º)
 *
 * @see https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
 */
export class AddLgpdConsentFields1763500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lgpdConsentAt',
        type: 'timestamp',
        isNullable: true,
        comment: 'Timestamp when user consented to LGPD terms (Art. 7º, I)',
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'lgpdConsentVersion',
        type: 'varchar',
        isNullable: true,
        comment: 'Version of LGPD terms accepted (Art. 8º, §4º)',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'lgpdConsentVersion');
    await queryRunner.dropColumn('users', 'lgpdConsentAt');
  }
}

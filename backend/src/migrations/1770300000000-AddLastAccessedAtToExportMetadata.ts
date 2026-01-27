import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLastAccessedAtToExportMetadata1770300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'export_metadata',
      new TableColumn({
        name: 'lastAccessedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('export_metadata', 'lastAccessedAt');
  }
}

import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

/**
 * Migration: Add IP anonymization to ApiUsage entity
 *
 * Technical Debt: DB-S06 - IP address stored in plaintext
 * Issue: #1723 - TD-008: Database schema improvements & LGPD compliance
 *
 * LGPD Requirements:
 * - Art. 12 para. 2: IP address + userId = linked personal data
 * - Art. 50: Security best practices
 *
 * Changes:
 * 1. Add ipAddress column to api_usage table
 * 2. Add ipAnonymizedAt tracking column
 * 3. Add ipRetentionDays column (default: 30 days for analytics)
 * 4. Add partial index for efficient anonymization job
 *
 * Note: Uses existing anonymize_ip_address() function from migration 1770500000000
 */
export class AddIpAnonymizationToApiUsage1770700000000 implements MigrationInterface {
  name = 'AddIpAnonymizationToApiUsage1770700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add IP address column
    await queryRunner.addColumn(
      'api_usage',
      new TableColumn({
        name: 'ipAddress',
        type: 'varchar',
        length: '64', // Supports both IPv4 (15 chars) and hashed (64 chars)
        isNullable: true,
        comment:
          'Client IP address. Anonymized after retention period (LGPD Art. 12)',
      }),
    );

    // Add anonymization tracking column
    await queryRunner.addColumn(
      'api_usage',
      new TableColumn({
        name: 'ipAnonymizedAt',
        type: 'timestamp',
        isNullable: true,
        comment:
          'Timestamp when IP was anonymized via SHA-256 hash (LGPD Art. 12)',
      }),
    );

    // Add retention days column
    await queryRunner.addColumn(
      'api_usage',
      new TableColumn({
        name: 'ipRetentionDays',
        type: 'int',
        default: 30,
        isNullable: false,
        comment:
          'Number of days to retain original IP before anonymization (default: 30)',
      }),
    );

    // Create partial index for efficient anonymization job
    // Only indexes rows that have IPs pending anonymization
    await queryRunner.createIndex(
      'api_usage',
      new TableIndex({
        name: 'IDX_api_usage_ip_anonymization',
        columnNames: ['createdAt', 'ipAnonymizedAt'],
        where: '"ipAddress" IS NOT NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('api_usage', 'IDX_api_usage_ip_anonymization');

    // Drop columns
    await queryRunner.dropColumn('api_usage', 'ipRetentionDays');
    await queryRunner.dropColumn('api_usage', 'ipAnonymizedAt');
    await queryRunner.dropColumn('api_usage', 'ipAddress');
  }
}

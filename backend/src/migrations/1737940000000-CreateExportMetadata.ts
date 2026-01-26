import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create the export_metadata table for S3 export tracking.
 *
 * Features:
 * - Tracks ETP exports stored in S3 (PDF, DOCX, JSON formats)
 * - Links to ETP and User entities with foreign keys
 * - Stores S3 location (key and URI) for retrieval
 * - Tracks download count for analytics
 * - Records ETP version at export time for audit trail
 *
 * @remarks
 * Part of issue #1704 - Implement automatic upload to S3 after export generation
 * Sub-issue 2/6 of EPIC #1168 - Integrar armazenamento em nuvem (S3)
 */
export class CreateExportMetadata1737940000000 implements MigrationInterface {
  name = 'CreateExportMetadata1737940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'export_metadata'
      );
    `);

    if (!tableExists[0].exists) {
      // Create export_metadata table
      await queryRunner.query(`
        CREATE TABLE "export_metadata" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "etpId" uuid NOT NULL,
          "userId" uuid NOT NULL,
          "format" character varying NOT NULL CHECK ("format" IN ('pdf', 'docx', 'json')),
          "version" character varying NOT NULL,
          "s3Key" character varying NOT NULL,
          "s3Uri" character varying,
          "downloadCount" integer NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_export_metadata" PRIMARY KEY ("id"),
          CONSTRAINT "FK_export_metadata_etpId" FOREIGN KEY ("etpId") REFERENCES "etps"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_export_metadata_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION
        );
      `);

      // Create indexes for efficient queries
      // Index on etpId for fetching export history by ETP
      await queryRunner.query(`
        CREATE INDEX "IDX_export_metadata_etpId"
        ON "export_metadata" ("etpId");
      `);

      // Index on userId for fetching exports by user
      await queryRunner.query(`
        CREATE INDEX "IDX_export_metadata_userId"
        ON "export_metadata" ("userId");
      `);

      // Index on createdAt for ordering by export time
      await queryRunner.query(`
        CREATE INDEX "IDX_export_metadata_createdAt"
        ON "export_metadata" ("createdAt" DESC);
      `);

      // Index on format for filtering by export type
      await queryRunner.query(`
        CREATE INDEX "IDX_export_metadata_format"
        ON "export_metadata" ("format");
      `);

      // Composite index for common query: fetch exports by ETP and format
      await queryRunner.query(`
        CREATE INDEX "IDX_export_metadata_etpId_format"
        ON "export_metadata" ("etpId", "format");
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_export_metadata_etpId_format";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_export_metadata_format";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_export_metadata_createdAt";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_export_metadata_userId";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_export_metadata_etpId";`,
    );

    // Drop table (foreign keys cascade automatically)
    await queryRunner.query(`DROP TABLE IF EXISTS "export_metadata";`);
  }
}

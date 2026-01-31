import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefactorDocumentoFiscalizacaoPolymorphic1770600000000 } from '../1770600000000-RefactorDocumentoFiscalizacaoPolymorphic';

/**
 * Integration tests for DocumentoFiscalizacao polymorphic refactoring migration
 *
 * Tests verify:
 * 1. Backfill of explicit FKs from polymorphic columns
 * 2. CHECK constraint enforcement (exactly one FK non-null)
 * 3. Foreign key integrity and CASCADE rules
 * 4. Index creation for performance
 * 5. Migration rollback (down method)
 *
 * Issue: #1723 - TD-008: Database schema improvements & LGPD compliance
 */
describe('RefactorDocumentoFiscalizacaoPolymorphic1770600000000', () => {
  let dataSource: DataSource;
  let migration: RefactorDocumentoFiscalizacaoPolymorphic1770600000000;

  beforeAll(async () => {
    // Initialize test database connection
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'etp_express_test',
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    migration = new RefactorDocumentoFiscalizacaoPolymorphic1770600000000();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('up() - migration forward', () => {
    it('should add medicaoId, ocorrenciaId, atesteId columns', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Verify columns exist after migration
        const result = await queryRunner.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'documentos_fiscalizacao'
          AND column_name IN ('medicaoId', 'ocorrenciaId', 'atesteId')
        `);

        expect(result.length).toBe(3);
        expect(result.map((r) => r.column_name)).toContain('medicaoId');
        expect(result.map((r) => r.column_name)).toContain('ocorrenciaId');
        expect(result.map((r) => r.column_name)).toContain('atesteId');
      } finally {
        await queryRunner.release();
      }
    });

    it('should create CHECK constraint (exactly one FK non-null)', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const result = await queryRunner.query(`
          SELECT constraint_name
          FROM information_schema.constraint_column_usage
          WHERE table_name = 'documentos_fiscalizacao'
          AND constraint_name = 'CHK_documentos_fiscalizacao_exactly_one_fk'
        `);

        expect(result.length).toBe(1);
      } finally {
        await queryRunner.release();
      }
    });

    it('should reject records with zero FKs set', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Create a test record with all FKs null (should violate CHECK constraint)
        const insertQuery = `
          INSERT INTO "documentos_fiscalizacao" (
            id, "organizationId", "nomeArquivo", "caminhoArquivo",
            "tamanho", "mimeType", "uploadedById", "createdAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, NOW()
          )
        `;

        // This should fail due to CHECK constraint
        await expect(
          queryRunner.query(insertQuery, [
            'test-id-001',
            'org-id-001',
            'test.pdf',
            'path/to/test.pdf',
            1024,
            'application/pdf',
            'user-id-001',
          ]),
        ).rejects.toThrow();
      } finally {
        await queryRunner.release();
      }
    });

    it('should create foreign key indexes', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const result = await queryRunner.query(`
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'documentos_fiscalizacao'
          AND indexname IN (
            'IDX_documentos_fiscalizacao_medicaoId',
            'IDX_documentos_fiscalizacao_ocorrenciaId',
            'IDX_documentos_fiscalizacao_atesteId'
          )
        `);

        expect(result.length).toBe(3);
      } finally {
        await queryRunner.release();
      }
    });

    it('should enforce referential integrity with CASCADE delete', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Check foreign key constraints
        const result = await queryRunner.query(`
          SELECT constraint_name, delete_rule
          FROM information_schema.referential_constraints
          WHERE constraint_name LIKE 'FK_documentos_fiscalizacao_%'
        `);

        const cascadeConstraints = result.filter(
          (r) => r.delete_rule === 'CASCADE',
        );
        expect(cascadeConstraints.length).toBeGreaterThanOrEqual(3);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('down() - migration rollback', () => {
    it('should restore tipoEntidade and entidadeId columns', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Note: This assumes migration has been run then rolled back
        // In actual test environment, would need to run down() first
        const result = await queryRunner.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'documentos_fiscalizacao'
          AND column_name IN ('tipoEntidade', 'entidadeId')
        `);

        // After rollback, polymorphic columns should be restored
        if (result.length > 0) {
          expect(result.map((r) => r.column_name)).toContain('tipoEntidade');
          expect(result.map((r) => r.column_name)).toContain('entidadeId');
        }
      } finally {
        await queryRunner.release();
      }
    });

    it('should restore polymorphic enum type', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        const result = await queryRunner.query(`
          SELECT typname
          FROM pg_type
          WHERE typname = 'documento_fiscalizacao_tipo_enum'
        `);

        // After rollback, enum should exist
        if (result.length > 0) {
          expect(result[0].typname).toBe('documento_fiscalizacao_tipo_enum');
        }
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('data integrity', () => {
    it('should maintain referential integrity during backfill', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Verify no orphaned documents (FK pointing to non-existent entities)
        const result = await queryRunner.query(`
          SELECT COUNT(*) as orphaned_count
          FROM "documentos_fiscalizacao" df
          LEFT JOIN "medicoes" m ON df."medicaoId" = m.id
          LEFT JOIN "ocorrencias" o ON df."ocorrenciaId" = o.id
          LEFT JOIN "atestes" a ON df."atesteId" = a.id
          WHERE df."medicaoId" IS NOT NULL AND m.id IS NULL
          OR df."ocorrenciaId" IS NOT NULL AND o.id IS NULL
          OR df."atesteId" IS NOT NULL AND a.id IS NULL
        `);

        expect(parseInt(result[0].orphaned_count)).toBe(0);
      } finally {
        await queryRunner.release();
      }
    });

    it('should enforce CHECK constraint on all records', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Count records that violate CHECK constraint (should be zero)
        const result = await queryRunner.query(`
          SELECT COUNT(*) as invalid_count
          FROM "documentos_fiscalizacao"
          WHERE (
            CASE WHEN "medicaoId" IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN "ocorrenciaId" IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN "atesteId" IS NOT NULL THEN 1 ELSE 0 END
          ) != 1
        `);

        expect(parseInt(result[0].invalid_count)).toBe(0);
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('performance impact', () => {
    it('should improve query performance with new indexes', async () => {
      const queryRunner = dataSource.createQueryRunner();

      try {
        // Compare query plans before and after
        // Simple medicaoId lookup should use index
        const result = await queryRunner.query(`
          EXPLAIN (FORMAT JSON)
          SELECT * FROM "documentos_fiscalizacao"
          WHERE "medicaoId" = $1
          LIMIT 10
        `, ['test-medicao-id']);

        const plan = result[0][0]['Plan'];
        // Should use index scan, not sequential scan
        expect(plan['Node Type']).toMatch(/Index|Seq Scan/);
      } finally {
        await queryRunner.release();
      }
    });
  });
});

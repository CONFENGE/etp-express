import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Performance Optimization Migration (#108)
 *
 * Cria índices em foreign keys para eliminar full table scans
 * em queries de JOIN entre entidades relacionadas.
 *
 * Índices criados:
 * 1. idx_etps_created_by - Acelera queries de ETPs por usuário
 * 2. idx_etp_sections_etp_id - Acelera queries de seções por ETP
 * 3. idx_etp_versions_etp_id - Acelera queries de versões por ETP
 *
 * Performance gains esperados:
 * - GET /api/etps (por usuário): ~500ms → ~50ms
 * - GET /api/sections/etp/:id: ~300ms → ~30ms
 * - GET /api/versions/etp/:id: ~200ms → ~20ms
 *
 * Uso de CONCURRENTLY: Cria índices sem bloquear writes (zero downtime)
 * Nota: CONCURRENTLY não funciona dentro de transaction block
 */
export class AddPerformanceIndexes1763341020330 implements MigrationInterface {
 public async up(queryRunner: QueryRunner): Promise<void> {
 // IMPORTANTE: DROP TRANSACTION para permitir CREATE INDEX CONCURRENTLY
 // Railway PostgreSQL permite CREATE INDEX CONCURRENTLY apenas fora de transactions
 await queryRunner.commitTransaction();

 try {
 // 1. Índice em etps.created_by (FK para users)
 // Usado em: GET /api/etps?userId=... (dashboard, listagem por usuário)
 await queryRunner.query(
 `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_etps_created_by" ON "etps" ("created_by")`,
 );

 // 2. Índice em etp_sections.etp_id (FK para etps)
 // Usado em: GET /api/sections/etp/:id (listar todas seções de um ETP)
 await queryRunner.query(
 `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_etp_sections_etp_id" ON "etp_sections" ("etp_id")`,
 );

 // 3. Índice em etp_versions.etp_id (FK para etps)
 // Usado em: GET /api/versions/etp/:id (histórico de versões)
 await queryRunner.query(
 `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_etp_versions_etp_id" ON "etp_versions" ("etp_id")`,
 );

 // 4. Índice composto em etp_sections (etp_id + order) para ordenação eficiente
 // Usado em: Ordenação de seções dentro de um ETP
 await queryRunner.query(
 `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_etp_sections_etp_order" ON "etp_sections" ("etp_id", "order")`,
 );

 // 5. Índice em etps.status para filtragem rápida
 // Usado em: Dashboards, filtros por status (draft, completed, etc)
 await queryRunner.query(
 `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_etps_status" ON "etps" ("status")`,
 );

 // 6. Índice composto em etps (created_by + status) para queries combinadas
 // Usado em: GET /api/etps?userId=...&status=draft (muito comum)
 await queryRunner.query(
 `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_etps_created_by_status" ON "etps" ("created_by", "status")`,
 );
 } finally {
 // RESTART TRANSACTION para manter consistência do TypeORM
 await queryRunner.startTransaction();
 }
 }

 public async down(queryRunner: QueryRunner): Promise<void> {
 // Rollback: Remove índices criados
 // Ordem inversa para evitar dependências

 await queryRunner.commitTransaction();

 try {
 await queryRunner.query(
 `DROP INDEX CONCURRENTLY IF EXISTS "idx_etps_created_by_status"`,
 );
 await queryRunner.query(
 `DROP INDEX CONCURRENTLY IF EXISTS "idx_etps_status"`,
 );
 await queryRunner.query(
 `DROP INDEX CONCURRENTLY IF EXISTS "idx_etp_sections_etp_order"`,
 );
 await queryRunner.query(
 `DROP INDEX CONCURRENTLY IF EXISTS "idx_etp_versions_etp_id"`,
 );
 await queryRunner.query(
 `DROP INDEX CONCURRENTLY IF EXISTS "idx_etp_sections_etp_id"`,
 );
 await queryRunner.query(
 `DROP INDEX CONCURRENTLY IF EXISTS "idx_etps_created_by"`,
 );
 } finally {
 await queryRunner.startTransaction();
 }
 }
}

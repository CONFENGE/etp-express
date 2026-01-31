# Story TD-004: Performance - Missing Database Indexes

## Priority: P1
## Estimated Effort: 2-3h
## Area: Database

## Description

As a database administrator, I want all 22 missing indexes created on the contracting chain tables, so that queries on frequently filtered/joined columns perform efficiently.

## Technical Debts Addressed

- **DB-IDX-01**: 22 missing indexes in the contracting chain (MEDIA)

## Acceptance Criteria

- [ ] All 22 indexes created via a single TypeORM migration using raw SQL
- [ ] All indexes use `CREATE INDEX CONCURRENTLY` to avoid table locks
- [ ] Migration does NOT use transactions (CONCURRENTLY cannot run inside a transaction)
- [ ] `IF NOT EXISTS` used on every index to make migration idempotent
- [ ] `EXPLAIN ANALYZE` confirms indexes are used on key listing queries
- [ ] No invalid indexes left in `pg_indexes`
- [ ] Down migration drops all 22 indexes

### Indexes to Create

**Group A - Critical (daily queries):**
1. `contratos(organizationId)`
2. `contratos(editalId)`
3. `contratos(status)`
4. `medicoes(contratoId)`
5. `medicoes(status)`
6. `ocorrencias(contratoId)`
7. `ocorrencias(status)`
8. `termos_referencia(organizationId)`
9. `termos_referencia(etpId)`
10. `editais(organizationId)`

**Group B - Important:**
11. `editais(status)`
12. `editais(termoReferenciaId)`
13. `contratos(govBrSyncStatus)`
14. `atestes(medicaoId)`
15. `pesquisas_precos(organizationId)`
16. `pesquisas_precos(etpId)`

**Group C - Support:**
17. `documentos_fiscalizacao(tipoEntidade, entidadeId)` (composite)
18. `contrato_sync_logs(contratoId)`
19. `export_metadata(etpId)`
20. `etp_sections(etp_id, order)` (composite)
21. `etp_versions(etp_id, versionNumber)` (composite)
22. `termos_referencia(status)`

## Technical Notes

- TypeORM migration must NOT use `queryRunner.startTransaction()`
- Each `CREATE INDEX CONCURRENTLY` must be a separate `queryRunner.query()` call
- If an index fails, it may be left as INVALID - check with `SELECT * FROM pg_indexes WHERE indexdef LIKE '%INVALID%'`
- Estimated execution time: ~30s for all indexes on tables with <100K rows
- Can run in parallel with TD-003 (eager loading)

## Test Plan

- Verify all 22 indexes exist after migration: `SELECT indexname FROM pg_indexes WHERE tablename IN (...)`
- `EXPLAIN ANALYZE` on listing queries for contratos, medicoes, editais, termos_referencia
- No INVALID indexes in pg_indexes

## Files Likely Affected

- `src/migrations/` (new migration file)

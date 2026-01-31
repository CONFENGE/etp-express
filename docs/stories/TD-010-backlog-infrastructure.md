# Story TD-010: Backlog - Infrastructure & Long-term Improvements

## Priority: P4
## Estimated Effort: 55h+
## Area: All

## Description

As the engineering team, I want lower-priority technical debts tracked and resolved when capacity allows, covering migration cleanup, TypeScript strictness, entity conventions, full-text search, table partitioning, and API documentation.

## Technical Debts Addressed

- **SYS-02**: 45+ entities in global scan (ALTA) - 2-4h
- **SYS-03**: 53 migrations with auto-run (ALTA) - 4h
- **SYS-04**: Monorepo without Turborepo/Nx (ALTA) - 16h+
- **SYS-10**: tmpfiles in frontend (150+ tmpclaude-* directories) (BAIXA) - 0.5h
- **SYS-11**: strictBindCallApply: false (BAIXA) - 1h
- **SYS-12**: forceConsistentCasingInFileNames: false (BAIXA) - 1h
- **DB-03**: ApiUsage with integer PK (only entity without UUID) (BAIXA) - 2h
- **DB-08**: Missing UpdateDateColumn in 7 entities (BAIXA) - 2h
- **DB-10**: ApiUsage without explicit entity name (BAIXA) - 0.5h
- **DB-11**: Inline enum in govBrSyncStatus (BAIXA) - 1h
- **DB-NEW-05**: ExportMetadata.format as inline string enum (BAIXA) - 0.5h
- **DB-S04**: CNPJ stored without database-level validation (BAIXA) - 1h
- **DB-P03**: contract_prices without partition (BAIXA) - 16h
- **DB-P05**: Full-text search without tsvector (BAIXA) - 4h
- **DB-P06**: Legislation.embedding without vector index (BAIXA) - 1h
- **DB-P07**: SINAPI/SICRO without UF partition (BAIXA) - 8h
- **FE-05**: Swagger disabled in production without alternative API docs (BAIXA) - 4h

## Acceptance Criteria

- [ ] SYS-03: Migrations squashed to baseline (MUST BE LAST item resolved)
- [ ] SYS-02: Entity scan changed to per-module registration
- [ ] SYS-04: Monorepo tooling evaluated and decision documented
- [ ] SYS-10/11/12: tmpfiles cleaned, TypeScript strict configs enabled
- [ ] DB-03/DB-10: ApiUsage has UUID PK and explicit entity name
- [ ] DB-08: updatedAt added to EtpVersion, Ateste, DocumentoFiscalizacao, ContratoSyncLog, ExportMetadata, etc.
- [ ] DB-11/DB-NEW-05: Enum types extracted to shared constants
- [ ] DB-S04: CHECK constraint for CNPJ format in database
- [ ] DB-P03: Partitioning evaluated (implement only after 5M+ rows)
- [ ] DB-P05: tsvector indexes on objeto/descricao fields
- [ ] DB-P06: IVFFlat index on Legislation.embedding
- [ ] DB-P07: SINAPI/SICRO partitioning evaluated
- [ ] FE-05: Static Redoc API documentation generated and served

## Technical Notes

- **SYS-03 MUST be resolved last** - highest risk of breaking existing environments
- SYS-04 (Turborepo/Nx) is a major effort, may warrant its own epic
- DB-P03 and DB-P07 are partitioning tasks that should only be implemented when data volume justifies it
- DB-P06: Use IVFFlat (not HNSW) until 100K+ records in Legislation
- Items can be picked up individually when sprint capacity allows

## Test Plan

- Per-item unit and integration tests
- SYS-03: Fresh install with baseline migration + upgrade test on existing environment
- SYS-02: Verify all entities still registered after modular scan
- DB-P05: Full-text search queries return correct results
- FE-05: Redoc page accessible and shows all endpoints

## Files Likely Affected

- `src/app.module.ts` (entity scan)
- `src/migrations/` (baseline migration, various new migrations)
- `tsconfig.json` (strict configs)
- `src/api-usage/entities/api-usage.entity.ts`
- Multiple entity files (updatedAt, enum extraction)
- `frontend/` (tmpfile cleanup)
- Build configuration (Turborepo/Nx if adopted)

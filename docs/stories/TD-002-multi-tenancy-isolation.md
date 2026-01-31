# Story TD-002: Security - Multi-tenancy Isolation Gaps

## Priority: P1
## Estimated Effort: 8h
## Area: Database / Security

## Description

As a platform operator, I want all data-bearing entities to include a non-nullable `organizationId` column with proper indexes, so that cross-tenant data leakage is impossible at the database level.

## Technical Debts Addressed

- **DB-09**: ExportMetadata without organizationId - exposes s3Key/s3Uri cross-tenant (ALTA)
- **DB-NEW-01**: Ateste without updatedAt AND without organizationId (MEDIA)
- **DB-NEW-02**: ContratoSyncLog without organizationId (MEDIA)
- **DB-NEW-06**: DocumentoFiscalizacao without organizationId (MEDIA)
- **DB-S03**: ContractPrice organizationId is nullable for backward compatibility (MEDIA)

## Acceptance Criteria

- [ ] ExportMetadata entity has `organizationId` column (NOT NULL, UUID, indexed)
- [ ] Ateste entity has `organizationId` column (NOT NULL, UUID, indexed) and `updatedAt`
- [ ] ContratoSyncLog entity has `organizationId` column (NOT NULL, UUID, indexed)
- [ ] DocumentoFiscalizacao entity has `organizationId` column (NOT NULL, UUID, indexed)
- [ ] ContractPrice.organizationId is NOT NULL (migration backfills from parent entity)
- [ ] Backfill migration infers organizationId from parent entities (ETP for ExportMetadata, Contrato for Ateste/SyncLog, etc.)
- [ ] Zero orphan records after backfill (validated by migration check query)
- [ ] Multi-tenant isolation test: User A cannot see data from Organization B
- [ ] All new columns have database indexes

## Technical Notes

- ExportMetadata: infer organizationId via associated ETP
- Ateste: infer organizationId via Medicao -> Contrato -> organizationId
- ContratoSyncLog: infer organizationId via Contrato -> organizationId
- DocumentoFiscalizacao: infer via parent entity (polymorphic - use tipoEntidade to determine source)
- ContractPrice: backfill from existing nullable values, then set NOT NULL
- This story is a prerequisite for TD-008 (DB-02 polymorphic refactor depends on DB-NEW-06)

## Test Plan

- Integration test: Creating ExportMetadata without organizationId fails
- Integration test: Query ExportMetadata filtered by organization returns only matching records
- Same pattern for Ateste, ContratoSyncLog, DocumentoFiscalizacao, ContractPrice
- Migration test: Backfill produces zero orphan records
- Regression test: Existing CRUD operations still work after migration

## Files Likely Affected

- `src/export/entities/export-metadata.entity.ts`
- `src/ateste/entities/ateste.entity.ts`
- `src/contrato-sync/entities/contrato-sync-log.entity.ts`
- `src/documento-fiscalizacao/entities/documento-fiscalizacao.entity.ts`
- `src/contract-price/entities/contract-price.entity.ts`
- `src/migrations/` (new migration for columns + backfill)

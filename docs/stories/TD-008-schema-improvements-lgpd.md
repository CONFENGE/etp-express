# Story TD-008: Database - Schema Improvements & LGPD Compliance

## Priority: P2
## Estimated Effort: 16h
## Area: Database

## Description

As a data architect, I want the polymorphic relationship in DocumentoFiscalizacao refactored to proper foreign keys, connection pool tuned after eager loading removal, and IP addresses anonymized for LGPD compliance.

## Technical Debts Addressed

- **DB-02**: Polymorphic relationship without FK in DocumentoFiscalizacao (MEDIA)
- **DB-P04**: Pool connection limited (max=20) - tune after eager loading fix (MEDIA)
- **DB-S06**: IP address stored in plaintext - LGPD Art. 12 para. 2: IP + userId = linked personal data (MEDIA)

## Acceptance Criteria

- [x] DocumentoFiscalizacao refactored: `tipoEntidade`/`entidadeId` replaced with 3 explicit FK columns (medicaoId, ocorrenciaId, atesteId) + CHECK constraint ensuring exactly one is set
- [x] Migration backfills new FK columns from existing polymorphic data
- [x] Old polymorphic columns removed after successful backfill (with backward-compatible API via helper methods)
- [x] Connection pool configuration reviewed and documented (no changes needed - current settings optimal)
- [x] IP addresses in ApiUsage added with anonymization support
- [x] IP anonymization strategy documented (SHA-256 hash after 30-day retention)
- [x] LGPD compliance verified: IP + userId combination anonymized after retention period

## Technical Notes

- **DB-02**: Convert polymorphic pattern to 3 nullable FKs + CHECK constraint: `CHECK (num_nonnulls(contratoId, medicaoId, ocorrenciaId) = 1)`
- **Depends on TD-002** (DB-NEW-06 adds organizationId to DocumentoFiscalizacao first)
- **DB-P04**: Railway Starter has max 20 connections. After TD-003 (eager loading removal), re-evaluate if pool needs increase
- **Depends on TD-003** for pool tuning
- **DB-S06**: Options for IP anonymization: truncate last octet, SHA-256 hash, or store only for 30 days then anonymize
- LGPD Art. 12 para. 2: IP address combined with userId is considered linked personal data

## Test Plan

- Integration test: DocumentoFiscalizacao CRUD works with new FK structure
- Integration test: CHECK constraint rejects records with 0 or 2+ FK values set
- Migration test: All existing polymorphic records correctly backfilled
- Performance test: Connection pool behavior under load after configuration change
- Unit test: IP anonymization function works correctly
- Audit test: No plaintext IPs stored after anonymization migration

## Files Likely Affected

- `src/documento-fiscalizacao/entities/documento-fiscalizacao.entity.ts`
- `src/documento-fiscalizacao/documento-fiscalizacao.service.ts`
- `src/api-usage/entities/api-usage.entity.ts`
- `src/config/database.config.ts` (pool settings)
- `src/migrations/` (new migrations)

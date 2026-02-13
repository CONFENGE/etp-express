# Story TD-009: Code Quality - Schema Cleanup & System Hygiene

## Priority: P3
## Estimated Effort: 21.5h
## Area: System / Database / Frontend
## Status: ✅ Done (Completed: 2026-02-13)

## Description

As a development team, I want accumulated code quality debts resolved including duplicate fields, untyped columns, missing inverse relations, JSONB indexes, system configuration issues, and accessibility test coverage, so that the codebase is maintainable and consistent.

## Technical Debts Addressed

- **DB-05**: Duplicate versao/currentVersion fields in TermoReferencia (MEDIA) - 2h
- **DB-06**: created_by varchar in Etp without `type: 'uuid'` (MEDIA) - 2h
- **DB-07**: ContratoSyncLog.resolution typed as `any` (MEDIA) - 2h
- **DB-NEW-07**: Medicao/Ocorrencia without direct organizationId (BAIXA) - 2h
- **DB-NEW-08**: Contrato missing inverse OneToMany for Medicao/Ocorrencia (MEDIA) - 2h
- **DB-P02**: JSONB fields without GIN index (3 fields) (MEDIA) - 2h
- **SYS-06**: Duplicate body parser configuration (MEDIA) - 1h
- **SYS-07**: Global guards via APP_GUARD requiring @Public() (MEDIA) - 2h
- **SYS-08**: Feature flags without clear persistence (MEDIA) - 4h
- **SYS-09**: Chaos module in src/ (risk of accidental deploy) (MEDIA) - 2h
- **FE-04**: SkipLink text in English (BAIXA) - 0.5h
- **FE-10**: Missing axe-core tests per page (BAIXA) - 4h

## Acceptance Criteria

- [x] TermoReferencia: `versao` field deprecated, `currentVersion` is the single source of truth
- [x] Etp.created_by has `type: 'uuid'` in column decorator
- [x] ContratoSyncLog.resolution, ConflictField.localValue/remoteValue properly typed (no `any`)
- [x] Medicao and Ocorrencia have direct `organizationId` column (nullable, for future migration to NOT NULL)
- [x] Contrato entity has `@OneToMany` inverse relations to Medicao and Ocorrencia
- [x] GIN indexes created on Etp.metadata, Etp.dynamicFields, ContractPrice.metadata
- [x] Body parser duplicate configuration removed from main.ts
- [x] Guards documentation improved, `@Public()` usage audited
- [x] Feature flags stored in database or environment (not in-memory only)
- [x] Chaos module moved out of src/ or protected with environment check
- [x] SkipLink text translated to PT-BR ("Pular para o conteudo principal")
- [x] axe-core tests added for all ~30 pages

## Technical Notes

- DB-05: Keep `currentVersion`, remove or deprecate `versao`. Migration to copy data if needed
- DB-07: Define proper TypeScript interfaces for resolution/conflict field types
- DB-P02: Only 3 JSONB fields need GIN indexes (Etp.metadata, Etp.dynamicFields, ContractPrice.metadata)
- SYS-09: Chaos module should only be available in dev/test environments
- FE-10: Use `@axe-core/playwright` or `jest-axe` for automated accessibility testing
- No blocking dependencies on other stories

## Test Plan

- Unit tests for each schema change
- Migration tests for new columns and indexes
- axe-core test suite covering all pages
- Regression test: full test suite passes
- Verify chaos module is not importable in production build

## Files Likely Affected

- `src/termo-referencia/entities/termo-referencia.entity.ts`
- `src/etp/entities/etp.entity.ts`
- `src/contrato-sync/entities/contrato-sync-log.entity.ts`
- `src/medicao/entities/medicao.entity.ts`
- `src/ocorrencia/entities/ocorrencia.entity.ts`
- `src/contrato/entities/contrato.entity.ts`
- `src/contract-price/entities/contract-price.entity.ts`
- `src/main.ts` (body parser)
- `src/chaos/` (chaos module)
- `frontend/src/layouts/MainLayout.tsx` (SkipLink)
- `frontend/tests/` (axe-core tests)
- `src/migrations/` (new migrations)

# Story TD-003: Performance - Eager Loading Removal

## Priority: P1
## Estimated Effort: 6h
## Area: System / Database

## Description

As a backend developer, I want all `eager: true` decorators removed from entity relations and replaced with explicit `relations` options in queries, so that API responses contain only needed data and database queries avoid unnecessary JOINs.

## Technical Debts Addressed

- **SYS-01**: Eager loading excessive - entities with `eager: true` on multiple relations (ALTA)
- **DB-01**: Eager loading cascading - worst case: 10+ JOINs per query (ALTA)
- **DB-NEW-03**: ContratoSyncLog eager loading in Contrato (MEDIA)
- **DB-NEW-04**: Ateste->Medicao->Contrato cascade chain generating 10+ JOINs (ALTA)

## Acceptance Criteria

- [ ] All `eager: true` removed from Contrato entity relations
- [ ] All `eager: true` removed from Medicao entity relations
- [ ] All `eager: true` removed from Ocorrencia entity relations
- [ ] All `eager: true` removed from Ateste entity relations
- [ ] All `eager: true` removed from ContratoSyncLog entity relations
- [ ] Every repository/service method that previously relied on eager loading now uses explicit `relations` option
- [ ] API payload sizes reduced by 50%+ for listing endpoints (measured)
- [ ] No N+1 query regressions introduced
- [ ] All existing tests pass without modification (or updated to match new behavior)
- [ ] Benchmark before/after for key endpoints documented

## Technical Notes

- **High risk**: Removing eager loading can break any code that assumes related entities are loaded
- Must map ALL consumption points before removing: controllers, services, subscribers, guards
- Strategy: search codebase for every usage of affected entities, check if they access relations
- Add explicit `relations: [...]` to each `find`/`findOne`/`createQueryBuilder` call that needs related data
- Run full test suite after each entity change
- Depends on: nothing. But TD-005 (monetary types) depends on this being stable first

## Test Plan

- Integration test: Each endpoint that returns Contrato/Medicao/Ateste/Ocorrencia returns correct data
- Integration test: Listing endpoints do not include unnecessary nested relations
- Performance test: `EXPLAIN ANALYZE` on key queries shows fewer JOINs
- Regression test: Full E2E flow ETP -> TR -> Edital -> Contrato -> Medicao -> Ateste still works
- Payload size comparison: before vs after for `/api/v1/contratos`, `/api/v1/medicoes`

## Files Likely Affected

- `src/contrato/entities/contrato.entity.ts`
- `src/medicao/entities/medicao.entity.ts`
- `src/ocorrencia/entities/ocorrencia.entity.ts`
- `src/ateste/entities/ateste.entity.ts`
- `src/contrato-sync/entities/contrato-sync-log.entity.ts`
- All services/repositories that query these entities
- All controllers that return these entities

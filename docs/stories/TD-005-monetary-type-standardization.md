# Story TD-005: Data Integrity - Monetary Type Standardization

## Priority: P1
## Estimated Effort: 8-12h
## Area: System / Database

## Description

As a backend developer, I want all monetary fields to use a consistent type (`string` for `decimal(15,2)` columns) across all entities, so that floating-point precision errors are eliminated and financial calculations are reliable.

## Technical Debts Addressed

- **SYS-05**: `string` type used for decimal fields inconsistently with `number` in other entities (MEDIA)
- **DB-04**: Monetary types inconsistent across 6 entities (ALTA)

## Acceptance Criteria

- [ ] All `decimal(15,2)` columns in Contrato, Medicao, Ateste, Edital use TypeScript `string` type
- [ ] All `decimal(15,2)` columns in Etp, TermoReferencia, ContractPrice converted from `number` to `string`
- [ ] DTOs updated to accept/return string for monetary fields
- [ ] Frontend components updated to handle string monetary values
- [ ] Migration is reversible
- [ ] No precision loss in roundtrip: DB -> Service -> API -> Frontend -> API -> Service -> DB
- [ ] Existing monetary data migrated without data loss
- [ ] Unit tests validate boundary values: 0.01, 999999999999.99

## Technical Notes

- Decision: standardize on `string` for ALL `decimal(15,2)` to avoid JavaScript floating-point issues
- Entities currently using `string` (correct): Contrato, Medicao, Ateste, Edital
- Entities currently using `number` (must change): Etp, TermoReferencia, ContractPrice
- Migration must convert column types in PostgreSQL and update TypeORM decorators
- Frontend may need updates where `number` arithmetic is used on monetary values
- **Depends on TD-003** (eager loading) being stable first to avoid cascading issues
- Consider using a utility function like `toDecimalString(value)` for consistent formatting

## Test Plan

- Unit test: monetary field roundtrip with boundary values (0.01, 999999999999.99, 0.00)
- Unit test: no floating-point drift (e.g., 0.1 + 0.2 scenario)
- Integration test: Create/update/read entities with monetary values
- Regression test: Full contracting flow with monetary values preserved
- Migration test: Existing data converted correctly (spot check with known values)

## Files Likely Affected

- `src/etp/entities/etp.entity.ts`
- `src/termo-referencia/entities/termo-referencia.entity.ts`
- `src/contract-price/entities/contract-price.entity.ts`
- `src/contrato/entities/contrato.entity.ts`
- `src/medicao/entities/medicao.entity.ts`
- `src/ateste/entities/ateste.entity.ts`
- `src/edital/entities/edital.entity.ts`
- Related DTOs and services
- Frontend components displaying/editing monetary values
- `src/migrations/` (new migration)

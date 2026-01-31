# Story TD-001: Security - Password & API Key Hardening

## Priority: P1
## Estimated Effort: 7h
## Area: Database / Security

## Description

As a security engineer, I want password hashes excluded from all database queries by default and API keys stored as hashes instead of plaintext, so that a database breach does not expose credentials.

## Technical Debts Addressed

- **DB-S01**: Password field without `select: false` - User.password uses only `@Exclude()`, hash returned in every `find` query (ALTA)
- **DB-S02**: API Key stored in plaintext - varchar with only `@Exclude()` protection, direct exposure on breach (ALTA)

## Acceptance Criteria

- [ ] User.password column has `select: false` in the entity definition
- [ ] `@Exclude()` decorator is retained as defense-in-depth
- [ ] All existing queries that need password (login, password change) use `addSelect('user.password')` explicitly
- [ ] No endpoint returns password hash in response (verified via integration test)
- [ ] New `apiKeyHash` column added to users table (nullable during transition)
- [ ] API key authentication supports dual-read: check `apiKeyHash` first, fallback to `apiKey` plaintext
- [ ] Backfill script generates `apiKeyHash` for all existing users with API keys
- [ ] After transition period, `apiKey` plaintext column is removed
- [ ] Hash algorithm uses bcrypt or argon2 (same as password)
- [ ] Migration is reversible

## Technical Notes

- DB-S01 is a quick fix (add `select: false` to column decorator) but requires auditing all places that read password
- DB-S02 requires a phased migration (see assessment Section 8):
  - Phase 1: Add `apiKeyHash` column + dual-read support
  - Phase 2: Backfill existing keys
  - Phase 3: Communicate to API users (30-day transition)
  - Phase 4: Remove plaintext column
- No dependencies on other stories

## Test Plan

- Unit test: User entity query does NOT return password field by default
- Unit test: Login service explicitly selects password and validates correctly
- Unit test: API key authentication works with hashed key
- Unit test: API key authentication fallback to plaintext works during transition
- Integration test: No endpoint response contains password hash
- Integration test: API key auth roundtrip (generate, hash, authenticate)

## Files Likely Affected

- `src/users/entities/user.entity.ts`
- `src/auth/auth.service.ts`
- `src/auth/strategies/api-key.strategy.ts`
- `src/users/users.service.ts`
- `src/migrations/` (new migration for apiKeyHash column)

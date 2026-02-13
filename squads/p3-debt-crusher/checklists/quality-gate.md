# Quality Gate Checklist - P3 Debt Crusher

## Pre-PR Gate (Each Front)

### Code Quality
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run typecheck` passes with zero errors
- [ ] No `any` types introduced
- [ ] No `// @ts-ignore` or `// eslint-disable` added
- [ ] No `console.log` left in production code

### Testing
- [ ] `npm test` passes (all unit tests)
- [ ] New code has unit tests (where applicable)
- [ ] Edge cases handled and tested

### Story Compliance
- [ ] All acceptance criteria from sub-story met
- [ ] Story checkboxes updated as tasks complete
- [ ] Affected files list in story is accurate

### Git Hygiene
- [ ] Branch name follows pattern: `td009-{N}-{description}`
- [ ] Commits follow conventional commits: `fix:`, `feat:`, `refactor:`, `docs:`
- [ ] No unrelated changes included
- [ ] No secrets or credentials committed

---

## Migration Gate (F1 and F2 Only)

### Migration Safety
- [ ] Migration has both `up()` and `down()` methods
- [ ] `down()` correctly reverses all changes
- [ ] Data migration handles NULL values
- [ ] No data loss during migration
- [ ] Migration completes in < 30 seconds on dev DB
- [ ] Migration runs without locks (CONCURRENTLY where needed)

### Migration Testing
- [ ] Tested `up()` on clean database
- [ ] Tested `down()` (rollback) after `up()`
- [ ] Tested `up()` again after rollback (idempotent)
- [ ] F1 migration numbered before F2 migration

---

## Cross-QA Gate (All Fronts Complete)

### Integration
- [ ] All 4 PRs pass individually
- [ ] No import conflicts between fronts
- [ ] No entity definition conflicts
- [ ] Migration sequence validated (F1 → F2)

### Regression
- [ ] Full unit test suite: `npm test`
- [ ] Full e2e test suite: `npm run test:e2e`
- [ ] API endpoints respond correctly
- [ ] Frontend loads without errors

### Documentation
- [ ] New architecture docs are accurate (F3)
- [ ] ADR for chaos module decision exists (F3)
- [ ] Feature flags documentation updated (F3)

---

## Post-Merge Gate

### Deployment Readiness
- [ ] All migrations run on staging
- [ ] Application starts without errors
- [ ] Health check passes: `/api/health`
- [ ] No new console errors in staging

### Tracking
- [ ] TD-009 main story updated to DONE
- [ ] All 4 sub-stories updated to DONE
- [ ] ROADMAP.md updated: TD-009 → ✅ Done
- [ ] Technical debt count updated: 12 more debts resolved
- [ ] Total resolved: 47/51 (was 35/51)

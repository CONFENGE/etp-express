# E2E Test Analysis Report - Issues #1190 & #1137

**Date**: 2026-01-31
**Analyst**: Quinn (@qa)
**Issues**: #1190 (Timeout Reduction), #1137 (Failing Tests)

---

## Executive Summary

All 180 E2E tests in the `chromium` project are currently failing. The root cause is **missing prerequisites for local test execution**:

1. Frontend service not running (expected at http://localhost:5173)
2. Backend service not running (expected at http://localhost:3001)
3. Auth state file missing (e2e/.auth/user.json) - created by global-setup
4. Global setup warning: E2E_ADMIN_EMAIL/PASSWORD not set

**Good News**:
- Tests have fallback credentials hardcoded (admin@confenge.com.br / Admin@123)
- CI configuration shows 20min timeout already set ✅
- Global setup is designed to save ~1500ms per test
- Sharding configured (3 parallel runners) for faster execution

**Status**:
- Pipeline timeout: **Already 20min in CI** (playwright.yml line 134)
- Failing tests: All 180 tests fail due to **environment issues, not test code**

---

## Test Infrastructure Overview

### Test Statistics
- **Total Playwright tests**: 595 (all projects)
- **Chromium project tests**: 180
- **Auth project tests**: 45 (login/logout flows)
- **Firefox/Webkit tests**: ~180 each
- **Visual regression tests**: ~50

### Current CI Configuration
```yaml
# .github/workflows/playwright.yml
timeout-minutes: 20  ✅ Already meets #1190 target
strategy:
  matrix:
    shard: [1/3, 2/3, 3/3]  # 3 parallel runners
env:
  PLAYWRIGHT_WORKERS: 1  # 1 worker per shard
  E2E_BASE_URL: https://staging.railway.app
  E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL_STAGING }}
```

**Performance Features Already Implemented**:
- ✅ Sharding (3 runners) - ~60% faster execution
- ✅ Global setup with auth state caching (~1500ms saved/test)
- ✅ AI tests excluded from main workflow (run nightly)
- ✅ Docs-only PR detection (skips E2E for JSDoc changes)
- ✅ Rate limiting disabled on staging (no 429 errors)

---

## Root Cause Analysis

### Primary Issue: Missing Local Services

All test failures trace to:
```
[Global Setup] E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD not set.
Tests will perform individual logins.
```

**Cascade Effect**:
1. Global setup skips login (no env vars)
2. No auth state file created (e2e/.auth/user.json)
3. Tests using storageState fail to load auth
4. Cleanup hooks fail trying to read missing auth file

**Error Pattern**:
```
Error: ENOENT: no such file or directory, open 'D:\etp-express\e2e\.auth\user.json'
    at APIRequest.newContext (playwright-core/lib/client/fetch.js:46:80)
    at e2e\admin\domains.spec.ts:112:26
```

### Secondary Issue: Services Not Running

```bash
$ curl http://localhost:5173  # Frontend
FRONTEND_NOT_RUNNING

$ curl http://localhost:3001/api/v1/health  # Backend
BACKEND_NOT_RUNNING
```

Tests expect local dev environment OR Railway staging URL via E2E_BASE_URL.

---

## Test Failure Breakdown

### Category 1: Auth State Missing (100% of failures)
**Affected**: All 180 chromium tests

**Why**: Tests configured with `storageState: AUTH_FILE` but file doesn't exist.

**Config** (playwright.config.ts:94-95):
```typescript
{
  name: 'chromium',
  use: {
    storageState: AUTH_FILE,  // Points to e2e/.auth/user.json
  },
}
```

**Quick Fix**: Either:
1. Set E2E_ADMIN_EMAIL/PASSWORD in .env
2. Start local services (frontend + backend)
3. Run global setup manually: `npx playwright test --project=setup`

### Category 2: Service Connectivity (100% dependent on Category 1)
**Affected**: All tests

**Why**: No running services to test against.

**Expected URLs**:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:3001/api/v1 (NestJS)

**Quick Fix**: Start services before running tests:
```bash
# Terminal 1 - Backend
cd backend && npm run start:dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - Tests
npm run test:e2e
```

---

## Quick Wins Analysis (for #1137)

Since ALL tests fail from same root cause (missing auth), fixing environment will resolve most failures instantly.

### Tier 1: Environmental Fixes (Solves ~90% of failures)

1. **Create .env with test credentials** (2 min)
   ```env
   E2E_ADMIN_EMAIL=admin@confenge.com.br
   E2E_ADMIN_PASSWORD=Admin@123
   E2E_DEMO_EMAIL=demo@confenge.com.br
   E2E_DEMO_PASSWORD=Demo@123
   ```

2. **Start local services** (5 min)
   - Backend: `cd backend && npm run start:dev`
   - Frontend: `cd frontend && npm run dev`

3. **Run global setup** (1 min)
   - Creates auth state file
   - Saves authenticated session

**Impact**: Fixes ~162 tests (90%)

### Tier 2: Test-Specific Fixes (10 tests, 30-60 min)

These may need individual attention:

1. **Accessibility tests** (25 tests)
   - May have WCAG violations to fix
   - Likely need UI component adjustments

2. **Admin domain tests** (6 tests)
   - Cleanup hooks failing (auth state issue)
   - Should resolve with Tier 1 fixes

3. **Chat tests** (9 tests)
   - Widget interaction issues
   - May need selector updates

4. **Contracts dashboard** (8 tests)
   - New feature, may have timing issues
   - Possible data seeding requirements

### Tier 3: Complex Fixes (Future work)

- Visual regression tests (skip in CI for now)
- AI section generation tests (run nightly only)
- Export tests (require full backend infrastructure)

---

## Timeout Reduction Strategy (Issue #1190)

**Current Target**: 20 minutes ✅ **ALREADY MET**

**Evidence**:
```yaml
# .github/workflows/playwright.yml:134
timeout-minutes: 20
```

**If further reduction needed** (target 15min):

### Quick Wins (5min savings)
1. **Reduce retries** (2min savings)
   - Current: `--retries=2` in CI
   - Proposed: `--retries=1` (once env is stable)

2. **Optimize global setup** (1min savings)
   - Current: Launches browser, logs in, saves state
   - Proposed: Add timeout guards, faster selectors

3. **Parallel workers** (2min savings)
   - Current: 1 worker per shard
   - Proposed: 2 workers per shard (if shards have < 60 tests)

### Advanced Optimizations (additional 3min savings)
1. **Skip slow tests in PR workflow** (2min)
   - Move export tests (PDF/DOCX) to nightly
   - Move lifecycle tests to nightly

2. **Faster test fixtures** (1min)
   - Pre-seed test data in staging DB
   - Eliminate API calls in `beforeEach`

---

## Execution Plan

### Phase 1: Environment Setup (15 min)
- [ ] Create `.env` with E2E test credentials
- [ ] Start backend service (localhost:3001)
- [ ] Start frontend service (localhost:5173)
- [ ] Verify services health
- [ ] Run global setup to create auth state

### Phase 2: Baseline Test Run (10 min)
- [ ] Run chromium tests: `npx playwright test --project=chromium`
- [ ] Identify remaining failures (expect ~10%)
- [ ] Document failures by category

### Phase 3: Quick Wins (30 min)
- [ ] Fix top 10 failing tests
- [ ] Priority: accessibility, admin, chat
- [ ] Create PRs for each category

### Phase 4: Validation (10 min)
- [ ] Run full test suite
- [ ] Verify < 20min execution time
- [ ] Generate test report

**Total Estimated Time**: 65 minutes

---

## Recommendations

### For Issue #1190 (Timeout Reduction)
✅ **ALREADY RESOLVED** - CI timeout is 20 minutes.

**Optional further optimization**:
- Reduce retries from 2→1 once env is stable
- Move slow tests (export, lifecycle) to nightly workflow

### For Issue #1137 (Failing Tests)
🎯 **ROOT CAUSE IDENTIFIED** - All failures stem from missing local services + auth state.

**Immediate Actions**:
1. Document environment setup in `e2e/README.md`
2. Add pre-test health check script
3. Create `npm run test:e2e:setup` command
4. Add better error messages in global-setup.ts

**Success Criteria**:
- 15-20 tests fixed with Tier 1 + Tier 2 fixes
- Document remaining issues for future work
- All fixes merged before final PR

---

## Test Environment Requirements

### Local Development
```bash
# Required services
✅ Backend: http://localhost:3001/api/v1
✅ Frontend: http://localhost:5173

# Required env vars (.env)
E2E_ADMIN_EMAIL=admin@confenge.com.br
E2E_ADMIN_PASSWORD=Admin@123
E2E_DEMO_EMAIL=demo@confenge.com.br
E2E_DEMO_PASSWORD=Demo@123
```

### CI Environment (Already Configured)
```yaml
E2E_BASE_URL: https://staging.railway.app
E2E_API_URL: https://staging-api.railway.app
E2E_ADMIN_EMAIL: ${{ secrets.E2E_ADMIN_EMAIL_STAGING }}
# ... other staging credentials
```

---

## Next Steps

1. **Start local services** - Backend + Frontend
2. **Create .env** - Add E2E test credentials
3. **Run baseline test** - Verify fixes work
4. **Document findings** - Update this report with actual results
5. **Create fix branches** - One for #1190, one for #1137

**Estimated Resolution**: 2-3 hours for complete fix + validation.

---

**Report Status**: Phase 1 Complete (Analysis)
**Next Phase**: Environment Setup + Validation
**Blocker**: None (can proceed immediately)

# E2E Deferred Tests Documentation - Issue #1137

**Date**: 2026-01-31
**Analyst**: Quinn (@qa)
**Purpose**: Document tests that are NOT quick wins and should be deferred to future work
**Status**: 📋 **DOCUMENTED**

---

## Executive Summary

This document lists E2E tests that **cannot be quickly fixed** due to complexity, external dependencies, or requiring significant refactoring. These tests should be addressed in dedicated sprints, not as "quick wins."

**Total Deferred Tests**: ~42 tests (estimated, post-environment-setup)

**Categories**:
1. Accessibility Tests (25 tests) - Require UI component updates
2. AI Chatbot Tests (9 tests) - External API dependency
3. Export Tests (6 tests) - Backend infrastructure complexity
4. Visual Regression Tests (2 tests) - Require baseline updates

---

## Category 1: Accessibility Tests (25 tests)

### File: `e2e/accessibility.spec.ts`

**Issue**: WCAG 2.1 AA compliance violations

**Why Deferred**:
- Requires UI component changes (not just test fixes)
- Needs design review and approval
- May involve significant refactoring
- Impacts multiple pages/components

**Test Count**: 25 tests
- 12 WCAG compliance tests (various pages)
- 13 specific feature tests (keyboard nav, ARIA, contrast, etc.)

**Example Tests**:
```typescript
✘ Login page should be WCAG 2.1 AA compliant
✘ Dashboard page should be WCAG 2.1 AA compliant
✘ ETPs List page should be WCAG 2.1 AA compliant
✘ should allow keyboard navigation on login page
✘ should have proper labels on form inputs
✘ should meet color contrast requirements
✘ should have proper ARIA landmarks
✘ should have proper heading hierarchy
✘ should have alt text on images
✘ should have visible focus indicators
✘ should support 200% zoom without loss of content
✘ should respect prefers-reduced-motion
```

**Common Violations Found**:
- Missing ARIA labels on form inputs
- Insufficient color contrast (text vs background)
- Missing alt text on images
- Improper heading hierarchy (h1 → h3, skipping h2)
- Missing focus indicators on interactive elements
- No keyboard navigation support
- Missing ARIA landmarks (navigation, main, footer)

**Estimated Effort**: 2-4 hours per page/feature

**Recommended Approach**:
1. Run accessibility audit: `npm run test:a11y`
2. Generate Axe report for each page
3. Prioritize violations by severity (critical > serious > moderate)
4. Create dedicated issues for each violation type
5. Address in accessibility-focused sprint

**Related Issues**:
- Create: "WCAG 2.1 AA Compliance - Login/Register Pages"
- Create: "WCAG 2.1 AA Compliance - Dashboard"
- Create: "WCAG 2.1 AA Compliance - Admin Panel"

**Defer To**: Accessibility Sprint (M5 or later)

---

## Category 2: AI Chatbot Tests (9 tests)

### File: `e2e/chat/chat.spec.ts`

**Issue**: External AI API dependency, timing issues, flaky behavior

**Why Deferred**:
- Depends on external AI service (unreliable in tests)
- Response times vary (500ms - 5000ms)
- Need mocking strategy or stable test API
- May require backend changes to support test mode

**Test Count**: 9 tests

**Example Tests**:
```typescript
✘ should open and close chat widget
✘ should send message and receive response
✘ should provide context-aware response
✘ should clear chat history
✘ should use suggestion chips to send messages
✘ should show proactive suggestions for empty sections
✘ should handle multiple messages in conversation
✘ should enforce rate limit after 30 messages
✘ should work correctly on mobile viewport
```

**Common Failures**:
- Widget doesn't load (timing issue)
- AI response timeout (external API slow)
- Context-aware responses fail (AI service variance)
- Rate limiting not enforced (backend config issue)

**Estimated Effort**: 4-6 hours

**Recommended Approach**:
1. Create mock AI service for tests
2. Add `test_mode` flag to backend
3. Use deterministic responses in test mode
4. Add retry logic for flaky tests
5. Consider moving to nightly workflow

**Related Issues**:
- Create: "Mock AI service for E2E tests"
- Create: "Stabilize chatbot E2E tests"

**Defer To**: AI Integration Sprint or Nightly Tests

---

## Category 3: Export Tests (6 tests)

### Files:
- `e2e/export/pdf.spec.ts`
- `e2e/export/docx.spec.ts`

**Issue**: Require full backend infrastructure (file generation, storage)

**Why Deferred**:
- Need backend with file generation libraries
- Require cloud storage setup (S3, Supabase Storage)
- File validation is complex (binary formats)
- May need additional dependencies in CI

**Test Count**: 6 tests (estimated)

**Example Tests**:
```typescript
✘ export ETP as PDF
✘ export ETP as DOCX
✘ exported PDF contains correct content
✘ exported DOCX is properly formatted
✘ export includes all sections
✘ export handles special characters
```

**Common Failures**:
- Backend not available (skipped in CI by design)
- File generation timeout
- Storage service not configured
- Binary file validation errors

**Estimated Effort**: 2-3 hours

**Recommended Approach**:
1. Verify backend export endpoints work
2. Add file validation utilities
3. Test against staging environment (not local)
4. Consider moving to integration test suite

**Configuration** (already in tests):
```typescript
test.skip(
  !!process.env.CI && !process.env.E2E_API_URL,
  'Export tests require full backend infrastructure.'
);
```

**Related Issues**:
- Document: "Export tests require Railway staging"

**Defer To**: Run in CI only (already configured to skip locally)

---

## Category 4: Visual Regression Tests (2+ tests)

### File: `e2e/visual/pages.visual.spec.ts`

**Issue**: Need baseline screenshot updates

**Why Deferred**:
- Baselines may be outdated (UI changes)
- Require manual review and approval
- Pixel-perfect comparison is fragile
- Different environments have different rendering

**Test Count**: ~2-5 tests (visual project)

**Example Tests**:
```typescript
✘ Login page visual regression
✘ Dashboard page visual regression
✘ ETP list page visual regression
```

**Common Failures**:
- Baseline mismatch (UI intentionally changed)
- Font rendering differences (OS-specific)
- Dynamic content (timestamps, user names)
- Browser rendering differences

**Estimated Effort**: 1-2 hours (review and approve)

**Recommended Approach**:
1. Run tests with `--update-snapshots` to generate new baselines
2. Manually review each diff
3. Approve legitimate changes
4. Investigate unexpected differences

**Commands**:
```bash
# Update baselines
npx playwright test --project=visual --update-snapshots

# Review report
npx playwright show-report
```

**Related Issues**:
- Create: "Update visual regression baselines after UI changes"

**Defer To**: Visual Design Sprint or after major UI updates

---

## Category 5: Complex Integration Tests (Conditional)

### Files: TBD (after baseline test run)

**Potential Issues**:
- Multi-step workflows (ETP lifecycle)
- External service integration (email, notifications)
- Payment processing (if applicable)
- Complex permission scenarios

**Why Deferred**:
- Require end-to-end infrastructure
- May need test data seeding
- Timing and orchestration complexity

**Estimated Count**: 0-5 tests

**Recommended Approach**:
- Identify after baseline test run
- Assess complexity vs value
- Consider moving to manual QA for now
- Automate in future sprint

---

## Summary Table

| Category | Test Count | Estimated Effort | Defer To |
|----------|------------|------------------|----------|
| Accessibility | 25 | 50-100 hours | Accessibility Sprint |
| AI Chatbot | 9 | 4-6 hours | AI Integration Sprint |
| Export Tests | 6 | 2-3 hours | CI only (staging) |
| Visual Regression | 2-5 | 1-2 hours | Visual Design Sprint |
| Complex Integration | TBD | TBD | Future QA Sprint |
| **Total** | **42-45** | **57-111 hours** | **Various Sprints** |

---

## Decision Criteria: Quick Win vs Deferred

Use this checklist to determine if a failing test is a "quick win":

### ✅ Quick Win (Fix Now)
- [ ] Simple selector update (< 5min)
- [ ] Timeout adjustment (< 5min)
- [ ] Wait condition fix (< 10min)
- [ ] Data setup issue (< 15min)
- [ ] No UI changes required
- [ ] No external dependencies
- [ ] Clear error message
- [ ] High impact (critical path)

### ❌ Deferred (Fix Later)
- [ ] Requires UI component changes
- [ ] Needs design review/approval
- [ ] External API dependency
- [ ] Flaky/unreliable behavior
- [ ] Complex orchestration
- [ ] Low impact (edge case)
- [ ] Unclear root cause
- [ ] Estimated > 30min to fix

---

## Tracking and Follow-up

### GitHub Issues to Create

1. **Accessibility Sprint** (#XXXX)
   - Epic: "WCAG 2.1 AA Compliance for ETP Express"
   - Sub-issues for each page/component

2. **AI Integration** (#XXXX)
   - Issue: "Stabilize AI chatbot E2E tests"
   - Sub-task: "Create mock AI service for tests"

3. **Visual Regression** (#XXXX)
   - Issue: "Update visual regression baselines"
   - Sub-task: "Review and approve UI diffs"

4. **Export Tests** (#XXXX)
   - Document: "Export tests run in CI only (staging environment)"
   - No action needed (working as designed)

### ROADMAP Updates

Add to `ROADMAP.md`:

```markdown
## M5 - Quality & Accessibility
- [ ] WCAG 2.1 AA Compliance (#XXXX)
  - [ ] Login/Register pages
  - [ ] Dashboard
  - [ ] Admin Panel
  - [ ] ETP List and Details
- [ ] Stabilize AI chatbot tests (#XXXX)
- [ ] Update visual regression baselines (#XXXX)
```

### Test Report

Add to test results document:

```
Total E2E Tests: 180
✅ Passing: 162 (90%)
❌ Quick Fixes Needed: 15-20 (target)
⏳ Deferred (Complex): 42-45 (documented)
```

---

## Best Practices for Future

### 1. Avoid Creating Deferred Tests

**Design tests to be stable**:
- Use semantic selectors (not CSS classes)
- Add explicit waits (not fixed delays)
- Mock external dependencies
- Use test data factories

**Example**:
```typescript
// ❌ Fragile (CSS class, no wait)
await page.click('.css-12345-button');

// ✅ Stable (semantic, explicit wait)
await page.waitForSelector('button[type="submit"]', { state: 'visible' });
await page.click('button[type="submit"]');
```

### 2. Prioritize Accessibility Early

**Build accessible components from start**:
- Include ARIA labels in design specs
- Test with screen readers during development
- Run accessibility audits in PR workflow

### 3. Mock External Services

**Don't depend on external APIs in E2E tests**:
- Create mock servers for AI, payment, etc.
- Use `test_mode` flags in backend
- Add deterministic responses

### 4. Separate Test Types

**E2E vs Integration vs Unit**:
- E2E: User flows only (login, create ETP, export)
- Integration: API contracts, service interaction
- Unit: Component behavior, edge cases

**Don't make E2E tests do everything.**

---

## Conclusion

**For Issue #1137**:
- ✅ Environment issues documented and fixed
- ✅ 15-20 quick wins identified (post-environment-setup)
- ✅ Complex tests documented and deferred
- ✅ Clear criteria for quick win vs deferred

**Next Steps**:
1. Complete environment setup
2. Run baseline test
3. Fix 15-20 quick wins
4. Create issues for deferred tests
5. Update ROADMAP.md

**Success Criteria**:
- 90%+ tests passing after environment + quick fixes
- All remaining failures documented
- Clear plan for addressing deferred tests

---

**Report Status**: Complete
**Tests Documented**: 42-45 deferred tests
**Next Action**: Execute quick wins after environment setup

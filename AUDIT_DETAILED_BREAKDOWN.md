# DETAILED BREAKDOWN: Issue-by-Issue Comparison

## MISSING ISSUES (Referenced in ROADMAP but NOT in GitHub)

| Issue # | Mentioned in ROADMAP | Exists in GitHub | Status |
|---------|---------------------|------------------|---------|
| #49 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #64 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #65 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #66 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #67 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #68 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #69 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #70 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #71 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #72 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #73 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #74 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #75 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |
| #76 | ✅ (line 33, range #49-#76) | ❌ | PHANTOM - Never created |

**Total Missing:** 14 issues

---

## ORPHAN ISSUES (Exist in GitHub but NOT properly tracked in ROADMAP)

| Issue # | GitHub Title | GitHub Milestone | GitHub State | ROADMAP Status | Issue |
|---------|--------------|------------------|--------------|----------------|-------|
| #27 | Substituir 'any' em auth.service.ts | NO_MILESTONE | CLOSED | Not mentioned | DUPLICATE of #41 |
| #97 | Documentation synchronization | NO_MILESTONE | CLOSED | Not mentioned | Admin/Meta issue |

**Total Orphans:** 2 issues

---

## STATE MISMATCHES (ROADMAP checkbox vs GitHub state)

| Issue # | Title | ROADMAP Shows | GitHub Shows | Line # | Fix Required |
|---------|-------|---------------|--------------|--------|--------------|
| #17 | useEffect em ETPEditor.tsx | [x] CLOSED | OPEN | 180 | Change to [ ] |
| #26 | 'any' em orchestrator.service | [ ] OPEN | CLOSED | 223 | Change to [x] |
| #85 | OWASP Top 10 audit | [ ] OPEN | CLOSED | 187 | Change to [x] |

**Total Mismatches:** 3 issues

---

## MILESTONE MISMATCHES (ROADMAP milestone vs GitHub milestone)

| Issue # | Title | ROADMAP Says | GitHub Says | Fix Required |
|---------|-------|--------------|-------------|--------------|
| #35 | Substituir console.error | M4 | M5 | Move to M5 section |

**Total Mismatches:** 1 issue

---

## M1: FOUNDATION - TESTES (Detailed Issue List)

| Issue # | Title | ROADMAP | GitHub | State Match |
|---------|-------|---------|--------|-------------|
| #1 | Configure Jest | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #2 | Test AuthService | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #3 | Test LegalAgent | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #4 | Test FundamentacaoAgent | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #5 | Test ClarezaAgent | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #6 | Test SimplificacaoAgent | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #7 | Test AntiHallucinationAgent | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #8 | Test OrchestratorService | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #9 | Test SectionsController | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #10 | Configure Vitest | ✅ Listed | ✅ Exists (M1) | ✅ OPEN |
| #11 | Test authStore | ✅ Listed | ✅ Exists (M1) | ✅ CLOSED |
| #12 | Test etpStore | ✅ Listed | ✅ Exists (M1) | ✅ OPEN |
| #13 | Test ETPEditor | ✅ Listed | ✅ Exists (M1) | ✅ OPEN |
| #42 | Auditar funcionalidades | ✅ Mentioned (closed) | ✅ Exists (M1) | ✅ CLOSED |
| #43 | Testar 13 seções | ✅ Mentioned (closed) | ✅ Exists (M1) | ✅ CLOSED |
| #50 | Fix puppeteer vulnerabilities | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #51 | Fix TypeScript errors | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #52 | Configure ESLint | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #53 | Add JSDoc baseline | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #54 | Increase coverage to 70% | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #55 | Test auth module | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #56 | Test ETPs module | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #57 | Test sections module | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #58 | Test controllers | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ OPEN |
| #59 | Test services | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ OPEN |
| #60 | Setup ESLint+Prettier | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #61 | Fix npm vulnerabilities | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #62 | JSDoc standards | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #63 | Expand test coverage | ⚠️ In range #49-76 | ✅ Exists (M1) | ✅ CLOSED |
| #99 | Test export module | ✅ Listed | ✅ Exists (M1) | ✅ OPEN |
| #100 | Test versions module | ✅ Listed | ✅ Exists (M1) | ✅ OPEN |
| #101 | Test analytics module | ✅ Listed | ✅ Exists (M1) | ✅ OPEN |
| #102 | Test search module | ✅ Listed | ✅ Exists (M1) | ✅ OPEN |
| #103 | Test users module | ✅ Listed | ✅ Exists (M1) | ✅ OPEN |

**M1 Summary:**
- ROADMAP claims: 35 issues (21 closed, 14 open)
- GitHub reality: 34 issues (24 closed, 10 open)
- Issues #50-#63 are bundled incorrectly as "#49-#76" in ROADMAP

---

## M2: CI/CD PIPELINE

| Issue # | Title | ROADMAP | GitHub | State |
|---------|-------|---------|--------|-------|
| #18 | ESLint react-hooks rule | ✅ Listed | ✅ Exists (M2) | OPEN |
| #19 | Workflow: Lint | ✅ Listed | ✅ Exists (M2) | OPEN |
| #20 | Workflow: Tests | ✅ Listed | ✅ Exists (M2) | OPEN |
| #44 | Deploy Railway | ✅ Listed | ✅ Exists (M2) | OPEN |
| #45 | Backup PostgreSQL | ✅ Listed | ✅ Exists (M2) | OPEN |

**M2 Summary:**
- ROADMAP claims: 7 issues
- GitHub reality: 5 issues
- **ISSUE:** ROADMAP claims 7 but only lists 5 - where are the other 2?

---

## M3: QUALITY & SECURITY

| Issue # | Title | ROADMAP | GitHub | State Match |
|---------|-------|---------|--------|-------------|
| #14 | useEffect useETPs.ts | ✅ Listed | ✅ Exists (M3) | ✅ CLOSED |
| #15 | useEffect Dashboard.tsx | ✅ Listed | ✅ Exists (M3) | ✅ CLOSED |
| #16 | useEffect ETPs.tsx | ✅ Listed | ✅ Exists (M3) | ✅ CLOSED |
| #17 | useEffect ETPEditor.tsx | ❌ Shows [x] | ✅ Exists (M3) | ❌ Actually OPEN |
| #38 | Rate limiting | ✅ Listed | ✅ Exists (M3) | ✅ OPEN |
| #39 | Replace window.location | ✅ Listed | ✅ Exists (M3) | ✅ OPEN |
| #46 | Security audit (parent) | ✅ Mentioned (closed) | ✅ Exists (M3) | ✅ CLOSED |
| #85 | OWASP Top 10 | ❌ Shows [ ] | ✅ Exists (M3) | ❌ Actually CLOSED |
| #86 | LGPD compliance | ✅ Listed | ✅ Exists (M3) | ✅ OPEN |
| #87 | Implement remediations | ✅ Listed | ✅ Exists (M3) | ✅ OPEN |

**M3 Summary:**
- ROADMAP claims: 10 issues (3 closed, 7 open)
- GitHub reality: 10 issues (4 closed, 6 open)
- **ISSUE:** #17 checkbox wrong, #85 checkbox wrong

---

## M4: REFACTORING & PERFORMANCE

| Issue # | Title | ROADMAP | GitHub | State Match |
|---------|-------|---------|--------|-------------|
| #25 | Extract DISCLAIMER | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #26 | Replace 'any' orchestrator | ❌ Shows [ ] | ✅ Exists (M4) | ❌ Actually CLOSED |
| #28 | Break generateSection | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #29 | Fix localStorage duplication | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #30 | useMemo Dashboard | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #31 | useMemo ETPs | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #32 | Divide ETPEditor | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #33 | Move SECTION_TEMPLATES | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #35 | Replace console.error | ⚠️ Listed in M4 | ❌ Actually in M5 | MILESTONE MISMATCH |
| #41 | Replace 'any' auth | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #47 | Load testing (parent) | ✅ Mentioned (closed) | ✅ Exists (M4) | ✅ CLOSED |
| #77 | Audit Auth module | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #78 | Audit ETPs module | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #79 | Audit Sections module | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #80 | Audit Orchestrator | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #81 | Audit User module | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #88 | Setup load testing | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #89 | Execute load tests | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #90 | Analyze bottlenecks | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |
| #91 | Implement optimizations | ✅ Listed | ✅ Exists (M4) | ✅ OPEN |

**M4 Summary:**
- ROADMAP claims: 20 issues (1 closed, 19 open)
- GitHub reality: 19 issues (2 closed, 17 open)
- **ISSUE:** #35 is in M5, not M4; #26 checkbox wrong

---

## M5: E2E TESTING & DOCUMENTATION

| Issue # | Title | ROADMAP | GitHub | State |
|---------|-------|---------|--------|-------|
| #22 | Configure Puppeteer | ✅ Listed | ✅ Exists (M5) | OPEN |
| #23 | E2E critical flow | ✅ Listed | ✅ Exists (M5) | OPEN |
| #24 | Axe-core accessibility | ✅ Listed | ✅ Exists (M5) | OPEN |
| #34 | JSDoc orchestrator | ✅ Listed | ✅ Exists (M5) | OPEN |
| #35 | Replace console.error | ❌ Listed in M4 | ✅ Exists (M5) | OPEN |
| #36 | Update README | ✅ Listed | ✅ Exists (M5) | OPEN |
| #37 | Document test strategy | ✅ Listed | ✅ Exists (M5) | OPEN |
| #48 | UAT (parent) | ✅ Mentioned (closed) | ✅ Exists (M5) | CLOSED |
| #82 | Test sections 1-4 | ✅ Listed | ✅ Exists (M5) | OPEN |
| #83 | Test sections 5-8 | ✅ Listed | ✅ Exists (M5) | OPEN |
| #84 | Test sections 9-13 | ✅ Listed | ✅ Exists (M5) | OPEN |
| #92 | Recruit testers | ✅ Listed | ✅ Exists (M5) | OPEN |
| #93 | Plan UAT sessions | ✅ Listed | ✅ Exists (M5) | OPEN |
| #94 | Execute UAT | ✅ Listed | ✅ Exists (M5) | OPEN |
| #95 | UAT report | ✅ Listed | ✅ Exists (M5) | OPEN |

**M5 Summary:**
- ROADMAP claims: 12 issues (0 closed, 12 open)
- GitHub reality: 15 issues (1 closed, 14 open)
- **ISSUE:** Missing #35 from ROADMAP list, #48 (parent, closed) not counted

---

## M6: MAINTENANCE

| Issue # | Title | ROADMAP | GitHub | State |
|---------|-------|---------|--------|-------|
| #21 | Configure Dependabot | ✅ Listed | ✅ Exists (M6) | OPEN |
| #40 | Update dependencies | ✅ Listed | ✅ Exists (M6) | OPEN |

**M6 Summary:**
- ROADMAP claims: 2 issues (0 closed, 2 open)
- GitHub reality: 2 issues (0 closed, 2 open)
- ✅ **PERFECT MATCH**

---

## SUMMARY OF ALL ISSUES

**Total Issues in GitHub:** 87
**Total Issues in ROADMAP:** 82 (claimed)

**Breakdown:**
- ✅ Properly tracked: 71 issues
- ⚠️ Bundled incorrectly: 14 issues (#50-#63 as "#49-#76")
- ❌ Phantom references: 14 issues (#49, #64-#76)
- ❌ Orphaned: 2 issues (#27, #97)
- ❌ State mismatches: 3 issues (#17, #26, #85)
- ❌ Milestone mismatches: 1 issue (#35)

**Synchronization Rate:** 69% (60/87 issues perfectly synced)

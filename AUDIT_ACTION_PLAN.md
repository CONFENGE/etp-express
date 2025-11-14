# AUDIT ACTION PLAN: How to Fix ROADMAP.md

**Generated:** 2025-11-12
**Purpose:** Step-by-step instructions to synchronize ROADMAP.md with GitHub issues

---

## QUICK STATS

- **Current Synchronization:** 69% (60/87 issues properly tracked)
- **Target Synchronization:** 95%+ (after fixes)
- **Critical Issues Found:** 5 categories
- **Estimated Fix Time:** 30-45 minutes

---

## PRIORITY 1: FIX PHANTOM ISSUE REFERENCE (CRITICAL)

### Issue
ROADMAP line 33 references `#49-#76` but 14 of these issues don't exist in GitHub.

### Fix
**Find and replace in ROADMAP.md:**

**Line 33 (currently):**
```markdown
- ✅ #49-#76 - Testes unitários (auth, sections, ETPs, controllers, services)
```

**Replace with:**
```markdown
- ✅ #50-#63 - Testes unitários (auth, sections, ETPs, controllers, services)
```

### Impact
- Removes reference to 14 phantom issues
- Accurately reflects the 14 issues that actually exist (#50-#63)

---

## PRIORITY 2: UPDATE M1 COUNTS AND PROGRESS

### Changes Required

**Line 7 - Total Issues:**
```diff
- **Total de Issues:** 82 issues (51 abertas + 31 fechadas) organizadas em 6 milestones
+ **Total de Issues:** 87 issues (56 abertas + 31 fechadas) organizadas em 6 milestones
```

**Line 14 - M1 Progress Bar:**
```diff
- [M1] Foundation - Testes          ████████████░░░░░░░░ 21/35 (60%) 🔥
+ [M1] Foundation - Testes          ████████████████░░░░ 24/34 (71%) 🔥
```

**Line 21 - Total Progress:**
```diff
- TOTAL: 25/82 issues concluídas (30%)
+ TOTAL: 31/87 issues concluídas (36%)
```

**Line 28 - M1 Header:**
```diff
- ### ✅ M1: Foundation - Testes (21 fechadas de 35)
- **Status**: 60% concluído 🔥 | **Próximas**: 14 issues restantes (+5 módulos órfãos adicionados)
+ ### ✅ M1: Foundation - Testes (24 fechadas de 34)
+ **Status**: 71% concluído 🔥 | **Próximas**: 10 issues restantes
```

**Line 77 - M1 Issues Count:**
```diff
- #### Issues (35 total - 21 concluídas ✅, 14 pendentes)
+ #### Issues (34 total - 24 concluídas ✅, 10 pendentes)
```

---

## PRIORITY 3: FIX STATE MISMATCHES (3 ISSUES)

### Issue #17 - Currently shows CLOSED, actually OPEN

**Line 180:**
```diff
- - [x] #17 - Corrigir useEffect em ETPEditor.tsx (1h)
+ - [ ] #17 - Corrigir useEffect em ETPEditor.tsx (1h)
```

### Issue #26 - Currently shows OPEN, actually CLOSED

**Line 223:**
```diff
- - [ ] #26 - Substituir 'any' por interfaces em orchestrator.service.ts (3h)
+ - [x] #26 - Substituir 'any' por interfaces em orchestrator.service.ts (3h)
```

### Issue #85 - Currently shows OPEN, actually CLOSED

**Line 187:**
```diff
- - [ ] #85 - [#46a] Auditoria OWASP Top 10 (2023) (6h) 🔐 **P0**
+ - [x] #85 - [#46a] Auditoria OWASP Top 10 (2023) (6h) 🔐 **P0**
```

---

## PRIORITY 4: UPDATE MILESTONE COUNTS

### M3 - Update Progress

**Line 16:**
```diff
- [M3] Quality & Security           ████████░░░░░░░░░░░░ 3/10 (30%)
+ [M3] Quality & Security           ████████████░░░░░░░░ 4/10 (40%)
```

**Line 42:**
```diff
- ### ✅ M3: Quality & Security (3 fechadas de 10)
- **Status**: 30% concluído
+ ### ✅ M3: Quality & Security (4 fechadas de 10)
+ **Status**: 40% concluído
```

**Line 174:**
```diff
- #### Issues (10 total - 3 concluídas ✅, 7 pendentes)
+ #### Issues (10 total - 4 concluídas ✅, 6 pendentes)
```

### M4 - Update Progress

**Line 18:**
```diff
- [M4] Refactoring & Performance    ░░░░░░░░░░░░░░░░░░░░ 1/20 (5%)
+ [M4] Refactoring & Performance    ██░░░░░░░░░░░░░░░░░░ 2/19 (11%)
```

**Line 51:**
```diff
- ### ✅ M4: Refactoring & Performance (1 fechada de 20)
- **Status**: 5% iniciado
+ ### ✅ M4: Refactoring & Performance (2 fechadas de 19)
+ **Status**: 11% iniciado
```

**Line 219:**
```diff
- #### Issues (20 total - 1 concluída ✅, 19 pendentes)
+ #### Issues (19 total - 2 concluídas ✅, 17 pendentes)
```

### M2 - Clarify Issue Count

**Line 15:**
```diff
- [M2] CI/CD Pipeline               ░░░░░░░░░░░░░░░░░░░░ 0/7  (0%)
+ [M2] CI/CD Pipeline               ░░░░░░░░░░░░░░░░░░░░ 0/5  (0%)
```

**Line 135:**
```diff
- #### Issues (7 total - 0 concluídas, 7 pendentes)
+ #### Issues (5 total - 0 concluídas, 5 pendentes)
```

### M5 - Update to reflect #35 and #48

**Line 19:**
```diff
- [M5] E2E Testing & Documentation  ░░░░░░░░░░░░░░░░░░░░ 0/12 (0%)
+ [M5] E2E Testing & Documentation  ██░░░░░░░░░░░░░░░░░░ 1/15 (7%)
```

**Line 284:**
```diff
- #### Issues (12 total - 0 concluídas, 12 pendentes)
+ #### Issues (15 total - 1 concluída, 14 pendentes)
```

---

## PRIORITY 5: MOVE ISSUE #35 FROM M4 TO M5

### Remove from M4 Section

**Line 235 - Remove this line:**
```diff
- - [ ] #35 - Substituir console.error por logging service (4h)
```

### Add to M5 Section (already there, just verify)

**Line 294 - Verify this exists:**
```markdown
- [ ] #34 - Adicionar JSDoc completo em OrchestratorService e agentes (4h)
```

No change needed - #35 is already correctly listed in M5 on line 295.

---

## PRIORITY 6: HANDLE ORPHAN ISSUES

### Issue #27 (Duplicate of #41)

**Action:** Close issue #27 on GitHub with comment:
```bash
gh issue close 27 --comment "Closing as duplicate of #41. Both issues address replacing 'any' with typed interfaces in auth.service.ts."
```

### Issue #97 (Documentation Meta-Issue)

**Action:** Either:

**Option A - Add to M5:**
```bash
gh issue edit 97 --milestone "M5: E2E Testing & Documentation"
```

**Option B - Mark as non-roadmap:**
Add label "administrative" and close:
```bash
gh issue edit 97 --add-label "administrative"
gh issue close 97 --comment "Administrative meta-issue for documentation sync. Work tracked in individual issues."
```

**Recommended:** Option B (close as administrative)

---

## PRIORITY 7: ADD EXPLICIT M1 ISSUE LIST

### Current Problem
Issues #50-#63 are bundled in line 33 and not individually listed in M1 section.

### Fix
**Add to M1 section after line 101 (after #103):**

```markdown

**Backend - Completed Issues (14 issues) - ✅ CONCLUÍDAS**
- [x] #50 - Fix puppeteer security vulnerabilities (2h)
- [x] #51 - Resolve TypeScript type errors (2h)
- [x] #52 - Configure ESLint with TypeScript rules (2h)
- [x] #53 - Add JSDoc baseline to AppService (1h)
- [x] #54 - Increase test coverage to 70% target (8h)
- [x] #55 - Write unit tests for auth module (4h)
- [x] #56 - Write unit tests for ETPs module (4h)
- [x] #57 - Write unit tests for sections module (4h)
- [x] #60 - Setup ESLint + Prettier configuration (2h)
- [x] #61 - Fix npm audit vulnerabilities (2h)
- [x] #62 - Add JSDoc documentation standards (2h)
- [x] #63 - Expand test coverage to 70% backend target (6h)

**Backend - Pending Issues (2 issues)**
- [ ] #58 - Write unit tests for remaining controllers (4h)
- [ ] #59 - Write unit tests for remaining services (4h)

**Validation Issues (2 issues) - ✅ CONCLUÍDAS**
- [x] #42 - Auditar funcionalidades implementadas vs ARCHITECTURE.md (8h)
- [x] #43 - Testar geração de conteúdo das 13 seções do ETP (6h)
```

This makes all 34 M1 issues explicitly visible in the ROADMAP.

---

## VERIFICATION CHECKLIST

After making all changes, verify:

### Counts Match
- [ ] Total issues: 87 (56 open + 31 closed)
- [ ] M1: 34 issues (24 closed, 10 open) = 71% complete
- [ ] M2: 5 issues (0 closed, 5 open) = 0% complete
- [ ] M3: 10 issues (4 closed, 6 open) = 40% complete
- [ ] M4: 19 issues (2 closed, 17 open) = 11% complete
- [ ] M5: 15 issues (1 closed, 14 open) = 7% complete
- [ ] M6: 2 issues (0 closed, 2 open) = 0% complete
- [ ] Orphans: 2 issues (#27, #97) - should be 0 after cleanup

### State Matches
- [ ] #17 shows `[ ]` (OPEN)
- [ ] #26 shows `[x]` (CLOSED)
- [ ] #85 shows `[x]` (CLOSED)

### References Fixed
- [ ] Line 33 says `#50-#63` (not `#49-#76`)
- [ ] All M1 issues (#50-#63) listed individually
- [ ] #35 only appears in M5 (not M4)

### Progress Bars Updated
- [ ] M1: 71% (24/34)
- [ ] M3: 40% (4/10)
- [ ] M4: 11% (2/19)
- [ ] M5: 7% (1/15)
- [ ] Total: 36% (31/87)

---

## EXPECTED OUTCOME

After completing all fixes:

**Before:**
- Synchronization: 69%
- Phantom issues: 14
- State mismatches: 3
- Milestone mismatches: 1
- Orphan issues: 2

**After:**
- Synchronization: 95%+
- Phantom issues: 0
- State mismatches: 0
- Milestone mismatches: 0
- Orphan issues: 0

**Time to complete:** 30-45 minutes of careful editing

---

## AUTOMATED FIX SCRIPT (Optional)

If you want to automate some of these fixes:

```bash
# Close duplicate issue #27
gh issue close 27 --comment "Duplicate of #41"

# Close administrative issue #97
gh issue close 97 --comment "Administrative meta-issue. Work tracked in individual issues."

# Verify milestone counts
echo "M1 issues:" && gh issue list --milestone "M1: Foundation - Testes" --state all --json number | jq length
echo "M2 issues:" && gh issue list --milestone "M2: CI/CD Pipeline" --state all --json number | jq length
echo "M3 issues:" && gh issue list --milestone "M3: Quality & Security" --state all --json number | jq length
echo "M4 issues:" && gh issue list --milestone "M4: Refactoring & Performance" --state all --json number | jq length
echo "M5 issues:" && gh issue list --milestone "M5: E2E Testing & Documentation" --state all --json number | jq length
echo "M6 issues:" && gh issue list --milestone "M6: Maintenance (Recurring)" --state all --json number | jq length
```

---

**End of Action Plan**

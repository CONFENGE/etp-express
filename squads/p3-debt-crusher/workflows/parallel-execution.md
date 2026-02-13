# Parallel Execution Workflow - P3 Debt Crusher

## Workflow Definition

```yaml
workflow: parallel-execution
description: Execute 4 fronts simultaneously with migration sequencing
orchestrator: "@squad-lead"
estimated_time: "10h elapsed"
```

## Phase 1: Parallel Development (All Fronts Start)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: PARALLEL DEV                        │
├────────────┬────────────┬────────────────┬──────────────────────┤
│    F1      │    F2      │      F3        │        F4            │
│  Schema    │  Tenancy   │   Hygiene      │   Accessibility      │
│  @schemer  │  @tenant   │   @janitor     │   @ally              │
├────────────┼────────────┼────────────────┼──────────────────────┤
│ DB-05      │ DB-NEW-07  │ SYS-06         │ npm install axe-core │
│ DB-06      │ DB-NEW-08  │ SYS-07         │ Create helpers.ts    │
│ DB-07      │ DB-P02     │ SYS-08         │ Create config.ts     │
│            │            │ SYS-09         │                      │
├────────────┼────────────┼────────────────┼──────────────────────┤
│ ~4h code   │ ~4h code   │ ~9h code+docs  │ ~1h setup            │
└────────────┴────────────┴────────────────┴──────────────────────┘
```

## Phase 2: Migration Sequencing (F1 → F2)

```
┌─────────────────────────────────────────────────────────────────┐
│                 PHASE 2: MIGRATION SEQUENCE                     │
├─────────────────────┬───────────────────────────────────────────┤
│  F1: Generate Mig   │  F2: WAIT for F1 migration               │
│  @migrator validates │  → then generate F2 migration            │
│  ~1h                 │  @migrator validates, ~1h                │
├─────────────────────┴───────────────────────────────────────────┤
│  F3: Continues independently (no migrations)                    │
│  F4: Implements tests for ~30 pages (in parallel)              │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 3: PR Creation (4 Independent PRs)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: PR CREATION                         │
├────────────┬────────────┬────────────────┬──────────────────────┤
│ PR: F1     │ PR: F2     │ PR: F3         │ PR: F4               │
│ td009-1-   │ td009-2-   │ td009-3-       │ td009-4-             │
│ schema     │ tenancy    │ hygiene        │ accessibility        │
└────────────┴────────────┴────────────────┴──────────────────────┘
```

## Phase 4: Cross-QA Review

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 4: CROSS-QA                            │
│                    @guardian reviews all 4 PRs                   │
├─────────────────────────────────────────────────────────────────┤
│ - npm run lint (all changes)                                    │
│ - npm run typecheck (all changes)                              │
│ - npm test (full suite)                                        │
│ - npm run test:e2e (full suite)                                │
│ - Cross-front conflict check                                   │
│ - Acceptance criteria validation                                │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 5: Merge Sequence (STRICT ORDER)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 5: MERGE (strict order)                │
├─────┬───────────────────────────────────────────────────────────┤
│  1  │ Merge F3 (Backend Hygiene) - No migrations, lowest risk  │
├─────┼───────────────────────────────────────────────────────────┤
│  2  │ Merge F1 (Schema Cleanup) - First migration batch        │
├─────┼───────────────────────────────────────────────────────────┤
│  3  │ Merge F2 (Multi-tenancy) - Second migration batch        │
├─────┼───────────────────────────────────────────────────────────┤
│  4  │ Merge F4 (Accessibility) - Independent, additive only    │
└─────┴───────────────────────────────────────────────────────────┘
```

## Phase 6: Post-Merge Validation

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 6: POST-MERGE                          │
├─────────────────────────────────────────────────────────────────┤
│ - Run all migrations on clean DB                               │
│ - Full regression suite                                        │
│ - Update TD-009 story: all checkboxes ✅                       │
│ - Update ROADMAP.md: TD-009 → ✅ Done                          │
│ - Update technical-debt-assessment.md                          │
└─────────────────────────────────────────────────────────────────┘
```

## Rollback Plan

If any front fails post-merge:
1. **F4**: Delete test files (no schema impact)
2. **F2**: `npm run migration:revert` (reverts F2 migration)
3. **F1**: `npm run migration:revert` (reverts F1 migration)
4. **F3**: Git revert commit (no schema impact)

All migrations have reversible `down()` methods.

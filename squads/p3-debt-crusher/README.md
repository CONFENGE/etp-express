# 🏗️ P3 Debt Crusher Squad

> Squad de implementação simultânea das 4 sub-stories TD-009 (P3 Code Quality)

## Overview

| Metric | Value |
|--------|-------|
| **Stories** | TD-009.1, TD-009.2, TD-009.3, TD-009.4 |
| **Priority** | P3 |
| **Total Effort** | 25h (sequential) |
| **Estimated Elapsed** | ~10h (parallel) |
| **Speedup** | 2.5x |
| **Debts Resolved** | 12 |
| **PRs** | 4 (one per front) |
| **Agents** | 7 |

## Squad Roster

| Agent | Role | Front | Focus |
|-------|------|-------|-------|
| **Maestro** (squad-lead) | Orchestrator | ALL | Coordination, blockers, sequencing |
| **Schemer** (schema-dev) | Dev | F1 | DB schema cleanup (DB-05, DB-06, DB-07) |
| **Tenant** (tenancy-dev) | Dev | F2 | Multi-tenancy & relations (DB-NEW-07, DB-NEW-08, DB-P02) |
| **Janitor** (hygiene-dev) | Dev | F3 | Backend hygiene (SYS-06, SYS-07, SYS-08, SYS-09) |
| **Ally** (a11y-dev) | Dev | F4 | Accessibility tests (FE-10) |
| **Guardian** (cross-qa) | QA | ALL | Cross-front review, regression |
| **Migrator** (migration-ops) | DevOps | F1+F2 | Migration sequencing |

## Execution Fronts

### F1: Database Schema Cleanup (6h) - @schemer
- **DB-05**: Remove duplicate `versao`/`currentVersion` in TermoReferencia
- **DB-06**: Add `type: 'uuid'` to Etp.created_by
- **DB-07**: Type ContratoSyncLog.resolution (replace `any`)
- **Migration**: Schema changes + data copy

### F2: Multi-tenancy & Relations (6h) - @tenant
- **DB-NEW-07**: Add `organizationId` to Medicao/Ocorrencia
- **DB-NEW-08**: Add inverse `@OneToMany` in Contrato
- **DB-P02**: GIN indexes on 3 JSONB columns
- **Migration**: Columns + backfill + indexes (AFTER F1 migration)

### F3: Backend System Hygiene (9h) - @janitor
- **SYS-06**: Refactor body parser to native NestJS
- **SYS-07**: Document guards & auth flow
- **SYS-08**: Centralize feature flags defaults
- **SYS-09**: Evaluate chaos module placement (ADR)

### F4: Accessibility Test Coverage (4h) - @ally
- **FE-10**: Install @axe-core/playwright
- Create `checkA11y()` helper
- Test ~30 pages for WCAG 2.1 AA
- CI integration (warning mode)

## Dependencies & Constraints

```
F1 ──migration──→ F2 (F2 migration waits for F1)
F3 ──────────────→ independent (no migrations)
F4 ──────────────→ independent (new files only)
```

## Merge Order (STRICT)

1. **F3** - No migrations, lowest risk
2. **F1** - First migration batch
3. **F2** - Second migration batch (depends on F1 numbering)
4. **F4** - Independent, additive only

## Quick Start

```bash
# Activate squad
@squad-lead  # or @maestro

# Check status
*status

# Start individual fronts
@schema-dev   # F1
@tenancy-dev  # F2
@hygiene-dev  # F3
@a11y-dev     # F4

# Cross-QA
@cross-qa *review-front F1
```

## Quality Gates

See `checklists/quality-gate.md` for complete quality gate checklist.

Key gates:
- Pre-PR: lint + typecheck + tests per front
- Migration: reversible up/down + data integrity
- Cross-QA: integration + regression across all fronts
- Post-merge: staging validation + story updates

## Files Created

```
squads/p3-debt-crusher/
├── squad.yaml                              # Manifest
├── README.md                               # This file
├── config/                                 # Config references
├── agents/
│   ├── squad-lead.md                       # Maestro - Orchestrator
│   ├── schema-dev.md                       # Schemer - F1
│   ├── tenancy-dev.md                      # Tenant - F2
│   ├── hygiene-dev.md                      # Janitor - F3
│   ├── a11y-dev.md                         # Ally - F4
│   ├── cross-qa.md                         # Guardian - QA
│   └── migration-ops.md                    # Migrator - DevOps
├── tasks/
│   ├── f1-cleanup-termo-referencia.md      # DB-05
│   ├── f1-fix-etp-created-by.md            # DB-06
│   ├── f1-type-contrato-sync-log.md        # DB-07
│   ├── f1-generate-migration.md            # F1 migration
│   ├── f2-add-org-id-medicao-ocorrencia.md # DB-NEW-07
│   ├── f2-add-contrato-inverse-relations.md# DB-NEW-08
│   ├── f2-create-gin-indexes.md            # DB-P02
│   ├── f2-generate-migration.md            # F2 migration
│   ├── f3-refactor-body-parser.md          # SYS-06
│   ├── f3-document-guards-auth.md          # SYS-07
│   ├── f3-centralize-feature-flags.md      # SYS-08
│   ├── f3-evaluate-chaos-module.md         # SYS-09
│   ├── f4-setup-axe-core.md               # FE-10 setup
│   ├── f4-implement-a11y-tests.md          # FE-10 tests
│   ├── f4-integrate-a11y-ci.md            # FE-10 CI
│   ├── qa-cross-validate.md               # Cross-QA
│   └── ops-migration-sequence.md          # Migration ops
├── workflows/
│   └── parallel-execution.md              # Orchestration workflow
└── checklists/
    └── quality-gate.md                    # Quality gates
```

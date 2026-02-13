# Epic: Technical Debt Resolution - ETP Express

## Overview

- **51 technical debts** across System/Architecture (12), Database (31), Frontend/UX (8)
- **~130h estimated effort** (original) | **~76.5h remaining** (as of 2026-02-12)
- **4 priority tiers**: P1 Critical, P2 High, P3 Medium, P4 Low/Backlog
- **10 stories** (TD-001 to TD-010), with TD-009 and TD-010 broken into **11 atomic sub-stories**
- **8/10 stories resolved** (TD-001 through TD-008) — all P1/P2 cleared
- Source: `docs/prd/technical-debt-assessment.md`

## Prerequisites

~~Before starting Sprint 1, collect baseline metrics (see assessment Section 10):~~
**DONE** — Baseline collected. Sprint 1-4 (TD-001 to TD-008) completed.

---

## Stories Index

### P1 - Critical (Sprint 1-2) — ALL RESOLVED

| Story | Title | Status | PR | Debts Resolved |
|-------|-------|--------|-----|----------------|
| TD-001 | Security: Password & API Key Hardening | **DONE** | #1724 | DB-S01, DB-S02 |
| TD-002 | Security: Multi-tenancy Isolation Gaps | **DONE** | #1727 | DB-09, DB-NEW-01, DB-NEW-02, DB-NEW-06, DB-S03 |
| TD-003 | Performance: Eager Loading Removal | **DONE** | #1730 | SYS-01, DB-01, DB-NEW-03, DB-NEW-04 |
| TD-004 | Performance: Missing Database Indexes | **DONE** | #1730 | DB-IDX-01 |
| TD-005 | Data Integrity: Monetary Type Standardization | **DONE** | #1732 | SYS-05, DB-04 |
| TD-006 | Frontend: Password Validation Alignment | **DONE** | #1730 | FE-01, FE-09 |

### P2 - High (Sprint 3-4) — ALL RESOLVED

| Story | Title | Status | PR | Debts Resolved |
|-------|-------|--------|-----|----------------|
| TD-007 | Frontend: Accessibility & i18n Fixes | **DONE** | #1722 | FE-08, FE-04 |
| TD-008 | Database: Schema Improvements & LGPD Compliance | **DONE (95%)** | #1721/1723/1732 | DB-02, DB-S06 |

### P3 - Medium (Sprint 5-8) — TD-009 Sub-stories

| Story | Title | Area | Effort | Debts Addressed |
|-------|-------|------|--------|-----------------|
| TD-009.1 | Database Schema Cleanup | Database | 6h | DB-05, DB-06, DB-07 |
| TD-009.2 | Multi-tenancy & Relations Completion | Database | 6h | DB-NEW-07, DB-NEW-08, DB-P02 |
| TD-009.3 | Backend System Hygiene | Backend | 9h | SYS-06, SYS-07, SYS-08, SYS-09 |
| TD-009.4 | Accessibility Test Coverage (axe-core) | Frontend/QA | 4h | FE-10 |

### P4 - Low (Backlog) — TD-010 Sub-stories

| Story | Title | Area | Effort | Debts Addressed |
|-------|-------|------|--------|-----------------|
| TD-010.1 | Entity Scan & Migration Infrastructure | Backend/Infra | 6-8h | SYS-02, SYS-03 |
| TD-010.2 | TypeScript Strictness & Cleanup | Config | 2.5h | SYS-10, SYS-11, SYS-12 |
| TD-010.3 | Database Convention Fixes | Database | 7.5h | DB-03, DB-08, DB-10, DB-11, DB-NEW-05, DB-S04 |
| TD-010.4 | Full-Text & Vector Search Performance | Database/Perf | 5h | DB-P05, DB-P06 |
| TD-010.5 | Database Partitioning Strategy | Database/Infra | 24h | DB-P03, DB-P07 |
| TD-010.6 | Monorepo Tooling Evaluation | DevOps | 16h+ | SYS-04 |
| TD-010.7 | Static API Documentation (Redoc) | API/Frontend | 4h | FE-05 |

---

## Dependencies

```
RESOLVED STORIES (no longer blocking):
TD-001 ✅  TD-002 ✅  TD-003 ✅  TD-004 ✅  TD-005 ✅  TD-006 ✅  TD-007 ✅  TD-008 ✅

PENDING SUB-STORIES:

TD-009.1 (Schema Cleanup) ──────────────────── No dependencies
TD-009.2 (Multi-tenancy Completion) ─────────── No dependencies
TD-009.3 (System Hygiene) ──────────────────── No dependencies
TD-009.4 (axe-core Tests) ──────────────────── No dependencies

TD-010.1 (Entity Scan) ─────────────────────── No dependencies for SYS-02
         (Migration Squash) ─────────────────── SYS-03 MUST BE LAST item in entire epic
TD-010.2 (TS Strictness) ───────────────────── No dependencies
TD-010.3 (DB Conventions) ──────────────────── No dependencies
TD-010.4 (Search Performance) ──────────────── No dependencies
TD-010.5 (Partitioning) ────────────────────── CONDITIONAL: only when volume > 5M rows
TD-010.6 (Monorepo Tooling) ────────────────── CONDITIONAL: evaluate when CI > 10min
TD-010.7 (API Docs) ────────────────────────── No dependencies
```

### Key Constraints

1. **TD-010.1** SYS-03 (migration squash) must be the very LAST item resolved due to high risk of breaking changes
2. **TD-010.5** (partitioning) is conditional — implement only when data volume justifies (5M+ rows)
3. **TD-010.6** (monorepo tooling) is conditional — evaluate when CI time becomes bottleneck
4. All TD-009.x sub-stories can run in parallel (no interdependencies)
5. All TD-010.x sub-stories can run independently except TD-010.1/SYS-03

---

## Execution Recommendation

### Sprint 5 (can start immediately)
Execute in parallel:
- TD-009.1 (Database Schema Cleanup) — 6h
- TD-009.3 (Backend System Hygiene) — 9h
- TD-010.2 (TypeScript Strictness) — 2.5h

### Sprint 6
Execute in parallel:
- TD-009.2 (Multi-tenancy Relations) — 6h
- TD-009.4 (axe-core Tests) — 4h
- TD-010.3 (Database Conventions) — 7.5h

### Sprint 7+
Pick from backlog based on capacity:
- TD-010.4 (Search Performance) — 5h
- TD-010.7 (API Docs) — 4h
- TD-010.1/SYS-02 (Entity Scan) — 2-4h

### Backlog (conditional)
- TD-010.5 (Partitioning) — when volume justifies
- TD-010.6 (Monorepo) — when CI becomes bottleneck
- TD-010.1/SYS-03 (Migration Squash) — LAST item

---

## Definition of Done

- All acceptance criteria met for each story/sub-story
- Tests added/updated covering changed functionality
- No regression in existing test suite (`npm test` passes)
- Security scan passes (`npm audit` shows no new vulnerabilities)
- Code review approved
- ROADMAP.md updated to reflect progress
- Technical debt assessment document updated with resolution status

---

## Progress Summary

| Metric | Original (2026-01-29) | Current (2026-02-12) |
|--------|----------------------|---------------------|
| Total debts | 51 | 51 |
| Resolved | 0 | ~35 |
| Pending | 51 | ~16 |
| P1/P2 blockers | 17 | **0** |
| Effort remaining | ~130h | ~76.5h |
| Stories complete | 0/10 | 8/10 |
| Sub-stories created | - | 11 (4 for TD-009 + 7 for TD-010) |

---

*Epic atualizado em 2026-02-12 por @pm (Morgan) — Sub-stories detalhadas criadas para TD-009 e TD-010*
*Assessment original de 2026-01-29 por @architect (Aria) — AIOS v3.10.0*

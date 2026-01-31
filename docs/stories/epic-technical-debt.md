# Epic: Technical Debt Resolution - ETP Express

## Overview

- **51 technical debts** across System/Architecture (12), Database (31), Frontend/UX (8)
- **~130h estimated effort**
- **4 priority tiers**: P1 Critical, P2 High, P3 Medium, P4 Low/Backlog
- **10 stories** grouping related debts logically
- Source: `docs/prd/technical-debt-assessment.md`

## Prerequisites

Before starting Sprint 1, collect baseline metrics (see assessment Section 10):
- Test coverage (unit + E2E)
- P95 latency for main routes
- Average payload size for listing endpoints
- Queries per request count
- npm audit vulnerabilities
- Missing indexes via `pg_stat_user_indexes`

---

## Stories Index

### P1 - Critical (Sprint 1-2)

| Story | Title | Area | Effort | Debts Addressed |
|-------|-------|------|--------|-----------------|
| TD-001 | Security: Password & API Key Hardening | Database/Security | 7h | DB-S01, DB-S02 |
| TD-002 | Security: Multi-tenancy Isolation Gaps | Database/Security | 8h | DB-09, DB-NEW-01, DB-NEW-02, DB-NEW-06, DB-S03 |
| TD-003 | Performance: Eager Loading Removal | System/Database | 6h | SYS-01, DB-01, DB-NEW-03, DB-NEW-04 |
| TD-004 | Performance: Missing Database Indexes | Database | 2-3h | DB-IDX-01 |
| TD-005 | Data Integrity: Monetary Type Standardization | System/Database | 8-12h | SYS-05, DB-04 |
| TD-006 | Frontend: Password Validation Alignment | Frontend | 3h | FE-01, FE-09 |

### P2 - High (Sprint 3-4)

| Story | Title | Area | Effort | Debts Addressed |
|-------|-------|------|--------|-----------------|
| TD-007 | Frontend: Accessibility & i18n Fixes | Frontend | 4h | FE-02, FE-08 |
| TD-008 | Database: Schema Improvements & LGPD Compliance | Database | 16h | DB-02, DB-P04, DB-S06 |

### P3 - Medium (Sprint 5-8)

| Story | Title | Area | Effort | Debts Addressed |
|-------|-------|------|--------|-----------------|
| TD-009 | Code Quality: Schema Cleanup & System Hygiene | System/Database | 21.5h | DB-05, DB-06, DB-07, DB-NEW-07, DB-NEW-08, DB-P02, SYS-06, SYS-07, SYS-08, SYS-09, FE-04, FE-10 |

### P4 - Low (Backlog)

| Story | Title | Area | Effort | Debts Addressed |
|-------|-------|------|--------|-----------------|
| TD-010 | Backlog: Infrastructure & Long-term Improvements | All | 55h+ | SYS-02, SYS-03, SYS-04, SYS-10, SYS-11, SYS-12, DB-03, DB-08, DB-10, DB-11, DB-NEW-05, DB-S04, DB-P03, DB-P05, DB-P06, DB-P07, FE-05 |

---

## Dependencies

```
TD-006 (Password Validation) ─────────────────────────────── No dependencies
TD-001 (Password/API Key) ────────────────────────────────── No dependencies
TD-004 (Missing Indexes) ─────────────────────────────────── No dependencies
                │
TD-003 (Eager Loading) ───────────────────────────────────── Can run parallel to TD-004
                │
                ├──► TD-005 (Monetary Types) ──────────────── Depends on TD-003
                │
                └──► TD-008 (DB-P04 pool) ─────────────────── Depends on TD-003

TD-002 (Multi-tenancy) ───────────────────────────────────── No dependencies
                │
                └──► TD-008 (DB-02 polymorphic) ───────────── Depends on TD-002 (DB-NEW-06)

TD-007 (Accessibility) ───────────────────────────────────── No dependencies
TD-009 (Code Quality) ────────────────────────────────────── No dependencies
TD-010 (Backlog) ──────────────────────────────────────────── SYS-03 must be LAST
```

### Key Constraints

1. **TD-005** (monetary types) must wait for **TD-003** (eager loading) to stabilize entity relations
2. **TD-008** (DB-02 polymorphic refactor) must wait for **TD-002** (DB-NEW-06 adds organizationId to DocumentoFiscalizacao)
3. **TD-008** (DB-P04 pool tuning) should wait for **TD-003** (eager loading removal reduces query load)
4. **TD-010** SYS-03 (migration squash) must be the very last item resolved due to high risk of breaking changes
5. **Baseline metrics** must be collected before any story begins

---

## Definition of Done

- All acceptance criteria met for each story
- Tests added/updated covering changed functionality
- No regression in existing test suite (`npm test` passes)
- Security scan passes (`npm audit` shows no new vulnerabilities)
- Code review approved
- ROADMAP.md updated to reflect progress
- Technical debt assessment document updated with resolution status

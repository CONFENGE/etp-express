# Technical Debt Executive Report - ETP Express

**Date:** 2026-01-29
**Prepared by:** Atlas (@analyst) - AIOS v3.10.0
**Source:** Technical Debt Assessment (consolidated, peer-reviewed by 4 specialists)

---

## Executive Summary

ETP Express carries **51 technical debts** requiring an estimated **~130 hours** of engineering effort across three areas: backend/architecture (12), database (31), and frontend/UX (8).

**10 debts are critical**, including security vulnerabilities that expose user passwords, API keys in plain text, and cross-tenant data leakage. Several of these debts create compliance risk under LGPD and Law 14.133/2021 (Brazil's public procurement law).

If left unaddressed, these debts will result in increasing incident costs, slower feature delivery, and growing regulatory exposure. The recommended approach is to dedicate **20% of sprint capacity** over 8 sprints, starting with security fixes that can be completed in the first two weeks.

---

## Business Risk Analysis

### What Happens If We Do Nothing

| Risk Category | Specific Threat | Business Impact |
|---------------|----------------|-----------------|
| **Security** | User password hashes returned in every API response (DB-S01) | A single data breach exposes all user credentials. Reputational and legal liability. |
| **Security** | API keys stored in plain text (DB-S02) | Any database breach gives attackers immediate, usable API keys -- no cracking needed. |
| **Security** | Cross-tenant data leak in export metadata (DB-09) | Organization A can potentially access Organization B's exported files (S3 URLs). Direct contract/procurement data exposure. |
| **Compliance** | IP addresses stored in plain text linked to user IDs (DB-S06) | Violates LGPD Art. 12 -- IP + userId constitutes identifiable personal data. Fines up to 2% of revenue. |
| **Compliance** | Incomplete multi-tenancy (6 entities lack organization isolation) | Public procurement data from one government entity could leak to another, violating Law 14.133/2021 confidentiality requirements. |
| **Operational** | Cascading eager loading generates 10+ JOINs per query | API response times degrade as data grows. Current pool limit (20 connections) will saturate, causing outages. |
| **Productivity** | Inconsistent data types, duplicated fields, missing indexes | Developers spend extra time debugging edge cases. New features take longer to ship. |

### Risk Severity Matrix

| | Low Likelihood | Medium Likelihood | High Likelihood |
|---|---|---|---|
| **High Impact** | Migration squash failure | Cross-tenant data leak | Password/API key exposure in breach |
| **Medium Impact** | Partition needs (future) | Performance degradation under load | Developer productivity loss |
| **Low Impact** | -- | TypeScript strict mode gaps | Frontend validation mismatch |

---

## Cost-Benefit Analysis

### Cost of Inaction (Annual Estimate)

| Cost Driver | Estimated Annual Cost |
|-------------|----------------------|
| Security incident (data breach, probability-weighted) | R$ 150,000 - 500,000 |
| LGPD non-compliance fine (if audited) | Up to 2% of gross revenue |
| Developer productivity loss (extra debugging, workarounds) | ~15% slower feature delivery = ~R$ 80,000 in lost capacity |
| Performance-related customer complaints / churn | R$ 30,000 - 100,000 |
| **Total estimated annual risk exposure** | **R$ 260,000 - 680,000+** |

### Investment Required

| Sprint Block | Focus | Hours | Approx. Cost (at R$ 150/h) |
|-------------|-------|-------|---------------------------|
| Sprint 1-2 | Critical security + performance | ~30h | R$ 4,500 |
| Sprint 3-4 | Multi-tenancy + reliability | ~25h | R$ 3,750 |
| Sprint 5-8 | Maintainability + cleanup | ~50h | R$ 7,500 |
| Backlog | Low-priority improvements | ~25h | R$ 3,750 |
| **Total** | | **~130h** | **R$ 19,500** |

### ROI Projection

- **Investment:** ~R$ 19,500 (one-time)
- **Risk reduction:** R$ 260,000 - 680,000/year in avoided costs
- **Payback period:** Less than 1 month
- **Additional benefits:** Faster feature delivery, improved developer morale, audit readiness

---

## Priority Roadmap (Business View)

### P1 -- CRITICAL (Sprint 1-2, weeks 1-4)

| # | What We Fix | Business Risk Mitigated | Hours |
|---|------------|------------------------|-------|
| 1 | Password field exposure (DB-S01) | Stops returning password hashes in every API call | 3h |
| 2 | API key plain text storage (DB-S02) | Eliminates instant credential theft in a breach | 4h |
| 3 | Cross-tenant export data leak (DB-09) | Prevents Organization A from seeing Organization B's files | 1h |
| 4 | Password validation mismatch (FE-01/FE-09) | Users can no longer set weak passwords that bypass backend rules | 2h |
| 5 | Cascading database queries (SYS-01/DB-01) | Reduces API response time and prevents connection pool exhaustion | 6h |
| 6 | Missing database indexes (DB-IDX-01) | Speeds up all listing/filtering operations across the platform | 3h |
| 7 | Inconsistent monetary data types (DB-04/SYS-05) | Eliminates rounding errors in contract values and measurements | 12h |

**Subtotal: ~31h | Key outcome: Security vulnerabilities closed, core performance improved**

### P2 -- HIGH (Sprint 3-4, weeks 5-8)

| # | What We Fix | Business Risk Mitigated | Hours |
|---|------------|------------------------|-------|
| 8 | Multi-tenancy gaps in 4 entities | Complete tenant isolation for all procurement data | 4h |
| 9 | ContractPrice tenant isolation | Prevents price data leakage between organizations | 2h |
| 10 | IP address LGPD compliance (DB-S06) | Removes identifiable personal data exposure; audit-ready | 4h |
| 11 | Accessibility labels in Portuguese (FE-08) | WCAG 3.1.1 compliance for government accessibility requirements | 2h |
| 12 | Polymorphic relationship refactor (DB-02) | Data integrity for inspection documents | 8h |
| 13 | Connection pool tuning (DB-P04) | Prevents outages under concurrent load | 1h |
| 14 | Pagination API consistency (FE-02) | Consistent developer experience, fewer frontend bugs | 2h |

**Subtotal: ~23h | Key outcome: Full compliance readiness, reliability improved**

### P3 -- MEDIUM (Sprint 5-8, weeks 9-16)

| What We Fix | Hours |
|------------|-------|
| Field deduplication, type safety, code cleanup (7 items) | ~12h |
| JSONB index optimization | 2h |
| Architecture hygiene (feature flags, guards, chaos module) | 9h |
| Accessibility testing coverage (axe-core) | 4h |
| SkipLink translation | 0.5h |

**Subtotal: ~27.5h | Key outcome: Maintainability and developer velocity improved**

### P4 -- LOW (Backlog, as capacity allows)

| What We Fix | Hours |
|------------|-------|
| Migration consolidation (53 -> baseline) | 4h |
| Entity scan modularization | 4h |
| Monorepo tooling (Turborepo/Nx) | 16h+ |
| Full-text search, vector indexes, table partitioning | 29h |
| Minor TypeScript/config cleanups | 2.5h |
| Static API documentation (Redoc) | 4h |

**Subtotal: ~59.5h | Key outcome: Future scalability and DX improvements**

---

## Key Metrics and KPIs

### Before/After Targets

| Metric | Current (Baseline TBD) | Target After Remediation |
|--------|----------------------|--------------------------|
| Security score (password/key exposure) | Failing | Zero plain-text secrets; `select: false` on all sensitive fields |
| API response time (P95, listing endpoints) | TBD (expected >1s with eager loading) | < 500ms |
| Average listing payload size | TBD (inflated by eager loading) | 50%+ reduction |
| Test coverage (backend unit) | TBD | >= 80% |
| Entities without tenant isolation | 6 | 0 |
| Monetary fields with inconsistent types | 6 entities | 0 |
| Missing database indexes | 22 | 0 |
| Frontend/backend validation alignment | Mismatched | Fully aligned |
| WCAG accessibility (aria-labels language) | English (non-compliant) | Portuguese (compliant) |
| LGPD compliance (IP storage) | Non-compliant | Compliant (anonymized) |

### How to Measure Success

1. **Collect baseline metrics BEFORE starting** (see assessment Section 10) -- this is a hard prerequisite
2. Run `EXPLAIN ANALYZE` on key queries before and after index creation
3. Monitor P95 latency via Sentry/Prometheus after each sprint
4. Verify zero sensitive fields in API responses via automated tests
5. Validate tenant isolation with cross-organization integration tests
6. Track sprint velocity to confirm productivity improvement over time

---

## Recommendation

### Approach: 20% Capacity Per Sprint

Dedicate one day per week (or equivalent) to technical debt resolution. This avoids disrupting feature delivery while making steady, measurable progress.

### Quick Wins (Can Start Immediately, < 1 day each)

| Item | Hours | Impact |
|------|-------|--------|
| Add `select: false` to password field | 3h | Stops password hash leakage |
| Add `organizationId` to ExportMetadata | 1h | Closes cross-tenant data leak |
| Align password validation (front/back) | 2h | Prevents weak passwords |
| Translate aria-labels to Portuguese | 2h | WCAG compliance |
| Translate SkipLink to Portuguese | 0.5h | WCAG compliance |

### Items Requiring Dedicated Sprint Focus

| Item | Why It Needs Focus |
|------|-------------------|
| API key hashing (DB-S02) | Requires 4-phase migration plan with 30-day transition period and user communication |
| Eager loading removal (SYS-01/DB-01) | Requires mapping all consumption points + regression testing across all endpoints |
| Monetary type standardization (DB-04/SYS-05) | Touches 6 entities, requires reversible migration and precision validation |
| 22 missing indexes (DB-IDX-01) | Must use `CONCURRENTLY` to avoid production downtime; cannot run inside transaction |

### Critical Prerequisite

**Baseline metrics must be collected before any work begins.** Without before/after data, the business cannot verify ROI or measure improvement. Budget 2-4 hours for baseline collection as Sprint 0.

---

*Report generated 2026-01-29 by Atlas (@analyst) - AIOS v3.10.0*
*Source data: Technical Debt Assessment (peer-reviewed by @architect, @data-engineer, @ux-design-expert, @qa)*

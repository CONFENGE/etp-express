# BMAD Method - ETP Express Integration

**Version:** 6.0.0-alpha (customized for B2G)
**Project:** ETP Express
**Integration Date:** 2025-12-11

---

## Overview

BMAD (Build More, Architect Dreams) Method is an AI-driven agile development framework integrated into ETP Express to elevate technical rigor, optimize development processes, and systematically resolve P0 issues with enterprise-grade quality.

**Key Benefits:**

- **Structured Planning:** PRDs, Tech Specs, and Stories for all complex features
- **Token Optimization:** 70-85% savings via document sharding and helper patterns
- **4-Phase Workflow:** Analysis → Planning → Solutioning → Implementation
- **Scale-Adaptive:** Quick Flow (< 5min) to Enterprise Track (< 30min)
- ✅ **Compliance-First:** Lei 14.133/2021, LGPD, WCAG 2.1 AA, OWASP Top 10

---

## Four-Phase Workflow

### Phase 1: Analysis (Optional)

**Command:** `/product-brief-etp <ISSUE_NUMBER>`

**Agent:** Business Analyst

**When to use:**

- Ambiguous requirements
- New feature domain
- Complex technical decisions

**Output:** `docs/product-briefs/issue-<NUMBER>-brief.md`

**Deliverables:**

- Executive summary
- Problem statement with impact assessment
- User stories
- Solution alternatives
- Market research

---

### Phase 2: Planning (Required for P0)

**Command:** `/prd-etp <ISSUE_NUMBER>`

**Agent:** Product Manager

**When to use:**

- All P0 Security issues
- All P0 Enterprise Launch issues
- Complex features (5+ files)

**Output:** `docs/prds/issue-<NUMBER>-prd.md`

**Deliverables:**

- Functional Requirements (FRs)
- Non-Functional Requirements (NFRs)
- Compliance requirements (LGPD, WCAG, OWASP, Lei 14.133)
- Success metrics (technical + business KPIs)
- Risk matrix with mitigations

---

### Phase 3: Solutioning (Required)

**Command:** `/tech-spec-etp <ISSUE_NUMBER>`

**Agent:** System Architect

**When to use:**

- Always, after PRD is created

**Output:** `docs/tech-specs/issue-<NUMBER>-tech-spec.md`

**Deliverables:**

- Architecture decisions (with alternatives considered)
- Implementation plan (file-by-file breakdown)
- API changes (endpoints, contracts)
- Database migrations (SQL scripts)
- Testing strategy (unit, integration, E2E)
- Performance considerations
- Security & accessibility analysis

**Optional:** `docs/architecture/ADR-<NUMBER>-<title>.md` (if significant decision)

---

### Phase 4: Implementation (Required)

**Command:** `/story-etp <ISSUE_NUMBER>`

**Agent:** Scrum Master

**When to use:**

- Always, after Tech Spec is created

**Output:** `docs/stories/issue-<NUMBER>-story.md`

**Deliverables:**

- Hyper-contextualized implementation story
- Step-by-step guide (phases 1-7)
- Concrete code snippets (TypeScript, not TODOs)
- Test cases (Given/When/Then)
- Definition of Done (specific, measurable)

---

## Quick Start

### Example: Resolve Issue #611 (Polling AI após unmount)

```bash
# Phase 1 (Optional): Create product brief
/product-brief-etp 611

# Phase 2: Create PRD
/prd-etp 611

# Phase 3: Create Tech Spec
/tech-spec-etp 611

# Phase 4: Create Implementation Story
/story-etp 611

# Execute implementation (manual or via agent)
# Follow steps in docs/stories/issue-611-story.md

# Quality review (future command)
# /review-quality <PR_NUMBER>
```

---

## File Structure

```
.bmad/
├── README.md # This file
├── config.yml # BMAD configuration (B2G customized)
├── templates/
│ ├── prd-template.md # PRD template
│ ├── tech-spec-template.md # Tech Spec template
│ ├── story-template.md # Story template
│ └── adr-template.md # ADR template
├── helpers/ # Document sharding (token optimization)
│ ├── roadmap/
│ │ ├── milestones.md
│ │ ├── p0-issues.md
│ │ ├── metrics.md
│ │ └── changelog.md
│ └── architecture/
│ ├── backend-stack.md
│ ├── frontend-stack.md
│ ├── database-schema.md
│ └── deployment.md
└── agents/ # Agent configurations (future)

.claude/commands/
├── product-brief-etp.md # Business Analyst command
├── prd-etp.md # Product Manager command
├── tech-spec-etp.md # System Architect command
├── story-etp.md # Scrum Master command
├── audit-roadmap.md # Existing command (preserved)
├── pick-next-issue.md # Existing command (preserved)
└── review-pr.md # Existing command (preserved)

docs/
├── product-briefs/ # Product briefs (Phase 1)
├── prds/ # PRDs (Phase 2)
├── tech-specs/ # Tech Specs (Phase 3)
├── stories/ # Stories (Phase 4)
└── architecture/ # ADRs (Architecture Decision Records)
```

---

## Agent Expertise

### Business Analyst

- Lei 14.133/2021 (Nova Lei de Licitações)
- Estudos Técnicos Preliminares (ETP)
- Public procurement best practices
- B2G user research

### Product Manager

- LGPD compliance (Lei 13.709/2018)
- WCAG 2.1 AA accessibility
- OWASP security priorities
- Multi-tenant B2G architecture

### System Architect

- NestJS + TypeORM patterns
- React + Tailwind + shadcn/ui
- Railway deployment strategies
- Multi-tenancy with organizationId
- PostgreSQL optimization

### Scrum Master

- Story decomposition
- Sprint planning
- Pipeline management (max 3 PRs)
- Velocity tracking

---

## Configuration

### Scale Tracks

**Quick Flow** (< 5 min planning)

- Typos
- Simple docs updates
- Bug fixes < 30 min

**BMAD Method** (< 15 min planning) - **DEFAULT**

- Medium features (3-5 files)
- Bug fixes with tests
- Refactoring

**Enterprise Track** (< 30 min planning)

- P0 Security issues
- P0 Enterprise Launch issues
- Complex features (5+ files, migrations)
- Multi-component changes

### Compliance Checks

All P0 issues automatically checked for:

- ✅ **LGPD:** Data minimization, consent, audit trail
- ✅ **WCAG 2.1 AA:** Keyboard nav, screen readers, color contrast
- ✅ **OWASP Top 10:** Injection, broken auth, XSS, etc.
- ✅ **Lei 14.133/2021:** Procurement compliance (if applicable)

### Coverage Targets

- **Backend:** ≥78%
- **Frontend:** ≥76%
- **New code:** 100% (enforced in stories)

---

## Success Metrics

### Development

- **Velocity:** 3-5 P0 issues/week (with BMAD)
- **Quality:** Zero regressions in BMAD-driven PRs
- **Coverage:** Maintain or improve 78%/76%

### Processes

- **Planning time (Quick Flow):** < 5 min
- **Planning time (BMAD Method):** < 15 min
- **Planning time (Enterprise):** < 30 min
- **Documentation coverage:** 100% for P0 issues

### Quality

- **Bug rate:** < 5% in BMAD-driven PRs (vs baseline)
- **Review time:** < 24h for PRs with complete stories
- **Rollback rate:** < 2% (well-documented decisions)

---

## Integration with Existing Workflow

### Preserved Commands

- `/audit-roadmap` - Syncs with ROADMAP.md (unchanged)
- `/pick-next-issue` - Pipeline mode, max 3 PRs (unchanged)
- `/review-pr` - PR review with coverage checks (unchanged)

### Enhanced Pipeline

**Before:**

1. `/pick-next-issue` → Selects issue
2. Implement directly
3. `/review-pr` → Review and merge

**With BMAD (for P0 issues):**

1. `/pick-next-issue` → Selects P0 issue
2. `/prd-etp <ISSUE>` → Create PRD
3. `/tech-spec-etp <ISSUE>` → Create Tech Spec
4. `/story-etp <ISSUE>` → Create Story
5. Implement following story guidance
6. `/review-pr` → Review and merge

**Net benefit:**

- Higher quality (fewer bugs, better tests)
- Faster review (clear context in story)
- Better documentation (PRD, Tech Spec, Story)

---

## Usage Guidelines

### When to Use BMAD Workflow

✅ **Always use for:**

- P0 Security issues (#598-#602)
- P0 Enterprise Launch issues (#578-#597)
- Features with 5+ files
- Database migrations
- API breaking changes
- Complex UI refactors

⚠ **Consider using for:**

- Medium features (3-5 files)
- Bug fixes with unclear scope
- Refactoring with trade-offs

❌ **Skip for:**

- Typos and doc updates
- One-line fixes
- Simple CSS tweaks

### Command Sequence

**Typical flow:**

```
/product-brief-etp <ISSUE> (optional)
↓
/prd-etp <ISSUE> (required for P0)
↓
/tech-spec-etp <ISSUE> (required)
↓
/story-etp <ISSUE> (required)
↓
Implement
↓
/review-pr <PR_NUMBER> (existing)
```

**Fast track (for clear issues):**

```
/prd-etp <ISSUE>
↓
/tech-spec-etp <ISSUE>
↓
/story-etp <ISSUE>
↓
Implement
```

---

## Token Optimization

### Document Sharding

Large documents (ROADMAP.md, ARCHITECTURE.md) are sharded into helpers:

- `{{helper:roadmap/metrics}}` → `.bmad/helpers/roadmap/metrics.md`
- `{{helper:architecture/backend-stack}}` → `.bmad/helpers/architecture/backend-stack.md`

**Token savings:** ~90% for repeated references

### Functional Design

Agents focus on deliverables, not personas:

- ❌ **Before:** "As an experienced architect, I would recommend..."
- ✅ **After:** "Recommendation: Use AbortController for cleanup"

**Token savings:** ~20% per response

---

## Templates

All templates are in `.bmad/templates/`:

- **prd-template.md** - 13 sections, compliance-focused
- **tech-spec-template.md** - 17 sections, implementation-focused
- **story-template.md** - 7 phases, step-by-step guidance
- **adr-template.md** - Architecture Decision Record

---

## References

### BMAD Method

- **Core Repository:** https://github.com/bmad-code-org/BMAD-METHOD
- **Claude Code Integration:** https://github.com/aj-geddes/claude-code-bmad-skills
- **Integration Guide:** https://github.com/24601/BMAD-AT-CLAUDE

### ETP Express

- **ROADMAP.md** - Project progress and P0 issues
- **ARCHITECTURE.md** - System design and tech stack
- **CONTRIBUTING.md** - Development workflow

---

## Changelog

### 2025-12-11 - Initial Integration (v1.0)

- ✅ BMAD config customized for B2G context
- ✅ 4 core commands created (product-brief, prd, tech-spec, story)
- ✅ Templates adapted for compliance (LGPD, WCAG, OWASP, Lei 14.133)
- ✅ Document sharding infrastructure created
- ✅ Integration with existing commands (audit-roadmap, pick-next-issue, review-pr)

---

**Maintained by:** Claude (BMAD Integration Agent)
**Version:** 1.0
**Last Updated:** 2025-12-11

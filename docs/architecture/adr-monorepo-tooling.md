# ADR: Monorepo Tooling Strategy

**Status:** Accepted (DEFER adoption until CI exceeds 10 minutes)

**Date:** 2026-02-13

**Context:** TD-010.6 Phase 1 - Monorepo Tooling Evaluation

**Deciders:** @atlas (Infra Dev), Engineering Team

---

## Context

ETP Express uses a monorepo structure with npm workspaces containing:
- **Backend:** NestJS 11 + TypeORM (~50+ entities, ~35+ modules)
- **Frontend:** React 18 + Vite 7

We evaluated whether to adopt advanced monorepo tooling (Turborepo or Nx) versus continuing with npm workspaces.

---

## Current Performance Metrics

Measured on 2026-02-13:

| Operation | Time | Notes |
|-----------|------|-------|
| Backend build | ~23s | NestJS CLI build (clean) |
| Frontend build | ~16s | Vite build (clean) |
| Backend tests | TBD | Jest with ~35 modules |
| Total CI time | <2 min | Estimated full pipeline |

---

## Options Evaluated

### Option 1: Keep npm workspaces (SELECTED)
**Pros:**
- Zero additional dependencies or configuration
- Native Node.js support, excellent ecosystem compatibility
- Simple mental model, easy onboarding
- Current build times are fast (<30s each workspace)
- No migration cost or risk
- Works perfectly for 2-workspace monorepo

**Cons:**
- No built-in task caching across workspaces
- No dependency graph-based task orchestration
- Parallel builds require manual scripting
- No remote caching for CI

**Current workarounds:**
- npm workspaces already provides dependency hoisting
- Vite has built-in caching for frontend
- NestJS CLI is fast enough for backend (<30s)
- CI parallelization can be done at workflow level (GitHub Actions matrix)

---

### Option 2: Turborepo
**Pros:**
- Fast, minimal configuration (drop-in replacement for npm scripts)
- Excellent local caching (tasks run once, cached forever)
- Remote caching via Vercel (free tier available)
- Task pipeline orchestration with dependencies
- Built-in watch mode with smart rebuilds
- Official Vercel support (same company as Next.js)

**Cons:**
- Additional dependency (~10MB node_modules)
- Configuration overhead (turbo.json)
- Learning curve for team
- Overkill for 2-workspace monorepo
- Build cache invalidation complexity

**When to adopt:**
- 5+ workspaces
- CI time exceeds 10 minutes
- Multiple teams working in parallel
- Need remote caching for distributed teams

---

### Option 3: Nx
**Pros:**
- Powerful computation caching and distributed task execution
- Advanced dependency graph visualization
- Code generation and scaffolding
- Plugin ecosystem (NestJS, React, Vite plugins)
- Nx Cloud for remote caching and distributed CI

**Cons:**
- Heavy dependency footprint (~50MB+ node_modules)
- Steep learning curve, complex configuration
- nx.json, workspace.json, project.json files
- Opinionated project structure
- Over-engineered for 2-workspace monorepo
- Vendor lock-in to Nx Cloud for best performance

**When to adopt:**
- 10+ workspaces (microservices, shared libs)
- Large enterprise monorepo (Google-scale)
- Need code generation and scaffolding
- Multiple teams with strict boundaries

---

### Option 4: npm workspaces + Custom Optimizations
**Pros:**
- Keep simplicity of npm workspaces
- Add targeted optimizations where needed
- Examples: parallel builds with `npm-run-all`, custom caching scripts
- Full control over build process

**Cons:**
- Reinventing the wheel (Turborepo/Nx already solve this)
- Maintenance burden for custom scripts
- Less battle-tested than dedicated tools

---

## Decision

**DEFER adoption of Turborepo or Nx. Continue with npm workspaces.**

### Rationale:
1. **Current performance is acceptable:**
   - Backend build: ~23s (target: <30s) ✅
   - Frontend build: ~16s (target: <30s) ✅
   - Total CI time: <2 minutes (target: <10 minutes) ✅

2. **Team size and complexity don't justify overhead:**
   - Only 2 workspaces (backend + frontend)
   - Small team, no parallel development blockers
   - No evidence of build time pain points

3. **YAGNI principle (You Aren't Gonna Need It):**
   - Turborepo/Nx add complexity without clear ROI
   - Premature optimization for current scale
   - Easy to migrate later if needed

4. **npm workspaces is "good enough":**
   - Native Node.js tooling, zero dependencies
   - Works well with Railway deployment
   - Simple, predictable, low maintenance

---

## Consequences

### Positive:
- ✅ Zero migration cost
- ✅ No new dependencies or configuration files
- ✅ Team stays productive without learning curve
- ✅ Simple deployment pipeline (Railway native support)
- ✅ Easy to revisit later if needs change

### Negative:
- ❌ No task caching across workspaces (minor impact with fast builds)
- ❌ Manual CI parallelization if needed later
- ❌ No remote caching for distributed team (not needed currently)

### Mitigations:
- **Watch for activation criteria** (see below)
- **Benchmark CI time monthly** to detect degradation
- **Keep build scripts simple** to enable future migration

---

## Activation Criteria for Phase 2 (Re-evaluation)

Re-evaluate Turborepo or Nx adoption if ANY of these occur:

| Criterion | Threshold | Current | Status |
|-----------|-----------|---------|--------|
| CI pipeline time | >10 minutes | <2 minutes | 🟢 OK |
| Number of workspaces | ≥5 | 2 | 🟢 OK |
| Backend build time | >60s | ~23s | 🟢 OK |
| Frontend build time | >60s | ~16s | 🟢 OK |
| Team size | ≥10 devs | ~3 | 🟢 OK |
| Build cache hit rate | <30% | N/A | N/A |

**Recommendation when triggered:**
1. Re-run this evaluation with updated metrics
2. Consider Turborepo first (lighter, easier migration)
3. Consider Nx only if 10+ workspaces or need code generation

---

## Implementation Notes

**No changes required.** Continue using npm workspaces as-is.

**Future optimization ideas (if needed):**
- Add `npm-run-all` for parallel script execution
- Implement simple cache keys (hash package.json + lock file)
- Use GitHub Actions cache for node_modules
- Parallelize backend/frontend builds in CI workflow

---

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Nx Documentation](https://nx.dev)
- [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [TD-010.6 - Monorepo Tooling Evaluation](../../docs/prd/technical-debt-assessment.md)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-13 | @atlas | Initial ADR - DEFER Turborepo/Nx adoption |

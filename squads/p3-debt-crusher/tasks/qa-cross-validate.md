---
task: "Cross-validate all 4 front PRs"
responsavel: "@cross-qa"
responsavel_type: agent
atomic_layer: task
elicit: false
story_ref: TD-009 (all)
blocked_by: all-fronts-complete
Entrada: |
  - PR from each front (4 PRs total)
  - Quality gate checklist
Saida: |
  - Review comments on each PR
  - Approval or change requests
  - Full regression report
Checklist:
  - "[ ] Review F1 PR: entity changes, migration, data integrity"
  - "[ ] Review F2 PR: multi-tenancy, backfill, indexes"
  - "[ ] Review F3 PR: body parser, docs, feature flags, chaos eval"
  - "[ ] Review F4 PR: axe-core setup, test coverage, CI integration"
  - "[ ] Run npm run lint across all changes"
  - "[ ] Run npm run typecheck across all changes"
  - "[ ] Run npm test (full unit test suite)"
  - "[ ] Run npm run test:e2e (full e2e suite)"
  - "[ ] Check for cross-front conflicts (entity imports, migration order)"
  - "[ ] Verify merge order: F3 → F1 → F2 → F4"
  - "[ ] Update TD-009 story checkboxes"
  - "[ ] Update ROADMAP.md with completion status"
---

# Cross-QA Validation

## Review Focus per Front

### F1 (Schema Cleanup)
- Is data migration safe? NULL handling?
- Are all `versao` references cleaned up?
- Is migration reversible?

### F2 (Multi-tenancy)
- Is backfill correct? Handles orphans?
- Are GIN indexes using CONCURRENTLY?
- Are inverse relations lazy (not eager)?

### F3 (Backend Hygiene)
- Does body parser preserve all content types?
- Is guards documentation accurate?
- Are feature flags backward-compatible?

### F4 (Accessibility)
- Do tests cover all ~30 pages?
- Is warning mode configured (no false CI failures)?
- Is test helper reusable?

## Merge Order (STRICT)
1. F3 - No migrations, lowest risk
2. F1 - First migration batch
3. F2 - Second migration batch
4. F4 - Independent, additive only

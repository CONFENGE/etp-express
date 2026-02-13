---
task: "Centralize feature flags defaults and add persistence"
responsavel: "@hygiene-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: SYS-08
story_ref: TD-009.3
front: F3
Entrada: |
  - backend/src/modules/feature-flags/
  - All scattered feature flag default values across codebase
Saida: |
  - Centralized feature-flags.defaults.ts with all defaults
  - Updated FeatureFlagsService to use centralized defaults
  - Audit trail for flag changes (via existing audit infrastructure)
Checklist:
  - "[ ] Read feature-flags module completely"
  - "[ ] Search for scattered flag defaults: grep -r 'featureFlag' --include='*.ts'"
  - "[ ] Create feature-flags.defaults.ts with all flag definitions"
  - "[ ] Update FeatureFlagsService to load defaults from central file"
  - "[ ] Add type safety: create FeatureFlagName union type"
  - "[ ] Integrate with existing audit log for flag change tracking"
  - "[ ] Update any hardcoded flag checks to use service"
  - "[ ] Run tests"
---

# SYS-08: Centralize Feature Flags

## Context
Feature flag default values are scattered across the codebase. This makes it
hard to know what flags exist and what their defaults are. Changes to flags
are not audited.

## Implementation Pattern
```typescript
// feature-flags.defaults.ts
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagName, boolean> = {
  AI_GENERATION: true,
  MARKET_INTELLIGENCE: true,
  EXPORT_PDF: true,
  MULTI_ORG: false,
  // ...
};

export type FeatureFlagName = keyof typeof FEATURE_FLAG_DEFAULTS;
```

## Risk
- LOW: Consolidation of existing values, no behavior change
- Must verify all current defaults match

---
task: "Evaluate chaos module placement and document decision"
responsavel: "@hygiene-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: SYS-09
story_ref: TD-009.3
front: F3
Entrada: |
  - backend/src/modules/chaos/
  - Current usage patterns
Saida: |
  - ADR document: docs/architecture/adr/chaos-module-placement.md
  - Module moved OR documented as intentional placement
Checklist:
  - "[ ] Read chaos module code and understand its purpose"
  - "[ ] Check if chaos module is imported in app.module.ts"
  - "[ ] Check if chaos module is conditionally loaded (env-based)"
  - "[ ] Evaluate: should it be in src/ or test infrastructure?"
  - "[ ] Document decision as ADR (Architecture Decision Record)"
  - "[ ] If moving: relocate to appropriate location"
  - "[ ] If staying: add clear documentation and conditional loading guard"
  - "[ ] Ensure chaos module NEVER loads in production"
---

# SYS-09: Chaos Module Evaluation

## Context
A chaos testing module exists in `src/modules/chaos/` which may be better placed
in test infrastructure. Need to evaluate whether it belongs in the production
source tree.

## Decision Criteria
1. Is it loaded in production? → If yes, MUST add environment guard
2. Is it used in integration tests? → May need to stay in src/ for DI
3. Is it a development-only tool? → Could move to test/ or tools/

## ADR Template
```markdown
# ADR: Chaos Module Placement

## Status: [Accepted/Proposed]
## Context: ...
## Decision: ...
## Consequences: ...
```

## Risk
- LOW: Evaluation and documentation task
- If moving module, ensure no production imports break

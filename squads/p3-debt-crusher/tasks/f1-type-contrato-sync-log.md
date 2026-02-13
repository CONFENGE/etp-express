---
task: "Replace 'any' types in ContratoSyncLog with proper interfaces"
responsavel: "@schema-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: DB-07
story_ref: TD-009.1
front: F1
Entrada: |
  - backend/src/entities/contrato-sync-log.entity.ts
  - Usage of ContratoSyncLog.resolution across codebase
Saida: |
  - ConflictResolution interface defined
  - ConflictField interface defined
  - ContratoSyncLog entity using typed fields instead of 'any'
Checklist:
  - "[ ] Read ContratoSyncLog entity to understand current 'any' usage"
  - "[ ] Analyze actual data shapes from service code that populates resolution"
  - "[ ] Create ConflictResolution interface matching actual data"
  - "[ ] Create ConflictField interface if needed"
  - "[ ] Replace 'any' types with new interfaces in entity"
  - "[ ] Update service code to use new interfaces"
  - "[ ] Run typecheck: npm run typecheck"
  - "[ ] Run unit tests"
---

# DB-07: Type ContratoSyncLog Resolution Fields

## Context
ContratoSyncLog uses `any` type for `resolution` and related fields.
This bypasses TypeScript's type safety and makes the code harder to maintain.

## Implementation Steps

1. **Analyze**: Read the entity and services to understand actual data shapes
2. **Define interfaces**: Create typed interfaces in the entity file or a shared types file
3. **Apply types**: Replace `any` with the new interfaces
4. **Validate**: Ensure all producers/consumers match the new types

## Risk
- LOW: Type-only change, no runtime behavior change
- May uncover existing type mismatches (which is a good thing)

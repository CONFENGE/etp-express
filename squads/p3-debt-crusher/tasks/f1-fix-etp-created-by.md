---
task: "Add type 'uuid' to Etp.created_by column"
responsavel: "@schema-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: DB-06
story_ref: TD-009.1
front: F1
Entrada: |
  - backend/src/entities/etp.entity.ts
Saida: |
  - Updated Etp entity with proper UUID type on created_by
Checklist:
  - "[ ] Open backend/src/entities/etp.entity.ts"
  - "[ ] Find @Column() created_by field"
  - "[ ] Add type: 'uuid' to decorator: @Column({ type: 'uuid', nullable: true })"
  - "[ ] Verify TypeScript type is string"
  - "[ ] Check if migration is needed (column may already be uuid in DB)"
  - "[ ] Run unit tests"
---

# DB-06: Type Etp.created_by as UUID

## Context
The `created_by` column in Etp entity lacks explicit `type: 'uuid'` in the @Column decorator.
While PostgreSQL may infer the type, explicit typing ensures schema clarity and prevents
issues during migration generation.

## Implementation
Single-line change: add `type: 'uuid'` to the @Column decorator options.

## Risk
- MINIMAL: Decorator metadata change, no runtime behavior change

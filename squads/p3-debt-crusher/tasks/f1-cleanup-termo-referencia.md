---
task: "Remove duplicate versao/currentVersion fields in TermoReferencia"
responsavel: "@schema-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: DB-05
story_ref: TD-009.1
front: F1
Entrada: |
  - backend/src/entities/termo-referencia.entity.ts
  - All references to `versao` field across codebase
Saida: |
  - Updated TermoReferencia entity with single version field
  - Updated all references from `versao` to `currentVersion`
Checklist:
  - "[ ] Search all references to `versao` in TermoReferencia context"
  - "[ ] Determine which field to keep (currentVersion is the standard)"
  - "[ ] Update entity: remove `versao`, keep `currentVersion`"
  - "[ ] Update all service/controller references from `versao` to `currentVersion`"
  - "[ ] Update any DTOs that reference `versao`"
  - "[ ] Add data copy in migration: UPDATE termo_referencia SET current_version = versao WHERE current_version IS NULL"
  - "[ ] Add column drop in migration: ALTER TABLE termo_referencia DROP COLUMN versao"
  - "[ ] Run unit tests: npm test -- --grep TermoReferencia"
  - "[ ] Verify no remaining references to `versao`"
---

# DB-05: Remove Duplicate Version Fields

## Context
TermoReferencia entity has both `versao` and `currentVersion` fields representing the same concept.
This causes confusion and potential data inconsistency.

## Implementation Steps

1. **Audit references**: `grep -r "versao" --include="*.ts"` filtering for TermoReferencia context
2. **Update entity**: Remove `@Column() versao: number` field
3. **Update consumers**: Change all `entity.versao` to `entity.currentVersion`
4. **Migration**: Copy data + drop column (handled in f1-generate-migration task)

## Risk
- LOW: Simple field consolidation with data preservation
- Migration must handle NULL values in both fields

---
task: "Generate F2 migration for multi-tenancy and indexes"
responsavel: "@tenancy-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
story_ref: TD-009.2
front: F2
blocked_by: f1-generate-migration
Entrada: |
  - All F2 entity changes (DB-NEW-07, DB-NEW-08, DB-P02)
  - F1 migration already generated and numbered
Saida: |
  - Single migration file covering all F2 changes
  - Migration tested with up() and down()
Checklist:
  - "[ ] CONFIRM: F1 migration is generated and committed"
  - "[ ] Ensure all F2 entity changes are saved"
  - "[ ] Generate migration: npm run migration:generate -- -n TD009-2-MultiTenancyIndexes"
  - "[ ] Add manual SQL for backfill (organizationId from parent Contrato)"
  - "[ ] Modify GIN index creation to use CONCURRENTLY"
  - "[ ] Review generated SQL carefully"
  - "[ ] Verify down() method reverses all changes"
  - "[ ] Test migration: npm run migration:run"
  - "[ ] Test rollback: npm run migration:revert"
---

# F2 Migration Generation

## CRITICAL DEPENDENCY
This migration MUST be generated AFTER F1 migration is complete.
Check with squad-lead before proceeding.

## Expected SQL
```sql
-- up()
ALTER TABLE medicao ADD COLUMN organization_id uuid;
ALTER TABLE ocorrencia ADD COLUMN organization_id uuid;

-- Backfill
UPDATE medicao m SET organization_id = c.organization_id FROM contrato c WHERE m.contrato_id = c.id;
UPDATE ocorrencia o SET organization_id = c.organization_id FROM contrato c WHERE o.contrato_id = c.id;

-- Indexes
CREATE INDEX idx_medicao_org_id ON medicao(organization_id);
CREATE INDEX idx_ocorrencia_org_id ON ocorrencia(organization_id);

-- GIN Indexes (outside transaction)
CREATE INDEX CONCURRENTLY idx_etp_metadata_gin ON etp USING gin(metadata);
CREATE INDEX CONCURRENTLY idx_etp_dynamic_fields_gin ON etp USING gin(dynamic_fields);
CREATE INDEX CONCURRENTLY idx_contract_price_metadata_gin ON contract_price USING gin(metadata);
```

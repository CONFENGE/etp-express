---
task: "Generate F1 migration for schema cleanup changes"
responsavel: "@schema-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
story_ref: TD-009.1
front: F1
Entrada: |
  - All F1 entity changes (DB-05, DB-06, DB-07)
Saida: |
  - Single migration file covering all F1 changes
  - Migration tested with up() and down()
Checklist:
  - "[ ] Ensure all F1 entity changes are saved"
  - "[ ] Generate migration: npm run migration:generate -- -n TD009-1-SchemaCleanup"
  - "[ ] Review generated SQL"
  - "[ ] Add manual SQL for data copy (versao → currentVersion)"
  - "[ ] Verify down() method reverses all changes"
  - "[ ] Test migration: npm run migration:run"
  - "[ ] Test rollback: npm run migration:revert"
  - "[ ] NOTIFY squad-lead: F1 migration complete, F2 can proceed"
---

# F1 Migration Generation

## IMPORTANT
This migration MUST complete before F2 migration is generated.
The squad-lead coordinates this sequencing.

## Expected SQL
```sql
-- up()
UPDATE termo_referencia SET current_version = versao WHERE current_version IS NULL;
ALTER TABLE termo_referencia DROP COLUMN versao;
-- (TypeORM auto-generates column type changes for created_by and resolution)

-- down()
ALTER TABLE termo_referencia ADD COLUMN versao integer;
UPDATE termo_referencia SET versao = current_version;
```

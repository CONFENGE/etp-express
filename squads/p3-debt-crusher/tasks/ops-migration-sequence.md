---
task: "Coordinate migration sequencing between F1 and F2"
responsavel: "@migration-ops"
responsavel_type: agent
atomic_layer: task
elicit: false
story_ref: TD-009.1, TD-009.2
Entrada: |
  - F1 entity changes
  - F2 entity changes
  - Current migration count
Saida: |
  - Ordered migration sequence
  - Validation that both migrations run cleanly
Checklist:
  - "[ ] Check current latest migration number"
  - "[ ] Wait for F1 to complete entity changes"
  - "[ ] Generate F1 migration"
  - "[ ] Test F1 migration: up + down"
  - "[ ] Commit F1 migration"
  - "[ ] Signal F2 to proceed"
  - "[ ] Wait for F2 to complete entity changes"
  - "[ ] Generate F2 migration"
  - "[ ] Test F2 migration: up + down"
  - "[ ] Test full sequence: F1 up → F2 up → F2 down → F1 down"
  - "[ ] Commit F2 migration"
---

# Migration Sequencing Protocol

## Why Sequential?
TypeORM migrations are numbered sequentially. Two developers generating
migrations simultaneously will create conflicting timestamps/numbers.

## Protocol
```
1. F1 Dev: Complete entity changes → notify Migrator
2. Migrator: Generate + test F1 migration → commit → notify F2 Dev
3. F2 Dev: Complete entity changes → notify Migrator
4. Migrator: Generate + test F2 migration → commit
5. Migrator: Full sequence test (both up, both down)
```

## Validation
```bash
# Test full sequence
npm run migration:run     # Both migrations up
npm run migration:revert  # F2 down
npm run migration:revert  # F1 down
npm run migration:run     # Both up again (idempotent check)
```

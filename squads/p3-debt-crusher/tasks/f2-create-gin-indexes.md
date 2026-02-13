---
task: "Create GIN indexes on JSONB fields"
responsavel: "@tenancy-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: DB-P02
story_ref: TD-009.2
front: F2
Entrada: |
  - backend/src/entities/etp.entity.ts (metadata, dynamicFields)
  - backend/src/modules/market-intelligence/entities/contract-price.entity.ts (metadata)
Saida: |
  - GIN indexes on 3 JSONB columns
  - Migration with CREATE INDEX CONCURRENTLY
Checklist:
  - "[ ] Read Etp entity for metadata and dynamicFields columns"
  - "[ ] Read ContractPrice entity for metadata column"
  - "[ ] Add @Index decorator with GIN type to each JSONB column"
  - "[ ] Generate migration"
  - "[ ] Modify migration to use CREATE INDEX CONCURRENTLY (non-blocking)"
  - "[ ] Test migration on dev database"
  - "[ ] Verify indexes with: SELECT indexname FROM pg_indexes WHERE tablename = 'etp'"
---

# DB-P02: GIN Indexes for JSONB Queries

## Context
Three JSONB columns lack GIN indexes, making containment queries (@>, ?) slow on large datasets.

## Target Columns
1. `etp.metadata` - jsonb
2. `etp.dynamic_fields` - jsonb
3. `contract_price.metadata` - jsonb

## Implementation
```sql
CREATE INDEX CONCURRENTLY idx_etp_metadata_gin ON etp USING gin (metadata);
CREATE INDEX CONCURRENTLY idx_etp_dynamic_fields_gin ON etp USING gin (dynamic_fields);
CREATE INDEX CONCURRENTLY idx_contract_price_metadata_gin ON contract_price USING gin (metadata);
```

## Risk
- LOW: Index creation is additive
- Use CONCURRENTLY to avoid table locks in production
- Note: CONCURRENTLY cannot run inside a transaction block

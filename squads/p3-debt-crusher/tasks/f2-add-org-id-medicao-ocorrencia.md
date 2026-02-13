---
task: "Add direct organizationId to Medicao and Ocorrencia entities"
responsavel: "@tenancy-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: DB-NEW-07
story_ref: TD-009.2
front: F2
Entrada: |
  - backend/src/entities/medicao.entity.ts
  - backend/src/entities/ocorrencia.entity.ts
  - Pattern from other entities with organizationId (e.g., Etp, Contrato)
Saida: |
  - Medicao entity with organizationId + @ManyToOne Organization
  - Ocorrencia entity with organizationId + @ManyToOne Organization
  - Migration with backfill from parent Contrato
Checklist:
  - "[ ] Read existing Medicao entity structure"
  - "[ ] Read existing Ocorrencia entity structure"
  - "[ ] Read a reference entity with organizationId (e.g., Etp)"
  - "[ ] Add @Column({ type: 'uuid', nullable: true }) organizationId to Medicao"
  - "[ ] Add @ManyToOne(() => Organization) organization to Medicao"
  - "[ ] Add @Index('idx_medicao_org_id') on organizationId"
  - "[ ] Repeat for Ocorrencia entity"
  - "[ ] Update any services that create Medicao/Ocorrencia to populate organizationId"
  - "[ ] Add backfill SQL to migration (from Contrato parent)"
  - "[ ] Run unit tests"
---

# DB-NEW-07: Direct organizationId on Medicao & Ocorrencia

## Context
These entities currently rely on their parent Contrato for tenant isolation.
Direct organizationId enables faster queries without joins and consistent
multi-tenancy patterns across all entities.

## Backfill Strategy
```sql
UPDATE medicao m
SET organization_id = c.organization_id
FROM contrato c
WHERE m.contrato_id = c.id AND m.organization_id IS NULL;

UPDATE ocorrencia o
SET organization_id = c.organization_id
FROM contrato c
WHERE o.contrato_id = c.id AND o.organization_id IS NULL;
```

## Risk
- MEDIUM: Data backfill must handle orphaned records (contrato_id = NULL)
- Add WHERE clause to skip records without parent

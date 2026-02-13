---
task: "Add inverse @OneToMany relations in Contrato entity"
responsavel: "@tenancy-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: DB-NEW-08
story_ref: TD-009.2
front: F2
Entrada: |
  - backend/src/entities/contrato.entity.ts
  - backend/src/entities/medicao.entity.ts
  - backend/src/entities/ocorrencia.entity.ts
Saida: |
  - Contrato entity with medicoes and ocorrencias inverse relations
Checklist:
  - "[ ] Read Contrato entity current state"
  - "[ ] Verify Medicao has @ManyToOne(() => Contrato)"
  - "[ ] Verify Ocorrencia has @ManyToOne(() => Contrato)"
  - "[ ] Add @OneToMany(() => Medicao, m => m.contrato) medicoes to Contrato"
  - "[ ] Add @OneToMany(() => Ocorrencia, o => o.contrato) ocorrencias to Contrato"
  - "[ ] Set lazy: true or use { eager: false } to prevent N+1"
  - "[ ] Run typecheck"
  - "[ ] Run unit tests"
---

# DB-NEW-08: Contrato Inverse Relations

## Context
Contrato entity is missing inverse `@OneToMany` relations for Medicao and Ocorrencia.
This prevents TypeORM from properly managing the bidirectional relationship and
makes certain query patterns more verbose.

## Implementation
Pure decorator additions - no migration needed as inverse relations are metadata-only.

## Risk
- MINIMAL: Metadata change only, no schema change
- Ensure `eager: false` to prevent loading cascades (per TD-003 fix)

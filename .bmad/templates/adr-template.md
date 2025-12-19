# ADR-XXX: [Título da Decisão Arquitetural]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-YYY
**Date:** YYYY-MM-DD
**Deciders:** [Lista de pessoas envolvidas]
**Issue:** #XXX
**PRD:** [Link]
**Tech Spec:** [Link]

---

## Context

<!-- Descreva o contexto que levou a esta decisão arquitetural -->

### Problema

<!-- Qual problema estamos tentando resolver? -->

### Restrições

<!-- Quais são as restrições técnicas, de negócio ou de tempo? -->

- Restrição 1
- Restrição 2

### Stakeholders

<!-- Quem é afetado por esta decisão? -->

- Equipe de desenvolvimento
- Equipe de operações
- Usuários finais
- Outros:

---

## Decision

<!-- Descreva a decisão tomada de forma clara e concisa -->

**Decisão:** [Declaração clara da decisão]

### Rationale

<!-- Por que esta decisão foi tomada? -->

1. Razão 1
2. Razão 2
3. Razão 3

---

## Options Considered

### Option A: [Nome da Opção]

**Description:**

<!-- Breve descrição da opção -->

**Pros:**

- ✅ Pro 1
- ✅ Pro 2
- ✅ Pro 3

**Cons:**

- ❌ Con 1
- ❌ Con 2
- ❌ Con 3

**Technical Complexity:** Low | Medium | High
**Cost:** $ | $$ | $$$
**Time to Implement:** X hours/days/weeks

**Decision:** ✅ **SELECTED** | ❌ Rejected

---

### Option B: [Nome da Opção]

**Description:**

<!-- Breve descrição da opção -->

**Pros:**

- ✅ Pro 1
- ✅ Pro 2

**Cons:**

- ❌ Con 1
- ❌ Con 2

**Technical Complexity:** Low | Medium | High
**Cost:** $ | $$ | $$$
**Time to Implement:** X hours/days/weeks

**Decision:** ✅ Selected | ❌ **REJECTED**

**Rejection Rationale:**

<!-- Por que esta opção foi rejeitada? -->

---

### Option C: [Nome da Opção]

**Description:**

<!-- Breve descrição da opção -->

**Pros:**

- ✅ Pro 1

**Cons:**

- ❌ Con 1

**Technical Complexity:** Low | Medium | High
**Cost:** $ | $$ | $$$
**Time to Implement:** X hours/days/weeks

**Decision:** ✅ Selected | ❌ **REJECTED**

**Rejection Rationale:**

<!-- Por que esta opção foi rejeitada? -->

---

## Consequences

### Positive Consequences

- ✅ Consequence 1
- ✅ Consequence 2

### Negative Consequences

- ❌ Consequence 1
- ❌ Consequence 2

### Trade-offs

<!-- Quais trade-offs foram aceitos? -->

- Trade-off 1: [Descrição]
- Trade-off 2: [Descrição]

---

## Implementation Details

### Architecture Changes

#### Before

```
[Diagrama ou descrição da arquitetura antes]
```

#### After

```
[Diagrama ou descrição da arquitetura depois]
```

### Code Changes

#### Backend

```typescript
// Exemplo de mudança arquitetural
// File: backend/src/path/to/file.ts

// BEFORE
class OldPattern {
 // ...
}

// AFTER
class NewPattern {
 // ...
}
```

#### Frontend

```typescript
// Exemplo de mudança arquitetural
// File: frontend/src/path/to/component.tsx

// BEFORE
const OldComponent = () => {
 // ...
};

// AFTER
const NewComponent = () => {
 // ...
};
```

### Database Changes

```sql
-- Migration: YYYYMMDDHHMMSS-ArchitecturalChange.ts

-- Example of schema change driven by architectural decision
ALTER TABLE table_name ADD COLUMN new_column TYPE;
CREATE INDEX idx_name ON table_name(column);
```

### Infrastructure Changes

- **Railway:** [Mudanças de configuração]
- **Environment Variables:** [Novas variáveis]
- **Monitoring:** [Novos dashboards/alerts]

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation | Owner |
| --------- | --------------- | --------------- | -------------------- | ------ |
| [Risco 1] | High/Medium/Low | High/Medium/Low | [Plano de mitigação] | [Nome] |
| [Risco 2] | ... | ... | ... | ... |

---

## Performance Impact

### Expected Impact

- **Latency:** [+ ou - X ms]
- **Throughput:** [+ ou - X req/s]
- **Memory:** [+ ou - X MB]
- **CPU:** [+ ou - X%]

### Benchmarks

<!-- Se houver benchmarks, inclua aqui -->

| Métrica | Before | After | Δ |
| ------------- | ------- | ------- | ----------- |
| Latency (P50) | X ms | Y ms | +/- Z ms |
| Latency (P95) | X ms | Y ms | +/- Z ms |
| Throughput | X req/s | Y req/s | +/- Z req/s |

---

## Security Implications

### OWASP Top 10

- [ ] **A01:2021 – Broken Access Control:** [Impacto e mitigação]
- [ ] **A03:2021 – Injection:** [Impacto e mitigação]
- [ ] **A07:2021 – Identification and Authentication Failures:** [Impacto e mitigação]

### Security Review

- [ ] Security team reviewed: [Date]
- [ ] Penetration testing: [Required? Completed?]
- [ ] Vulnerability scan: [Results]

---

## Compliance Impact

### LGPD (Lei 13.709/2018)

- [ ] **Data Minimization:** [Como atendido]
- [ ] **Purpose Limitation:** [Como atendido]
- [ ] **Data Subject Rights:** [Impacto nos direitos]

### Lei 14.133/2021 (se aplicável)

- [ ] **Procurement Compliance:** [Impacto]

### WCAG 2.1 AA

- [ ] **Accessibility Impact:** [Positivo/Negativo/Neutro]

---

## Migration Plan

### Pre-Migration

- [ ] Backup database
- [ ] Test migrations in staging
- [ ] Document rollback procedure

### Migration

- [ ] Deploy code changes
- [ ] Run database migrations
- [ ] Update environment variables

### Post-Migration

- [ ] Validate functionality
- [ ] Monitor performance (24h)
- [ ] Monitor errors (Sentry)

### Rollback Procedure

```bash
# If migration fails
git revert <COMMIT_HASH>
npm run migration:revert
railway redeploy
```

---

## Testing Strategy

### Unit Tests

- [ ] Backend unit tests updated
- [ ] Frontend unit tests updated
- [ ] Coverage maintained (78%/76%)

### Integration Tests

- [ ] Integration tests for new architecture
- [ ] Backward compatibility tests (se aplicável)

### E2E Tests

- [ ] E2E tests updated for new flow
- [ ] Regression tests passing

### Performance Tests

- [ ] Load testing completed
- [ ] Benchmark validation

---

## Documentation Updates

- [ ] README.md updated
- [ ] ARCHITECTURE.md updated
- [ ] API documentation updated (Swagger)
- [ ] Runbooks updated (se operacional)
- [ ] Team notified (Slack/Email)

---

## Timeline

### Phase 1: Design & Approval

- **Start:** YYYY-MM-DD
- **End:** YYYY-MM-DD
- **Status:** Completed | In Progress | Pending

### Phase 2: Implementation

- **Start:** YYYY-MM-DD
- **End:** YYYY-MM-DD
- **Status:** Completed | In Progress | Pending

### Phase 3: Testing & Validation

- **Start:** YYYY-MM-DD
- **End:** YYYY-MM-DD
- **Status:** Completed | In Progress | Pending

### Phase 4: Deployment

- **Start:** YYYY-MM-DD
- **End:** YYYY-MM-DD
- **Status:** Completed | In Progress | Pending

---

## Monitoring & Success Metrics

### Success Criteria

- [ ] **SC1:** [Critério de sucesso 1]
- [ ] **SC2:** [Critério de sucesso 2]
- [ ] **SC3:** [Critério de sucesso 3]

### Monitoring

- [ ] Sentry alerts configured
- [ ] Performance dashboard updated
- [ ] Error rate baseline established

### Review Date

**First Review:** YYYY-MM-DD (1 month post-deployment)
**Second Review:** YYYY-MM-DD (3 months post-deployment)

---

## Related ADRs

- **Supersedes:** ADR-XXX (se aplicável)
- **Related to:** ADR-YYY, ADR-ZZZ
- **Referenced by:** ADR-AAA

---

## Approval

**System Architect:** [ ] Aprovado | Date: ******\_\_\_******
**Tech Lead:** [ ] Aprovado | Date: ******\_\_\_******
**Security Lead:** [ ] Aprovado | Date: ******\_\_\_****** (se security impact)
**Product Manager:** [ ] Aprovado | Date: ******\_\_\_****** (se business impact)

---

## Revision History

| Version | Date | Author | Changes |
| ------- | ---------- | ------ | ------------------------ |
| 1.0 | YYYY-MM-DD | [Nome] | Initial version |
| 1.1 | YYYY-MM-DD | [Nome] | [Descrição das mudanças] |

---

## References

- [Related Issue #XXX]
- [PRD Link]
- [Tech Spec Link]
- [External Documentation]
- [Research Papers/Articles]

---

**ADR Version:** 1.0
**BMAD Method:** v6.0.0-alpha
**Projeto:** ETP Express

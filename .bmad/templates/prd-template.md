# PRD: [Nome do Épico/Feature]

**Issue:** #XXX
**Épico:** [Nome do Épico]
**Prioridade:** P0 | P1 | P2 | P3
**Esforço Estimado:** X horas
**Data:** YYYY-MM-DD

---

## 1. Overview

### 1.1 Problema a Resolver

<!-- Descreva claramente o problema que esta feature resolve -->

### 1.2 Impacto em Produção

<!-- Se aplicável, descreva o impacto atual do problema -->

- **Usuários afetados:**
- **Frequência:**
- **Severidade:**

### 1.3 Stakeholders

<!-- Quem se beneficia desta feature? -->

- Servidores públicos
- Gestores de contratação
- Administradores de sistema
- Outros:

---

## 2. Success Metrics

### 2.1 KPIs Técnicos

- [ ] **Coverage:** Manter ou melhorar 78% backend / 76% frontend
- [ ] **Performance:** [Especificar métricas]
- [ ] **Accessibility Score:** WCAG 2.1 AA compliance
- [ ] **Security:** Zero vulnerabilidades P0/P1

### 2.2 KPIs de Negócio

- [ ] **User Satisfaction:** [Métrica]
- [ ] **Adoption Rate:** [Métrica]
- [ ] **Task Completion Time:** [Métrica]

---

## 3. User Stories

### 3.1 Story Principal

**As a** [tipo de usuário],
**I want** [objetivo],
**So that** [benefício].

**Acceptance Criteria:**

- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

### 3.2 Stories Adicionais

<!-- Se aplicável, adicione outras user stories -->

---

## 4. Requirements

### 4.1 Functional Requirements

- [ ] **FR1:** [Descrição]
- [ ] **FR2:** [Descrição]
- [ ] **FR3:** [Descrição]

### 4.2 Non-Functional Requirements

#### Performance

- [ ] **NFR-PERF1:** [Ex: Tempo de resposta < 2s P95]
- [ ] **NFR-PERF2:** [Ex: Suporta 100 usuários simultâneos]

#### Security

- [ ] **NFR-SEC1:** [Ex: Validação de input contra XSS]
- [ ] **NFR-SEC2:** [Ex: Rate limiting implementado]

#### Accessibility

- [ ] **NFR-A11Y1:** WCAG 2.1 AA compliance
- [ ] **NFR-A11Y2:** Keyboard navigation completa
- [ ] **NFR-A11Y3:** Screen reader compatible

### 4.3 Compliance Requirements

#### LGPD (Lei 13.709/2018)

- [ ] **LGPD1:** Dados pessoais minimizados
- [ ] **LGPD2:** Consent explícito (se aplicável)
- [ ] **LGPD3:** Audit trail implementado

#### Lei 14.133/2021 (se aplicável)

- [ ] **LEI1:** [Requisito específico]

#### OWASP Top 10

- [ ] **OWASP1:** [Mitigação específica]

---

## 5. Design & UX

### 5.1 UI/UX Requirements

<!-- Descreva requisitos de interface -->

- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Dark mode support (se aplicável)
- [ ] Loading states definidos
- [ ] Error states definidos

### 5.2 Mockups/Wireframes

<!-- Adicione links ou imagens de mockups -->

- [Link para Figma/Design]

---

## 6. Technical Considerations

### 6.1 Backend

- **Endpoints:** [Lista de endpoints afetados]
- **Database:** [Mudanças no schema]
- **Migrations:** [Necessárias?]

### 6.2 Frontend

- **Components:** [Componentes novos/modificados]
- **State Management:** [Zustand stores afetados]
- **API Integration:** [Endpoints consumidos]

### 6.3 Infrastructure

- **Railway:** [Mudanças de deploy/config]
- **Environment Variables:** [Novas variáveis necessárias]

---

## 7. Dependencies

### 7.1 Bloqueada por

- Issue #XXX - [Descrição]

### 7.2 Bloqueia

- Issue #YYY - [Descrição]

### 7.3 Relacionada a

- Issue #ZZZ - [Descrição]

---

## 8. Out of Scope

<!-- Liste explicitamente o que NÃO será implementado para evitar scope creep -->

- ❌ [Item fora do escopo 1]
- ❌ [Item fora do escopo 2]

---

## 9. Open Questions

<!-- Decisões pendentes, trade-offs a discutir -->

- [ ] **Q1:** [Pergunta aberta]
  - **Opções:** A, B, C
  - **Recommendation:** [Se houver]

- [ ] **Q2:** [Pergunta aberta]

---

## 10. Timeline & Milestones

### Fases de Implementação

1. **Phase 1:** [Nome] (X horas)
   - Tasks: [Lista]
2. **Phase 2:** [Nome] (Y horas)
   - Tasks: [Lista]

**Total Estimado:** X+Y horas

---

## 11. Risks & Mitigations

| Risco     | Probabilidade    | Impacto          | Mitigação            |
| --------- | ---------------- | ---------------- | -------------------- |
| [Risco 1] | Alta/Média/Baixa | Alto/Médio/Baixo | [Plano de mitigação] |
| [Risco 2] | ...              | ...              | ...                  |

---

## 12. Rollout Plan

### 12.1 Deployment Strategy

- [ ] Feature flag (se aplicável)
- [ ] Canary deployment (se aplicável)
- [ ] Blue-green deployment (padrão Railway)

### 12.2 Rollback Plan

- [ ] Condições de rollback definidas
- [ ] Rollback script: `git revert COMMIT_HASH && railway redeploy`

### 12.3 Monitoring

- [ ] Sentry alerts configurados
- [ ] Métricas de performance monitoradas
- [ ] Logs de erro revisados (24h post-deploy)

---

## 13. Approval

**Product Manager:** [ ] Aprovado
**System Architect:** [ ] Aprovado
**Tech Lead:** [ ] Aprovado

**Data de Aprovação:** ******\_\_\_******

---

## Anexos

- [Tech Spec Link]
- [Story Link]
- [ADR Link]
- [Mockups/Designs]

---

**Template Version:** 1.0
**BMAD Method:** v6.0.0-alpha
**Projeto:** ETP Express

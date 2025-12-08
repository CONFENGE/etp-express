# ROADMAP - ETP Express

**Atualizado:** 2025-12-08 | **Progresso:** 227/267 (85.0%) | **Auditoria:** Completa + Sync

## Status

```
M1: ████████████████████ 36/36  (100%) Foundation - Testes
M2: ████████████████████ 18/18  (100%) CI/CD Pipeline
M3: ████████████████████ 61/61  (100%) Quality & Security
M4: ████████████████████ 45/45  (100%) Refactoring & Performance
M5: ██████████░░░░░░░░░░ 17/28  (61%)  E2E Testing & Documentation
M6: ████████████░░░░░░░░ 41/61  (67%)  Maintenance
M7: ████████████████████  6/6   (100%) Multi-Tenancy B2G
M8: █████░░░░░░░░░░░░░░░  3/12  (25%)  Gestão de Domínios Institucionais [IN PROGRESS]
```

**Deploy:** ✅ Backend + Frontend operacionais (12/07) | **12 P0 CRÍTICOS (M8)**

---

## Milestones Concluídos

### M1: Foundation - Testes (100%)

Finalizado: 2025-11-20 | Cobertura: Backend 70%+, Frontend 60%+, Jest + Vitest

### M2: CI/CD Pipeline (100%)

Finalizado: 2025-11-21 | GitHub Actions + Railway deploy + -68% CI/CD minutos

### M3: Quality & Security (100%)

Finalizado: 2025-11-28 | OWASP audit + LGPD compliance + Rate limiting + WCAG fixes (#419, #421) + CVE fix (#413)

### M4: Refactoring & Performance (100%)

Finalizado: 2025-12-01 | Cache LLM -80% custos, Circuit Breaker, RAG PoC

### M7: Multi-Tenancy B2G (100%)

Finalizado: 2025-12-02 | Column-based isolation, TenantGuard, domain whitelist

---

## M8: Gestão de Domínios Institucionais (0%) [NEW]

**Objetivo:** Sistema de controle de acesso hierárquico para domínios institucionais

### Arquitetura de Acesso

| Role           | Descrição                             | Permissões                                      |
| -------------- | ------------------------------------- | ----------------------------------------------- |
| SYSTEM_ADMIN   | Gestor Master (tiago@confenge.com.br) | Gestão global de domínios                       |
| DOMAIN_MANAGER | Gestor Local (por domínio)            | Gerenciar até 10 usuários + criar ETPs próprios |
| DEMO           | Usuário Demonstração                  | Acesso completo, dados isolados, reset diário   |

### Usuários Iniciais

| Email                   | Senha     | Role         |
| ----------------------- | --------- | ------------ |
| tiago@confenge.com.br   | Crj70011! | SYSTEM_ADMIN |
| demoetp@confenge.com.br | teste2026 | DEMO         |

### Issues P0 - Backend (7)

- [x] #464 - Estender UserRole enum (SYSTEM_ADMIN, DOMAIN_MANAGER, DEMO) **[PR #476]**
- [x] #465 - Criar entidade AuthorizedDomain **[PR #477]**
- [x] #466 - Criar módulo SystemAdmin (CRUD domínios) **[PR #478]**
- [ ] #467 - Criar módulo DomainManager (CRUD usuários + quota 10)
- [ ] #468 - Implementar fluxo troca obrigatória de senha
- [ ] #469 - Criar seed script (master admin + demo user)
- [ ] #474 - Implementar isolamento e reset dados demo

### Issues P0 - Frontend (5)

- [ ] #470 - Dashboard gestão de domínios (System Admin)
- [ ] #471 - Dashboard gestão de usuários (Domain Manager)
- [ ] #472 - Modal troca obrigatória de senha
- [ ] #473 - Modernizar UI/UX (Apple HIG)
- [ ] #475 - CTA conversão WhatsApp para usuário demo

### Design (Apple HIG)

- Tipografia Inter/SF Pro
- Cores neutras, sombras sutis
- Transições 200-300ms ease-out
- Dark mode harmônico
- WCAG 2.1 AA

---

## M5: E2E Testing & Documentation (61%)

**Concluídos (17):** #22-#24, #34-#37, #48, #82-#84, #97, #215, #353, #367-#369

**Pendentes (11):**

- [ ] #92-#95 - UAT scenarios (recrutamento + sessões)
- [ ] #110 - Staged Rollout Strategy
- [ ] #111 - Production Support SLA
- [ ] #216-#218 - Prompt externalization
- [ ] #456 - Frontend test coverage (41% → 70%) **[NEW]**
- [ ] #458 - WCAG 2.1 accessibility gaps **[NEW]**

---

## M6: Maintenance (67%)

**Concluídos (41):** Redis/BullMQ, TypeORM fixes, migrations idempotentes, WCAG fixes, async UX, Railway deploy fixes (#404, #411, #423, #424, #428, #429, #431, #433, #434, #447, #448, #451)

**P0 CRÍTICOS (0):** ✅ Nenhum bloqueio

- [x] #447 - Backend deploy failing (railway.toml conflict) ✅ **RESOLVED via PR #462**
- [x] #448 - Frontend deploy failing (snapshot error) ✅ **RESOLVED via PORT variable fix**

**P1 Segurança (3):**

- [ ] #426 - Perplexity timeout (logs confirmam) **[P3→P1]**
- [ ] #449 - JWT localStorage XSS vulnerability **[NEW]**
- [ ] #450 - TypeScript noImplicitAny disabled **[NEW]**
- [x] #451 - LGPD hard delete scheduler ✅ **RESOLVED via PR #463**

**P2 Qualidade (10):**

- [ ] #382 - Replace 'any' types **[P3→P2]**
- [ ] #387 - pgvector migration (RAG) **[P0→P2]**
- [ ] #223-#224 - Rotação secrets automática
- [ ] #40 - Atualizar dependências
- [ ] #392 - Documentar deploy Railway
- [ ] #452 - CSRF protection incomplete **[NEW]**
- [ ] #453 - CSP headers missing **[NEW]**
- [ ] #454 - N+1 query risk **[NEW]**
- [ ] #455 - Cache memory leak risk **[NEW]**
- [ ] #457 - Missing useCallback/useMemo **[NEW]**

**P3 Otimizações (6):**

- [ ] #248 - Limite tamanho PRs
- [ ] #379 - Migrar LLMs obsoletos
- [ ] #401 - Health endpoint discrepância **[P2→P3]**
- [ ] #459 - Eager loading optimization **[NEW]**
- [ ] #460 - Migration timestamp fix **[NEW]**
- [ ] #461 - Bundle lazy loading **[NEW]**

---

## Auditoria Premium (2025-12-07)

**Metodologia:** Silicon Valley Premium Audit | Claude Code (Opus 4.5) | **GitHub Sync: 100%**

### Sumário Executivo

| Categoria     | Achados               | Ação                          |
| ------------- | --------------------- | ----------------------------- |
| Deploy        | 2 P0 críticos         | #447, #448 criados            |
| Segurança     | 4 vulnerabilidades P1 | #449-#451 + #426 repriorizado |
| Qualidade     | 7 issues P2           | #452-#458 criados             |
| Performance   | 4 otimizações P3      | #459-#461 criados             |
| Repriorização | 4 issues existentes   | #426↑ #387↓ #382↑ #401↓       |

### Próximos Passos (Ordem de Prioridade)

1. **Sprint 1:** ✅ COMPLETO - #447 + #448 DONE - Próximo: Perplexity (#426)
2. **Sprint 2 (1 semana):** Security P1 (#449, #450, #451)
3. **Sprint 3 (2 semanas):** Quality P2 (#452-#458)
4. **Backlog:** P3 + UAT + Documentation

---

## Métricas

| Métrica    | Valor              |
| ---------- | ------------------ |
| Velocidade | 10.6 issues/dia    |
| Coverage   | Backend 78%        |
| Tests      | 1000+ passando     |
| Security   | 4 P1 identificados |
| Latência   | -42% (60s→35s)     |

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- [Plano de Auditoria](/.claude/plans/agile-munching-firefly.md)

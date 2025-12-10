# ROADMAP - ETP Express

**Atualizado:** 2025-12-10 | **Progresso:** 278/312 (89.1%) | **Deploy:** Operacional

## Milestones

```
M1: Foundation          ████████████████████ 36/36  100%
M2: CI/CD Pipeline      ████████████████████ 18/18  100%
M3: Quality & Security  ████████████████████ 61/61  100%
M4: Refactoring & Perf  ████████████████████ 45/45  100%
M5: E2E & Docs          █████████████████░░░ 24/28   86%
M6: Maintenance         █████████████████░░░ 68/82   83%
M7: Multi-Tenancy B2G   ████████████████████  6/6   100%
M8: Domínios Instit.    ████████████████████ 24/24  100%
M9: Export/Import       ░░░░░░░░░░░░░░░░░░░░  0/16    0%
```

---

## Próximas Ações Prioritárias

### M8 - Gestão de Domínios ✅ COMPLETE (24/24)

**Concluídas recentemente:**

- [x] #543 Acessibilidade WCAG 2.1 AA (PR #571)
- [x] #539 UserManagement CRUD completo (PR #570)
- [x] #523 Setup adminStore + rotas
- [x] #524 AdminDashboard estatísticas
- [x] #525 DomainManagement CRUD
- [x] #526 DomainDetail + AssignManager
- [x] #527 Testes e responsividade
- [x] #537 Setup managerStore + rotas
- [x] #538 ManagerDashboard estatísticas
- [x] #540 Setup design tokens Apple HIG
- [x] #541 Componentes base estilizados
- [x] #542 Dark mode
- [x] #470 System Admin dashboard (parent)

### M5 - Quality (4 open)

| #    | Issue                 | Status |
| ---- | --------------------- | ------ |
| #110 | Staged rollout        | OPEN   |
| #111 | Production SLA        | OPEN   |
| #456 | Frontend coverage 70% | OPEN   |
| #458 | WCAG 2.1 gaps         | OPEN   |

### M6 - Maintenance (13 open)

**Security:**
| # | Issue | Priority |
| ---- | --------------- | -------- |
| #452 | CSRF protection | P2 |

✅ #453 CSP headers (PR #572) - MERGED

**Performance:**
| # | Issue | Priority |
| ---- | ----------------------- | -------- |
| #426 | Perplexity timeout | P3 |
| #454 | N+1 query fix | P2 |
| #455 | LLM cache memory leak | P2 |
| #457 | useCallback/useMemo | P2 |
| #459 | Eager loading User | P3 |
| #461 | Bundle lazy loading | P3 |

**Infrastructure:**
| # | Issue | Priority |
| ---- | ----------------------- | -------- |
| #379 | Migrar LLM obsoletos | P2 |
| #387 | PostgreSQL pgvector | P0 |
| #460 | Migration timestamp | P3 |
| #492 | ESLint 9 flat config | P2 |
| #493 | React Router v7 | P2 |
| #536 | DomainDetail test fix | P1 |

**Operations:**
| # | Issue | Priority |
| ---- | ------------------- | -------- |
| #223 | Secrets rotation | P4 |

### M9 - Export DOCX & Import Analysis (16 open)

**Feature 1: Export DOCX** (~9h)
| # | Issue | Dep. |
| ---- | ---------------------------------- | ----- |
| #548 | Setup biblioteca docx | - |
| #549 | Implementar exportToDocx | #548 |
| #550 | Endpoint GET /export/etp/:id/docx | #549 |
| #551 | Frontend botão Export DOCX | #550 |
| #552 | Testes E2E Export DOCX | #551 |

**Feature 2: Import & Analysis** (~27h)
| # | Issue | Dep. |
| ---- | ---------------------------------- | ---------- |
| #553 | Setup infraestrutura upload | - |
| #554 | Extração texto DOCX | #553 |
| #555 | Extração texto PDF | #553 |
| #556 | ETPAnalysisService (agents) | #554, #555 |
| #557 | Geração relatório melhorias | #556 |
| #558 | Conversão documento para ETP | #556 |
| #559 | Endpoints análise e conversão | #557, #558 |
| #560 | Frontend página Import & Analysis | #559 |
| #561 | Frontend exibição resultados | #560 |
| #562 | Frontend store análise | #559 |
| #563 | Testes E2E Import e Analysis | #561, #562 |

---

## Milestones Completos

### M1: Foundation - Testes (36/36)

Issues #1-#20, #41-#48, #77-#87

### M2: CI/CD Pipeline (18/18)

Issues #88-#105

**Infraestrutura:**

- ✅ Large Runners GitHub Enterprise configurados (16-core, 64GB RAM)
- Runner group: `confenge-runners`
- Todos os 7 workflows migrados para runners de alto desempenho

### M3: Quality & Security (61/61)

Issues #106-#145, #153-#158, #172-#186

### M4: Refactoring & Performance (45/45)

Issues #191-#222, #224-#257

### M7: Multi-Tenancy B2G (6/6)

Issues #261-#269, #298-#301

---

## Métricas

| Métrica           | Valor    |
| ----------------- | -------- |
| Issues Totais     | 312      |
| Issues Abertas    | 34       |
| Issues Fechadas   | 278      |
| Progresso         | 89.1%    |
| Velocidade        | 10.7/dia |
| Backend Coverage  | 78%      |
| Frontend Coverage | 76%      |
| Testes            | 1381     |

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Milestones](https://github.com/CONFENGE/etp-express/milestones)

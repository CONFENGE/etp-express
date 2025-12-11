# ROADMAP - ETP Express

**Atualizado:** 2025-12-11 | **Progresso:** 287/347 (82.7%) | **Deploy:** Operacional | **P0 Security:** 10 issues | **P0 Enterprise:** 20 issues

## Milestones

```
M1: Foundation          ████████████████████ 36/36  100%
M2: CI/CD Pipeline      ████████████████████ 18/18  100%
M3: Quality & Security  ████████████████████ 61/61  100%
M4: Refactoring & Perf  ████████████████████ 45/45  100%
M5: E2E & Docs          █████████████████░░░ 24/28   86%
M6: Maintenance         █████████████████░░░ 69/97   71%
M7: Multi-Tenancy B2G   ████████████████████  6/6   100%
M8: Domínios Instit.    ███████████████████░ 23/24   96%
M9: Export/Import       ████░░░░░░░░░░░░░░░░  4/16   25%
```

---

## Próximas Ações Prioritárias

### 🔴 ÉPICO P0 - Segurança e Estabilidade Produção (12 issues restantes)

**Objetivo:** Resolver vulnerabilidades críticas e fragilidades que afetam happy paths de usuários em produção.

**Épico 1: Security Backend (0 issues - ✅ COMPLETO)**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| ~~#598~~ | ~~SSL Certificate Validation desabilitado~~ | ✅ PR #614 (OWASP A03:2021) |
| ~~#599~~ | ~~CORS fallback para localhost~~ | ✅ PR #615 |
| ~~#600~~ | ~~Complexidade senha ausente no registro~~ | ✅ PR #616 (OWASP A07:2021) |
| ~~#601~~ | ~~Browser cleanup PDF pode falhar~~ | ✅ PR #618 |
| ~~#602~~ | ~~Admin authorization não implementada~~ | ✅ PR #613 (OWASP A01:2021) |

**Épico 2: Bugs Frontend (4 issues)**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| #603 | Memory leak em export operations | Performance |
| #604 | Race condition managerStore loading | UI travada |
| #605 | Dynamic import sem error handling | Auth loop |
| #606 | ProtectedRoute antes de auth check | Flash login |

**Épico 3: Infraestrutura (3 issues)**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| #607 | Graceful shutdown handler ausente | Requests perdidos |
| #608 | Logs verbose em produção | Data leak |
| #609 | npm audit ausente no CI | CVEs |

**Épico 4: UX Crítico (3 issues)**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| #610 | Unsaved changes warning ausente | Perda de trabalho |
| #611 | Polling AI continua após unmount | React warnings |
| #612 | Export sem progress/cancel | UX ruim |

**Labels:** `priority/P0`, `security`, `bug`

---

### 🚨 ÉPICO P0 - Lançamento Enterprise (20 issues)

**Objetivo:** Garantir login funcional + wow factors para demonstrações enterprise.

**Épico 1: Autenticação Funcional (Blocker)**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| #578 | Executar seed:admin em produção | 15min |
| #579 | Validação organização no login | 2h |
| #580 | Melhorar mensagens erro autenticação | 3h |

**Épico 2: Login UX/UI Enterprise (Wow Factors)**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| #581 | Toggle visibilidade senha | 1h |
| #582 | Validação tempo real campos | 2h |
| #583 | Ícone placeholder login | 1h |
| #584 | Spinner elegante autenticação | 1h |
| #585 | Animações entrada login | 2h |
| #586 | Indicadores campo obrigatório | 1h |
| #587 | Funcionalidade "Esqueceu senha" | 8h |

**Épico 3: Polish Visual Global**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| #588 | Componente ErrorState padronizado | 2h |
| #589 | Ilustrações empty states | 4h |
| #590 | Toast com undo ações destrutivas | 3h |
| #591 | Touch targets 44x44px | 4h |
| #592 | Micro-interações cards/botões | 3h |

**Épico 4: Feedback & Estados (Enterprise Grade)**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| #593 | Página 404 com ilustração | 2h |
| #594 | Breadcrumb navigation | 3h |
| #595 | Indicador online/offline | 2h |
| #596 | Skeleton loading completo | 4h |
| #597 | Confetti ETP 100% concluído | 2h |

**Esforço Total:** ~52h | **Labels:** `priority/P0`, `wow-factor`

---

### M8 - Gestão de Domínios ⚠️ 96% (23/24)

**Pendente:**
| # | Issue | Status |
| ---- | --------------------- | ------ |
| #470 | System Admin dashboard (parent) | OPEN |

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
| ~~#536~~ | ~~DomainDetail test fix~~ | ✅ DONE |

**Operations:**
| # | Issue | Priority |
| ---- | ------------------- | -------- |
| #223 | Secrets rotation | P4 |

### M9 - Export DOCX & Import Analysis (12 open, 4 done)

**Feature 1: Export DOCX** ✅ COMPLETE
| # | Issue | Status |
| ---- | ---------------------------------- | ------ |
| ~~#548~~ | ~~Setup biblioteca docx~~ | ✅ PR #573 |
| ~~#549~~ | ~~Implementar exportToDocx~~ | ✅ PR #574 |
| ~~#550~~ | ~~Endpoint GET /export/etp/:id/docx~~ | ✅ PR #576 |
| ~~#551~~ | ~~Frontend botão Export DOCX~~ | ✅ PR #577 |
| #552 | Testes E2E Export DOCX | OPEN |

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

- ✅ Migração para Standard Runners (2025-12-11)
  - **Motivo:** Larger Runners não podem usar os 50,000 min/mês incluídos no Enterprise
  - **Antes:** `ubuntu-16core` (cobrado $0.064/min, não usa cota gratuita)
  - **Depois:** `ubuntu-latest` (usa cota gratuita de 50,000 min/mês)
  - **Workflows alterados:** ci.yml, ci-tests.yml, playwright.yml
  - **Trade-off:** Builds mais lentos (2 cores vs 16) mas custo zero dentro da cota

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
| Issues Totais     | 347      |
| Issues Abertas    | 61       |
| Issues Fechadas   | 286      |
| Progresso         | 82.4%    |
| Velocidade        | 12.1/dia |
| Backend Coverage  | 78%      |
| Frontend Coverage | 76%      |
| Testes            | 1090     |
| P0 Security       | 11       |
| P0 Enterprise     | 20       |

---

## Infraestrutura de Commands

| Command            | Última Atualização | Status                                                            |
| ------------------ | ------------------ | ----------------------------------------------------------------- |
| `/audit-roadmap`   | 2025-12-10         | ✅ Sincronizado com M1-M9                                         |
| `/pick-next-issue` | 2025-12-10         | ✅ **Pipeline Mode** - Suporta até 3 PRs simultâneas              |
| `/review-pr`       | 2025-12-10         | ✅ **Pipeline Mode** - Prioriza PRs do pipeline, Coverage 78%/76% |

### Pipeline de Desenvolvimento

**Capacidade:** Máximo 3 PRs simultâneas no pipeline

**Tracking:** Label `status/pr-pending` no GitHub

**Fluxo:**

1. `/pick-next-issue` verifica capacidade do pipeline (máx 3)
2. Implementa issue e cria PR
3. Adiciona label `status/pr-pending` à issue
4. Se pipeline < 3: pode continuar com `/pick-next-issue`
5. Se pipeline = 3: obrigatório `/review-pr`
6. `/review-pr` prioriza PRs com label (+20 pontos no scoring)
7. Após merge: remove label e atualiza status

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Milestones](https://github.com/CONFENGE/etp-express/milestones)

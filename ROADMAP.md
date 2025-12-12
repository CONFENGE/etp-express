# ROADMAP - ETP Express

**Atualizado:** 2025-12-12 | **Progresso:** 301/348 (86.5%) | **Deploy:** 🟢 ONLINE | **P0 Security:** 1 issue | **P0 Enterprise:** 16 issues

## ✅ Deploy Backend Railway - RESOLVIDO

**Issue:** #631 (CLOSED)

**Problemas Identificados e Corrigidos:**

1. ✅ Build timeout → Puppeteer skipDownload + system Chromium
2. ✅ SSL Connection Error → PGSSLMODE=disable em typeorm.config.ts
3. ✅ TypeScript enum error → \_\_dirname-based paths para entities/migrations
4. ✅ ts-node not found → migration:run:prod script
5. ✅ Template HBS não copiado → nest-cli.json assets config
6. ✅ Workspace incorreto → NIXPACKS_START_CMD corrigido

**Status:** Backend operacional. Migrations executadas. NestJS rodando.

---

## Milestones

```
M1: Foundation          ████████████████████ 36/36  100%
M2: CI/CD Pipeline      ████████████████████ 18/18  100%
M3: Quality & Security  ████████████████████ 61/61  100%
M4: Refactoring & Perf  ████████████████████ 45/45  100%
M5: E2E & Docs          █████████████████░░░ 24/28   86%
M6: Maintenance         █████████████████░░░ 69/82   84%
M7: Multi-Tenancy B2G   ████████████████████  6/6   100%
M8: Domínios Instit.    ███████████████████░ 23/24   96%
M9: Export/Import       ████░░░░░░░░░░░░░░░░  4/16   25%
```

---

## Próximas Ações Prioritárias

### 🔴 ÉPICO P0 - Segurança e Estabilidade Produção (5 issues restantes)

**Objetivo:** Resolver vulnerabilidades críticas e fragilidades que afetam happy paths de usuários em produção.

**Épico 1: Security Backend (0 issues - ✅ COMPLETO)**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| ~~#598~~ | ~~SSL Certificate Validation desabilitado~~ | ✅ PR #614 (OWASP A03:2021) |
| ~~#599~~ | ~~CORS fallback para localhost~~ | ✅ PR #615 |
| ~~#600~~ | ~~Complexidade senha ausente no registro~~ | ✅ PR #616 (OWASP A07:2021) |
| ~~#601~~ | ~~Browser cleanup PDF pode falhar~~ | ✅ PR #618 |
| ~~#602~~ | ~~Admin authorization não implementada~~ | ✅ PR #613 (OWASP A01:2021) |

**Épico 2: Bugs Frontend (0 issues - ✅ COMPLETO)**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| ~~#603~~ | ~~Memory leak em export operations~~ | ✅ PR #619 |
| ~~#604~~ | ~~Race condition managerStore loading~~ | ✅ PR #621 |
| ~~#605~~ | ~~Dynamic import sem error handling~~ | ✅ PR #623 |
| ~~#606~~ | ~~ProtectedRoute antes de auth check~~ | ✅ PR #624 | |

**Épico 3: Infraestrutura (0 issues - ✅ COMPLETO)**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| ~~#607~~ | ~~Graceful shutdown handler ausente~~ | ✅ PR #617 |
| ~~#608~~ | ~~Logs verbose em produção~~ | ✅ PR #620 |
| ~~#609~~ | ~~npm audit ausente no CI~~ | ✅ PR #622 |

**Épico 4: UX Crítico (1 issue)**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| ~~#610~~ | ~~Unsaved changes warning ausente~~ | ✅ PR #625 |
| ~~#611~~ | ~~Polling AI continua após unmount~~ | ✅ PR #626 |
| #612 | Export sem progress/cancel | UX ruim |

**Labels:** `priority/P0`, `security`, `bug`

---

### 🚨 ÉPICO P0 - Lançamento Enterprise (20 issues)

**Objetivo:** Garantir login funcional + wow factors para demonstrações enterprise.

**Épico 1: Autenticação Funcional (Blocker)**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| #578 | Executar seed:admin em produção | 15min |
| ~~#579~~ | ~~Validação organização no login~~ | ✅ PR #633 |
| ~~#580~~ | ~~Melhorar mensagens erro autenticação~~ | ✅ PR #635 |

**Épico 2: Login UX/UI Enterprise (Wow Factors)**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| #581 | Toggle visibilidade senha | 1h |
| #582 | Validação tempo real campos | 2h |
| ~~#583~~ | ~~Ícone placeholder login~~ | ✅ PR #636 |
| ~~#584~~ | ~~Spinner elegante autenticação~~ | ✅ PR #634 |
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

| Métrica           | Valor  |
| ----------------- | ------ |
| Issues Totais     | 348    |
| Issues Abertas    | 47     |
| Issues Fechadas   | 301    |
| Progresso         | 86.5%  |
| Velocidade        | 17/dia |
| Backend Coverage  | 78%    |
| Frontend Coverage | 76%    |
| Testes            | 1846   |
| P0 Security       | 1      |
| P0 Enterprise     | 16     |

---

## Changelog Recente

### 2025-12-12

**PR #636 - Ícone Login/Register (Issue #583)** ✅

- **Feature:** Substituído ícone FileText por ClipboardList (mais representativo para documentos estruturados)
- **Mudanças:**
  - Novo ícone ClipboardList do lucide-react em Login.tsx e Register.tsx
  - Container circular com background sutil (`bg-primary/10 rounded-full p-3`)
  - `aria-hidden="true"` para acessibilidade
- **Testes:** +36 linhas (2 novos testes para verificação do ícone)
- **Validação `/review-pr`:** Score 100/100 (8 categorias)
- **Post-merge:** 3 layers de validação passaram (build, tests, CI pipeline)

---

### 2025-12-11

**PR #625 - Unsaved Changes Warning (Issue #610)** ✅

- **Feature:** Aviso ao usuário quando há alterações não salvas no ETPEditor
- **Componentes criados:**
  - `useUnsavedChangesWarning` - Hook para bloqueio de navegação (React Router + beforeunload)
  - `UnsavedChangesDialog` - Diálogo de confirmação com AlertDialog
- **Melhorias no ETPEditor:**
  - Tracking de dirty state comparando conteúdo atual vs último salvo
  - Indicador visual (\*) no título quando há alterações pendentes
  - Reset do dirty state após save bem-sucedido
- **Testes:** +29 novos testes (15 hook + 14 componente)
- **Validação `/review-pr`:** Score 100/100 (8 categorias)
- **Post-merge:** 3 layers de validação passaram (build, tests, CI pipeline)

**PR #624 - ProtectedRoute Auth Check (Issue #606)** ✅

- Corrigido flash da tela de login durante refresh de página
- Auth check agora aguarda carregamento antes de renderizar

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

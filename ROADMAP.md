# ROADMAP - ETP Express

**Atualizado:** 2025-12-14 | **Progresso:** 326/360 (90.6%) | **Deploy:** 🟢 ONLINE | **P0 Security:** 0 issues | **P0 Enterprise:** 0 issues | **Hardening:** 6 issues

## 🛡️ Hardening & Refactoring (6 issues restantes)

**Origem:** Análise de segurança externa (dez/2024)
**Validação:** Codebase auditado, 2 pontos já implementados, 10 issues criadas

### ✅ Pontos Validados e Já Implementados

| Ponto                      | Status | Implementação                                                                         |
| -------------------------- | ------ | ------------------------------------------------------------------------------------- |
| **Assincronismo (BullMQ)** | ✅ OK  | `sections.processor.ts`, `app.module.ts` - Workers em background, retry exponencial   |
| **Circuit Breakers**       | ✅ OK  | `openai.service.ts`, `perplexity.service.ts` - Opossum com 60s timeout, 50% threshold |
| **Connection Pool**        | ✅ OK  | `app.module.ts` - Max 20, min 5, timeouts configurados para Railway                   |
| **Graceful Shutdown**      | ✅ OK  | `main.ts` - SIGTERM/SIGINT handlers, 10s timeout                                      |

### ✅ P1 - Segurança Multi-Tenancy (0 issues restantes - COMPLETO)

| #        | Issue                                                   | Status               |
| -------- | ------------------------------------------------------- | -------------------- |
| ~~#648~~ | ~~AnalyticsService - Filtragem por organizationId~~     | ✅ CLOSED 2025-12-13 |
| ~~#649~~ | ~~SearchService - Isolamento de cache por organização~~ | ✅ PR #665           |
| ~~#650~~ | ~~SimilarContract - Adicionar campo organizationId~~    | ✅ PR #661           |
| ~~#651~~ | ~~Prompt Injection - Melhorar sanitização input~~       | ✅ PR #666           |

### 🟡 P2 - Observabilidade (4 issues)

| #    | Issue                             | Impacto                        |
| ---- | --------------------------------- | ------------------------------ |
| #652 | Logging estruturado em JSON       | Análise de logs facilitada     |
| #653 | Request ID/Trace ID em logs       | Correlação de requisições      |
| #654 | OpenTelemetry distributed tracing | Visibilidade por componente    |
| #655 | Métricas de negócio Prometheus    | KPIs: tokens, latência, falhas |

### 🟢 P3 - Melhorias (2 issues)

| #    | Issue                            | Benefício                         |
| ---- | -------------------------------- | --------------------------------- |
| #656 | Validação estruturada saída LLM  | Detectar outputs maliciosos       |
| #657 | Documentar PgBouncer para escala | Preparação para escala horizontal |

---

## Milestones

```
M1: Foundation          ████████████████████ 36/36  100%
M2: CI/CD Pipeline      ████████████████████ 18/18  100%
M3: Quality & Security  ████████████████████ 61/61  100%
M4: Refactoring & Perf  ████████████████████ 45/45  100%
M5: E2E & Docs          █████████████████░░░ 24/28   86%
M6: Maintenance         █████████████████░░░ 70/82   85%
M7: Multi-Tenancy B2G   ████████████████████  6/6   100%
M8: Domínios Instit.    ███████████████████░ 23/24   96%
M9: Export/Import       █████░░░░░░░░░░░░░░░  5/16   31%
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

**Épico 4: UX Crítico - ✅ COMPLETO**
| # | Issue | Impacto |
| ---- | ----------------------------------------- | ------- |
| ~~#610~~ | ~~Unsaved changes warning ausente~~ | ✅ PR #625 |
| ~~#611~~ | ~~Polling AI continua após unmount~~ | ✅ PR #626 |
| ~~#612~~ | ~~Export sem progress/cancel~~ | ✅ PR #660 |

**Labels:** `priority/P0`, `security`, `bug`

---

### ✅ ÉPICO P0 - Lançamento Enterprise (0 issues restantes - COMPLETO)

**Objetivo:** Garantir login funcional + wow factors para demonstrações enterprise.

**Épico 1: Autenticação Funcional (Blocker) - ✅ COMPLETO**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| ~~#578~~ | ~~Executar seed:admin em produção~~ | ✅ PR #637 |
| ~~#579~~ | ~~Validação organização no login~~ | ✅ PR #633 |
| ~~#580~~ | ~~Melhorar mensagens erro autenticação~~ | ✅ PR #635 |

**Épico 2: Login UX/UI Enterprise (Wow Factors) - ✅ COMPLETO**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| ~~#581~~ | ~~Toggle visibilidade senha~~ | ✅ CLOSED |
| ~~#582~~ | ~~Validação tempo real campos~~ | ✅ PR #640 |
| ~~#583~~ | ~~Ícone placeholder login~~ | ✅ PR #636 |
| ~~#584~~ | ~~Spinner elegante autenticação~~ | ✅ PR #634 |
| ~~#585~~ | ~~Animações entrada login~~ | ✅ PR #641 |
| ~~#586~~ | ~~Indicadores campo obrigatório~~ | ✅ PR #638 |
| ~~#587~~ | ~~Funcionalidade "Esqueceu senha"~~ | ✅ PR #664 |

**Épico 3: Polish Visual Global - ✅ COMPLETO**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| ~~#588~~ | ~~Componente ErrorState padronizado~~ | ✅ PR #639 |
| ~~#589~~ | ~~Ilustrações empty states~~ | ✅ CLOSED |
| ~~#590~~ | ~~Toast com undo ações destrutivas~~ | ✅ PR #645 |
| ~~#591~~ | ~~Touch targets 44x44px~~ | ✅ PR #659 |
| ~~#592~~ | ~~Micro-interações cards/botões~~ | ✅ PR #647 |

**Épico 4: Feedback & Estados (Enterprise Grade)**
| # | Issue | Esforço |
| ---- | ----------------------------------------- | ------- |
| ~~#593~~ | ~~Página 404 com ilustração~~ | ✅ PR #642 |
| ~~#594~~ | ~~Breadcrumb navigation~~ | ✅ PR #646 |
| ~~#595~~ | ~~Indicador online/offline~~ | ✅ PR #643 |
| ~~#596~~ | ~~Skeleton loading completo~~ | ✅ PR #658 |
| ~~#597~~ | ~~Confetti ETP 100% concluído~~ | ✅ PR #644 |

**Esforço Total:** ✅ COMPLETO | **Labels:** `priority/P0`, `wow-factor`

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

### M5 - E2E & Docs - 85% (23/27, 4 open)

| #    | Issue                 | Status |
| ---- | --------------------- | ------ |
| #110 | Staged rollout        | OPEN   |
| #111 | Production SLA        | OPEN   |
| #456 | Frontend coverage 70% | OPEN   |
| #458 | WCAG 2.1 gaps         | OPEN   |

### M6 - Maintenance (12 open)

**Security:** ✅ ALL COMPLETE
| # | Issue | Priority |
| ---- | --------------- | -------- |
| ~~#452~~ | ~~CSRF protection~~ | ✅ CLOSED 2025-12-14 |
| ~~#453~~ | ~~CSP headers~~ | ✅ PR #572 |

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
| ~~#553~~ | ~~Setup infraestrutura upload~~ | ✅ PR #667 |
| #554 | Extração texto DOCX | ~~#553~~ |
| #555 | Extração texto PDF | ~~#553~~ |
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

M1 Foundation (36/36), M2 CI/CD (18/18), M3 Quality (61/61), M4 Refactoring (45/45), M7 Multi-Tenancy (6/6) - **Total: 166 issues**

---

## Métricas

| Métrica           | Valor |
| ----------------- | ----- |
| Issues Totais     | 360   |
| Issues Abertas    | 34    |
| Issues Fechadas   | 326   |
| Progresso         | 90.6% |
| Velocidade        | 7/dia |
| Backend Coverage  | 78%   |
| Frontend Coverage | 76%   |
| Testes            | 1879  |
| P0 Security       | 0     |
| P0 Enterprise     | 0     |
| Hardening P1      | 0     |
| Hardening P2      | 4     |
| Hardening P3      | 2     |

---

## Infraestrutura Claude Code

**Atualizado:** 2025-12-14

### MCP Servers Configurados

| Server              | Propósito                                       | Status         |
| ------------------- | ----------------------------------------------- | -------------- |
| Memory              | Knowledge graph - padrões, compliance, prompts  | ✅ Configurado |
| Sequential Thinking | Raciocínio estruturado para problemas complexos | ✅ Configurado |
| GitHub              | Issues, PRs, code search, workflows             | ✅ Configurado |
| PostgreSQL          | Queries em linguagem natural                    | ✅ Configurado |
| Context7            | Documentação de bibliotecas                     | ✅ Configurado |
| Exa                 | Web search e code context                       | ✅ Configurado |
| Playwright          | Browser automation                              | ✅ Configurado |
| Railway             | Deploy, logs, variables                         | ✅ Configurado |

**Arquivo:** `.mcp.json`

### Comandos Slash Disponíveis (19 total)

**Core Workflow (7 existentes):**

- `/pick-next-issue` - Seleção determinística de issues
- `/review-pr` - Review e merge automatizado
- `/audit-roadmap` - Detecção de drift no ROADMAP
- `/prd-etp` - Geração de PRD
- `/product-brief-etp` - Brief executivo
- `/story-etp` - Template de user story
- `/tech-spec-etp` - Especificação técnica

**Novos Comandos (9):**

- `/catchup` - Restaurar contexto após /clear
- `/smart-fix` - Debug inteligente adaptativo
- `/commit` - Commit semântico automatizado
- `/test-coverage` - Análise de cobertura com recomendações
- `/security-scan` - Scan OWASP + npm audit + secrets
- `/lint-fix` - Auto-fix ESLint + Prettier
- `/db-migrate` - Gerenciamento TypeORM migrations
- `/deploy-check` - Validação pré-deploy Railway
- `/health-check` - Status dos serviços em produção

**Superpowers (3):**

- `/brainstorm` - Design Socrático interativo
- `/write-plan` - Criar plano de implementação detalhado
- `/execute-plan` - Executar plano em batches com checkpoints

**Diretório:** `.claude/commands/`

### Skills - Superpowers (20) + Customizadas (6)

**Superpowers (20 skills):**

| Categoria     | Skills                                                                                |
| ------------- | ------------------------------------------------------------------------------------- |
| Testing       | `test-driven-development`, `testing-anti-patterns`, `condition-based-waiting`         |
| Debugging     | `systematic-debugging`, `root-cause-tracing`, `defense-in-depth`                      |
| Verification  | `verification-before-completion`                                                      |
| Planning      | `brainstorming`, `writing-plans`, `executing-plans`, `writing-skills`                 |
| Workflow      | `subagent-driven-development`, `dispatching-parallel-agents`, `finishing-development` |
| Collaboration | `requesting-code-review`, `receiving-code-review`, `sharing-skills`                   |
| Tools         | `using-git-worktrees`, `using-superpowers`, `testing-skills-with-subagents`           |

**Customizadas (6 skills):**

| Skill                     | Ativação              | Propósito                        |
| ------------------------- | --------------------- | -------------------------------- |
| `proactive-orchestration` | Toda mensagem         | Execução automática de commands  |
| `nestjs-patterns`         | Edita `backend/src/`  | Guards, pipes, decorators NestJS |
| `react-patterns`          | Edita `frontend/src/` | Hooks, state, shadcn/ui          |
| `typeorm-guide`           | Edita entities        | Relations, queries, transactions |
| `lei-14133`               | Trabalha com ETPs     | Compliance Lei 14.133/2021       |
| `bullmq-patterns`         | Trabalha com jobs     | Queues, workers, retry logic     |

**Diretório:** `.claude/skills/`

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Milestones](https://github.com/CONFENGE/etp-express/milestones)

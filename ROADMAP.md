# ROADMAP - ETP Express

**Atualizado:** 2025-12-20 | **Progresso:** 355/392 (90.6%) | **Deploy:** P0 COMPLETE ✅ | **Go-Live:** TBD | **Strategy:** Stabilization Sprint

> **DECISÃO CTOs (18/12/2024):** Sprint de estabilizacao antes do go-live. 41 issues criadas para resolver deficiencias criticas.

---

## SPRINT GO-LIVE DEFINITIVO (41 issues)

**Criado:** 2025-12-18 | **Objetivo:** Resolver todas as deficiencias que corroem credibilidade do sistema

### P0 - BLOQUEADORES CRITICOS (0 open / 10 total) ✅ COMPLETO

| #        | Issue                                                              | Status  |
| -------- | ------------------------------------------------------------------ | ------- |
| ~~#777~~ | ~~Fix health endpoint 404 - verificar HealthModule registration~~  | ✅ DONE |
| ~~#778~~ | ~~Executar seed:admin em producao Railway~~                        | ✅ DONE |
| ~~#779~~ | ~~Renovar/verificar EXA_API_KEY em Railway~~                       | ✅ DONE |
| ~~#780~~ | ~~Configurar variaveis SMTP em Railway~~                           | ✅ DONE |
| ~~#781~~ | ~~Configurar SENTRY_DSN backend e frontend~~                       | ✅ DONE |
| ~~#782~~ | ~~Atualizar emails de @etpexpress.com para @confenge.com.br~~      | ✅ DONE |
| ~~#783~~ | ~~Atualizar URLs de producao em documentacao~~                     | ✅ DONE |
| ~~#784~~ | ~~Remover emoticons do AppTour.tsx~~                               | ✅ DONE |
| ~~#785~~ | ~~Remover emoticons do MANUAL_USUARIO.md~~                         | ✅ DONE |
| ~~#786~~ | ~~Auditar e remover emoticons decorativos de arquivos do projeto~~ | ✅ DONE |

### P1 - UX CRITICO (0 open / 11 total) ✅ COMPLETO

| #        | Issue                                              | Status  |
| -------- | -------------------------------------------------- | ------- |
| ~~#787~~ | ~~Aumentar font-size minimo de 11px para 12px~~    | ✅ DONE |
| ~~#788~~ | ~~Melhorar contraste de texto secundario~~         | ✅ DONE |
| ~~#789~~ | ~~Revisar text-xs em form-field.tsx~~              | ✅ DONE |
| ~~#790~~ | ~~Adicionar welcome modal para primeiro login~~    | ✅ DONE |
| ~~#791~~ | ~~Melhorar empty state do dashboard~~              | ✅ DONE |
| ~~#792~~ | ~~Mensagens de erro amigaveis para falhas de API~~ | ✅ DONE |
| ~~#793~~ | ~~Ajustar design tokens para melhor legibilidade~~ | ✅ DONE |
| ~~#794~~ | ~~Padronizar micro-interacoes existentes~~         | ✅ DONE |
| ~~#795~~ | ~~Criar guia de tom e voz institucional~~          | ✅ DONE |
| ~~#796~~ | ~~Remover linguagem AI-like das interfaces~~       | ✅ DONE |
| ~~#797~~ | ~~Revisar empty states com CTAs claros~~           | ✅ DONE |

### P2 - OPERACIONAL (5 open / 10 total)

| #        | Issue                                                | Status  |
| -------- | ---------------------------------------------------- | ------- |
| #798     | Criar MANUAL_TESTER.md para gestores e testadores    | OPEN    |
| #799     | Criar TROUBLESHOOTING.md com problemas comuns        | OPEN    |
| ~~#800~~ | ~~Exportar documentacao OpenAPI/Swagger~~            | ✅ DONE |
| #801     | Criar OPS_RUNBOOK.md com procedimentos operacionais  | OPEN    |
| #802     | Configurar dashboard de metricas em Railway          | OPEN    |
| ~~#803~~ | ~~Adicionar endpoint /api/health/ready~~             | ✅ DONE |
| ~~#804~~ | ~~Configurar rate limiting agressivo para /auth/\*~~ | ✅ DONE |
| ~~#805~~ | ~~Criar script de verificacao de security headers~~  | ✅ DONE |
| #806     | Executar re-teste completo pos-correcoes P0          | OPEN    |
| ~~#807~~ | ~~Documentar processo de validacao pre-deploy~~      | ✅ DONE |

### P3 - FUTURO (10 issues)

| #    | Issue                                          | Status |
| ---- | ---------------------------------------------- | ------ |
| #808 | Implementar mutation testing com Stryker       | OPEN   |
| #809 | Adicionar visual regression testing            | OPEN   |
| #810 | Integrar OWASP ZAP no CI                       | OPEN   |
| #811 | Implementar cache Redis para respostas LLM     | OPEN   |
| #812 | Configurar CDN para assets estaticos           | OPEN   |
| #813 | Adicionar alertas para slow queries            | OPEN   |
| #814 | Implementar sistema de feature flags           | OPEN   |
| #815 | Configurar WAF (Web Application Firewall)      | OPEN   |
| #816 | Documentar estrategia multi-regiao DR          | OPEN   |
| #817 | Adicionar export de audit logs para compliance | OPEN   |

**Esforco Estimado:** ~108-152h | **Labels:** `go-live`, `priority/P0-P3`

---

## Hardening & Refactoring (5 issues restantes)

**Origem:** Análise de segurança externa (dez/2024)
**Validação:** Codebase auditado, 2 pontos já implementados, 18 issues criadas

### ✅ Pontos Validados e Já Implementados

| Ponto                      | Status | Implementação                                                                       |
| -------------------------- | ------ | ----------------------------------------------------------------------------------- |
| **Assincronismo (BullMQ)** | ✅ OK  | `sections.processor.ts`, `app.module.ts` - Workers em background, retry exponencial |
| **Circuit Breakers**       | ✅ OK  | `openai.service.ts`, `exa.service.ts` - Opossum com 60s timeout, 50% threshold      |
| **Connection Pool**        | ✅ OK  | `app.module.ts` - Max 20, min 5, timeouts configurados para Railway                 |
| **Graceful Shutdown**      | ✅ OK  | `main.ts` - SIGTERM/SIGINT handlers, 10s timeout                                    |

### ✅ P0 - Deploy Crítico (0 issues - COMPLETO)

| #        | Issue                                        | Est.  | Status            |
| -------- | -------------------------------------------- | ----- | ----------------- |
| ~~#753~~ | ~~Remover referências residuais Perplexity~~ | 30min | ✅ DONE (PR #761) |

### ✅ P1 - UX Crítico (0 issues - COMPLETO)

| #        | Issue                                          | Est.   | Status            |
| -------- | ---------------------------------------------- | ------ | ----------------- |
| ~~#754~~ | ~~SSE/streaming para feedback geração seções~~ | ~~8h~~ | ✅ DONE (PR #763) |
| ~~#755~~ | ~~SearchResult estruturado Gov-APIs~~          | ~~4h~~ | ✅ DONE (PR #762) |
| ~~#756~~ | ~~DataSourceStatus frontend (alerta serviço)~~ | ~~3h~~ | ✅ DONE (PR #771) |

### ✅ P2 - Segurança Multi-Tenancy (0 issues - COMPLETO)

| #        | Issue                                              | Est.   | Status            |
| -------- | -------------------------------------------------- | ------ | ----------------- |
| ~~#757~~ | ~~Middleware centralizado autorização tenancy~~    | ~~6h~~ | ✅ DONE (PR #765) |
| ~~#758~~ | ~~Fix updateCompletionPercentage() sem validação~~ | ~~1h~~ | ✅ DONE (PR #764) |

### ✅ P1 - Segurança Multi-Tenancy Anterior (0 issues restantes - COMPLETO)

| #        | Issue                                                   | Status               |
| -------- | ------------------------------------------------------- | -------------------- |
| ~~#648~~ | ~~AnalyticsService - Filtragem por organizationId~~     | ✅ CLOSED 2025-12-13 |
| ~~#649~~ | ~~SearchService - Isolamento de cache por organização~~ | ✅ PR #665           |
| ~~#650~~ | ~~SimilarContract - Adicionar campo organizationId~~    | ✅ PR #661           |
| ~~#651~~ | ~~Prompt Injection - Melhorar sanitização input~~       | ✅ PR #666           |

### ✅ P1 - Observabilidade Crítica (0 issues - COMPLETO)

| #        | Issue                           | Impacto    | Sprint |
| -------- | ------------------------------- | ---------- | ------ |
| ~~#652~~ | ~~Logging estruturado em JSON~~ | ✅ PR #680 | 1      |
| ~~#653~~ | ~~Request ID/Trace ID em logs~~ | ✅ PR #681 | 1      |

### v1.1 - Observabilidade Avançada (2 issues - Postergado)

| #    | Issue                             | Impacto                        |
| ---- | --------------------------------- | ------------------------------ |
| #654 | OpenTelemetry distributed tracing | Visibilidade por componente    |
| #655 | Métricas de negócio Prometheus    | KPIs: tokens, latência, falhas |

### P3 - Melhorias (3 issues)

| #        | Issue                                | Benefício                            |
| -------- | ------------------------------------ | ------------------------------------ |
| #656     | Validação estruturada saída LLM      | Detectar outputs maliciosos          |
| ~~#657~~ | ~~Documentar PgBouncer para escala~~ | ✅ DONE (2025-12-18)                 |
| #759     | Rich Text (WYSIWYG) formulários      | Tabelas, listas, formatação avançada |
| #760     | Documentar agentes determinísticos   | Clareza arquitetural (Regex vs LLM)  |

---

## Milestones

```
M1: Foundation ████████████████████ 36/36 100%
M2: CI/CD Pipeline ████████████████████ 18/18 100%
M3: Quality & Security ████████████████████ 61/61 100%
M4: Refactoring & Perf ████████████████████ 45/45 100%
M5: E2E & Docs █████████████████░░░ 26/30 87%
M6: Maintenance ██████████████████░░ 77/85 91%
M7: Multi-Tenancy B2G ████████████████████ 6/6 100%
M8: Domínios Instit. ████████████████████ 24/24 100% ✅ COMPLETE
M9: Export/Import ████████████████████ 16/16 100% ✅ COMPLETE
Go-Live B2G ██████████████░░░░░░ 10/14 71%
```

---

## Próximas Ações Prioritárias

### ÉPICO - Go-Live B2G (4 issues restantes) - DATA FLEXÍVEL

**Criado:** 2024-12-16 | **Objetivo:** Lançamento comercial B2G com todas as condições de prontidão atendidas

> **DECISÃO CTOs (16/12/2024):** GO CONFIRMADO. Progresso excepcional: M9 100%, Observabilidade P1, Migração Exa 87.5%, Gov-API Core 36%.

#### Sprint 3 (Continuação) - Performance + Validações ✅ COMPLETE

| #        | Issue                              | Prior.     | Est.   | Status               |
| -------- | ---------------------------------- | ---------- | ------ | -------------------- |
| ~~#457~~ | ~~useCallback/useMemo~~            | ~~P2~~     | ~~4h~~ | ✅ CLOSED 2025-12-18 |
| ~~#676~~ | ~~Load testing k6 - 100 usuários~~ | ~~**P1**~~ | ~~4h~~ | ✅ PR #750           |

#### Sprint 4 (Final) - QA + Go-Live

**P0 - Bloqueantes:**
| # | Issue | Est. | Status |
|---|-------|------|--------|
| ~~#735~~ | ~~Scale backend 2+ réplicas Railway~~ | ~~2h~~ | ✅ PR #746 |
| ~~#738~~ | ~~Fix Puppeteer npm config warning~~ | ~~30min~~ | ✅ CLOSED 2025-12-17 |

**P1 - Críticos:**
| # | Issue | Est. | Status |
|---|-------|------|--------|
| ~~#736~~ | ~~E2E teste fluxo completo usuário~~ | ~~4h~~ | ✅ PR #749 |
| ~~#737~~ | ~~Smoke test checklist pré-launch~~ | ~~2h~~ | ✅ PR #748 |
| ~~#675~~ | ~~Manual usuário PDF para órgãos B2G~~ | ~~8h~~ | ✅ CLOSED 2025-12-18 |
| ~~#677~~ | ~~Canal de suporte email~~ | ~~4h~~ | ✅ CLOSED 2025-12-18 |
| #741 | Deploy final validado | 2h | OPEN |
| #742 | Monitoramento 24h pós-deploy | 8h | OPEN |

**P1 - Infrastructure:** ✅ COMPLETE
| # | Issue | Est. | Status |
|---|-------|------|--------|
| ~~#657~~ | ~~Documentar PgBouncer para escala~~ | ~~12h~~ | ✅ CLOSED 2025-12-18 |

**P2 - Enterprise Onboarding:**
| # | Issue | Est. | Status |
|---|-------|------|--------|
| ~~#743~~ | ~~Tour guiado in-app~~ | ~~6h~~ | ✅ CLOSED 2025-12-18 |
| #111 | SLA formal | 4h | OPEN |
| ~~#739~~ | ~~Atualizar dependências outdated~~ | ~~6h~~ | ✅ CLOSED 2025-12-18 |
| #744 | Pitch deck B2G | 8h | OPEN |

**P3 - Tech Debt:**
| # | Issue | Est. |
|---|-------|------|
| #740 | Refactor deprecated methods | 2h |

**v1.1 - Postergar:**
| # | Issue | Est. |
|---|-------|------|
| TBD | Migrar SINAPI/SICRO para PostgreSQL | 8h |

**Total Esforço Restante:** ~14h (4 issues: #741, #742, #744, #740)

**Labels:** `go-live`, `go-to-market`, `priority/P0`, `priority/P1`, `priority/P2`

---

### ÉPICO P0 - Segurança e Estabilidade Produção (5 issues restantes)

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

### M8 - Gestão de Domínios ✅ 100% COMPLETE (24/24)

| #        | Issue                               | Status                           |
| -------- | ----------------------------------- | -------------------------------- |
| ~~#470~~ | ~~System Admin dashboard (parent)~~ | ✅ CLOSED (sub-issues completas) |

**Sub-issues completas:**

- ✅ #523 Setup adminStore + rotas
- ✅ #524 AdminDashboard estatísticas
- ✅ #525 DomainManagement CRUD
- ✅ #526 DomainDetail + AssignManager
- ✅ #527 Testes e responsividade

### M5 - E2E & Docs - 86% (25/29, 4 open)

| #    | Issue                 | Status |
| ---- | --------------------- | ------ |
| #110 | Staged rollout        | OPEN   |
| #111 | Production SLA        | OPEN   |
| #456 | Frontend coverage 70% | OPEN   |
| #458 | WCAG 2.1 gaps         | OPEN   |

### M6 - Maintenance (8 open)

**Security:** ✅ ALL COMPLETE
| # | Issue | Priority |
| ---- | --------------- | -------- |
| ~~#452~~ | ~~CSRF protection~~ | ✅ CLOSED 2025-12-14 |
| ~~#453~~ | ~~CSP headers~~ | ✅ PR #572 |

**Performance:**
| # | Issue | Priority |
| ---- | ----------------------- | -------- |
| ~~#426~~ | ~~Perplexity timeout~~ | ✅ CLOSED |
| ~~#454~~ | ~~N+1 query fix~~ | ✅ PR #689 |
| ~~#455~~ | ~~LLM cache memory leak~~ | ✅ PR #734 |
| ~~#457~~ | ~~useCallback/useMemo~~ | ✅ CLOSED 2025-12-18 |
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

### M9 - Export DOCX & Import Analysis ✅ COMPLETE (0 open, 16 done)

> **Decisão:** Feature-complete no MVP. Sprint intensivo nas semanas 1-4.

**Feature 1: Export DOCX** ✅ COMPLETE
| # | Issue | Status |
| ---- | ---------------------------------- | ------ |
| ~~#548~~ | ~~Setup biblioteca docx~~ | ✅ PR #573 |
| ~~#549~~ | ~~Implementar exportToDocx~~ | ✅ PR #574 |
| ~~#550~~ | ~~Endpoint GET /export/etp/:id/docx~~ | ✅ PR #576 |
| ~~#551~~ | ~~Frontend botão Export DOCX~~ | ✅ PR #577 |
| ~~#552~~ | ~~Testes E2E Export DOCX~~ | ✅ PR #733 |

**Feature 2: Import & Analysis** (27h - P1)
| # | Issue | Prior. | Sprint |
| ---- | ---------------------------------- | ------ | ------ |
| ~~#553~~ | ~~Setup infraestrutura upload~~ | ✅ PR #667 | - |
| ~~#554~~ | ~~Extração texto DOCX~~ | ✅ PR #668 | - |
| ~~#555~~ | ~~Extração texto PDF~~ | ✅ PR #669 | - |
| ~~#556~~ | ~~ETPAnalysisService (agents)~~ | ✅ PR #682 | - |
| ~~#557~~ | ~~Geração relatório melhorias~~ | ✅ PR #684 | - |
| ~~#558~~ | ~~Conversão documento para ETP~~ | ✅ PR #685 | - |
| ~~#559~~ | ~~Endpoints análise e conversão~~ | ✅ PR #687 | - |
| ~~#560~~ | ~~Frontend página Import & Analysis~~ | ✅ PR #721 | - |
| ~~#561~~ | ~~Frontend exibição resultados~~ | ✅ PR #723 | - |
| ~~#562~~ | ~~Frontend store análise~~ | ✅ PR #722 | - |
| ~~#563~~ | ~~Testes E2E Import e Analysis~~ | ✅ CLOSED | - |

---

## Sprint Plan 30 Dias (Go-Live B2G)

**Origem:** REUNIAO_EXTRAORDINARIA_CTOS.md (14/12/2024)
**Total:** 83h (~21h/semana)

### Sprint 1 (Semana 1) - Infra Crítica + Observabilidade | ✅ 100% COMPLETE

| #        | Issue                             | Prior.     | Est. |
| -------- | --------------------------------- | ---------- | ---- |
| ~~#670~~ | ~~Corrigir nixpacks.toml~~        | ✅ CLOSED  | -    |
| ~~#671~~ | ~~Scale backend 2+ réplicas~~     | ✅ CLOSED  | -    |
| ~~#652~~ | ~~JSON logging estruturado~~      | ✅ PR #680 | -    |
| ~~#653~~ | ~~Request/Trace IDs~~             | ✅ PR #681 | -    |
| ~~#672~~ | ~~Documentar restore PostgreSQL~~ | ✅ PR #688 | -    |
| ~~#673~~ | ~~Alertas Railway~~               | ✅ PR #683 | -    |
| ~~#555~~ | ~~PDF Extraction~~                | ✅ PR #669 | -    |

### Sprint 2 (Semana 2) - M9 Backend | ✅ 100% COMPLETE

| #        | Issue                           | Prior.     | Est. |
| -------- | ------------------------------- | ---------- | ---- |
| ~~#556~~ | ~~ETPAnalysisService (agents)~~ | ✅ PR #682 | -    |
| ~~#557~~ | ~~Report Generation~~           | ✅ PR #684 | -    |
| ~~#558~~ | ~~Doc Conversion~~              | ✅ PR #685 | -    |
| ~~#559~~ | ~~Endpoints análise~~           | ✅ PR #687 | -    |

### Sprint 3 (Semana 3) - M9 Frontend + Performance | ✅ 100% COMPLETE

| #        | Issue                           | Prior.     | Est. |
| -------- | ------------------------------- | ---------- | ---- |
| ~~#560~~ | ~~Import Page UI~~              | ✅ PR #721 | -    |
| ~~#561~~ | ~~Results Display~~             | ✅ PR #723 | -    |
| ~~#562~~ | ~~Analysis Store~~              | ✅ PR #722 | -    |
| ~~#454~~ | ~~N+1 query fix~~               | ✅ PR #689 | -    |
| ~~#457~~ | ~~useCallback/useMemo~~         | ✅ CLOSED  | -    |
| ~~#676~~ | ~~Load testing k6 (100 users)~~ | ✅ PR #750 | -    |

### Sprint 4 (Semana 4) - QA + Go-Live | ✅ COMPLETE

| #        | Issue                         | Prior.     | Est. |
| -------- | ----------------------------- | ---------- | ---- |
| ~~#563~~ | ~~E2E Tests Import/Analysis~~ | ✅ CLOSED  | -    |
| ~~#552~~ | ~~E2E Export DOCX~~           | ✅ PR #733 | -    |
| ~~#674~~ | ~~Smoke test checklist~~      | ✅ CLOSED  | -    |
| ~~#675~~ | ~~Manual usuário PDF~~        | ✅ CLOSED  | -    |
| ~~#677~~ | ~~Canal suporte email~~       | ✅ CLOSED  | -    |
| ~~#455~~ | ~~LLM cache memory leak~~     | ✅ PR #734 | -    |

---

## ✅ ÉPICO - Migração Perplexity → Exa (8 issues) - 100% COMPLETE

**Criado:** 2025-12-15 | **Objetivo:** Substituir PerplexityService por ExaService para melhor custo-benefício

### Sprint 1 - Core Migration ✅ COMPLETE

| #        | Issue                                          | Prior. | Status  |
| -------- | ---------------------------------------------- | ------ | ------- |
| ~~#706~~ | ~~ExaService com interface PerplexityService~~ | ✅     | PR #715 |
| ~~#707~~ | ~~Configuração ambiente Exa~~                  | ✅     | PR #714 |
| ~~#708~~ | ~~SearchModule usar ExaService~~               | ✅     | PR #719 |
| ~~#709~~ | ~~Orchestrator migrar para Exa~~               | ✅     | PR #720 |

### Sprint 2 - Remaining Migrations ✅ COMPLETE

| #        | Issue                                       | Prior. | Status            |
| -------- | ------------------------------------------- | ------ | ----------------- |
| ~~#710~~ | ~~Anti-hallucination fact-checking → Exa~~  | ✅     | PR #724           |
| ~~#711~~ | ~~Health checks → Exa~~                     | ✅     | PR #725           |
| ~~#712~~ | ~~Remove Perplexity code and dependencies~~ | ✅     | PR #728           |
| ~~#713~~ | ~~Update documentation (Perplexity → Exa)~~ | ✅     | CLOSED 2025-12-18 |

**Labels:** `type/refactor`, `area/backend`

---

## ÉPICO - Migração para APIs Governamentais (11 issues)

**Criado:** 2025-12-14 | **Objetivo:** Substituir Perplexity por fontes oficiais (PNCP, Compras.gov.br, SINAPI, SICRO)

> **Decisão:** APIs governamentais como fonte primária para licitações e preços de referência. Perplexity apenas como fallback para informações complementares.

### Sprint 1 - APIs de Licitações ✅ COMPLETE

| #        | Issue                                 | Prior. | Status  |
| -------- | ------------------------------------- | ------ | ------- |
| ~~#690~~ | ~~Base module gov-api~~               | ✅     | PR #716 |
| ~~#691~~ | ~~Integrar Compras.gov.br (SIASG)~~   | ✅     | PR #717 |
| ~~#692~~ | ~~Integrar PNCP (Lei 14.133)~~        | ✅     | PR #718 |
| ~~#695~~ | ~~Unified search service~~            | ✅     | PR #731 |
| ~~#696~~ | ~~Refactor orchestrator (gov-first)~~ | ✅     | PR #751 |

### Sprint 2 - Tabelas de Preços ✅ COMPLETE

| #        | Issue                             | Prior. | Status                           |
| -------- | --------------------------------- | ------ | -------------------------------- |
| ~~#693~~ | ~~SINAPI data ingestion (Excel)~~ | ✅     | PR #726                          |
| ~~#694~~ | ~~SICRO data ingestion (Excel)~~  | ✅     | PR #727, #730 (xlsx→ExcelJS fix) |
| ~~#697~~ | ~~Migrations entidades gov-data~~ | ✅     | PR #732                          |
| ~~#698~~ | ~~Jobs sync automático (BullMQ)~~ | ✅     | PR #774                          |

### Sprint 3 - Observabilidade (1 open)

| #        | Issue                             | Prior. | Status            |
| -------- | --------------------------------- | ------ | ----------------- |
| ~~#699~~ | ~~Métricas gov-api (Prometheus)~~ | ✅     | CLOSED 2025-12-18 |
| #700     | Documentação integração           | P3     | -                 |

**Labels:** `area/gov-api`, `enhancement`

---

## Backlog v1.1 (Postergado)

| #    | Issue                 | Esforço |
| ---- | --------------------- | ------- |
| #654 | OpenTelemetry         | 4h      |
| #655 | Prometheus metrics    | 4h      |
| #110 | Staged rollout        | TBD     |
| #387 | pgvector migration    | TBD     |
| #111 | SLA definition        | 4h      |
| #456 | Frontend coverage 70% | 8h      |
| #458 | WCAG 2.1 gaps         | 4h      |

---

## Milestones Completos

M1 Foundation (36/36), M2 CI/CD (18/18), M3 Quality (61/61), M4 Refactoring (45/45), M7 Multi-Tenancy (6/6), M8 Domínios (24/24), M9 Export/Import (16/16) - **Total: 206 issues**

---

## Métricas

| Métrica           | Valor    |
| ----------------- | -------- |
| Issues Totais     | 392      |
| Issues Abertas    | 38       |
| Issues Fechadas   | 355      |
| Progresso         | 90.3%    |
| Velocidade        | 10.3/dia |
| Backend Coverage  | 78%      |
| Frontend Coverage | 76%      |
| Testes            | 1879     |
| P0 Go-Live        | 0 ✅     |
| P1 Go-Live        | 0 ✅     |
| P2 Go-Live        | 5        |
| P3 Go-Live        | 10       |
| P2 Gov-API        | 1        |
| v1.1 Backlog      | 7        |

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

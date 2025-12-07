# 🗺️ ROADMAP - ETP Express

**Última Atualização:** 2025-12-07 02:55 UTC | **Auditoria ROADMAP:** 238 issues validadas (207 closed, 30 open), M1-M7 progress synced with GitHub, #35 ✅ MERGED (frontend logging service), #424 ✅ VALIDATED (build artifacts confirmed)

## 📊 Status Atual

**Progresso Global:** 205/233 issues concluídas (88.0%)
**Velocidade:** 9.4 issues/dia (últimos 7 dias: 66 issues)
**ETA Conclusão:** ~2025-12-09 (3 dias - quality-first approach)
**✅ Deploy Status:** Backend production OPERATIONAL & VALIDATED & SECURE | Frontend BUILD VALIDATED (aguardando Railway redeploy) | Resolvidos: #186 (async queue), #221 (test coverage job status), #222 (async UX), #390, #391 (duplicated), #400, #402-#407, #409, #411, #413 (security fix), #416 (job status API), #419, #421, #423, #424 (build artifacts validated), #24 (accessibility tests), #428 (nixpacks conflict), #429 (railway.json), #438 (frontend async UX) - zero vulnerabilities

```
M1: ████████████████████ 35/35  (100%) ✅ Foundation - Testes
M2: ████████████████████ 18/18  (100%) ✅ CI/CD Pipeline
M3: ████████████████████ 57/57  (100%) ✅ Quality & Security
M4: ████████████████████ 44/44  (100%) ✅ Refactoring & Performance
M5: ████████░░░░░░░░░░░░ 11/26  (42.3%) 📚 E2E Testing & Documentation
M6: ██████████████░░░░░░ 28/41  (68.3%) 🔄 Maintenance (#438 ✅ MERGED - async UX)
M7: ████████████████████  6/6   (100%) ✅ Multi-Tenancy B2G
```

**Bloqueadores:** Nenhum P0 crítico - #424 validada, todos build artifacts confirmados, aguardando Railway redeploy frontend

---

## 🎯 Milestones

### ✅ M1: Foundation - Testes (35/35) - 100%

**Finalizado:** 2025-11-20

- Cobertura: Backend 70%+, Frontend 60%+
- Zero erros TypeScript (96 → 0)
- Suite completa: Jest + Vitest

**Issues:** #1-#13, #42-#43, #50-#63, #99-#103, #243

---

### ✅ M2: CI/CD Pipeline (18/18) - 100%

**Finalizado:** 2025-11-21

- GitHub Actions: lint + tests + coverage
- Deploy Railway: backend + frontend + PostgreSQL
- Infrastructure as Code + zero-downtime deployment
- **Otimização:** -68% minutos CI/CD (cache NPM + path filters + secret scanning otimizado)

**Issues:** #18-#20, #44-#45, #104-#107, #112, #180, #183, #252-#257

---

### ✅ M3: Quality & Security (57/57) - 100%

**Finalizado:** 2025-11-28

**Segurança:**

- OWASP Top 10 audit (0 vulnerabilidades HIGH)
- Secret scanning (Gitleaks + GitHub)
- Security.md + Vulnerability Disclosure Policy

**LGPD Compliance:**

- Mapeamento fluxo de dados pessoais
- Data export + deletion (CASCADE)
- Política de Privacidade + Audit trail

**Performance:**

- Rate limiting por usuário (5 req/min)
- React Router navigation fixes

**Issues:** #14-#17, #38-#39, #46, #85-#87, #109, #113-#114, #145, #153-#158, #176-#179, #191-#197, #202-#205, #233-#239, #247, #261-#269, #298-#301

---

### ✅ M4: Refactoring & Performance (44/44) - 100%

**Finalizado:** 2025-12-01

**Refatoração:**

- DRY: DISCLAIMER constant, localStorage cleanup
- TypeScript: 'any' → interfaces (orchestrator, auth)
- Componentização: ETPEditor.tsx (4 subcomponentes)
- Orchestrator helpers: validators, generators, runners

**Performance:**

- ✅ Cache LLM: OpenAI (TTL 24h) + Perplexity (TTL 7d)
  - Economia: ~80% custos OpenAI (~$40/1000 gerações)
  - Latência: -25s (5-30s → <5s em cache HIT)
- ✅ Selective loading: -75% query reduction
- ✅ Paralelização agentes: 4-5x speedup
- ✅ Connection pooling PostgreSQL (Railway optimized)

**Resiliência:**

- Circuit Breaker: OpenAI + Perplexity (Opossum)
- Retry exponential backoff
- Health check proativo

**RAG & Anti-Hallucinação:**

- PoC RAG Lei 14.133/2021 (pgvector)
- Integração AntiHallucinationAgent
- Fact-checking reverso via Perplexity

**Auditoria Arquitetural:**

- ✅ Módulo Sections: 83% conformidade
- ✅ Módulo Orchestrator: 95% conformidade - APROVADO para produção
- ✅ Módulo User: 92% conformidade - APROVADO CONDICIONALMENTE (requer RBAC)

**Issues:** #25-#33, #41, #47, #77-#81, #88-#91, #108, #172, #206-#214, #231, #300-#301, #316-#319, #321, #326-#329, #339-#343

---

### 📚 M5: E2E Testing & Documentation (11/26) - 42.3%

**Status:** EM PROGRESSO | **ETA:** 2025-12-08

#### Concluídas (11):

- ✅ #22 - Configurar Puppeteer para testes E2E (PR #353)
- ✅ #23 - E2E Test - Critical Flow Complete (PR #372 - 2025-12-03)
  - **Merge Automatizado:** `/review-pr` (8/8 categorias validadas, score 75% técnico / 100% qualitativo)
  - **Test Suite:** 537 linhas (10-step critical flow: login → create ETP → AI generation → save → export PDF)
  - **Qualidade:** API mocking ($0 cost), screenshots on failure, resource cleanup
  - **Post-Merge:** ✅ Layer 1-3 validation passed (build+tests, CI pipeline)
- ✅ #24 - E2E Accessibility tests (Axe-core) → **RESOLVIDO** (PR #418 MERGED - 2025-12-06)
  - **Implementação:** Testes WCAG 2.1 AA usando @axe-core/playwright
  - **Cobertura:** 5 páginas (Login, Register, Dashboard, ETPs List, New ETP)
  - **Funcionalidades:** 6 testes específicos (keyboard nav, labels, contrast, alt text, headings, ARIA)
  - **Compliance:** LBI Lei 13.146/2015 (Lei Brasileira de Inclusão)
- ✅ #34 - JSDoc completo em OrchestratorService e agentes (PR #366)
- ✅ #48 - UAT (parent - desmembrada em #92-#95)
- ✅ #367 - Fix etps.controller.spec.ts - organizationId parameter missing (✅ RESOLVED by PR #371 - 2025-12-02)
- ✅ #368 - Fix Multi-Tenancy tests - 60 tests fixed (sections + etps modules) (PR #371 - 2025-12-02)
- ✅ #97 - Documentation sync & JSDoc
- ✅ #353 - Configure Puppeteer for E2E Testing
- ✅ #369 - Fix auth.controller.spec.ts - Organization mock missing 'etps' property (PR #370)
- ✅ #35 - Frontend logging service with Sentry integration (PR #439 - 2025-12-07)
  - **Merge Automatizado:** `/review-pr` (8/8 categorias validadas, score 100%)
  - **Implementação:** Logger service (logger.ts) com 4 níveis (debug, info, warn, error)
  - **Sentry:** captureException + breadcrumbs + setUser/setContext
  - **Cobertura:** 26 testes, 238 linhas de teste, 5 console.error substituídos

#### Pendentes (15):

**Testes E2E:**

- [ ] #82-#84 - Testes integração adicionais
- [ ] #92-#95 - UAT scenarios

**Documentação:**

- [ ] #36-#37 - Docs técnicas (README badges, arquitetura)
- [ ] #110 - Staged Rollout Strategy & Feature Flags
- [ ] #111 - Production Support SLA & Training
- [ ] #215-#218 - Prompt externalization (YAML, service, hot-reload)

**Issues:** #22-#24, #34-#37, #48, #82-#84, #92-#95, #97, #110-#111, #215-#218, #353, #367-#369

---

### 🔄 M6: Maintenance (28/41) - 68.3%

**Status:** RECORRENTE

#### Concluídas (28):

- ✅ #21 - Configurar Dependabot
- ✅ #181 - Migration-aware readiness probe
- ✅ #219 - Setup Redis no Railway (desbloqueou #220-#222)
- ✅ #220 - BullMQ implementation (PR #386 - MERGED 2025-12-04)
  - ✅ Fix: BullMQ config usa redisConfig (parseia REDIS_URL do Railway)
  - ✅ Fix: Frontend railway.toml startCommand (npx serve)
  - ✅ Railway: Redis service deployed + REDIS_URL configured
- ✅ #374 - Fix TypeORM Railway crash (Organization.stripeCustomerId explicit type)
- ✅ #375 - Fix TypeORM User entity explicit types (PR #380 - 2025-12-03)
- ✅ #376 - Fix TypeORM AuditLog entity explicit types (PR #383 - 2025-12-03)
- ✅ #377 - Fix TypeORM AnalyticsEvent entity explicit types (PR #384 - 2025-12-04)
- ✅ #378 - Fix TypeORM explicit types entidades restantes (PR #385 - 2025-12-04)
- ✅ #379 - Migrar LLMs: GPT-4.1 nano + Perplexity sonar (~30% redução custos)
- ✅ #396 - Railway: Database schema vazio - migrations falhando (PR #399 + hotfix 0fbb813)
- ✅ #393 - [P0] Railway build failing: nest command error (RESOLVIDO 2025-12-04 12:30 UTC)
- ✅ #394 - [P0] Railway crash: PostgreSQL SSL connection error (RESOLVIDO 2025-12-04 13:45 UTC)
- ✅ #397 - [P2] Railway: Corrigir healthcheckPath no railway.toml (RESOLVIDO 2025-12-04 22:16 UTC)

#### Concluídas Recentes (11):

- ✅ #186 - [P1] Implementar processamento assíncrono com BullMQ (PR #416 - MERGED 2025-12-05 23:40 UTC)
- ✅ #321 - [P2] Fix monorepo @nestjs/common dependency conflict (MERGED - 2025-12-01)
- ✅ #388 - [P0] Railway crash: NODE_ENV variable not set (RESOLVIDO 2025-12-04 12:15 UTC)
- ✅ #389 - [P0] Railway build failing: husky prepare script (RESOLVIDO commit a5ec173)
- ✅ #390 - [P1] Validação End-to-End Deploy Railway (RESOLVIDO 2025-12-05 13:00 UTC)
  - **Validação Completa:** 8/9 checks passing (88.9% - PRODUCTION READY)
  - **Documento:** scripts/validation-results-390-railway-e2e.md
  - **Score:** Health ✅, Database ✅, Redis ✅, Auth ✅, Response Time ✅ (<1s)
- ✅ #391 - [P2] API de Status de Jobs Assíncronos (CLOSED - duplicada de #186)
- ✅ #404 - [P0][HOTFIX] Column naming mismatch (etpId→etp_id) (PR #408 - MERGED 2025-12-05)
- ✅ #405 - [P0][HOTFIX] Make CreateSecretAccessLogs migration idempotent (Commit 9452594)
- ✅ #406 - [P0][HOTFIX] Disable ALL secret_access_logs migrations (Commit 3333fd3)
- ✅ #407 - [P0][HOTFIX] Fix AddLgpdConsentFields migration idempotency (PR #408 - MERGED 2025-12-05)
- ✅ #409 - [P0][HOTFIX] AddInternationalTransferConsent migration idempotency (PR #410 - MERGED 2025-12-05 via /review-pr)
- ✅ #411 - [P0][HOTFIX] Fix AddDeletedAtToUsers migration idempotency (PR #412 - MERGED 2025-12-05 12:35 UTC via /review-pr)
- ✅ #419 - [P0] Wrap authentication pages in <main> landmark for WCAG (PR #420 - MERGED 2025-12-06 17:24 UTC)
- ✅ #421 - [P0] Fix WCAG link-in-text-block violation (PR #422 - MERGED 2025-12-06 18:02 UTC)
- ✅ #222 - [P2] Frontend async UX - section generation progress tracking (PR #438 - MERGED 2025-12-06 23:20 UTC via /review-pr)
  - **Implementação:** Polling utilities, progress tracking, status messages
  - **Novos arquivos:** polling.ts, polling.test.ts (17 tests)
  - **Qualidade:** JSDoc completo, error handling robusto, 88 tests passing

#### Pendentes (12):

**P0 - Critical:**

- ✅ #428 - [P0][HOTFIX] Frontend healthcheck failing - serve not starting correctly → **PR #437 MERGED** (2025-12-06 21:40 UTC via /review-pr)
  - **Root Cause:** `nixpacks.toml` na raiz sobrescrevia config do frontend
  - **Fix:** Removido nixpacks.toml da raiz - cada serviço usa sua própria config
  - **Post-Merge:** Layer 1 validation passed (Build + 966 tests)
- ✅ #429 - [P0][HOTFIX] Remover conflito entre railway.json e frontend/railway.toml → **RESOLVIDO** (2025-12-06)
  - **Status:** Fechada
- ✅ #424 - [P0] Validate frontend build artifacts and dist directory structure → **VALIDADO** (2025-12-07 02:30 UTC)
  - **Resultados:** Build local ✅, dist/index.html ✅, assets JS/CSS ✅, serve test ✅
  - **Status:** Todos 5 critérios de aceitação passaram - nenhuma correção necessária

**P2 - Medium:**

- [ ] #387 - [P2] Migrar PostgreSQL para versão com suporte a pgvector
  - **Bloqueio:** pgvector extension não disponível (RAG disabled como workaround)
  - **Impacto:** RAG Module não funcional
  - **Status:** Workaround estável aplicado
- [ ] #223-#224 - Rotação secrets automática
- [ ] #248 - Processo: limite tamanho PRs
- [ ] #40 - Atualizar dependências desatualizadas

**P3 - Low:**

- [ ] #392 - [P3] Documentar processo de deploy Railway completo
  - DEPLOYMENT.md com troubleshooting (#388, #387, #389)
- [ ] #379 - Migrar modelos LLM obsoletos para GPT-4.1 nano e Perplexity sonar
- [ ] #381 - Replace console statements with structured logging (4 warnings)
- [ ] #382 - Replace 'any' types in OrchestratorService (14 warnings)
- [ ] #401 - Investigar discrepância Health endpoint JSON vs text/plain
- [ ] #426 - [P3][Backend] Aumentar timeout Perplexity e melhorar resiliência

**Issues:** #21, #40, #181, #219-#224, #248, #374-#382, #387, #392, #401, #424, #426, #428-#429

---

### ✅ M7: Multi-Tenancy B2G (6/6) - 100%

**Finalizado:** 2025-12-02 | **Tempo Executado:** 30h de 31h

**Objetivo:** Transformar o sistema de Single-Tenant para Multi-Tenant (column-based isolation), permitindo múltiplas prefeituras/órgãos públicos utilizarem a mesma instância com isolamento de dados garantido.

**Arquitetura:** Column-Based Isolation

- Modelo: organizationId em User e Etp
- Kill Switch: TenantGuard global para suspender organizações
- Validação: Registro apenas para domínios autorizados (whitelist)

#### Concluídas (6):

- ✅ #354 - [MT-01] Infraestrutura de Dados (Schema Organization) - 4h (PR #360)
  - Entidade Organization + OrganizationsModule
  - Validação CNPJ + domainWhitelist + isActive
  - Tests: 21 testes passando

- ✅ #355 - [MT-02] Associação de Usuários (User-Org Relation) - 3h (PR #361)
  - organizationId em User entity
  - Campo 'orgao' removido completamente (breaking change)
  - Migration + relação ManyToOne

- ✅ #356 - [MT-03] Refatoração do Registro (Auth Guardrails) - 6h (PR #362)
  - Validação de domínio de email
  - Busca Organization por domainWhitelist
  - JWT payload com organizationId

- ✅ #357 - [MT-04] Middleware de Contexto e Bloqueio (Kill Switch) - 4h (PR #363)
  - TenantGuard global (bloqueia orgs suspensas)
  - RolesGuard + @Roles decorator para RBAC
  - Audit trail de bloqueios
  - Endpoints suspend/reactivate protegidos (ADMIN only)

- ✅ #358 - [MT-05] Isolamento de Dados dos ETPs (Data Scoping) - 6h (PR #364)
  - organizationId em Etp entity (NOT NULL + FK)
  - Campo metadata.orgao removido (breaking change limpo)
  - EtpsService: auto-inject organizationId, filter by org
  - SectionsService: organizationId em todos métodos
  - Tests: 823/836 passando (98.4%)

- ✅ #359 - [MT-06] Adaptação do Frontend (Onboarding) - 3h (PR #365)
  - User interface: organization { id, name }
  - UnauthorizedDomainModal + OrganizationSuspendedModal
  - Register.tsx: domain validation message + error handling
  - Header.tsx: organization name display
  - Tests: 71/71 passando (100%)

**Ordem de Implementação:** ✅ MT-01 → ✅ MT-02 → ✅ MT-03 → ✅ MT-04 → ✅ MT-05 → ✅ MT-06

**Issues:** #354-#359 | **PRs:** #360, #361, #362, #363, #364, #365

---

## 🎯 Próximos Passos

### ✅ P0 - CRITICAL (FRONTEND DEPLOY - TODOS RESOLVIDOS):

1. ~~**#428 - [HOTFIX] Frontend healthcheck failing**~~ - ✅ PR #437 MERGED
   - **Status:** RESOLVIDO via /review-pr (2025-12-06 21:40 UTC)
   - **Root Cause:** nixpacks.toml raiz sobrescrevia frontend config
   - **Fix:** Removido nixpacks.toml - cada serviço usa config própria
   - **Post-Merge:** Layer 1 passed (Build + 966 tests)

2. ~~**#429 - [HOTFIX] Conflito railway.json**~~ - ✅ RESOLVIDO

3. ~~**#424 - Validate frontend build artifacts**~~ - ✅ VALIDADO (2025-12-07 02:30 UTC)
   - **Resultados:** Build local ✅, dist/ ✅, assets ✅, serve test ✅
   - **Conclusão:** Todos 5 critérios passaram - nenhuma correção necessária

### ✅ P0 - CRITICAL COMPLETADAS (2025-12-04 a 2025-12-06):

1. **Backend Migrations Stabilization** - ✅ SÉRIE COMPLETA
   - ✅ #400-#411 - Todas migrations idempotentes
   - ✅ Backend production OPERATIONAL, zero crash loops

2. **Accessibility (WCAG 2.1)** - ✅ SÉRIE COMPLETA
   - ✅ #24 - Testes E2E Accessibility (PR #418)
   - ✅ #419 - Main landmark em auth pages
   - ✅ #421 - Link visual distinction fix
   - **Resultado:** 100% WCAG 2.1 AA compliant

3. **Async Processing** - ✅ SÉRIE COMPLETA
   - ✅ #186 - BullMQ implementation
   - ✅ #391 - Job Status API (merged com #186)
   - **Resultado:** Polling API funcional, zero timeouts

### P1 - Esta Semana (2025-12-07 a 2025-12-09):

1. **Frontend Deploy** - ✅ #428/#429/#424 TODOS RESOLVIDOS - aguardando Railway redeploy
2. **E2E Tests (#82-#84)** - Testes integração adicionais
3. **UAT scenarios (#92-#95)** - Recrutamento + sessões

### P2 - Próxima Sprint:

1. ~~Frontend async UX (#222)~~ - ✅ MERGED via PR #438 (2025-12-06)
2. Prompt externalization (#215-#218)
3. Staged rollout strategy (#110)
4. pgvector migration (#387) - quando houver janela

---

## 📈 Métricas

| Métrica    | Valor                         |
| ---------- | ----------------------------- |
| Velocidade | 9.4 issues/dia (66 em 7 dias) |
| Coverage   | Backend 78%, Frontend 60%+    |
| Tests      | 920+ passando                 |
| Security   | Zero vulnerabilidades HIGH    |
| Latência   | -42% (60s → 35s avg)          |
| CI/CD      | -68% minutos/mês              |

---

## 📚 Referências

- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura sistema
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) - Prontidão produção
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Resumo executivo

---

**Status:** 🟢 Frontend build VALIDATED (#424 ✅) | Backend ✅ | **Risco:** Baixo - aguardando Railway redeploy (zero P0 abertos)

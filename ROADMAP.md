# 🗺️ ROADMAP - ETP Express

**Última Atualização:** 2025-12-05 01:10 UTC | **Auditoria Completa:** 32 issues auditadas, 6 repriorizadas, #404 RESOLVIDA

## 📊 Status Atual

**Progresso Global:** 185/211 issues concluídas (87.7%)
**Velocidade:** 8.3 issues/dia (últimos 7 dias: 58 issues)
**ETA Conclusão:** ~2025-12-08 (3 dias - quality-first approach)
**✅ Deploy Status:** Backend production OPERACIONAL - todos crash loops resolvidos (#400 + #402 + #403 + #404)

## 🚨 Railway Deploy Status

**Bloqueadores Ativos:**

**NENHUM** - Todos bloqueadores P0/P1 resolvidos! ✅

**Prioridades Atualizadas (2025-12-05):**

- ✅ #404 - [P0][HOTFIX] Column naming mismatch → **RESOLVIDO** (commits 74a576d + 92c97cb)
- 🟢 #390 - [P1] Validação End-to-End Deploy Railway → **PRONTA PARA EXECUÇÃO**
  - Desbloqueada após resolução #404
  - Próximo passo: Executar validação completa após deploy completar
- 🔄 #387 - pgvector migration → **REPRIORITIZADA: P0 → P2**
  - Razão: Workaround estável, RAG não-crítico (10/11 módulos funcionais = 90.9%)
  - Backend operacional sem RAG
  - Deploy quando houver janela de manutenção
- 🔄 #401 - Health endpoint JSON vs text/plain → **REPRIORITIZADA: P2 → P3**
  - Provável falso positivo (código retorna JSON)
  - Railway proxy pode estar interceptando
  - Investigação de baixa urgência

**Issues Resolvidas (2025-12-04/05):**

- ✅ #388 - NODE_ENV não definido → **RESOLVIDO** (2025-12-04 12:15 UTC)
- ✅ #389 - Husky prepare script → **RESOLVIDO** (commit a5ec173)
- ✅ #396 - Database schema vazio → **RESOLVIDO** (2025-12-04 22:41 UTC)
- ✅ #400 - [P0][HOTFIX] Backend crashando - CreateLegislationTable migration → **RESOLVIDO** (2025-12-04 23:35 UTC)
  - **Solução:** Migration desabilitada (.disabled) - workaround temporário
  - **Commit:** 5e8b891
  - **Resultado:** Backend production operacional, health check 200 OK
  - **Nota:** Solução definitiva em #387 (pgvector migration)
- ✅ #402 - [P0][HOTFIX] AddOrganizationToUsers migration causing crash loops → **RESOLVIDO** (2025-12-04 23:50 UTC)
  - **Solução:** Migration idempotente (check-before-create pattern)
  - **Commit:** f75ea52
  - **Resultado:** Backend estável, startup limpo sem retries
  - **Impacto:** Eliminados crash loops e startup delays (~6-10s reduzidos a <2s)
- ✅ #403 - [P0][HOTFIX] Fix AddOrganizationToEtps migration + InitialSchema naming → **RESOLVIDO** (2025-12-05 00:40 UTC)
  - **Problema 1:** Migration AddOrganizationToEtps não idempotente (column organizationId already exists)
  - **Problema 2:** InitialSchema criou `createdById` (camelCase) mas entidade espera `created_by` (snake_case)
  - **Solução 1:** Migration idempotente (check-before-create pattern) - Commit 07ed572
  - **Solução 2:** InitialSchema preventive fix (bbaa804) + Migration RenameEtpsCreatedByIdColumn (f063a9b)
  - **Resultado:** Backend production OPERACIONAL, zero crash loops, migrations executando corretamente
  - **Impacto:** Backend 100% funcional, health endpoint 200 OK, CI/CD green
- ✅ #404 - [P0][HOTFIX] Column naming mismatch (etpId→etp_id) → **RESOLVIDO** (2025-12-05 01:05 UTC)
  - **Problema:** AddPerformanceIndexes migration falhando (`column "etp_id" does not exist`)
  - **Root Cause:** InitialSchema criou `etpId` (camelCase), mas migration esperava `etp_id` (snake_case)
  - **Solução 1:** Migration 1733360000000-RenameEtpIdColumns.ts (renomeia etpId→etp_id) - Commit 74a576d
  - **Solução 2:** InitialSchema preventive fix (linhas 110, 117, 128, 135) - Commit 92c97cb
  - **Resultado:** AddPerformanceIndexes executa sem erros, índices criados, FK preservadas
  - **Impacto:** Crash loop resolvido, performance indexes funcionais, zero data loss

**Novas Issues Criadas (2025-12-04/05):**

- #390 - [P1] Validação End-to-End Deploy Railway (PRONTA - #400 + #402 + #403 + #404 resolvidos)
- #391 - [P2] Implementar API de Status de Jobs Assíncronos
- #392 - [P3] Documentar processo de deploy Railway completo
- ~~#400 - [P0][HOTFIX] Desabilitar migration CreateLegislationTable~~ (✅ RESOLVIDO)
- #401 - [P3] Investigar discrepância Health endpoint JSON vs text/plain (reprioritizada P2→P3)
- ~~#402 - [P0][HOTFIX] Fix AddOrganizationToUsers migration idempotency~~ (✅ RESOLVIDO)
- ~~#403 - [P0][HOTFIX] Fix AddOrganizationToEtps migration + InitialSchema naming~~ (✅ RESOLVIDO)
- ~~#404 - [P0][HOTFIX] Fix column naming mismatch (etpId→etp_id)~~ (✅ RESOLVIDO)

**Repriorizações (2025-12-05 - Auditoria Completa):**

- #387: P0 → P2 (workaround estável, RAG não-crítico)
- #186: P3 → P1 (processamento assíncrono essencial para estabilidade)
- #401: P2 → P3 (provável falso positivo, baixa urgência)
- #224: P4 → P2 (security não deve ser P4)
- #223: P4 → P2 (security não deve ser P4)
- #40: P2 → P3 (zero vulnerabilidades HIGH, não urgente)

```
M1: ████████████████████ 35/35  (100%) ✅ Foundation - Testes
M2: ████████████████████ 18/18  (100%) ✅ CI/CD Pipeline
M3: ████████████████████ 57/57  (100%) ✅ Quality & Security
M4: ████████████████████ 44/44  (100%) ✅ Refactoring & Performance
M5: ███████░░░░░░░░░░░░░  9/25  (36%)  📚 E2E Testing & Documentation
M6: ██████████░░░░░░░░░░ 11/21  (52%)  🔄 Maintenance
M7: ████████████████████  6/6   (100%) ✅ Multi-Tenancy B2G
```

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

### 📚 M5: E2E Testing & Documentation (9/25) - 36%

**Status:** EM PROGRESSO | **ETA:** 2025-12-05

#### Concluídas (9):

- ✅ #22 - Configurar Puppeteer para testes E2E (PR #353)
- ✅ #23 - E2E Test - Critical Flow Complete (PR #372 - 2025-12-03)
  - **Merge Automatizado:** `/review-pr` (8/8 categorias validadas, score 75% técnico / 100% qualitativo)
  - **Test Suite:** 537 linhas (10-step critical flow: login → create ETP → AI generation → save → export PDF)
  - **Qualidade:** API mocking ($0 cost), screenshots on failure, resource cleanup
  - **Post-Merge:** ✅ Layer 1-3 validation passed (build+tests, CI pipeline)
- ✅ #34 - JSDoc completo em OrchestratorService e agentes (PR #366)
- ✅ #48 - UAT (parent - desmembrada em #92-#95)
- ✅ #367 - Fix etps.controller.spec.ts - organizationId parameter missing (✅ RESOLVED by PR #371 - 2025-12-02)
- ✅ #368 - Fix Multi-Tenancy tests - 60 tests fixed (sections + etps modules) (PR #371 - 2025-12-02)
- ✅ #97 - Documentation sync & JSDoc
- ✅ #353 - Configure Puppeteer for E2E Testing
- ✅ #369 - Fix auth.controller.spec.ts - Organization mock missing 'etps' property (PR #370)

#### Pendentes (16):

**Testes E2E:**

- [ ] #24 - E2E Accessibility tests (Axe-core)
- [ ] #82-#84 - Testes integração adicionais
- [ ] #92-#95 - UAT scenarios

**Documentação:**

- [ ] #35-#37 - Docs técnicas (frontend logging, README badges, arquitetura)
- [ ] #110 - Staged Rollout Strategy & Feature Flags
- [ ] #111 - Production Support SLA & Training
- [ ] #215-#218 - Prompt externalization (YAML, service, hot-reload)

**Issues:** #22-#24, #34-#37, #48, #82-#84, #92-#95, #97, #110-#111, #215-#218, #353, #367-#369

---

### 🔄 M6: Maintenance (11/21) - 52%

**Status:** RECORRENTE

#### Concluídas (11):

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

#### Concluídas Recentes (3):

- ✅ #388 - [P0] Railway crash: NODE_ENV variable not set (RESOLVIDO 2025-12-04 12:15 UTC)
- ✅ #389 - [P0] Railway build failing: husky prepare script (RESOLVIDO commit a5ec173)
- ✅ #396 - [P0] Railway: Database schema vazio - migrations falhando (RESOLVIDO 2025-12-04 22:41 UTC)
  - **Solução:** Migration inicial `1000000000000-InitialSchema.ts` criada
  - **Impacto:** 11 tabelas base criadas, backend production funcional
  - **PR:** #399 + hotfix commit 0fbb813

#### Pendentes (13):

**P0 - Critical:**

- [ ] #387 - [P0] Migrar PostgreSQL para versão com suporte a pgvector **[EM PROGRESSO]**
  - **Bloqueio:** Deploy Railway crashando (pgvector extension não disponível)
  - **Impacto:** RAG Module não funcional, deploy bloqueado
  - **Solução:** Deploy template pgvector + pg_backup/restore (~6-8h)
  - **Status:** Migração iniciada (2025-12-04)
  - **Alternativa:** Workaround temporário já aplicado (migration .disabled)

**P1 - High:**

- [ ] #40 - Atualizar dependências desatualizadas
- [ ] #390 - [P1] Validação End-to-End Deploy Railway **[NOVA - 2025-12-04]**
  - Checklist completo pós-resolução #387 e #388
- [ ] #391 - [P2] Implementar API de Status de Jobs Assíncronos **[NOVA - 2025-12-04]**
  - Endpoint REST para consulta status BullMQ jobs
  - Bloqueador de #222 (Frontend async UX)

**P2 - Medium:**

- [ ] #222 - Frontend async UX (depende de #391)
- [ ] #223-#224 - Rotação secrets automática
- [ ] #248 - Processo: limite tamanho PRs
- [ ] #321 - Fix monorepo @nestjs/common dependency conflict

**P3 - Low:**

- [ ] #392 - [P3] Documentar processo de deploy Railway completo **[NOVA - 2025-12-04]**
  - DEPLOYMENT.md com troubleshooting (#388, #387, #389)

**P3 - Low:**

- [ ] #381 - Replace console statements with structured logging (4 warnings)
- [ ] #382 - Replace 'any' types in OrchestratorService (14 warnings)

**Issues:** #21, #40, #181, #186, #219-#224, #248, #321, #374-#382, #387

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

### 🔴 P0 - CRITICAL (AÇÃO IMEDIATA - DEPLOY CRASHANDO):

1. **#400 - [HOTFIX] Desabilitar migration CreateLegislationTable** - BLOQUEIA TUDO ⚠️
   - **Status:** Issue criada (2025-12-04 23:15 UTC)
   - **Prazo:** IMEDIATO (backend production completamente inoperante)
   - **Estimativa:** 30 min
   - **Ação:** Renomear migration para `.disabled`, redeploy backend
   - **Impacto:** 100% funcionalidades backend indisponíveis até hotfix
   - **Bloqueia:** #390 (validação E2E), #387 (pgvector), todas funcionalidades

2. **#387 - Migrar PostgreSQL para pgvector** - SOLUÇÃO DEFINITIVA
   - **Status:** EM MIGRAÇÃO (workaround anterior ineficaz)
   - **Prazo:** Após #400 resolvido
   - **Estimativa:** 6-8h (migração completa)
   - **Nota:** Issue #400 é workaround temporário para #387

### ✅ P0 - CRITICAL COMPLETADAS:

1. **Fix TypeORM Explicit Types** - Prevenir crashes Railway ✅ SÉRIE COMPLETA
   - ✅ #374 - Organization entity (PR #??? - 2025-12-03)
   - ✅ #375 - User entity (PR #380 - 2025-12-03)
   - ✅ #376 - AuditLog entity (PR #383 - 2025-12-03)
   - ✅ #377 - AnalyticsEvent entity (PR #384 - 2025-12-04)
   - ✅ #378 - Remaining entities (PR #385 - 2025-12-04)
   - **Total:** 17 campos nullable corrigidos em 8 entidades críticas

2. **Fix Railway Deploy Crashes** - ✅ RESOLVIDOS (3/4 problemas)
   - ✅ Redis não configurado → Redis service deployed + REDIS_URL
   - ✅ BullMQ config incorreta → Usa redisConfig (parseia REDIS_URL)
   - ✅ Frontend start command → npx serve -s dist -l 3000
   - ⚠️ pgvector extension → Issue #387 (requer migração DB)

### P1 - Esta Semana (2025-12-04 a 2025-12-07):

1. **#387 - PostgreSQL pgvector migration** - PRIORITÁRIO (bloqueia deploy)
2. **E2E Tests (#24)** - Accessibility tests (Axe-core)
3. **Async Job Queue (#221-#222)** - ✅ #220 BullMQ merged, API + UX pending
4. UAT scenarios (#92-#95)

### P2 - Próxima Sprint:

1. Testes integração adicionais (#82-#84)
2. Prompt externalization (#215-#218)
3. Staged rollout strategy (#110)
4. Dependencies update (#40)

---

## 📈 Métricas & Insights

### Velocidade (7 dias):

- **Issues fechadas:** 54
- **Taxa:** 7.7 issues/dia
- **Tendência:** Acelerando (+22% vs semana anterior)

### Quality Metrics:

- **Coverage:** Backend 70%+, Frontend 60%+
- **Build:** ✅ Zero erros TypeScript
- **Security:** ✅ Zero vulnerabilidades HIGH
- **Tests:** ✅ 873+ testes passando

### Performance Gains:

- **Latência:** -42% (60s → 35s avg generation)
- **Cache Hit Rate:** 80-90% (OpenAI), 70% (Perplexity)
- **DB Queries:** -62% (15 → 5.7 avg queries/request)
- **Cost Reduction:** ~$40/1000 gerações (OpenAI cache)
- **CI/CD:** -68% minutos (~8000 min/mês economizados)

---

## 📚 Referências

### Auditorias:

- [ROADMAP_AUDIT_2025-12-01_COMPREHENSIVE.md](ROADMAP_AUDIT_2025-12-01_COMPREHENSIVE.md) - 99.5% acurácia
- [Orchestrator Module Audit](docs/audits/ORCHESTRATOR_MODULE_AUDIT.md) - 95% conformidade (APROVADO)

### Documentação Técnica:

- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura sistema
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) - Prontidão produção
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Resumo executivo

---

**Status:** 🟢 No caminho certo | **Confiança:** Alta | **Risco:** Baixo

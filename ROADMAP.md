# 🗺️ ROADMAP - ETP Express

**Última Atualização:** 2025-12-02 | **Auditoria:** [ROADMAP_AUDIT_2025-12-01_COMPREHENSIVE.md](ROADMAP_AUDIT_2025-12-01_COMPREHENSIVE.md)

## 📊 Status Atual

**Progresso Global:** 170/197 issues concluídas (86.3%)
**Velocidade:** 6.3 issues/dia (últimos 7 dias)
**ETA Conclusão:** ~2025-12-05 (3 dias)

```
M1: ████████████████████ 35/35  (100%) ✅ Foundation - Testes
M2: ████████████████████ 18/18  (100%) ✅ CI/CD Pipeline
M3: ████████████████████ 57/57  (100%) ✅ Quality & Security
M4: ████████████████████ 44/44  (100%) ✅ Refactoring & Performance
M5: ██████░░░░░░░░░░░░░░  8/25  (32%)  📚 E2E Testing & Documentation
M6: ██░░░░░░░░░░░░░░░░░░  2/11  (18%)  🔄 Maintenance
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

### 📚 M5: E2E Testing & Documentation (8/25) - 32%

**Status:** EM PROGRESSO | **ETA:** 2025-12-05

#### Concluídas (8):

- ✅ #22 - Configurar Puppeteer para testes E2E (PR #353)
- ✅ #34 - JSDoc completo em OrchestratorService e agentes (PR #366)
- ✅ #48 - UAT (parent - desmembrada em #92-#95)
- ✅ #367 - Fix etps.controller.spec.ts - organizationId parameter missing (✅ RESOLVED by PR #371 - 2025-12-02)
- ✅ #368 - Fix Multi-Tenancy tests - 60 tests fixed (sections + etps modules) (PR #371 - 2025-12-02)
- ✅ #97 - Documentation sync & JSDoc
- ✅ #353 - Configure Puppeteer for E2E Testing
- ✅ #369 - Fix auth.controller.spec.ts - Organization mock missing 'etps' property (PR #370)

#### Pendentes (17):

**Testes E2E:**

- [ ] #23-#24 - E2E test suite (auth, ETPs, sections)
- [ ] #82-#84 - Testes integração adicionais
- [ ] #92-#95 - UAT scenarios

**Documentação:**

- [ ] #35-#37 - Docs técnicas (frontend logging, README badges, arquitetura)
- [ ] #110 - Staged Rollout Strategy & Feature Flags
- [ ] #111 - Production Support SLA & Training
- [ ] #215-#218 - Prompt externalization (YAML, service, hot-reload)

**Issues:** #22-#24, #34-#37, #48, #82-#84, #92-#95, #97, #110-#111, #215-#218, #353, #367-#369

---

### 🔄 M6: Maintenance (2/11) - 18%

**Status:** RECORRENTE

#### Concluídas (2):

- ✅ #181 - Migration-aware readiness probe
- ✅ Manutenção adicional

#### Pendentes (9):

- [ ] #21, #40 - Dependências + Dependabot
- [ ] #186, #219-#224, #248 - Maintenance recorrente

**Issues:** #21, #40, #181, #186, #219-#224, #248

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

### P0 - URGENTE (Hoje):

1. ✅ **CONCLUÍDO: Correção Testes Backend Multi-Tenancy** - Merged PR #371 (2025-12-02)
   - ✅ #368 - Fixed **60 tests** across sections + etps modules (controller + service spec)
   - ✅ #367 - Resolved indirectly by PR #371 (etps.controller.spec.ts - 25 tests passing)

### P1 - Esta Semana (2025-12-02 a 2025-12-07):

1. **E2E Tests (#23-#24)** - Iniciar suite completa de testes E2E
2. UAT scenarios (#92-#95)
3. Testes de integração adicionais (#82-#84)

### P2 - Próxima Sprint:

1. Prompt externalization (#215-#218)
2. Staged rollout strategy (#110)
3. Maintenance recorrente (#21, #40)

---

## 📈 Métricas & Insights

### Velocidade (7 dias):

- **Issues fechadas:** 47
- **Taxa:** 6.3 issues/dia
- **Tendência:** Acelerando (+9% vs semana anterior)

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
- [Sections Module Audit](docs/audits/SECTIONS_MODULE_AUDIT.md) - 83% conformidade
- [Orchestrator Module Audit](docs/audits/ORCHESTRATOR_MODULE_AUDIT.md) - 95% conformidade (APROVADO)
- [User Module Audit](docs/audits/USER_MODULE_AUDIT.md) - 92% conformidade (APROVADO COND.)

### Documentação:

- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura do sistema
- [PERFORMANCE_BOTTLENECK_ANALYSIS.md](PERFORMANCE_BOTTLENECK_ANALYSIS.md) - Análise de bottlenecks
- [LOAD_TEST_EXECUTION_PLAYBOOK.md](LOAD_TEST_EXECUTION_PLAYBOOK.md) - Playbook de testes de carga
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) - Prontidão produção
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Resumo executivo

---

**Status:** 🟢 No caminho certo | **Confiança:** Alta | **Risco:** Baixo

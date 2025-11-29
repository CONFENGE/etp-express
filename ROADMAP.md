# 🗺️ ROADMAP - ETP Express

## Visão Geral do Projeto

**Status Atual:** M1, M2, M3 COMPLETOS! (100%) - M4 em progresso (67%)
**Última Atualização:** 2025-11-28

**Total de Issues:** 183 issues (43 abertas + 140 fechadas)
**Prontidão para Produção:** 76% - M1-M3 FINALIZADOS, M4 acelerado

### Progresso Global

```
M1: ████████████████████ 35/35  (100%) ✅ Foundation - Testes
M2: ████████████████████ 18/18  (100%) ✅ CI/CD Pipeline
M3: ████████████████████ 57/57  (100%) ✅ Quality & Security
M4: █████████████░░░░░░░ 26/39  (67%)  ⚡ Refactoring & Performance
M5: ██░░░░░░░░░░░░░░░░░░  2/22  (9%)   📚 E2E Testing & Documentation
M6: ██░░░░░░░░░░░░░░░░░░  1/11  (9%)   🔄 Maintenance
```

**Velocidade Atual:** 4.7 issues/dia (33 fechadas nos últimos 7 dias)
**Previsão de Conclusão:** ~2025-12-07 (9 dias)

---

## Milestones

### ✅ M1: Foundation - Testes (35/35) 🎉

**Status:** 100% CONCLUÍDO | Finalizado em 2025-11-20

**Conquistas:**

- ✅ Cobertura backend: 70%+ (meta alcançada)
- ✅ Cobertura frontend: 60.38% (meta alcançada)
- ✅ TypeScript build: 96 erros → 0 (module augmentation Radix UI)
- ✅ Testes completos: backend (Jest), frontend (Vitest), módulos órfãos

**Issues:** #1-#13, #42-#43, #50-#63, #99-#103, #243

---

### ✅ M2: CI/CD Pipeline (18/18) 🎉

**Status:** 100% CONCLUÍDO | Finalizado em 2025-11-21

**Conquistas:**

- ✅ GitHub Actions workflows (lint + tests)
- ✅ Deploy automático Railway (backend + frontend + PostgreSQL)
- ✅ Backup automático + disaster recovery
- ✅ Zero-downtime deployment strategy
- ✅ Production monitoring & alerting
- ✅ Infrastructure as Code (Railway)
- ✅ CI fixes: package-lock.json + line endings normalizados

**Issues:** #18-#20, #44-#45, #104-#107, #112, #180, #183, #252-#255

---

### ✅ M3: Quality & Security (57/57) 🎉

**Status:** 100% CONCLUÍDO | Finalizado em 2025-11-28

**Conquistas Principais:**

- ✅ **Segurança:**
  - OWASP Top 10 audit (2023)
  - 0 vulnerabilidades HIGH no production build
  - Secret scanning (Gitleaks + GitHub + CI/CD)
  - Secrets Management Strategy completo
  - Security.md + Vulnerability Disclosure Policy
- ✅ **LGPD Compliance:**
  - Mapeamento fluxo de dados pessoais
  - Consentimento no registro
  - Sanitização PII antes de LLMs
  - Data export (GET /users/me/export)
  - Data deletion (DELETE /users/me + cascade)
  - Retention policy (30 dias)
  - Política de Privacidade completa
  - Audit trail para exports/deletions
- ✅ **Performance & UX:**
  - Rate limiting por usuário (5 req/min)
  - React Router navigation (window.location → navigate())
  - useEffect fixes (4/4 completas)

**Issues:** #14-#17, #38-#39, #85-#87, #109, #113-#114, #145, #153-#158, #176-#179, #202-#205, #233-#239, #247, #261-#269, #298-#299

---

### ⚡ M4: Refactoring & Performance (26/39) - 67%

**Status:** EM PROGRESSO | 13 issues pendentes

**Concluídas:**

**Refatoração de Código:**

- ✅ #25 - Extrair constante DISCLAIMER (46+ duplicações)
- ✅ #26 - Substituir 'any' por interfaces (orchestrator)
- ✅ #27 - Substituir 'any' por interfaces (auth.service)
- ✅ #29 - Corrigir duplicação localStorage (authStore)
- ✅ #30 - useMemo em Dashboard.tsx (stats)
- ✅ #31 - useMemo em ETPs.tsx (filteredETPs)
- ✅ #214 - Melhorar scoring AntiHallucinationAgent
- ✅ #316 - Criar helpers/validators.ts (28a)
- ✅ #317 - Criar helpers/orchestratorHelpers.ts (28b)
- ✅ #318 - Extrair runValidations() (28c)
- ✅ #319 - Refatorar generateSection() (28d)
- ✅ #326 - Criar ETPEditorHeader + Progress (32a)

**Resiliência APIs Externas:**

- ✅ #206 - Circuit Breaker OpenAI (Opossum)
- ✅ #207 - Circuit Breaker Perplexity (Opossum)
- ✅ #208 - Retry exponential backoff
- ✅ #209 - Health check proativo
- ✅ #210 - Graceful degradation Perplexity

**RAG & Anti-Hallucinação:**

- ✅ #211 - PoC RAG Lei 14.133/2021 (pgvector)
- ✅ #212 - Integrar RAG no AntiHallucinationAgent

**Performance:**

- ✅ #108 - Database performance optimization
- ✅ #147 - Database production tuning

**Tooling:**

- ✅ #172 - Upgrade major dependencies
- ✅ #231 - Resolve npm vulnerabilities
- ✅ #301 - Pentest vendor research

**Hotfixes:**

- ✅ #321 - [BUG] Monorepo dependency conflict

**Pendentes:**

- [ ] #28 - Parent: Refatorar orchestrator (PARENT - sub-issues concluídas)
- [ ] #32 - Componentizar ETPEditor.tsx (PARENT)
- [ ] #327 - Criar ETPEditorTabsList + Content (32b)
- [ ] #328 - Criar ETPEditorSidebar (32c)
- [ ] #329 - Refatorar ETPEditor para composição (32d)
- [ ] #33 - Adicionar useMemo em cálculos caros
- [ ] #41 - Otimizar re-renders desnecessários
- [ ] #77-#81 - Refatorações adicionais
- [ ] #88-#91 - Load testing
- [ ] #300 - Security Penetration Testing

**Issues:** #25-#33, #41, #77-#81, #88-#91, #108, #147, #172, #206-#212, #214, #231, #300-#301, #316-#319, #321, #326-#329

---

### ⚡ M5: E2E Testing & Documentation (2/22) - 9%

**Status:** PLANEJADO | 20 issues pendentes

**Concluídas:**

- ✅ #48 - UAT (parent - desmembrada em #92-#95)
- ✅ #97 - Documentation sync & JSDoc

**Pendentes:**

- [ ] #22-#24 - Testes E2E
- [ ] #34-#37 - Documentação técnica
- [ ] #82-#84 - Testes integração adicionais
- [ ] #92-#95 - UAT (sub-issues)
- [ ] Demais issues de E2E testing

**Issues:** #22-#24, #34-#37, #48, #82-#84, #92-#97

---

### ⚡ M6: Maintenance (1/11) - 9%

**Status:** RECORRENTE

**Concluídas:**

- ✅ 1 issue de manutenção

**Pendentes:**

- [ ] 10 issues recorrentes de manutenção

---

## Referências

- 📋 [Auditoria 2025-11-28](ROADMAP_AUDIT_2025-11-28.md) - 99.4% acurácia
- 📋 [Auditoria 2025-11-27](ROADMAP_AUDIT_2025-11-27.md) - 99.4% acurácia
- 📋 [Auditoria 2025-11-25](ROADMAP_AUDIT_2025-11-25.md) - 97.6% → 99.5%
- 📄 [Análise Dependabot](DEPENDABOT_PR_ANALYSIS.md)
- 📊 [Project Summary](PROJECT_SUMMARY.md)
- 🚀 [Production Readiness](PRODUCTION_READINESS_REPORT.md)

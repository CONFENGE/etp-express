# ROADMAP - ETP Express

**Atualizado:** 2026-01-06 | **Progresso:** 613/638 (96%) | **Deploy:** LIVE

---

## Atualizações Recentes

| Data       | PR    | Tipo     | Descrição                                                   |
| ---------- | ----- | -------- | ----------------------------------------------------------- |
| 2026-01-06 | #1221 | Feature  | Complete onboarding wizard with checklist (#1213)           |
| 2026-01-06 | #1220 | Feature  | Implementar preview de PDF antes do export (#1214)          |
| 2026-01-06 | #1219 | Security | Fix critical jspdf Path Traversal CVE (GHSA-f8cm-6447-x5h2) |
| 2026-01-06 | #1217 | Feature  | Implementar auto-save durante edição (#1169)                |

---

## MVP Comercial - Prioridade Máxima para GTM

> **Objetivo:** Catalisar GTM com happy paths perfeitos para demos e uso real

### Fase 1 - Happy Path Core (P1 CRÍTICO)

| #     | Issue                                                  | Status |
| ----- | ------------------------------------------------------ | ------ |
| #1158 | [ETP] Expandir formulário de criação para 20-30 campos | 🔴     |
| #1161 | [Templates] Criar modelos pré-configurados por tipo    | 🔴     |
| #1215 | [UX] Validação em tempo real dos campos ETP            | ✅     |
| #1169 | [UX] Implementar auto-save durante edição              | ✅     |

### Fase 2 - Experiência Guiada (P1)

| #     | Issue                                         | Status |
| ----- | --------------------------------------------- | ------ |
| #1213 | [UX] Wizard de onboarding para primeiro uso   | ✅     |
| #1214 | [Export] Preview de documento antes do export | ✅     |
| #1167 | [Assistente] Implementar chatbot para dúvidas | 🔴     |
| #1164 | [Dashboard] Adicionar métricas avançadas      | 🔴     |

### Fase 3 - Credibilidade Institucional (P1)

| #     | Issue                                                 | Status |
| ----- | ----------------------------------------------------- | ------ |
| #1163 | [Conformidade] Templates baseados em modelos TCU/TCES | 🔴     |
| #1165 | [Preços] Persistir histórico SINAPI/SICRO em banco    | 🔴     |

### Fase 4 - Operacional (P2)

| #     | Issue                                              | Status |
| ----- | -------------------------------------------------- | ------ |
| #1166 | [Preços] Ajustar schedule para atualização semanal | 🔴     |
| #1168 | [Export] Integrar armazenamento em nuvem (S3)      | 🔴     |

**Progresso MVP Comercial:** 7/15 (47%)

---

## Issues Abertas (25)

### P1 - High Priority (14 issues)

| #     | Issue                                                           |
| ----- | --------------------------------------------------------------- |
| #1191 | [E2E] Create dedicated staging environment for E2E tests        |
| #1187 | [E2E] Persistent 401 Unauthorized errors during test execution  |
| #1172 | [E2E] Fix Auth Session tests for Railway environment            |
| #1171 | [E2E] Fix Auth Login-Flow tests for Railway environment         |
| #1167 | [Assistente] Implementar chatbot para dúvidas (MVP Comercial)   |
| #1165 | [Preços] Persistir histórico SINAPI/SICRO (MVP Comercial)       |
| #1164 | [Dashboard] Adicionar métricas avançadas (MVP Comercial)        |
| #1163 | [Conformidade] Templates TCU/TCES (MVP Comercial)               |
| #1161 | [Templates] Criar modelos pré-configurados por tipo             |
| #1158 | [ETP] Expandir formulário de criação para 20-30 campos          |
| #1137 | [E2E] Epic: Fix all 73 failing E2E tests for Railway CI         |
| #1075 | [QA] Configurar load testing com 100+ requisições simultâneas   |
| #1074 | [QA] Implementar chaos engineering (Redis: ✅, API Timeout: ✅) |
| #1073 | [QA] Criar testes de integração com APIs governamentais reais   |

### P2 - Medium Priority (9 issues)

| #     | Issue                                                            |
| ----- | ---------------------------------------------------------------- |
| #1190 | [CI] Reduce E2E pipeline timeout from 90min to 20min target      |
| #1189 | [CI] Skip E2E tests for documentation-only PRs                   |
| #1168 | [Export] Integrar armazenamento em nuvem (S3)                    |
| #1166 | [Preços] Ajustar schedule para atualização semanal               |
| #1072 | [Observabilidade] Adicionar retry automático para emails         |
| #1071 | [Observabilidade] Garantir requestId em todos os logs            |
| #1070 | [Observabilidade] Enriquecer contexto em erros de extraction     |
| #1069 | [Gov-API] Implementar invalidação de cache baseada em eventos    |
| #1068 | [Gov-API] Otimizar configuração de retry para janelas manutenção |

### P3 - Low Priority (1 issue)

| #     | Issue                                          |
| ----- | ---------------------------------------------- |
| #1045 | docs(readme): Update coverage badges and dates |

---

## Milestones

| Milestone              | Issues | Prioridade GTM |
| ---------------------- | ------ | -------------- |
| MVP Comercial          | 6/15   | 🔥 MÁXIMA      |
| M1: Foundation         | 36/36  | ✅             |
| M2: CI/CD Pipeline     | 18/18  | ✅             |
| M3: Quality & Security | 61/61  | ✅             |
| M4: Refactoring & Perf | 45/45  | ✅             |
| M5: E2E & Docs         | 30/30  | ✅             |
| M6: Maintenance        | 85/85  | ✅             |
| M7: Multi-Tenancy B2G  | 6/6    | ✅             |
| M8: Dominios Instit.   | 24/24  | ✅             |
| M9: Export/Import      | 16/16  | ✅             |
| Go-Live B2G            | 14/14  | ✅             |

---

## Metricas

| Metrica           | Valor |
| ----------------- | ----- |
| Issues Totais     | 638   |
| Issues Abertas    | 25    |
| Issues Fechadas   | 613   |
| Progresso         | 96%   |
| Backend Coverage  | 71%   |
| Frontend Coverage | 79%   |
| Backend Tests     | 2265  |
| Frontend Tests    | 1574  |
| Total Tests       | 3839  |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Issues](https://github.com/CONFENGE/etp-express/issues)

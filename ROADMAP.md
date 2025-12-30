# ROADMAP - ETP Express

**Atualizado:** 2025-12-30 | **Progresso:** 558/581 (96.0%) | **Deploy:** LIVE

---

## Ultimos Merges

| PR    | Commit    | Descricao                                                               |
| ----- | --------- | ----------------------------------------------------------------------- |
| #1097 | `8a7112c` | fix(backend): resolve Playwright test failures (#1097)                  |
| #1094 | `4020ae2` | fix(e2e): support CI environment variables in seed-admin script (#1090) |
| #1086 | `4d59021` | fix(ci): Playwright E2E timeout - chromium-only for PRs, 2 workers      |
| #1084 | `12bd78f` | feat(editor): integrate SimilarContractsPanel into ETPEditor (#1048)    |
| #1082 | `c26fe11` | fix(gov-api): complete Zod schema validation (#1054)                    |
| #1081 | `ce6d910` | fix(ai): improve AI section generation error handling (#1047)           |

---

## Issues Abertas (23)

### P0 - Critica (1 issue)

| #     | Issue                                             |
| ----- | ------------------------------------------------- |
| #1103 | tracking: E2E Playwright test failures (69 tests) |

### P1 - Alta (17 issues)

| #     | Issue                                                                 |
| ----- | --------------------------------------------------------------------- |
| #1102 | fix(e2e): Manager module tests failing (dashboard, users)             |
| #1101 | fix(e2e): Export module tests failing (PDF, DOCX)                     |
| #1100 | fix(e2e): ETP module tests failing (crud, edit, lifecycle)            |
| #1099 | fix(e2e): Auth module tests failing (logout, password-reset, role)    |
| #1098 | fix(e2e): Admin module tests failing (audit, dashboard, domains)      |
| #1088 | [E2E] Fix 92 Playwright test failures in CI                           |
| #1061 | [Gov-API] Adicionar timeout individual em Promise.allSettled          |
| #1062 | [Gov-API] Implementar carregamento automatico de dados SINAPI/SICRO   |
| #1063 | [Gov-API] Diferenciar sem resultados de erro de servico               |
| #1064 | [Concorrencia] Usar transacao em update de status de secao            |
| #1065 | [Concorrencia] Corrigir race condition em getNextOrder                |
| #1066 | [Frontend] Remover global AbortController para evitar cancelamento    |
| #1067 | [Gov-API] Implementar alerting automatico para circuit breaker        |
| #1068 | [Gov-API] Otimizar configuracao de retry para janelas de manutencao   |
| #1073 | [QA] Criar testes de integracao com APIs governamentais reais         |
| #1074 | [QA] Implementar chaos engineering (Redis down, API timeout, payload) |
| #1075 | [QA] Configurar load testing com 100+ requisicoes simultaneas         |

### P2 - Media (4 issues)

| #     | Issue                                                                 |
| ----- | --------------------------------------------------------------------- |
| #1069 | [Gov-API] Implementar invalidacao de cache baseada em eventos         |
| #1070 | [Observabilidade] Enriquecer contexto em erros de document extraction |
| #1071 | [Observabilidade] Garantir requestId em todos os logs de gov-api      |
| #1072 | [Observabilidade] Adicionar retry automatico para emails com backoff  |

### P3 - Baixa (1 issue)

| #     | Issue                                          |
| ----- | ---------------------------------------------- |
| #1045 | docs(readme): Update coverage badges and dates |

---

## Milestones (100% Complete)

| Milestone              | Issues |
| ---------------------- | ------ |
| M1: Foundation         | 36/36  |
| M2: CI/CD Pipeline     | 18/18  |
| M3: Quality & Security | 61/61  |
| M4: Refactoring & Perf | 45/45  |
| M5: E2E & Docs         | 30/30  |
| M6: Maintenance        | 85/85  |
| M7: Multi-Tenancy B2G  | 6/6    |
| M8: Dominios Instit.   | 24/24  |
| M9: Export/Import      | 16/16  |
| Go-Live B2G            | 14/14  |

---

## Metricas

| Metrica           | Valor |
| ----------------- | ----- |
| Issues Totais     | 581   |
| Issues Abertas    | 23    |
| Issues Fechadas   | 558   |
| Progresso         | 96.0% |
| Backend Coverage  | 78%   |
| Frontend Coverage | 76%   |
| Backend Tests     | 2180  |
| Frontend Tests    | 1412  |
| Total Tests       | 3592  |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Issues](https://github.com/CONFENGE/etp-express/issues)

# ROADMAP - ETP Express

**Atualizado:** 2025-12-29 | **Progresso:** 550/568 (96.8%) | **Deploy:** LIVE

---

## Ultimos Merges

| PR    | Commit    | Descricao                                                                  |
| ----- | --------- | -------------------------------------------------------------------------- |
| #1082 | `c26fe11` | fix(gov-api): complete Zod schema validation (#1054)                       |
| #1081 | `ce6d910` | fix(ai): improve AI section generation error handling (#1047)              |
| #1080 | `ec7c0ec` | fix(gov-api): implement in-memory cache fallback when Redis fails (#1056)  |
| #1078 | `a71b9ca` | fix(etps): add ACID transaction to updateCompletionPercentage (#1057)      |
| #1077 | `fcd7db7` | fix(sections): add unique constraint to prevent duplicate sections (#1058) |

---

## Issues Abertas (18)

### P0 - Critico (1 issue)

| #     | Issue                                                               |
| ----- | ------------------------------------------------------------------- |
| #1059 | [Frontend] Implementar conflict detection para updates concorrentes |

### P1 - Alta (12 issues)

| #     | Issue                                                                 |
| ----- | --------------------------------------------------------------------- |
| #1048 | feat(editor): Integrar SimilarContractsPanel ao ETPEditor             |
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
| Issues Totais     | 568   |
| Issues Abertas    | 19    |
| Issues Fechadas   | 549   |
| Progresso         | 96.7% |
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

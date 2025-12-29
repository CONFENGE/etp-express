# ROADMAP - ETP Express

**Atualizado:** 2025-12-29 | **Progresso:** 546/568 (96.1%) | **Deploy:** LIVE

---

## Ultimos Merges

| PR    | Commit    | Descricao                                                                  |
| ----- | --------- | -------------------------------------------------------------------------- |
| #1077 | `fcd7db7` | fix(sections): add unique constraint to prevent duplicate sections (#1058) |
| #1079 | `c3568ac` | fix(polling): increase timeout and add graceful degradation (#1060)        |
| #1076 | `d536a41` | fix(gov-api): add payload size limits to Axios (#1055)                     |
| #1053 | `e937c29` | docs(readme): Update E2E section from Puppeteer to Playwright (#1043)      |
| #1052 | `84f48ab` | fix(ui): Redesign WarningBanner to follow design system (#1049)            |

---

## Issues Abertas (22)

### P0 - Critico (5 issues)

| #     | Issue                                                                 |
| ----- | --------------------------------------------------------------------- |
| #1047 | fix(ai): Investigar erro ao gerar secao com IA                        |
| #1054 | [Gov-API] Implementar validacao de schema Zod nas respostas           |
| #1056 | [Gov-API] Implementar fallback in-memory quando Redis falha           |
| #1057 | [Concorrencia] Adicionar transacao ACID em updateCompletionPercentage |
| #1059 | [Frontend] Implementar conflict detection para updates concorrentes   |

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
| Issues Abertas    | 22    |
| Issues Fechadas   | 546   |
| Progresso         | 96.1% |
| Backend Coverage  | 78%   |
| Frontend Coverage | 76%   |
| Backend Tests     | 2164  |
| Frontend Tests    | 1409  |
| Total Tests       | 3573  |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Issues](https://github.com/CONFENGE/etp-express/issues)

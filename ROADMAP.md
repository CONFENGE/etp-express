# ROADMAP - ETP Express

**Atualizado:** 2026-01-04 | **Progresso:** 599/633 (95%) | **Deploy:** LIVE

---

## Issues Abertas (34)

### P1 - High Priority (17 issues)

| #     | Issue                                                            |
| ----- | ---------------------------------------------------------------- |
| #1191 | [E2E] Create dedicated staging environment for E2E tests         |
| #1187 | [E2E] Persistent 401 Unauthorized errors during test execution   |
| #1186 | [E2E] 429 Rate Limiting causing test timeouts in CI              |
| #1172 | [E2E] Fix Auth Session tests for Railway environment             |
| #1171 | [E2E] Fix Auth Login-Flow tests for Railway environment          |
| #1162 | [UX] Implementar UI de historico de versoes                      |
| #1161 | [Templates] Criar modelos pre-configurados por tipo              |
| #1160 | [Riscos] Implementar analise de riscos parametrizada             |
| #1159 | [Precos] Implementar calculo de media entre fontes               |
| #1158 | [ETP] Expandir formulario de criacao para 20-30 campos           |
| #1150 | [E2E] Fix ETP Lifecycle tests - 7 failing tests                  |
| #1149 | [E2E] Fix ETP Edit tests - 7 failing tests                       |
| #1137 | [E2E] Epic: Fix all 73 failing E2E tests for Railway CI          |
| #1075 | [QA] Configurar load testing com 100+ requisicoes simultaneas    |
| #1074 | [QA] Implementar chaos engineering                               |
| #1073 | [QA] Criar testes de integracao com APIs governamentais reais    |
| #1062 | [Gov-API] Implementar carregamento automatico dados SINAPI/SICRO |

### P2 - Medium Priority (13 issues)

| #     | Issue                                                            |
| ----- | ---------------------------------------------------------------- |
| #1193 | fix(frontend): header com z-index incorreto sobrepoe sidebar     |
| #1190 | [CI] Reduce E2E pipeline timeout from 90min to 20min target      |
| #1189 | [CI] Skip E2E tests for documentation-only PRs                   |
| #1166 | [Precos] Ajustar schedule para atualizacao semanal               |
| #1165 | [Precos] Persistir historico SINAPI/SICRO em banco de dados      |
| #1164 | [Dashboard] Adicionar metricas avancadas                         |
| #1163 | [Conformidade] Adicionar templates baseados em modelos TCU/TCES  |
| #1072 | [Observabilidade] Adicionar retry automatico para emails         |
| #1071 | [Observabilidade] Garantir requestId em todos os logs            |
| #1070 | [Observabilidade] Enriquecer contexto em erros de extraction     |
| #1069 | [Gov-API] Implementar invalidacao de cache baseada em eventos    |
| #1068 | [Gov-API] Otimizar configuracao de retry para janelas manutencao |
| #1067 | [Gov-API] Implementar alerting automatico para circuit breaker   |

### P3 - Low Priority (4 issues)

| #     | Issue                                          |
| ----- | ---------------------------------------------- |
| #1169 | [UX] Implementar auto-save durante edicao      |
| #1168 | [Export] Integrar armazenamento em nuvem (S3)  |
| #1167 | [Assistente] Implementar chatbot para duvidas  |
| #1045 | docs(readme): Update coverage badges and dates |

---

## Milestones

| Milestone              | Issues |
| ---------------------- | ------ |
| MVP Comercial          | 0/12   |
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
| Issues Totais     | 633   |
| Issues Abertas    | 34    |
| Issues Fechadas   | 599   |
| Progresso         | 95%   |
| Backend Coverage  | 78%   |
| Frontend Coverage | 82%   |
| Backend Tests     | 2128  |
| Frontend Tests    | 1391  |
| Total Tests       | 3519  |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Issues](https://github.com/CONFENGE/etp-express/issues)

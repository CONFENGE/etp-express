# ROADMAP - ETP Express

**Atualizado:** 2025-12-27 | **Progresso:** 509/518 (98%) | **Deploy:** LIVE

---

## Ultimos Merges

| PR   | Commit    | Descricao                                          |
| ---- | --------- | -------------------------------------------------- |
| #996 | `2cc3866` | security(users): fix IDOR PATCH /users/:id (#991)  |
| #995 | `f526754` | security(users): fix IDOR GET /users (Closes #990) |
| #994 | `77b2e71` | security(export): fix IDOR export endpoints (#988) |

---

## Issues Abertas (9)

### P0 - Security/Blockers (3 issues)

| #    | Issue                                                              |
| ---- | ------------------------------------------------------------------ |
| #989 | [BLOCKER] Versions: IDOR permite manipular versoes de qualquer ETP |
| #992 | [HIGH] Sections SSE: Streaming sem validacao de ownership          |
| #993 | [HIGH] Users: GET /users/:id expoe dados de qualquer usuario       |

### P1 - Bugs/Tests (3 issues)

| #    | Issue                                                                 |
| ---- | --------------------------------------------------------------------- |
| #985 | fix(frontend): Loading infinito 'Carregando ETP...' ao criar ETP      |
| #986 | fix(frontend): Tarja superior sobrepoe primeiro botao do menu lateral |
| #956 | test(e2e): Export DOCX complete flow                                  |

### P2 - Melhorias (3 issues)

| #    | Issue                                                                   |
| ---- | ----------------------------------------------------------------------- |
| #962 | docs: Comprehensive authentication flow                                 |
| #963 | ci: Add auth E2E tests to CI pipeline                                   |
| #987 | feat(frontend): Exibir menu de administracao para usuarios SYSTEM_ADMIN |

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
| Issues Totais     | 518   |
| Issues Abertas    | 9     |
| Issues Fechadas   | 509   |
| Progresso         | 98%   |
| Backend Coverage  | 78%   |
| Frontend Coverage | 76%   |
| Backend Tests     | 2109  |
| Frontend Tests    | 1368  |
| Total Tests       | 3477  |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [GitHub Issues](https://github.com/CONFENGE/etp-express/issues)

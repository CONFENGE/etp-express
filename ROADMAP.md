# ROADMAP - ETP Express

**Atualizado:** 2025-12-10 | **Progresso:** 264/309 (85.4%) | **Deploy:** Operacional

## Milestones

```
M1-M4, M7: ████████████████████ 100%  Completos
M5:        █████████████████░░░  86%  E2E & Docs (24/28)
M6:        ███████████████░░░░░  76%  Maintenance (58/76)
M8:        ███████████████░░░░░  74%  Domínios (17/23)
M9:        ░░░░░░░░░░░░░░░░░░░░   0%  Export/Import (0/16)
```

---

## Próximas Ações

### M8 - Gestão de Domínios (12 issues)

| #    | Issue                             | Est. |
| ---- | --------------------------------- | ---- |
| #470 | System Admin dashboard (parent)   | -    |
| #523 | └─ Setup adminStore + rotas       | ✅   |
| #524 | └─ AdminDashboard estatísticas    | ✅   |
| #525 | └─ DomainManagement CRUD          | ✅   |
| #526 | └─ DomainDetail + AssignManager   | ✅   |
| #527 | └─ Testes e responsividade        | 4h   |
| #471 | Domain Manager dashboard (parent) | -    |
| #537 | └─ Setup managerStore + rotas     | ✅   |
| #538 | └─ ManagerDashboard estatísticas  | ✅   |
| #539 | └─ UserManagement CRUD            | 4h   |
| #473 | UI/UX Apple HIG (parent)          | -    |
| #540 | └─ Setup design tokens            | ✅   |
| #541 | └─ Componentes base estilizados   | 4h   |
| #542 | └─ Dark mode                      | 4h   |
| #543 | └─ Acessibilidade + responsivo    | 4h   |

### Security (2 issues)

| #    | Issue           | Est. |
| ---- | --------------- | ---- |
| #452 | CSRF protection | 6h   |
| #453 | CSP headers     | 4h   |

### M5 - Quality (4 issues)

| #    | Issue                 | Est. |
| ---- | --------------------- | ---- |
| #110 | Staged rollout        | 8h   |
| #111 | Production SLA        | 4h   |
| #456 | Frontend coverage 70% | 20h  |
| #458 | WCAG 2.1 gaps         | 12h  |

### M9 - Export DOCX & Import Analysis (16 issues)

**Feature 1: Export DOCX** (~9h)
| # | Issue | Est. | Dep. |
| ---- | ---------------------------------- | ---- | ----- |
| #548 | Setup biblioteca docx | 1h | - |
| #549 | Implementar exportToDocx | 3h | #548 |
| #550 | Endpoint GET /export/etp/:id/docx | 1h | #549 |
| #551 | Frontend botão Export DOCX | 2h | #550 |
| #552 | Testes E2E Export DOCX | 2h | #551 |

**Feature 2: Import & Analysis** (~27h)
| # | Issue | Est. | Dep. |
| ---- | ---------------------------------- | ---- | ---------- |
| #553 | Setup infraestrutura upload | 2h | - |
| #554 | Extração texto DOCX | 2h | #553 |
| #555 | Extração texto PDF | 2h | #553 |
| #556 | ETPAnalysisService (agents) | 3h | #554, #555 |
| #557 | Geração relatório melhorias | 3h | #556 |
| #558 | Conversão documento para ETP | 3h | #556 |
| #559 | Endpoints análise e conversão | 2h | #557, #558 |
| #560 | Frontend página Import & Analysis | 3h | #559 |
| #561 | Frontend exibição resultados | 3h | #560 |
| #562 | Frontend store análise | 2h | #559 |
| #563 | Testes E2E Import e Analysis | 2h | #561, #562 |

---

## Backlog (16 issues)

**Performance:** #426, #454, #455, #457, #459, #461
**Maintenance:** #379, #387, #460, #492, #493
**Operations:** #223
**Tests (P0/P1):** #533, #534, #535, #536

---

## Métricas

| Métrica           | Valor    |
| ----------------- | -------- |
| Velocidade        | 10.6/dia |
| Backend Coverage  | 78%      |
| Frontend Coverage | 76%      |
| Testes            | 1355     |

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)

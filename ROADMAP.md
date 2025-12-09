# ROADMAP - ETP Express

**Atualizado:** 2025-12-09 | **Progresso:** 242/282 (85.8%) | **Deploy:** Operacional

## Status dos Milestones

```
M1-M4, M7: ████████████████████ 100%  Completos
M5:        ██████████░░░░░░░░░░  61%  E2E Testing & Documentation
M6:        ████████████░░░░░░░░  64%  Maintenance
M8:        █████████░░░░░░░░░░░  50%  Gestão de Domínios
```

---

## Priority Tracks

### IMEDIATO - Segurança (Semana 1)

**CI/CD Fixes:**
| # | Issue | Est. | Status |
|---|-------|------|--------|
| ~~#503~~ | ~~Gitleaks false positive allowlist~~ | ~~1h~~ | ✅ DONE |
| #500 | Gitleaks license for orgs | 2h | |
| #501 | Rollup optional dependency | 1h | |

**JWT XSS (#449) - Decomposta:**
| # | Issue | Est. | Status |
|---|-------|------|--------|
| ~~#504~~ | ~~Criar authStore com httpOnly cookies~~ | ~~3h~~ | ✅ DONE |
| #505 | Refatorar AuthService para cookies | 3h | |
| #506 | Atualizar guards e interceptors | 2h | |

**~~TypeScript Strictness (#450) - COMPLETO~~ ✅**
| # | Issue | Est. | Status |
|---|-------|------|--------|
| ~~#507~~ | ~~Habilitar noImplicitAny~~ | ~~1h~~ | ✅ DONE |
| ~~#508~~ | ~~Fix 'any' em OrchestratorService~~ | ~~3h~~ | ✅ DONE |
| ~~#509~~ | ~~Fix 'any' em DTOs e interfaces~~ | ~~3h~~ | ✅ DONE |
| ~~#510~~ | ~~Fix 'any' restantes + CI validation~~ | ~~3h~~ | ✅ DONE |

---

### CURTO PRAZO - M8 Frontend + Compliance (Semanas 2-3)

**M8 Frontend:**
| # | Issue | Est. |
|---|-------|------|
| #474 | Demo data isolation and reset | 8h |
| #470 | System Admin dashboard | 12h |
| #471 | Domain Manager dashboard | 12h |
| #472 | Password change modal | 4h |
| #473 | Modernize UI/UX (Apple HIG) | 16h |
| #475 | WhatsApp CTA for demo user | 4h |

**Security Headers:**
| # | Issue | Est. |
|---|-------|------|
| #452 | CSRF protection | 6h |
| #453 | CSP headers | 4h |

**Quality:**
| # | Issue | Est. |
|---|-------|------|
| #456 | Frontend test coverage 41%→70% | 20h |
| #458 | WCAG 2.1 accessibility gaps | 12h |

---

### BACKLOG - Otimizações (Próximo Sprint)

**Performance:**

- #426 - Perplexity timeout (4h)
- #454 - N+1 query risk (6h)
- #455 - Cache memory leak risk (4h)
- #457 - useCallback/useMemo optimization (8h)
- #459 - Eager loading optimization (4h)
- #461 - Bundle lazy loading (8h)

**Maintenance:**

- #460 - Migration timestamp fix (1h)
- #492 - ESLint 9 migration (4h)
- #493 - React Router v7 migration (6h)

**Operations:**

- #223 - Secret rotation automation + alerts (6h)
- #110 - Staged rollout strategy (8h)
- #111 - Production support SLA (4h)
- #387 - pgvector migration for RAG (8h)

---

## Métricas

| Métrica           | Valor            |
| ----------------- | ---------------- |
| Velocidade        | 10.6 issues/dia  |
| Coverage Backend  | 78%              |
| Coverage Frontend | 41% → 70% (meta) |
| Testes            | 1000+ passando   |
| Latência          | -42% (60s→35s)   |

---

## Auditoria 2025-12-09

**Ações Executadas:**

- 13 issues fechadas (ruído/obsoletas/duplicatas)
- 8 issues repriorizada
- 7 sub-issues atômicas criadas
- ROADMAP reestruturado com Priority Tracks

**Issues Fechadas:**

- #40, #92-#95, #216-#218, #248, #392, #401 (ruído/obsoletas)
- #382, #224 (consolidadas em #450 e #223)

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md)
- [LGPD_COMPLIANCE_REPORT.md](LGPD_COMPLIANCE_REPORT.md)
- [Plano de Auditoria](.claude/plans/jaunty-seeking-bear.md)

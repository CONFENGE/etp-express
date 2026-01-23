---
active: true
iteration: 1
max_iterations: 25
completion_promise: "PROMISE_FLUXO_FINALIZADO"
started_at: "2026-01-22T22:13:58Z"
---

Siga este ciclo. Emita STATUS_CONCLUIDO ao final de cada fase: 1. FASE REVISAO: execute /review-pr ate o merge. 2. FASE ATUALIZACAO: atualize ROADMAP.md, commit e push na main. 3. FASE PLANEJAMENTO: execute /pick-next-issue ate abrir novo PR. 4. FASE VALIDACAO: aguarde CI/CD, se falhar corrija, se passar inicie /review-pr. Execute /clear entre cada fase. Termine apenas ao emitir a string: PROMISE_FLUXO_FINALIZADO

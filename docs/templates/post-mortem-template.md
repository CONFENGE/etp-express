# Post-Mortem: [Título do Incidente]

**Data do Incidente:** YYYY-MM-DD
**Duração Total:** X horas Y minutos
**Severity:** P0 / P1 / P2
**Incident Commander:** [Nome]
**Escrito por:** [Nome]
**Revisado por:** [Nome]
**Data do Post-Mortem:** YYYY-MM-DD

---

## Executive Summary

[Resumo executivo de 2-3 parágrafos para stakeholders não-técnicos]

**Exemplo:**

> No dia DD/MM/YYYY às HH:MM, o sistema ETP Express ficou completamente indisponível por 45 minutos devido a uma falha no banco de dados de produção. O problema afetou 100% dos usuários ativos, impedindo acesso a ETPs e geração de novas seções. A equipe identificou a root cause em 15 minutos e restaurou o serviço em 45 minutos utilizando procedimento de rollback. Não houve perda de dados. Implementamos monitoramento proativo e procedimentos de rollback automático para prevenir recorrência.

---

## Timeline

**Todos os horários em UTC-3 (Brasília)**

| Horário | Evento                                                     | Responsável | Ação             |
| ------- | ---------------------------------------------------------- | ----------- | ---------------- |
| 15:20   | 🚨 **Incident Start** - Database connection errors começam | Sistema     | N/A              |
| 15:22   | Alert disparado no Slack #alerts-production                | Monitoring  | N/A              |
| 15:23   | First Responder acknowledges alert                         | [Nome]      | Triage inicial   |
| 15:25   | Root cause identified: PostgreSQL service crashed          | [Nome]      | Diagnóstico      |
| 15:27   | Decision: Restart PostgreSQL service                       | [Nome]      | Mitigação        |
| 15:30   | PostgreSQL restart completo                                | Railway     | N/A              |
| 15:32   | Health checks passing                                      | [Nome]      | Verificação      |
| 15:35   | Smoke tests passing (endpoints críticos OK)                | [Nome]      | Validação        |
| 15:40   | Full system validation                                     | [Nome]      | Testes completos |
| 15:45   | All-clear declared                                         | [Nome]      | N/A              |
| 16:05   | 🎉 **Incident End** - Users notified of resolution         | [Nome]      | Comunicação      |

**Total duration:** 45 minutos (detection to resolution)
**MTTR (Mean Time To Resolution):** 45 minutos
**MTTD (Mean Time To Detection):** 2 minutos

---

## Impact

### Users Affected

- **Total users impacted:** [Número ou %]
  - Exemplo: "120 usuários ativos no momento do incidente (100%)"
  - Exemplo: "~30% da base de usuários (estimativa baseada em horário)"

### Functionality Impact

- ❌ **Completamente indisponível:**
  - Login
  - Acesso a ETPs existentes
  - Criação de novos ETPs
  - Geração de seções
  - Exportação de PDFs

- ⚠️ **Parcialmente indisponível:** [Se aplicável]
  - N/A

- ✅ **Sem impacto:** [Se aplicável]
  - N/A (sistema completamente fora do ar)

### Data Impact

- **Data loss:** ❌ Não / ⚠️ Sim (detalhar abaixo)
- **Data corruption:** ❌ Não / ⚠️ Sim (detalhar abaixo)

**Detalhes:**

- ✅ Todos os ETPs salvos antes do incidente foram preservados
- ✅ Banco de dados restaurado sem perda de informações
- ❌ Não houve data loss

### Business Impact

- **Downtime:** 45 minutos de indisponibilidade total
- **Revenue impact:** [Se aplicável - geralmente N/A para MVP]
- **SLA breach:** [Se houver SLA definido]
- **Customer complaints:** [Número de tickets/emails recebidos]

---

## Root Cause

### Technical Root Cause

[Explicação técnica detalhada da causa raiz]

**Exemplo:**

O serviço PostgreSQL no Railway crashou devido a um out-of-memory (OOM) error. A análise dos logs revelou que:

1. **Causa imediata:** PostgreSQL process consumiu 100% da memória alocada (512MB) e foi killed pelo OOM killer do kernel
2. **Causa raiz:** Query lenta sem índice apropriado (`SELECT * FROM sections WHERE etp_id IN (...)`) executada simultaneamente por 15 usuários causou memory spike
3. **Trigger:** Deploy recente (#XYZ) removeu índice em `sections.etp_id` acidentalmente durante refatoração de migration

### Contributing Factors

Fatores que contribuíram para o incidente ou agravaram o impacto:

1. **Falta de alerting proativo:** Não tínhamos alert de memory usage > 80%
2. **Índice removido sem validação:** Migration não passou por review de DBA
3. **Falta de load testing:** Deploy não foi validado com carga realista antes de produção

---

## Detection

### Como foi detectado

- [x] Alerting automático (Monitoring)
- [ ] Usuário reportou problema
- [ ] Equipe descobriu durante operação rotineira
- [ ] Outro: [Descrever]

### Tempo de detecção

- **Incident start:** 15:20 (primeira evidência nos logs)
- **Alert fired:** 15:22 (2 minutos após início)
- **MTTD:** 2 minutos ✅ (objetivo: < 5 minutos)

### Qualidade da detecção

- ✅ **Boa:** Alert preciso e acionável
- Texto do alert: "Database connection failed - Backend health check failing"
- First Responder conseguiu iniciar triage imediatamente

---

## Response

### O que funcionou bem

✅ **Positives:**

1. **Detecção rápida:** Alert disparou em 2 minutos
2. **Diagnóstico eficiente:** Root cause identificada em 15 minutos (follow runbook)
3. **Comunicação clara:** Usuários notificados em 20 minutos do início
4. **Rollback procedures:** Script de rollback funcionou conforme esperado
5. **Documentação útil:** Runbook `INCIDENT_RESPONSE.md` guiou response corretamente

### O que não funcionou bem

❌ **Issues:**

1. **Falta de prevenção:** Memory spike não foi detectado antes de OOM
2. **Migration review:** Remoção de índice não foi caught em code review
3. **Alerting gaps:** Não tínhamos alert de "missing index causing slow query"
4. **Testing gaps:** Load testing não incluía cenário de 15+ usuários simultâneos

### O que tivemos sorte

🍀 **Lucky breaks:**

1. Incidente ocorreu durante horário comercial (equipe disponível)
2. No backup restore foi necessário (PostgreSQL recovery foi simples restart)
3. Nenhum usuário estava em processo crítico de finalização de ETP

---

## Resolution

### Immediate Actions Taken

1. **15:27** - Restart PostgreSQL service via Railway UI
2. **15:30** - PostgreSQL back online
3. **15:32** - Health checks validated
4. **15:35** - Smoke tests executed (critical endpoints tested)
5. **15:40** - Full regression validation
6. **15:45** - All-clear declared

### Long-term Fixes

**Implemented immediately (hotfix):**

- [ ] Re-adicionar índice em `sections.etp_id` (Migration #XYZ-fix)
- [ ] Deploy hotfix com índice restaurado

**Scheduled (within 7 days):**

- [ ] Implementar alert de memory usage > 80%
- [ ] Adicionar slow query logging (queries > 1s)
- [ ] Create load testing scenario com 20+ usuários simultâneos

**Planned (within 30 days):**

- [ ] Migration review checklist (obrigatório incluir índices review)
- [ ] Upgrade PostgreSQL plan (512MB → 1GB RAM)
- [ ] Implement query performance monitoring (APM)

---

## Action Items

| #   | Action Item                           | Owner  | Priority | Due Date   | Status         |
| --- | ------------------------------------- | ------ | -------- | ---------- | -------------- |
| 1   | Re-adicionar índice `sections.etp_id` | [Nome] | P0       | DD/MM/YYYY | ✅ Done        |
| 2   | Deploy hotfix com índice              | [Nome] | P0       | DD/MM/YYYY | ✅ Done        |
| 3   | Implementar alert memory > 80%        | [Nome] | P1       | DD/MM/YYYY | 🔄 In Progress |
| 4   | Adicionar slow query logging          | [Nome] | P1       | DD/MM/YYYY | 📋 To Do       |
| 5   | Load testing com 20+ users            | [Nome] | P1       | DD/MM/YYYY | 📋 To Do       |
| 6   | Migration review checklist            | [Nome] | P2       | DD/MM/YYYY | 📋 To Do       |
| 7   | Upgrade PostgreSQL plan               | [Nome] | P2       | DD/MM/YYYY | 📋 To Do       |
| 8   | Implement APM (query monitoring)      | [Nome] | P2       | DD/MM/YYYY | 📋 To Do       |

---

## Lessons Learned

### Technical Lessons

1. **Índices são críticos:** Remoção de índice em tabela com crescimento rápido causa degradação severa
2. **Memory limits matter:** PostgreSQL default settings não são otimizados para production workload
3. **Monitoring gaps:** Faltavam alerts proativos de resource exhaustion

### Process Lessons

1. **Migration review:** Migrations que tocam índices precisam de review extra
2. **Load testing:** Deploy sem load testing realista = deploy blind
3. **Runbooks work:** Ter runbook documentado acelerou response em 50%+

### Communication Lessons

1. **Templates úteis:** Templates de comunicação permitiram notificação rápida de usuários
2. **Update frequency:** Updates a cada 30min foram apropriados (não muito frequente, não muito esparso)

---

## Metrics

### SLA Performance

| Metric                             | Target   | Actual | Met?   |
| ---------------------------------- | -------- | ------ | ------ |
| MTTD (Mean Time To Detection)      | < 5 min  | 2 min  | ✅ Yes |
| MTTR (Mean Time To Resolution)     | < 1 hour | 45 min | ✅ Yes |
| Communication (first notification) | < 30 min | 20 min | ✅ Yes |

### Incident Severity Justification

**Classified as:** P0 (Critical)

**Justification:**

- Sistema 100% indisponível
- Todas as funcionalidades principais afetadas
- 100% dos usuários ativos impactados
- Downtime > 15 minutos

**Severity was appropriate:** ✅ Yes / ❌ No (explain if no)

---

## Supporting Information

### Relevant Links

- **Incident Slack Thread:** [Link]
- **GitHub Issue (Root Cause):** [Link]
- **Hotfix PR:** [Link]
- **Monitoring Dashboard:** [Link]
- **Railway Incident Log:** [Link]

### Related Incidents

- **Previous similar incidents:** [Listar se houver]
  - Exemplo: "2025-10-15 - Database timeout (P2) - diferente root cause mas sintomas similares"
- **Pattern identified:** [Se aplicável]

### References

- `docs/INCIDENT_RESPONSE.md` - Scenario 1: Database Down
- `DISASTER_RECOVERY.md` - Backup procedures
- `scripts/rollback.sh` - Rollback automation

---

## Sign-off

**Post-Mortem Author:** [Nome] - [Data]
**Reviewed by:** [Nome] - [Data]
**Approved by (Incident Commander):** [Nome] - [Data]

**Review Meeting:**

- **Date:** DD/MM/YYYY
- **Attendees:** [Lista de participantes]
- **Action Items Owner Assignment:** ✅ Complete

---

## Appendix

### Logs Excerpt

```
[2025-11-15 15:20:15] ERROR: Connection to database failed
[2025-11-15 15:20:16] ERROR: pg_connect(): could not connect to server
[2025-11-15 15:20:17] FATAL: out of memory
[2025-11-15 15:20:17] DETAIL: Failed on request of size 1024
```

### Query Analysis

```sql
-- Slow query sem índice (identified as root cause):
EXPLAIN ANALYZE SELECT * FROM sections WHERE etp_id IN (1,2,3,...,50);

-- Execution time: 5.2s (antes do índice)
-- Execution time: 0.05s (depois do índice)
-- Speedup: 104x
```

### Timeline Diagram

```
15:20 ──────┬─── Incident Start (DB crash)
            │
15:22 ──────┼─── Alert fired
            │
15:25 ──────┼─── Root cause identified
            │
15:30 ──────┼─── DB restarted (mitigation)
            │
15:45 ──────┴─── All-clear declared
            │
16:05 ──────────── Users notified (resolution)

Total: 45 minutes (MTTR)
```

---

**Post-Mortem Version:** 1.0
**Template Version:** 1.0
**Last Updated:** 2025-11-15

---

## Usage Notes

**Mandatory sections:**

- Timeline
- Impact
- Root Cause
- Action Items

**Optional sections:**

- Supporting Information (helpful but not required)
- Appendix (use for deep technical details)

**Review timeline:**

- Draft: +24h após resolução
- Review meeting: +48h
- Final sign-off: +7 dias
- Action items completion: +30 dias

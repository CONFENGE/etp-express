# SLA (Service Level Agreement) - ETP Express

**Versao:** 1.0.0
**Ultima atualizacao:** 2025-12-20
**Responsavel:** DevOps/Operations Team
**Ambiente:** Railway (Producao)

---

## Indice

1. [Definicao de Niveis de Severidade](#1-definicao-de-niveis-de-severidade)
2. [Tempos de Resposta](#2-tempos-de-resposta)
3. [SLOs (Service Level Objectives)](#3-slos-service-level-objectives)
4. [Metricas e Medicao](#4-metricas-e-medicao)
5. [Processo de Escalation](#5-processo-de-escalation)
6. [Templates de Incidentes](#6-templates-de-incidentes)
7. [Revisao e Atualizacao](#7-revisao-e-atualizacao)

---

## 1. Definicao de Niveis de Severidade

### P0 - CRITICAL (Sistema Fora do Ar)

**Descricao:** Sistema completamente indisponivel ou funcionalidade critica de negocio totalmente comprometida.

**Exemplos:**
- Sistema nao responde (timeout em todos os endpoints)
- Database down (sem conexao)
- Autenticacao totalmente quebrada (ninguem consegue fazer login)
- Perda de dados em andamento
- Falha de seguranca ativa (vazamento de dados)

**Impacto:** 100% dos usuarios afetados, operacao completamente parada

### P1 - HIGH (Funcionalidade Critica Quebrada)

**Descricao:** Funcionalidade principal do negocio quebrada, afetando maioria dos usuarios.

**Exemplos:**
- Geracao de secoes ETP nao funciona (LLM timeout/erro)
- Exportacao de PDF/DOCX falhando
- Performance severamente degradada (>10s response time)
- Erro 500 em fluxo principal
- Integracao com APIs governamentais fora do ar

**Impacto:** 50-99% dos usuarios afetados, operacao parcialmente funcional

### P2 - MEDIUM (Funcionalidade Secundaria Afetada)

**Descricao:** Funcionalidade secundaria com problema, workaround disponivel.

**Exemplos:**
- Dashboard de analytics nao carrega
- Notificacoes por email com atraso
- Performance degradada em funcoes nao-criticas (2-5s)
- Bug visual em componente especifico
- Feature flag nao ativa corretamente

**Impacto:** 10-49% dos usuarios afetados, workaround existe

### P3 - LOW (Bug Menor)

**Descricao:** Problema menor, nao afeta fluxo principal de trabalho.

**Exemplos:**
- Typo em mensagem de interface
- Alinhamento visual incorreto
- Log excessivo (nao afeta funcionalidade)
- Tooltip com informacao desatualizada
- Funcionalidade edge-case com bug

**Impacto:** <10% dos usuarios percebem, nao afeta produtividade

---

## 2. Tempos de Resposta

### Janela de Suporte

| Tipo | Horario | Fuso |
|------|---------|------|
| **Suporte Padrao** | 08:00 - 18:00 (Segunda a Sexta) | Brasilia (BRT/BRST) |
| **On-Call P0/P1** | 24/7 | Brasilia (BRT/BRST) |

### Tempos de Resposta por Severidade

| Severidade | Primeira Resposta | Atualizacao ao Usuario | Resolucao Target | Escalation |
|------------|-------------------|------------------------|------------------|------------|
| **P0** | **15 minutos** | A cada 30 min | 4 horas | Imediato para Tech Lead + CTO |
| **P1** | **1 hora** | A cada 1 hora | 8 horas | +2h para Tech Lead |
| **P2** | **4 horas** | A cada 4 horas | 48 horas | +24h para Tech Lead |
| **P3** | **24 horas** | Sob demanda | 5 dias uteis | Nao requer |

### Definicoes

- **Primeira Resposta:** Tempo maximo desde a deteccao/report ate o primeiro contato com usuario confirmando ciencia do problema
- **Atualizacao ao Usuario:** Frequencia de comunicacao de status durante investigacao/resolucao
- **Resolucao Target:** Tempo objetivo para resolver completamente o problema (nao garantido, mas monitorado)
- **Escalation:** Quando e para quem escalar se nao resolvido

---

## 3. SLOs (Service Level Objectives)

### 3.1 Disponibilidade (Uptime)

| Metrica | Target | Minimo Aceitavel | Medicao |
|---------|--------|------------------|---------|
| **Uptime Mensal** | 99.9% | 99.5% | Railway + Sentry |
| **Uptime Semanal** | 99.95% | 99.8% | Railway + Sentry |

**Calculo:**
```
Uptime% = (Total Minutos Mes - Minutos Downtime) / Total Minutos Mes * 100
```

**Limites Praticos:**

| Target | Downtime Maximo/Mes | Downtime Maximo/Semana |
|--------|---------------------|------------------------|
| 99.9% | ~43 minutos | ~10 minutos |
| 99.5% | ~3.6 horas | ~50 minutos |

### 3.2 Latencia (Response Time)

| Endpoint | P50 Target | P95 Target | P99 Target | Timeout |
|----------|------------|------------|------------|---------|
| **Health Check** (`/api/health`) | <100ms | <200ms | <500ms | 5s |
| **Auth** (`/api/auth/*`) | <300ms | <800ms | <2s | 10s |
| **CRUD Simples** (`GET/POST ETPs`) | <500ms | <1.5s | <3s | 15s |
| **Geracao LLM** (`/api/sections/generate`) | <5s | <15s | <30s | 60s |
| **Export PDF/DOCX** (`/api/etps/:id/export`) | <3s | <8s | <15s | 30s |

**Definicoes:**
- **P50:** 50% das requests completam dentro deste tempo (mediana)
- **P95:** 95% das requests completam dentro deste tempo
- **P99:** 99% das requests completam dentro deste tempo
- **Timeout:** Tempo maximo antes de erro de timeout

### 3.3 Error Rate

| Metrica | Target | Alerta | Critico |
|---------|--------|--------|---------|
| **5xx Errors (por hora)** | <0.1% | >0.5% | >1% |
| **4xx Errors (por hora)** | <5% | >10% | >20% |
| **Timeout Rate** | <0.5% | >1% | >3% |

### 3.4 Throughput

| Metrica | Baseline | Target Peak | Limite |
|---------|----------|-------------|--------|
| **Requests/segundo** | 10-50 | 200 | 500 |
| **Usuarios Concorrentes** | 20-100 | 500 | 1000 |
| **Geracoes LLM/hora** | 50-200 | 1000 | 2000 (rate limit API) |

---

## 4. Metricas e Medicao

### 4.1 Ferramentas de Monitoramento

| Ferramenta | Uso | Dashboard |
|------------|-----|-----------|
| **Railway Metrics** | CPU, Memory, Disk, Requests | https://railway.app/dashboard |
| **Sentry** | Errors, Performance, Traces | https://sentry.io/organizations/confenge/ |
| **Health Endpoint** | Uptime Checks | `/api/health`, `/api/health/ready` |
| **Prometheus** (futuro) | Custom Metrics | Em implementacao (#860-#862) |

### 4.2 Health Checks

**Automatizados (Railway):**
- Frequencia: A cada 30 segundos
- Endpoint: `GET /api/health`
- Timeout: 5 segundos
- Retries: 3

**Manuais (Checklist Diario):**
- Ver `OPS_RUNBOOK.md` secao 7

### 4.3 Alertas

| Condicao | Severidade | Notificacao |
|----------|------------|-------------|
| Health check falhou 3x consecutivas | P0 | Sentry + Email + SMS |
| Error rate >1% (5 min window) | P1 | Sentry + Email |
| Response time P95 >3s (15 min window) | P2 | Sentry |
| CPU >90% (10 min sustained) | P2 | Railway + Email |
| Memory >90% | P1 | Railway + Email |
| Disk >80% | P2 | Railway |

---

## 5. Processo de Escalation

### 5.1 Matriz de Escalation

```
Tempo desde inicio do incidente:

P0:
  +0min   -> On-Call Engineer (imediato)
  +15min  -> Tech Lead (se nao resolvido)
  +30min  -> CTO (se nao resolvido)
  +60min  -> CEO/Stakeholders (comunicacao de crise)

P1:
  +0min   -> DevOps Engineer
  +2h     -> Tech Lead (se nao resolvido)
  +4h     -> CTO (se nao resolvido)

P2:
  +0min   -> Desenvolvedor Designado
  +24h    -> Tech Lead (se nao resolvido)
  +48h    -> DevOps Review

P3:
  +0min   -> Backlog (proxima sprint)
  +5 dias -> Tech Lead Review (se expirado)
```

### 5.2 Contatos de Emergencia

| Funcao | Responsabilidade | Contato |
|--------|------------------|---------|
| **On-Call Engineer** | Primeira resposta 24/7 | [Definir] |
| **Tech Lead Backend** | Escalation tecnica | [Definir] |
| **DevOps Lead** | Infraestrutura | [Definir] |
| **CTO** | Decisoes criticas | [Definir] |

### 5.3 Criterios para Escalation

**Escalar imediatamente se:**
- Problema afeta >50% dos usuarios
- Dados em risco (perda ou exposicao)
- Tempo de resolucao estimado >2x o target
- Causa raiz nao identificada apos 30min (P0) ou 2h (P1)
- Requires expertise externa (cloud provider, etc)

---

## 6. Templates de Incidentes

### 6.1 Templates Disponiveis

| Template | Arquivo | Quando Usar |
|----------|---------|-------------|
| **Notificacao de Incidente** | `docs/templates/incident-notification.md` | Inicio de P0/P1 |
| **Incidente Resolvido** | `docs/templates/incident-resolved.md` | Resolucao de P0/P1 |
| **Post-Mortem** | `docs/templates/post-mortem.md` | 48h apos P0/P1 |

### 6.2 Documentacao de Incidentes

**Formato de Registro:**

```markdown
## Incidente #YYYY-MM-DD-XX

**ID:** INC-YYYY-MM-DD-XX
**Severidade:** P0/P1/P2/P3
**Status:** Aberto | Em Investigacao | Mitigado | Resolvido
**Duracao:** HH:MM (inicio) - HH:MM (fim)

### Timeline
- HH:MM - Incidente detectado [como]
- HH:MM - Primeira resposta [quem]
- HH:MM - Root cause identificada
- HH:MM - Mitigacao aplicada
- HH:MM - Resolucao completa

### Root Cause
[Descricao tecnica da causa raiz]

### Impacto
- Usuarios afetados: XX
- Funcionalidades afetadas: [lista]
- Dados afetados: [sim/nao + detalhes]

### Acoes Tomadas
1. [Acao 1]
2. [Acao 2]
3. [Acao 3]

### Acoes Preventivas
1. [Medida preventiva 1] - Responsavel: [Nome] - Prazo: [Data]
2. [Medida preventiva 2] - Responsavel: [Nome] - Prazo: [Data]

### Metricas
- MTTR (Mean Time to Resolve): XX minutos
- MTTA (Mean Time to Acknowledge): XX minutos
```

### 6.3 Post-Mortem (P0/P1 Obrigatorio)

**Prazo:** 48 horas apos resolucao

**Conteudo Obrigatorio:**
- Timeline detalhada
- Root cause analysis (5 Whys)
- Impacto quantificado
- Acoes preventivas com owners e prazos
- Lessons learned

**Armazenamento:** `docs/incidents/YYYY/INC-YYYY-MM-DD-XX.md`

---

## 7. Revisao e Atualizacao

### 7.1 Cronograma de Revisao

| Frequencia | Escopo | Responsavel |
|------------|--------|-------------|
| **Semanal** | Metricas de SLO | DevOps |
| **Mensal** | SLA Compliance Report | Tech Lead |
| **Trimestral** | Revisao de Targets | CTO + DevOps |
| **Anual** | SLA Completo | Lideranca |

### 7.2 Criterios para Ajuste de SLOs

**Aumentar Targets (mais rigoroso):**
- Cumprindo target >99% por 3 meses consecutivos
- Feedback de clientes indicando expectativas maiores
- Concorrentes oferecendo melhores SLAs

**Relaxar Targets (menos rigoroso):**
- Nao cumprindo target por 3 meses consecutivos
- Custo de infraestrutura insustentavel
- Trade-off com outras prioridades de negocio

### 7.3 Versionamento

| Versao | Data | Mudancas |
|--------|------|----------|
| 1.0.0 | 2025-12-20 | Versao inicial |

---

## Documentacao Relacionada

- **Runbook Operacional:** `docs/OPS_RUNBOOK.md`
- **Template Notificacao:** `docs/templates/incident-notification.md`
- **Template Resolucao:** `docs/templates/incident-resolved.md`
- **Monitoramento:** `docs/MONITORING.md`
- **Deploy:** `DEPLOY_RAILWAY.md`

---

**Gerado com [Claude Code](https://claude.com/claude-code)**

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

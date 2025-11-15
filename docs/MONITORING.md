# 📊 Production Monitoring & Observability

**Status:** ✅ Implementado
**Última atualização:** 2025-11-15
**Versão:** 1.0

## Visão Geral

O ETP Express possui infraestrutura completa de observability em produção para detectar e alertar sobre falhas automaticamente.

**Objetivos:**
- **MTTD (Mean Time to Detect):** <5 minutos para P0/P1 incidents
- **Error tracking:** 100% de exceptions capturadas
- **Alerting:** Notificações automáticas em <2 minutos
- **Visibility:** Dashboards real-time de health, performance, errors

---

## 🏗️ Arquitetura

### Stack de Monitoring

| Componente | Tecnologia | Função |
|------------|------------|--------|
| **Error Tracking** | Sentry | Captura exceptions backend + frontend |
| **Infrastructure Metrics** | Railway Metrics | CPU, Memory, Network (built-in) |
| **Application Metrics** | Custom `/api/metrics` | DB connections, queries, uptime |
| **Alerting** | Sentry Alerts + Railway Webhooks | Slack/Email notifications |
| **Dashboards** | Sentry + Railway UI | Real-time visibility |

### Diagrama de Fluxo

```
┌─────────────┐
│   Backend   │──┐
│   (NestJS)  │  │
└─────────────┘  │
                  │  Exceptions
┌─────────────┐  │  ↓
│  Frontend   │──┼────────────→  ┌──────────┐
│   (React)   │  │               │  Sentry  │
└─────────────┘  │               └──────────┘
                  │                     │
                  │                     │ Alerts
                  │                     ↓
                  │               ┌──────────┐
                  │               │  Slack   │
                  │               │ #alerts  │
                  │               └──────────┘
                  │
┌─────────────┐  │  Metrics
│  PostgreSQL │──┤  ↓
└─────────────┘  │  ┌──────────────────┐
                  └→ │ /api/metrics     │
                     │ (Prometheus fmt) │
                     └──────────────────┘
                              │
                              ↓
                     ┌──────────────────┐
                     │ Railway Metrics  │
                     │    Dashboard     │
                     └──────────────────┘
```

---

## 🚨 Error Tracking (Sentry)

### Configuração

**Backend (NestJS):**
- SDK: `@sentry/nestjs`
- Integrations: HTTP tracing, PostgreSQL, Profiling
- Sample rate: 10% em produção, 100% em development
- Filtros: Sanitiza headers (Authorization, Cookie), passwords, tokens

**Frontend (React):**
- SDK: `@sentry/react`
- Integrations: Browser tracing, Session Replay
- Sample rate: 10% navegações, 100% sessões com erro
- Error Boundary: Fallback UI com botão "Recarregar Página"

### Variáveis de Ambiente

```bash
# Backend (.env)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENVIRONMENT=production

# Frontend (.env)
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### Dashboard Sentry

**URL:** https://sentry.io/organizations/{org}/issues/

**Widgets principais:**
- Error rate (last 24h)
- Top 10 errors by frequency
- Affected users count
- Response time p95
- Release comparison

---

## 📈 Application Metrics

### Endpoint: `/api/metrics`

**Formato:** Prometheus text format
**URL:** https://etp-express.up.railway.app/api/metrics
**Endpoint JSON:** `/api/metrics/json`

### Métricas Coletadas

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `database_connections_active` | Gauge | Conexões ativas no PostgreSQL |
| `database_connections_total` | Gauge | Total de conexões abertas |
| `database_connections_max` | Gauge | Máximo permitido (Railway: 100) |
| `memory_usage_bytes` | Gauge | Heap memory usada |
| `memory_limit_bytes` | Gauge | Heap memory total |
| `memory_rss_bytes` | Gauge | Resident Set Size |
| `uptime_seconds` | Counter | Uptime do processo Node.js |
| `process_id` | Gauge | PID do processo |

### Exemplo de Response

```
# ETP Express Application Metrics
# Generated: 2025-11-15T10:30:00Z

# HELP database_connections_active Active database connections
# TYPE database_connections_active gauge
database_connections_active 5

# HELP memory_usage_bytes Memory heap used in bytes
# TYPE memory_usage_bytes gauge
memory_usage_bytes 45678901

# HELP uptime_seconds Process uptime in seconds
# TYPE uptime_seconds counter
uptime_seconds 3600
```

---

## 🔔 Alerting

### Sentry Alerts

Configurar no dashboard do Sentry:

#### 1. High Error Rate
- **Condition:** Error count > 10 in 1 minute
- **Action:** Send to Slack #etp-alerts
- **Severity:** P1

#### 2. New Error (First Seen)
- **Condition:** First time this error appears
- **Action:** Send to Slack #etp-alerts
- **Severity:** P2

#### 3. Regression
- **Condition:** Issue marked as resolved but reappears
- **Action:** Send to Slack #etp-alerts + Email
- **Severity:** P1

### Railway Webhooks

Configurar no Railway Dashboard → Settings → Webhooks:

#### 1. Deploy Failed
- **Event:** `deployment.failed`
- **URL:** Slack webhook URL
- **Severity:** P0

#### 2. High Memory Usage
- **Event:** `metrics.memory.high`
- **Trigger:** Memory > 85%
- **URL:** Slack webhook URL
- **Severity:** P1

### Slack Setup

1. Criar canal `#etp-alerts`
2. Criar Slack App em https://api.slack.com/apps
3. Enable "Incoming Webhooks"
4. Criar webhook para `#etp-alerts`
5. Copiar webhook URL e configurar no Sentry/Railway

---

## 📊 Dashboards

### 1. Railway Metrics (Infrastructure)

**URL:** https://railway.app/project/{project-id}/metrics

**Widgets padrão:**
- CPU usage (%)
- Memory usage (MB)
- Network I/O (MB/s)
- Deployment history

**Custom endpoint:** `/api/metrics` (adicionar manualmente se suportado)

### 2. Sentry Dashboard (Application)

**URL:** https://sentry.io/organizations/{org}/dashboard/

**Widgets criados:**
- Error rate trend (last 7 days)
- Top 10 errors by frequency
- Affected users by browser/OS
- Response time p50/p95/p99
- Release health (current vs previous)

---

## 🚀 Setup Completo

### 1. Criar conta Sentry

```bash
# 1. Acessar https://sentry.io/signup/
# 2. Criar organização "ETP Express"
# 3. Criar 2 projetos:
#    - etp-express-backend (platform: Node.js)
#    - etp-express-frontend (platform: React)
# 4. Copiar DSNs
```

### 2. Configurar variáveis Railway

```bash
# Railway Dashboard → Project → Variables
SENTRY_DSN=<backend-dsn>
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_ENVIRONMENT=production

# Frontend build vars
VITE_SENTRY_DSN=<frontend-dsn>
```

### 3. Deploy e validar

```bash
# Deploy automático via push to master
git push origin master

# Validar error tracking
curl -X POST https://etp-express.up.railway.app/api/debug/sentry-test
# → Verificar erro no Sentry em <30s

# Validar métricas
curl https://etp-express.up.railway.app/api/metrics
# → Ver métricas em formato Prometheus
```

---

## 📖 Runbooks de Alerta

### Alert: High Error Rate (>10 errors/min)

**Severity:** P1
**MTTD:** <2 min

**Ação:**
1. Acessar [Sentry Dashboard](https://sentry.io) → ver stack trace completo
2. Executar `railway logs -f` para logs real-time
3. Identificar root cause:
   - API externa down? (OpenAI, Perplexity)
   - Database timeout?
   - Bug de código?
4. Se crítico: Executar rollback (ver `INCIDENT_RESPONSE.md`)
5. Se não crítico: Criar hotfix PR

### Alert: New Error (First Seen)

**Severity:** P2
**MTTD:** <5 min

**Ação:**
1. Revisar stack trace no Sentry
2. Verificar se afeta funcionalidade crítica
3. Se sim: Escalar para P1
4. Se não: Adicionar ao backlog para próximo sprint

### Alert: Deploy Failed

**Severity:** P0
**MTTD:** <1 min

**Ação:**
1. Verificar logs do Railway: `railway logs -f`
2. Identificar causa:
   - Build error? → Corrigir código
   - Health check fail? → Ver `/api/health` endpoint
   - Timeout? → Aumentar timeout no `.railway.toml`
3. Opções:
   - Corrigir localmente → Push fix
   - Rollback: `./scripts/rollback.sh`

### Alert: Memory > 85%

**Severity:** P1
**MTTD:** <2 min

**Ação:**
1. Executar `curl /api/metrics/json` → ver memory_usage_bytes
2. Verificar memory leak:
   - Conexões DB não fechadas?
   - Event listeners não removidos?
   - Cache sem TTL?
3. Restart temporário: `railway restart`
4. Investigar root cause e criar fix permanente

---

## 🔧 Troubleshooting

### Sentry não recebe erros

**Checklist:**
- [ ] `SENTRY_DSN` configurado no Railway?
- [ ] `initSentry()` sendo chamado antes de `NestFactory.create()`?
- [ ] Error está sendo ignorado em `ignoreErrors`?
- [ ] Ambiente é production? (development pode ter sample rate 0)

**Debug:**
```bash
# Backend: Testar endpoint de debug
curl -X GET https://etp-express.up.railway.app/api/debug/sentry-test

# Frontend: Abrir console e verificar
console.log(import.meta.env.VITE_SENTRY_DSN) // Deve ter valor
```

### Métricas `/api/metrics` retorna 404

**Checklist:**
- [ ] `MetricsController` adicionado ao `HealthModule`?
- [ ] Endpoint está em `/api/metrics` (não `/metrics`)?
- [ ] Deploy foi feito após adicionar controller?

**Fix:**
```bash
# Verificar que HealthModule exporta MetricsController
# backend/src/health/health.module.ts
```

### Railway webhooks não disparam

**Checklist:**
- [ ] Webhook URL válido (testar com `curl -X POST`)?
- [ ] Evento correto configurado (ex: `deployment.failed`)?
- [ ] Slack App tem permissões de webhook?

---

## 📚 Referências

- [Sentry NestJS Docs](https://docs.sentry.io/platforms/node/guides/nestjs/)
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Railway Metrics](https://docs.railway.app/reference/metrics)
- [Prometheus Format](https://prometheus.io/docs/instrumenting/exposition_formats/)

---

**Próximos passos:**
1. Configurar PagerDuty para P0 incidents (on-call rotation)
2. Adicionar custom business metrics (ETPs criados/dia, tempo médio de geração)
3. Configurar distributed tracing com OpenTelemetry

**Última revisão:** 2025-11-15

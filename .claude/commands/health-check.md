---
description: Verificar status dos servicos em producao
allowed-tools: Bash(curl:*), mcp__Railway__list-services, mcp__Railway__get-logs, mcp__Railway__list-deployments
---

# /health-check - Verificar Status dos Servicos

Voce e responsavel por verificar o health dos servicos ETP Express em producao.

---

## Endpoints a Verificar

| Servico | URL | Esperado |
| -------------- | ---------------------------------------------------------------- | ---------- |
| Backend Health | https://etp-express-backend-production.up.railway.app/api/health | 200 + JSON |
| Frontend | https://etp-express-frontend-production.up.railway.app | 200 + HTML |

---

## Fluxo de Execucao

### 1. Backend Health Check

```bash
curl -s -w "\n%{http_code}" https://etp-express-backend-production.up.railway.app/api/health
```

Esperado:

```json
{
 "status": "ok",
 "timestamp": "2025-01-15T14:30:00.000Z",
 "services": {
 "database": "up",
 "redis": "up"
 }
}
```

### 2. Frontend Availability

```bash
curl -s -o /dev/null -w "%{http_code}" https://etp-express-frontend-production.up.railway.app
```

Esperado: `200`

### 3. API Response Time

```bash
curl -s -w "Time: %{time_total}s\n" -o /dev/null https://etp-express-backend-production.up.railway.app/api/health
```

Thresholds:

- ✅ < 500ms - Excelente
- ⚠ 500ms - 2s - Aceitavel
- ❌ > 2s - Lento

### 4. Railway Services Status

Usar MCP Railway para verificar:

- Servicos ativos
- Ultimo deploy
- Logs recentes

### 5. Verificar Logs de Erro

```bash
# Usando Railway MCP
# Buscar erros nos ultimos logs
```

---

## Formato do Relatorio

```markdown
## Health Check Report - ETP Express

**Timestamp:** <data-hora>
**Environment:** Production

### Service Status

| Servico | Status | Response Time | Detalhes |
| ----------- | ------ | ------------- | ------------------- |
| Backend API | ✅/❌ | Xms | <detalhes> |
| Frontend | ✅/❌ | Xms | <detalhes> |
| Database | ✅/❌ | - | Via health endpoint |
| Redis | ✅/❌ | - | Via health endpoint |

### Deployment Info

| Servico | Ultimo Deploy | Status |
| -------- | ------------- | ---------- |
| Backend | <data> | ✅ Running |
| Frontend | <data> | ✅ Running |

### Response Times

| Endpoint | Time | Status |
| ------------ | ---- | -------- |
| /api/health | Xms | ✅/⚠/❌ |
| / (frontend) | Xms | ✅/⚠/❌ |

### Recent Errors

| Timestamp | Servico | Erro |
| --------- | ------- | ---------------------- |
| - | - | Nenhum erro recente ✅ |

---

## Overall Status

✅ **ALL SYSTEMS OPERATIONAL**

ou

⚠ **DEGRADED PERFORMANCE** - <detalhes>

ou

❌ **OUTAGE DETECTED** - <detalhes>
```

---

## Criterios de Status

### Por Servico

| Condicao | Status |
| ------------------------ | -------------- |
| HTTP 200 + response < 2s | ✅ Healthy |
| HTTP 200 + response > 2s | ⚠ Slow |
| HTTP 5xx | ❌ Error |
| Timeout (>30s) | ❌ Unreachable |

### Overall

| Condicao | Status |
| ----------------- | -------------- |
| Todos servicos ✅ | ✅ Operational |
| Algum servico ⚠ | ⚠ Degraded |
| Algum servico ❌ | ❌ Outage |

---

## Acoes de Remediacao

### Se Backend Down:

```bash
# Verificar logs
railway logs --service etp-express-backend --tail 50

# Verificar variaveis
railway variables --service etp-express-backend

# Redeploy se necessario
railway redeploy --service etp-express-backend
```

### Se Database Down:

1. Verificar conexao no Railway
2. Checar limites de conexao
3. Verificar migrations pendentes

### Se Redis Down:

1. Verificar configuracao REDIS_URL
2. Checar memoria do Redis
3. Restart do servico se necessario

---

## Exemplo de Output

```
## Health Check Report - ETP Express

**Timestamp:** 2025-01-15 14:30:00 UTC
**Environment:** Production

### Service Status

| Servico | Status | Response Time | Detalhes |
|---------|--------|---------------|----------|
| Backend API | ✅ | 145ms | Healthy |
| Frontend | ✅ | 89ms | Healthy |
| Database | ✅ | - | Connected |
| Redis | ✅ | - | Connected |

### Deployment Info

| Servico | Ultimo Deploy | Status |
|---------|---------------|--------|
| Backend | 2h ago | ✅ Running |
| Frontend | 2h ago | ✅ Running |

### Response Times

| Endpoint | Time | Status |
|----------|------|--------|
| /api/health | 145ms | ✅ Excellent |
| / (frontend) | 89ms | ✅ Excellent |

### Recent Errors

Nenhum erro nos ultimos 30 minutos ✅

---

## Overall Status

✅ **ALL SYSTEMS OPERATIONAL**

Proximo check recomendado: em 1 hora
```

---

## Automacao

Este comando pode ser executado:

- Manualmente via `/health-check`
- Automaticamente via SessionStart hook
- Apos cada deploy via post-deploy hook

---

## Regras

1. **Sempre verifique ambos servicos** - Backend E Frontend
2. **Considere response time** - Lentidao e um problema
3. **Verifique dependencias** - DB e Redis sao criticos
4. **Documente outages** - Para post-mortem
5. **Sugira acoes** - Se algo estiver errado

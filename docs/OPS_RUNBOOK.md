# OPS_RUNBOOK.md - Procedimentos Operacionais ETP Express

**Versao:** 1.0.0
**Ultima atualizacao:** 2025-12-20
**Responsavel:** DevOps/Admin do projeto
**Ambiente:** Railway (Producao)

---

## Indice

1. [Rotacao de Secrets](#1-rotacao-de-secrets)
2. [Execucao de Migrations](#2-execucao-de-migrations)
3. [Escalonamento de Servicos](#3-escalonamento-de-servicos)
4. [Acesso a Logs (Railway)](#4-acesso-a-logs-railway)
5. [Reinicio de Servicos](#5-reinicio-de-servicos)
6. [Rollback de Deploy](#6-rollback-de-deploy)
7. [Checklist de Verificacao Diaria](#7-checklist-de-verificacao-diaria)
8. [Contatos de Emergencia](#8-contatos-de-emergencia)
9. [Staged Rollout de Features](#9-staged-rollout-de-features)

---

## 1. Rotacao de Secrets

### 1.1 Cronograma de Rotacao

| Secret         | Frequencia  | Proxima Rotacao | Risco   |
| -------------- | ----------- | --------------- | ------- |
| JWT_SECRET     | Mensal      | Dia 25 do mes   | ALTO    |
| SESSION_SECRET | Mensal      | Dia 25 do mes   | ALTO    |
| OPENAI_API_KEY | Trimestral  | Fev/Mai/Ago/Nov | MEDIO   |
| EXA_API_KEY    | Trimestral  | Fev/Mai/Ago/Nov | MEDIO   |
| DATABASE_URL   | Sob demanda | N/A             | CRITICO |

### 1.2 Rotacao JWT_SECRET (Dual-Key - Zero Downtime)

**Tempo estimado:** 10 minutos

**Passo 1: Gerar novo secret**

```bash
openssl rand -base64 32
```

**Passo 2: Habilitar modo dual-key**

1. Acesse Railway Dashboard > etp-express-backend > Variables
2. **Copie** o valor atual de `JWT_SECRET`
3. **Crie** nova variavel `JWT_SECRET_OLD` com o valor copiado
4. **Atualize** `JWT_SECRET` com o novo secret gerado
5. Clique em **Save Changes**

**Passo 3: Aguardar redeploy** (~30-60s)

- Railway faz redeploy automaticamente
- Verificar logs: `railway logs --service=etp-express-backend`

**Passo 4: Validar** (aguardar 24-48h)

```bash
# Testar login
curl -X POST https://etp-express-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

**Passo 5: Remover secret antigo**

1. Railway Dashboard > Variables
2. **Delete** `JWT_SECRET_OLD`
3. Save Changes

### 1.3 Rotacao OPENAI_API_KEY

**Tempo estimado:** 5 minutos

**Passo 1: Criar nova API Key**

1. Acesse https://platform.openai.com/api-keys
2. Clique em **Create new secret key**
3. Nome: `etp-express-prod-YYYY-MM`
4. Copie a chave imediatamente

**Passo 2: Atualizar no Railway**

1. Railway Dashboard > etp-express-backend > Variables
2. Atualize `OPENAI_API_KEY` com a nova chave
3. Save Changes (redeploy automatico)

**Passo 3: Validar**

```bash
# Testar geracao de secao
curl -X POST https://etp-express-backend.railway.app/api/sections/test/generate \
  -H "Authorization: Bearer <token>"
```

**Passo 4: Revogar chave antiga**

1. OpenAI Dashboard > API Keys
2. Encontre a chave antiga
3. Delete/Revoke

### 1.4 Rotacao de Emergencia (Secret Comprometido)

**Tempo de resposta:** 15 minutos maximo

1. **Identificar** qual secret foi comprometido
2. **Rotacionar imediatamente** seguindo procedimento acima
3. **Auditar logs** por acessos nao autorizados:
   ```bash
   railway logs --service=etp-express-backend | grep -i "unauthorized\|401\|403"
   ```
4. **Notificar** equipe via canal de incidentes
5. **Documentar** em issue GitHub com label `security`

**Referencia completa:** `docs/SECRET_ROTATION_PROCEDURES.md`

---

## 2. Execucao de Migrations

### 2.1 Verificar Migrations Pendentes

```bash
# Via Railway CLI
railway run --service=etp-express-backend npm run migration:show
```

### 2.2 Executar Migration em Producao

**Tempo estimado:** 2-5 minutos

**IMPORTANTE:** Railway executa migrations automaticamente no start do servico via:

```
npm run migration:run:prod && npm run start:prod
```

**Para execucao manual (se necessario):**

```bash
# 1. Criar backup antes (OBRIGATORIO)
railway run --service=postgresql pg_dump > backup-pre-migration-$(date +%Y%m%d_%H%M%S).sql

# 2. Executar migration
railway run --service=etp-express-backend npm run migration:run:prod

# 3. Verificar sucesso
railway run --service=etp-express-backend npm run migration:show
```

### 2.3 Reverter Migration (Rollback)

**CUIDADO:** Pode causar perda de dados!

```bash
# Reverter ultima migration
railway run --service=etp-express-backend npm run migration:revert

# Verificar status
railway run --service=etp-express-backend npm run migration:show
```

### 2.4 Criar Nova Migration

```bash
# Localmente (desenvolvimento)
cd backend
npm run migration:generate -- -n NomeDaMigration

# Arquivo criado em: backend/src/migrations/TIMESTAMP_NomeDaMigration.ts
```

**Referencia completa:** `DEPLOY_RAILWAY.md` (secao Migrations)

---

## 3. Escalonamento de Servicos

### 3.1 Configuracao Atual

| Servico  | Min Replicas | Max Replicas | Target CPU | Target Memory |
| -------- | ------------ | ------------ | ---------- | ------------- |
| Backend  | 2            | 4            | 70%        | 80%           |
| Frontend | 1            | 2            | 70%        | 80%           |

### 3.2 Escalar Backend Manualmente

**Via Railway Dashboard:**

1. Acesse Railway Dashboard > etp-express-backend
2. Navegue para **Settings** > **Scaling** (ou **Deploy**)
3. Configure:
   - **Min Replicas:** 2 (recomendado para HA)
   - **Max Replicas:** 4 (picos de carga)
   - **Target CPU:** 70%
   - **Target Memory:** 80%
4. Clique em **Save**

### 3.3 Verificar Replicas Ativas

**Via Railway Dashboard:**

1. etp-express-backend > Deployments > Latest > Metrics/Replicas
2. Verificar que 2+ instancias estao **Healthy**

**Via CLI:**

```bash
railway status
railway logs --service=etp-express-backend | grep "Application started"
```

### 3.4 Escalar Database (PgBouncer)

**Quando usar:** 5+ replicas backend ou erros de "too many connections"

1. Criar servico PgBouncer no Railway (ver `DEPLOY_RAILWAY.md` secao 6.6)
2. Atualizar `DATABASE_URL` do backend para usar PgBouncer
3. Reduzir pool size do TypeORM para 5

**Referencia completa:** `DEPLOY_RAILWAY.md` (secao 6.5 e 6.6)

---

## 4. Acesso a Logs (Railway)

### 4.1 Via Railway Dashboard (Recomendado)

1. Acesse https://railway.app/dashboard
2. Selecione projeto **etp-express**
3. Clique no servico desejado (backend/frontend/postgresql)
4. Aba **Logs**

### 4.2 Via Railway CLI

```bash
# Instalar CLI (se necessario)
npm install -g @railway/cli

# Login
railway login

# Logs do backend (tempo real)
railway logs --service=etp-express-backend

# Logs do backend (ultimas 100 linhas)
railway logs --service=etp-express-backend --tail 100

# Logs do frontend
railway logs --service=etp-express-frontend

# Logs do PostgreSQL
railway logs --service=postgresql

# Filtrar por padrao
railway logs --service=etp-express-backend | grep -i "error"
railway logs --service=etp-express-backend | grep -i "health"
```

### 4.3 Logs Estruturados (JSON)

O backend emite logs em formato JSON estruturado:

```json
{
  "level": "info",
  "message": "Request completed",
  "requestId": "abc123",
  "traceId": "xyz789",
  "timestamp": "2025-12-20T10:30:00.000Z"
}
```

**Filtrar por request ID:**

```bash
railway logs --service=etp-express-backend | grep "abc123"
```

### 4.4 Alertas de Erro (Sentry)

- **Dashboard:** https://sentry.io/organizations/confenge/
- Erros criticos geram alertas automaticos
- Ver `docs/MONITORING.md` para configuracao

---

## 5. Reinicio de Servicos

### 5.1 Reiniciar Backend

**Via Railway Dashboard:**

1. etp-express-backend > Deployments
2. Clique no menu de 3 pontos do deploy ativo
3. Selecione **Restart** ou **Redeploy**

**Via CLI:**

```bash
railway redeploy --service=etp-express-backend
```

### 5.2 Reiniciar Frontend

```bash
railway redeploy --service=etp-express-frontend
```

### 5.3 Reiniciar PostgreSQL

**CUIDADO:** Causa downtime temporario!

1. Railway Dashboard > PostgreSQL > Settings
2. **Restart Service**

**Ou via CLI:**

```bash
railway redeploy --service=postgresql
```

### 5.4 Reiniciar por Mudanca de Variavel

Qualquer alteracao em **Variables** do Railway causa redeploy automatico:

1. Railway Dashboard > Servico > Variables
2. Altere qualquer valor (mesmo adicionando espaco)
3. Save Changes
4. Servico reinicia automaticamente

### 5.5 Forcar Redeploy (Cache Limpo)

```bash
# Forcar build completo (ignorar cache)
railway up --force
```

---

## 6. Rollback de Deploy

### 6.1 Rollback via Railway Dashboard

**Tempo estimado:** 2-5 minutos

1. Acesse Railway Dashboard > etp-express-backend
2. Navegue para **Deployments**
3. Encontre o deploy anterior (antes do problema)
4. Clique no menu de 3 pontos
5. Selecione **Rollback to this deployment**
6. Confirme a acao

### 6.2 Rollback via Git Revert

**Para problemas de codigo:**

```bash
# Identificar commit problematico
git log --oneline -10

# Reverter commit especifico
git revert <commit-hash>

# Push (dispara novo deploy)
git push origin master
```

### 6.3 Rollback de Migration + Deploy

**Para problemas de database:**

```bash
# 1. Reverter migration
railway run --service=etp-express-backend npm run migration:revert

# 2. Reverter codigo (se necessario)
git revert <commit-hash>
git push origin master

# 3. Verificar aplicacao
curl https://etp-express-backend.railway.app/api/health
```

### 6.4 Rollback Completo (Restore de Backup)

**Para desastres maiores:**

1. Identificar ultimo backup valido:
   - Railway Dashboard > PostgreSQL > Backups

2. Criar novo PostgreSQL service (opcional, para teste):

   ```bash
   railway add postgresql-recovery
   ```

3. Restaurar backup:
   - Railway Dashboard > Backup desejado > Restore

4. Validar dados:

   ```bash
   railway run --service=postgresql psql -c "SELECT COUNT(*) FROM etps;"
   ```

5. Atualizar `DATABASE_URL` do backend (se novo PostgreSQL)

**Referencia completa:** `DISASTER_RECOVERY.md`

---

## 7. Checklist de Verificacao Diaria

### 7.1 Health Check (5 minutos)

- [ ] Backend UP: `curl https://etp-express-backend.railway.app/api/health`
- [ ] Frontend UP: `curl -I https://etp-express-frontend.railway.app`
- [ ] Swagger acessivel: https://etp-express-backend.railway.app/api/docs
- [ ] Railway Dashboard: 2+ replicas backend ativas

### 7.2 Logs (10 minutos)

```bash
# Verificar erros criticos (ultimas 24h)
railway logs --service=etp-express-backend --tail 500 | grep -i "error\|fatal\|critical"

# Verificar health checks
railway logs --service=etp-express-backend | grep "health"
```

### 7.3 Metricas Railway

1. Railway Dashboard > Observability
2. Verificar:
   - CPU < 80%
   - Memory < 85%
   - Disk < 90%
   - Error rate < 1%

### 7.4 Sentry (Erros)

1. Acesse https://sentry.io/organizations/confenge/
2. Verificar:
   - Zero erros **Critical/Fatal** nas ultimas 24h
   - < 5 warnings
   - Nenhum erro repetitivo

### 7.5 Backups

```bash
# Verificar ultimo backup (Railway Dashboard > PostgreSQL > Backups)
# Deve haver backup < 24h
```

---

## 8. Contatos de Emergencia

### Escalation Matrix

> **Referencia Completa:** Ver `docs/SLA.md` para definicoes detalhadas de severidade, SLOs e processo de escalation.

| Severity | Descricao                         | Tempo Resposta | Resolucao Target | Responsavel        |
| -------- | --------------------------------- | -------------- | ---------------- | ------------------ |
| **P0**   | Sistema fora do ar                | 15 minutos     | 4 horas          | DevOps + Tech Lead |
| **P1**   | Funcionalidade critica quebrada   | 1 hora         | 8 horas          | DevOps             |
| **P2**   | Funcionalidade secundaria afetada | 4 horas        | 48 horas         | Desenvolvedor      |
| **P3**   | Bug menor                         | 24 horas       | 5 dias uteis     | Desenvolvedor      |

### Contatos

| Funcao            | Nome   | Email   | Telefone   |
| ----------------- | ------ | ------- | ---------- |
| DevOps Engineer   | [Nome] | [email] | [telefone] |
| Backend Tech Lead | [Nome] | [email] | [telefone] |
| CTO               | [Nome] | [email] | [telefone] |

### Links Rapidos

| Recurso           | URL                                                |
| ----------------- | -------------------------------------------------- |
| Railway Dashboard | https://railway.app/dashboard                      |
| Sentry            | https://sentry.io/organizations/confenge/          |
| GitHub Issues     | https://github.com/CONFENGE/etp-express/issues     |
| Backend Health    | https://etp-express-backend.railway.app/api/health |
| Swagger Docs      | https://etp-express-backend.railway.app/api/docs   |

---

## 9. Staged Rollout de Features

### 9.1 Overview

O sistema de Staged Rollout permite lancar features gradualmente atraves de 3 fases:

| Fase      | % Usuarios | Duracao Min. | Error Rate Max | Usuarios Min | Descricao                     |
| --------- | ---------- | ------------ | -------------- | ------------ | ----------------------------- |
| **Alpha** | 5%         | 24h          | 5%             | 10           | Testadores internos, QA, devs |
| **Beta**  | 25%        | 72h          | 2%             | 50           | Early adopters, parceiros     |
| **GA**    | 100%       | -            | 1%             | -            | Todos os usuarios (stable)    |

### 9.2 Arquitetura do Sistema

**Backend:**

- `feature-flags.service.ts` - Servico principal de flags
- `rollout-metrics.service.ts` - Tracking de metricas por feature
- `rollout-strategy.config.ts` - Configuracao das fases

**Frontend:**

- `featureFlagsStore.ts` - Store Zustand para flags
- `useFeatureFlag.ts` - Hook React para consultar flags

**Persistencia:** Redis (com fallback para defaults se indisponivel)

### 9.3 Endpoints da API

| Metodo | Endpoint                                     | Descricao                        |
| ------ | -------------------------------------------- | -------------------------------- |
| GET    | `/api/feature-flags`                         | Lista todas flags do usuario     |
| GET    | `/api/feature-flags/:flag`                   | Consulta flag especifica         |
| POST   | `/api/feature-flags/:flag`                   | Habilita/desabilita flag (admin) |
| GET    | `/api/feature-flags/rollout/configuration`   | Configuracao das fases           |
| GET    | `/api/feature-flags/rollout/:key/status`     | Status atual do rollout          |
| POST   | `/api/feature-flags/rollout/:key/initialize` | Inicia rollout em Alpha          |
| POST   | `/api/feature-flags/rollout/:key/advance`    | Avanca para proxima fase         |
| POST   | `/api/feature-flags/rollout/:key/rollback`   | Retorna para fase anterior       |

### 9.4 Iniciar Novo Rollout

**Tempo estimado:** 5 minutos

**Passo 1: Autenticar como SYSTEM_ADMIN**

```bash
# Login para obter token
TOKEN=$(curl -s -X POST https://etp-express-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@confenge.com.br","password":"<senha>"}' \
  | jq -r '.access_token')
```

**Passo 2: Inicializar rollout**

```bash
curl -X POST https://etp-express-backend.railway.app/api/feature-flags/rollout/new_dashboard/initialize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**

```json
{
  "featureKey": "new_dashboard",
  "currentPhase": "alpha",
  "phaseStartedAt": "2025-12-22T10:00:00.000Z",
  "phaseDurationHours": 0,
  "metrics": { "activeUsers": 0, "errorRate": 0, "successRate": 100 },
  "canAdvance": false,
  "canRollback": false,
  "nextPhase": "beta",
  "previousPhase": null
}
```

### 9.5 Verificar Status do Rollout

```bash
curl -X GET https://etp-express-backend.railway.app/api/feature-flags/rollout/new_dashboard/status \
  -H "Authorization: Bearer $TOKEN"
```

**Campos importantes:**

- `currentPhase`: Fase atual (alpha/beta/ga)
- `phaseDurationHours`: Horas na fase atual
- `canAdvance`: Se pode avancar (metricas OK e duracao minima)
- `canRollback`: Se pode voltar (nao esta em Alpha)
- `metrics.errorRate`: Taxa de erro atual (%)
- `metrics.activeUsers`: Usuarios ativos nas ultimas 24h

### 9.6 Avancar para Proxima Fase

**Pre-requisitos para avancar de Alpha para Beta:**

- [x] Pelo menos 24h em Alpha
- [x] Error rate < 5%
- [x] Pelo menos 10 usuarios ativos
- [x] Satisfaction score >= 3.0

**Pre-requisitos para avancar de Beta para GA:**

- [x] Pelo menos 72h em Beta
- [x] Error rate < 2%
- [x] Pelo menos 50 usuarios ativos
- [x] Satisfaction score >= 3.5

**Executar avanco:**

```bash
curl -X POST https://etp-express-backend.railway.app/api/feature-flags/rollout/new_dashboard/advance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Sucesso (200):**

```json
{
  "featureKey": "new_dashboard",
  "currentPhase": "beta",
  "phaseStartedAt": "2025-12-23T10:00:00.000Z",
  "canAdvance": false,
  "nextPhase": "ga"
}
```

**Falha (400) - Metricas nao atendidas:**

```json
{
  "statusCode": 400,
  "message": "Cannot advance new_dashboard from alpha: metrics not met or already at GA"
}
```

### 9.7 Rollback para Fase Anterior

**IMPORTANTE:** Rollback e uma operacao de emergencia. Execute quando:

- Error rate subiu acima do threshold
- Usuarios reportando problemas criticos
- Comportamento inesperado detectado

**Executar rollback:**

```bash
curl -X POST https://etp-express-backend.railway.app/api/feature-flags/rollout/new_dashboard/rollback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Sucesso (200):**

```json
{
  "featureKey": "new_dashboard",
  "currentPhase": "alpha",
  "canAdvance": true,
  "canRollback": false
}
```

**Nota:** Apos rollback, as metricas sao resetadas e a contagem de duracao reinicia.

### 9.8 Metricas a Monitorar

Durante cada fase, monitore as seguintes metricas:

| Metrica           | Onde Ver                        | Threshold Alpha | Threshold Beta | Threshold GA |
| ----------------- | ------------------------------- | --------------- | -------------- | ------------ |
| Error Rate        | Status API / Sentry             | < 5%            | < 2%           | < 1%         |
| Active Users      | Status API                      | >= 10           | >= 50          | -            |
| Response Time     | Railway Metrics / OpenTelemetry | < 2s            | < 1s           | < 500ms      |
| User Satisfaction | Feedback / Surveys              | >= 3.0          | >= 3.5         | >= 4.0       |

**Comandos para monitorar:**

```bash
# Status do rollout (metricas)
curl -s -X GET https://etp-express-backend.railway.app/api/feature-flags/rollout/new_dashboard/status \
  -H "Authorization: Bearer $TOKEN" | jq '.metrics'

# Health do servico de flags
curl https://etp-express-backend.railway.app/api/feature-flags/health/status

# Erros no Sentry (ultimas 24h)
# Ver dashboard: https://sentry.io/organizations/confenge/
```

### 9.9 Troubleshooting

#### Redis Indisponivel

**Sintoma:** Endpoint `/health/status` retorna `{"status": "degraded", "redisConnected": false}`

**Impacto:** Flags usam valores default. Metricas de rollout nao sao persistidas.

**Solucao:**

1. Verificar status do Redis no Railway
2. Verificar variaveis de ambiente `REDIS_*`
3. Reiniciar servico se necessario

#### Nao Consegue Avancar Fase

**Causa 1:** Duracao minima nao atingida

```bash
# Verificar horas na fase atual
curl -s ... | jq '.phaseDurationHours'
# Alpha requer 24h, Beta requer 72h
```

**Causa 2:** Error rate acima do threshold

```bash
# Verificar error rate
curl -s ... | jq '.metrics.errorRate'
# Corrigir bugs antes de avancar
```

**Causa 3:** Usuarios ativos insuficientes

```bash
# Verificar active users
curl -s ... | jq '.metrics.activeUsers'
# Aguardar mais adocao ou adicionar testers
```

#### Rollback Nao Funciona

**Causa:** Ja esta em Alpha (fase mais baixa)

**Solucao:** Se problema persiste em Alpha, desabilite a flag:

```bash
curl -X POST https://etp-express-backend.railway.app/api/feature-flags/new_dashboard \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

#### Feature Flag Nao Aplica ao Usuario

**Causa 1:** Cache do frontend (TTL 5 min)

```javascript
// Frontend pode forcar refresh
const { refetch } = useFeatureFlags();
await refetch();
```

**Causa 2:** Targeting incorreto (user/organization)

```bash
# Verificar configuracao da flag
curl -X GET https://etp-express-backend.railway.app/api/feature-flags/configurations \
  -H "Authorization: Bearer $TOKEN"
```

### 9.10 Boas Praticas

1. **Sempre comece em Alpha** - Nunca pule fases
2. **Monitore metricas diariamente** - Nao espere o threshold ser atingido
3. **Documente problemas encontrados** - Crie issues para bugs em cada fase
4. **Comunique com stakeholders** - Informe antes de avancar para GA
5. **Tenha plano de rollback** - Saiba exatamente o que fazer se algo der errado
6. **Nao apresse o processo** - Respeite os tempos minimos de cada fase

---

## Documentacao Relacionada

- **SLA e Niveis de Severidade:** `docs/SLA.md`
- **Deploy completo:** `DEPLOY_RAILWAY.md`
- **Rotacao de secrets:** `docs/SECRET_ROTATION_PROCEDURES.md`
- **Disaster recovery:** `DISASTER_RECOVERY.md`
- **Infraestrutura:** `docs/INFRASTRUCTURE.md`
- **Monitoramento:** `docs/MONITORING.md`
- **Registro de Incidentes:** `docs/incidents/README.md`
- **Templates de Incidentes:** `docs/templates/`
- **Feature Flags:** `backend/src/modules/feature-flags/`
- **Rollout Strategy:** `backend/src/modules/feature-flags/rollout-strategy.config.ts`

---

**Gerado com [Claude Code](https://claude.com/claude-code)**

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

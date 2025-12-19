# GUIA DE DEPLOY - RAILWAY

> **⚠ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.**

Este guia detalha o processo completo de deploy do ETP Express na Railway.

---

## PRÉ-REQUISITOS

1. **Conta Railway**
 - Criar conta em: https://railway.app
 - Conectar com GitHub (recomendado)

2. **API Keys Necessárias**
 - OpenAI API Key (https://platform.openai.com/api-keys)
 - Exa API Key (https://dashboard.exa.ai/api-keys)

3. **Repositório Git**
 - Código versionado no Git
 - Repositório no GitHub (opcional mas recomendado)

---

## ARQUITETURA NO RAILWAY

O ETP Express usa **3 serviços separados**:

```
Railway Project: etp-express
├── Service 1: PostgreSQL Database (Managed)
├── Service 2: Backend (NestJS)
└── Service 3: Frontend (React + Vite)
```

---

## PASSO 1: CRIAR PROJETO NO RAILWAY

### 1.1 Via Dashboard Railway

1. Acesse https://railway.app/dashboard
2. Clique em **"New Project"**
3. Selecione **"Empty Project"**
4. Renomeie para `etp-express`

### 1.2 Via Railway CLI (Alternativa)

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Criar projeto
railway init
```

---

## PASSO 2: CRIAR DATABASE (PostgreSQL)

### 2.1 Adicionar PostgreSQL

1. No projeto Railway, clique **"+ New"**
2. Selecione **"Database"**
3. Escolha **"Add PostgreSQL"**
4. Railway criará automaticamente:
 - Database instance
 - DATABASE_URL (variável automática)
 - Credenciais de acesso

### 2.2 Conectar ao Database (Verificação)

```bash
# No Railway Dashboard, clique no serviço PostgreSQL
# Copie a "Connection String"
# Exemplo: postgresql://postgres:password@region.railway.app:5432/railway
```

### 2.3 Executar Schema SQL (Inicial)

Você tem duas opções:

#### Opção A: Via Railway CLI

```bash
# Conectar ao database
railway connect postgres

# No terminal psql que abrir:
\i DATABASE_SCHEMA.sql
```

#### Opção B: Via GUI (TablePlus, pgAdmin, etc)

1. Copie a connection string do Railway
2. Conecte com TablePlus/pgAdmin
3. Execute o arquivo `DATABASE_SCHEMA.sql`

---

## PASSO 3: DEPLOY DO BACKEND

### 3.1 Adicionar Serviço Backend

1. No projeto Railway, clique **"+ New"**
2. Selecione **"GitHub Repo"** (se conectado ao GitHub)
 - OU **"Empty Service"** para deploy manual
3. Selecione o repositório `ETP Express`
4. Configure:
 - **Name**: `etp-express-backend`
 - **Root Directory**: `backend`
 - **Build Command**: `npm install && npm run build`
 - **Start Command**: `npm run migration:run && npm run start:prod`

### 3.2 Configurar Variáveis de Ambiente

No serviço `etp-express-backend`, adicione as variáveis:

```bash
# Application
NODE_ENV=production
PORT=${{PORT}} # Railway injeta automaticamente

# Database (injeta automaticamente da PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# JWT
JWT_SECRET=seu-super-secret-jwt-key-change-this-123456789
JWT_EXPIRATION=7d

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

# Exa (Web Search)
EXA_API_KEY=exa-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Frontend URL (será preenchido após deploy do frontend)
FRONTEND_URL=https://etp-express-frontend-production.up.railway.app
CORS_ORIGINS=https://etp-express-frontend-production.up.railway.app

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Database Config
DB_SYNCHRONIZE=false
DB_LOGGING=false

# Logging
LOG_LEVEL=info

# Analytics
ANALYTICS_ENABLED=false
```

### 3.3 Deploy

1. Clique em **"Deploy"**
2. Railway detectará automaticamente o `package.json` no diretório `backend/`
3. Aguarde o build e deploy (~3-5 minutos)

### 3.4 Verificar Deploy

Após deploy bem-sucedido:

1. Clique no serviço `etp-express-backend`
2. Vá em **"Settings"** → **"Domains"**
3. Clique **"Generate Domain"**
4. Anote a URL: `https://etp-express-backend-production.up.railway.app`
5. Teste: `https://etp-express-backend-production.up.railway.app/api`
6. Acesse Swagger: `https://etp-express-backend-production.up.railway.app/api/docs`

---

## PASSO 4: DEPLOY DO FRONTEND

### 4.1 Adicionar Serviço Frontend

1. No projeto Railway, clique **"+ New"**
2. Selecione **"GitHub Repo"** (mesmo repositório)
3. Configure:
 - **Name**: `etp-express-frontend`
 - **Root Directory**: `frontend`
 - **Build Command**: `npm install && npm run build`
 - **Start Command**: `npm run preview`

### 4.2 Configurar Variáveis de Ambiente

No serviço `etp-express-frontend`, adicione:

```bash
# API URL (usar a URL do backend gerada no passo anterior)
VITE_API_URL=https://etp-express-backend-production.up.railway.app/api

# App Config
VITE_APP_NAME=ETP Express
```

### 4.3 Deploy

1. Clique em **"Deploy"**
2. Railway detectará automaticamente o `package.json` no diretório `frontend/`
3. Aguarde o build e deploy (~2-4 minutos)

### 4.4 Gerar Domínio

1. Clique no serviço `etp-express-frontend`
2. Vá em **"Settings"** → **"Domains"**
3. Clique **"Generate Domain"**
4. Anote a URL: `https://etp-express-frontend-production.up.railway.app`

### 4.5 Atualizar CORS no Backend

**IMPORTANTE**: Agora que você tem a URL do frontend, precisa atualizar o backend:

1. Volte ao serviço `etp-express-backend`
2. Em **"Variables"**, atualize:
 ```bash
 FRONTEND_URL=https://etp-express-frontend-production.up.railway.app
 CORS_ORIGINS=https://etp-express-frontend-production.up.railway.app
 ```
3. O serviço reiniciará automaticamente

### 4.6 Verificar Deploy

Acesse: `https://etp-express-frontend-production.up.railway.app`

Você deve ver:

- Página de login do ETP Express
- WarningBanner no topo
- Interface responsiva

---

## PASSO 5: VERIFICAÇÃO FINAL

### 5.1 Teste de Conectividade

1. Acesse o frontend: `https://etp-express-frontend-production.up.railway.app`
2. Registre um novo usuário
3. Faça login
4. Crie um ETP de teste
5. Tente gerar uma seção com IA

### 5.2 Verificar Logs

Se algo não funcionar:

```bash
# Via CLI
railway logs --service=etp-express-backend
railway logs --service=etp-express-frontend

# Via Dashboard
Clique no serviço → Aba "Logs"
```

### 5.3 Healthchecks

- Backend: `https://etp-express-backend-production.up.railway.app/api`
- Backend Info: `https://etp-express-backend-production.up.railway.app/api/info`
- Swagger: `https://etp-express-backend-production.up.railway.app/api/docs`
- Frontend: `https://etp-express-frontend-production.up.railway.app`

### 5.4 Timeout Configuration

**Request Timeout:** 120s (configurado em `railway.toml`)
**Razao:** Geracao de secoes via LLM pode levar 30-90s dependendo da complexidade.

**Healthcheck Timeout:** 300s (5min)
**Razao:** Cold start do NestJS + TypeORM pode levar ate 60s em primeira inicializacao.

**Configuracao via `railway.toml`:**

```toml
[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[build]
builder = "NIXPACKS"

[service]
# Aumentar timeout para suportar geracoes longas (60-90s tipico)
requestTimeout = 120
```

**Monitoramento:**

- Railway Logs: Verificar ocorrencias de "TIMEOUT" ou "504 Gateway Timeout"
- Se timeouts persistirem, considerar implementacao de fila assincrona (Issue #186 - ASYNC-02)

---

## PASSO 6: SEGURANÇA E OTIMIZAÇÕES

### 6.1 Domínio Customizado (Opcional)

Se você tem um domínio próprio:

1. No serviço, vá em **"Settings"** → **"Domains"**
2. Clique **"Custom Domain"**
3. Adicione: `etp.seudominio.gov.br`
4. Configure DNS conforme instruções do Railway

### 6.2 Variáveis Sensíveis

**NUNCA** commite no Git:

- `OPENAI_API_KEY`
- `EXA_API_KEY`
- `JWT_SECRET`
- `DATABASE_URL`

Sempre configure via Railway Dashboard → Variables.

### 6.3 Monitoramento e Alertas

Railway oferece Observability Dashboard com métricas em tempo real e alertas configuráveis.

#### 6.3.1 Métricas Disponíveis

| Métrica | Descrição | Widget Padrão |
| --------------- | -------------------------- | ------------- |
| CPU Usage | Uso de CPU por serviço | ✅ |
| Memory (RAM) | Consumo de memória | ✅ |
| Disk Usage | Uso de disco | ✅ |
| Network Traffic | Tráfego de entrada/saída | ✅ |
| Project Spend | Custo acumulado do projeto | ✅ |

#### 6.3.2 Configuração de Alertas (OBRIGATÓRIO para Produção)

**Pré-requisito:** Railway Pro Plan

**Passo a passo para configurar alertas:**

1. Acesse Railway Dashboard → Projeto `etp-express`
2. Clique em **Observability** no menu lateral
3. Para cada métrica, clique no menu de 3 pontos (⋮) do widget
4. Selecione **"Add monitor"**
5. Configure os thresholds conforme tabela abaixo

#### 6.3.3 Thresholds Recomendados

| Alerta | Threshold | Trigger | Ação Esperada |
| ------------------ | ---------- | ------- | ----------------------------------------- |
| **CPU Alto** | > 80% | Above | Investigar carga; escalar réplicas |
| **CPU Baixo** | < 1% | Below | App pode ter crashado |
| **Memory Alta** | > 85% | Above | Investigar memory leak; reiniciar serviço |
| **Memory Baixa** | < 10MB | Below | App pode ter crashado |
| **Disk Alto** | > 90% | Above | Limpar logs antigos; expandir storage |
| **Network Egress** | > 10GB/dia | Above | Investigar tráfego; verificar Private Net |

#### 6.3.4 Configuração de Canais de Notificação

**Email (Padrão):**

- Alertas são enviados automaticamente para o email da conta Railway

**Webhook (Recomendado para Slack/Teams):**

1. No Dashboard, vá em **Settings** → **Integrations**
2. Configure webhook URL do Slack/Teams/Discord
3. Formato do payload:
 ```json
 {
 "type": "monitor_alert",
 "service": "etp-express-backend",
 "metric": "cpu",
 "value": 85,
 "threshold": 80,
 "timestamp": "2025-12-14T10:30:00Z"
 }
 ```

**Slack Webhook Setup:**

1. No Slack, crie um webhook em: https://api.slack.com/messaging/webhooks
2. Copie a URL do webhook
3. No Railway, adicione como Integration

#### 6.3.5 Alertas de Erro via Logs (Complementar)

Para alertas baseados em taxa de erro, use o endpoint `/api/health/metrics`:

```bash
# Verificar métricas do backend
curl https://etp-express-backend-production.up.railway.app/api/health/metrics
```

Resposta esperada:

```json
{
 "uptime": 86400,
 "memory": {
 "heapUsed": 150000000,
 "heapTotal": 250000000,
 "external": 5000000,
 "rss": 300000000
 },
 "cpu": {
 "user": 1234567,
 "system": 234567
 }
}
```

**Integração com Sentry para Error Rate:**

Sentry já está configurado no projeto e captura erros automaticamente. Para alertas de error rate:

1. Acesse https://sentry.io → Projeto etp-express
2. Vá em **Alerts** → **Create Alert**
3. Selecione **Issue Alert** com condição:
 - When: Number of events > 10 in 1 hour
 - Action: Send notification to team

#### 6.3.6 Checklist de Alertas (Verificar antes de Go-Live)

- [ ] Alerta CPU > 80% configurado no Railway
- [ ] Alerta Memory > 85% configurado no Railway
- [ ] Alerta CPU < 1% (crash detection) configurado
- [ ] Alerta Disk > 90% configurado
- [ ] Canal de notificação testado (email recebido)
- [ ] Webhook Slack/Teams configurado (se aplicável)
- [ ] Alerta Sentry error rate configurado
- [ ] Teste de alerta executado (forçar threshold)

### 6.4 Backups do Database

1. Clique no serviço PostgreSQL
2. Settings → Backups
3. Railway faz backups automáticos diariamente
4. Retenção: 7 dias (plano Hobby)

> **Documentação Completa de Disaster Recovery:** Consulte [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) para procedimentos detalhados de backup, restore e cenários de recuperação.

### 6.5 Horizontal Scaling (Múltiplas Réplicas)

> **Status:** ✅ CONFIGURADO (Issue #735)
> **Réplicas:** 2 (mínimo) a 4 (máximo com auto-scale)

O backend está configurado para rodar com **múltiplas réplicas** para eliminar SPOF (Single Point of Failure) e garantir alta disponibilidade.

#### 6.5.1 Configuração via Railway Dashboard

**Passo 1: Acessar Configurações de Scaling**

1. Acesse Railway Dashboard → `etp-express-backend` service
2. Navegue para **Settings** → **Deploy** (ou **Scaling**)
3. Localize a seção **"Horizontal Scaling"** ou **"Replicas"**

**Passo 2: Configurar Réplicas**

Configure as seguintes opções:

| Configuração | Valor | Descrição |
| ------------------------- | ---------------- | --------------------------------------------- |
| **Min Replicas** | 2 | Número mínimo de instâncias sempre ativas |
| **Max Replicas** | 4 | Máximo de instâncias durante picos de carga |
| **Target CPU** | 70% | Auto-scale quando CPU média > 70% |
| **Target Memory** | 80% | Auto-scale quando memória média > 80% |
| **Cooldown Period** | 60s | Tempo de espera entre scaling events (padrão) |
| **Health Check Path** | `/api/v1/health` | Endpoint usado para validar réplicas |
| **Health Check Interval** | 30s | Frequência de health checks (padrão) |

**Passo 3: Salvar e Aguardar Deploy**

- Clique em **"Save"** ou **"Apply Changes"**
- Railway iniciará um novo deploy com as configurações de scaling
- Aguarde ~3-5 minutos até que 2 réplicas estejam ativas

#### 6.5.2 Health Check Configuration

**Endpoint:** `/api/v1/health` (NestJS versioned endpoint)

**Response esperado (200 OK):**

```json
{
 "status": "healthy",
 "timestamp": "2025-12-17T01:00:00.000Z",
 "database": "connected",
 "redis": "connected"
}
```

**Validação manual:**

```bash
# Testar health check em produção
curl https://etp-express-backend-production.up.railway.app/api/v1/health

# Verificar health de todas réplicas (Railway Dashboard → Metrics → Health)
railway logs --service=etp-express-backend --tail 50 | grep "health"
```

**Timeout configuração:**

- **Health Check Timeout:** 300s (5 minutos - suficiente para cold start + migrations)
- **Request Timeout:** 120s (2 minutos - geração LLM pode levar 60-90s)

#### 6.5.3 Como Funciona o Load Balancing

**Distribuição de Tráfego:**

- Railway automaticamente distribui requisições entre réplicas saudáveis
- Algoritmo: Round-robin com health check awareness
- Se uma réplica falhar no health check, é removida do pool de balanceamento
- Réplicas degradadas são automaticamente reiniciadas

**Componentes Stateless (Safe para Múltiplas Réplicas):**

| Componente | Comportamento |
| ----------- | -------------------------------------------------- |
| JWT Auth | ✅ Stateless - JWT validado em qualquer réplica |
| BullMQ Jobs | ✅ Redis compartilhado - jobs distribuídos |
| PostgreSQL | ✅ Connection pool compartilhado (pgvector) |
| Uploads | ✅ Armazenados em disco persistente ou S3 (futuro) |

**Componentes Stateful (Considerações):**

| Componente | Comportamento | Impacto |
| ----------------- | ----------------------------------------------------- | ------------------------------------- |
| NodeCache (LLM) | ⚠ Cache por réplica (cada réplica tem cache próprio) | Duplicação aceitável (~10MB/réplica) |
| Rate Limiting | ⚠ Contagem por réplica (não distribuída) | Limite efetivo = limite x nº réplicas |
| In-Memory Session | ❌ Não usar - preferir Redis ou JWT | N/A (não usado) |

#### 6.5.4 Verificação de Réplicas Ativas

**Via Railway Dashboard:**

1. Acesse `etp-express-backend` service
2. Navegue para **Deployments** → Latest deployment
3. Clique em **"Metrics"** ou **"Replicas"**
4. Verifique que 2+ instâncias estão **"Healthy"**

**Via Railway CLI:**

```bash
# Ver status do serviço (inclui réplicas)
railway status

# Logs de todas réplicas (Railway mescla automaticamente)
railway logs --service=etp-express-backend

# Forçar redeploy (útil para aplicar novas configurações)
railway redeploy --service=etp-express-backend
```

#### 6.5.5 Teste de Zero-Downtime Deploy

**Procedimento de Teste:**

1. **Monitorar réplicas antes do deploy:**

 ```bash
 # Em um terminal, monitore os logs
 railway logs --service=etp-express-backend --tail 100
 ```

2. **Fazer um deploy de teste:**
 - Faça um commit trivial (ex: adicionar comentário no código)
 - Push para branch master
 - Railway iniciará rolling update automaticamente

3. **Observar rolling update:**
 - Railway atualiza **uma réplica por vez**
 - Sequência:
 1. Nova réplica V2 é iniciada (health check até passar)
 2. Tráfego é redirecionado para V2
 3. Réplica antiga V1 é desligada gracefully
 4. Processo repete para próxima réplica
 - Tempo total: ~5-10 minutos para 2 réplicas

4. **Validar zero downtime:**

 ```bash
 # Em outro terminal, execute requisições contínuas
 while true; do
 curl -s https://etp-express-backend-production.up.railway.app/api/v1/health | jq -r '.status'
 sleep 2
 done
 ```

 - Output esperado: `healthy` contínuo (sem interrupções)
 - Se aparecer erro de conexão, **rolling update falhou**

#### 6.5.6 Teste de Failover (Alta Disponibilidade)

**Simulação de Falha de Réplica:**

1. Acesse Railway Dashboard → `etp-express-backend`
2. Navegue para **Deployments** → Latest → **Replicas**
3. Clique em **"Kill"** ou **"Restart"** em uma das réplicas
4. Observe:
 - Réplica em questão entra em estado "Unhealthy" ou "Restarting"
 - Tráfego é automaticamente redirecionado para réplicas saudáveis
 - Nova réplica é iniciada para manter o mínimo de 2
 - Tempo de recuperação: ~60-90 segundos

**Validação:**

```bash
# Executar durante teste de failover
while true; do
 curl -s -w "\nStatus: %{http_code} - Time: %{time_total}s\n" \
 https://etp-express-backend-production.up.railway.app/api/v1/health
 sleep 1
done
```

**Resultado esperado:**

- Todas requisições retornam **200 OK**
- Pode haver leve aumento de latência (~100-200ms) durante redirecionamento
- **Zero requisições com erro 502/503/504**

#### 6.5.7 Auto-Scaling Triggers

**Quando Railway escala automaticamente para 3-4 réplicas:**

| Métrica | Threshold | Ação |
| ---------------- | --------- | ---------------------------------- |
| CPU > 70% | 2 min | Adiciona 1 réplica |
| Memory > 80% | 2 min | Adiciona 1 réplica |
| Requests/s > 100 | 1 min | Adiciona 1 réplica (se habilitado) |

**Quando Railway escala para baixo (scale down):**

- CPU < 30% e Memory < 40% por 10 minutos
- Nunca escala abaixo de `Min Replicas` (2)

**Monitoramento:**

```bash
# Verificar eventos de scaling nos logs
railway logs --service=etp-express-backend | grep -i "scal"
```

#### 6.5.8 Custo de Horizontal Scaling

**Estimativa de Custo Railway (Pro Plan):**

| Configuração | Custo/mês (estimado) |
| ------------ | -------------------- |
| 1 réplica | $5-10 |
| 2 réplicas | $10-20 |
| 3 réplicas | $15-30 (picos) |
| 4 réplicas | $20-40 (picos) |

**Nota:** Custo varia com uso de CPU/RAM. 2 réplicas permanentes + auto-scale até 4 = ~$15-25/mês.

#### 6.5.9 Troubleshooting

**Problema: Apenas 1 réplica ativa**

```bash
# Verificar configuração
railway variables | grep -i replica

# Forçar redeploy
railway redeploy --service=etp-express-backend
```

**Causa:** Configuração de scaling não salva ou plano Railway não suporta scaling.

**Problema: Réplicas ficam "Unhealthy"**

```bash
# Verificar logs de health check
railway logs --tail 200 | grep "health"

# Testar health check manualmente
curl https://etp-express-backend-production.up.railway.app/api/v1/health
```

**Causas comuns:**

- Migrations demorando > 300s (aumentar `healthCheckTimeout`)
- Database connection pool esgotado (verificar `max` connections)
- OpenAI/Exa API down (verificar `/api/v1/health/providers`)

**Problema: Deploy timeout**

- Health check não passa em 300s
- Aumentar timeout: Dashboard → Settings → Health Check Timeout → 600s
- Investigar migrations lentas ou cold start

---

**Referências:**

- Railway Scaling Docs: https://docs.railway.app/deploy/scaling
- Railway Health Checks: https://docs.railway.app/deploy/healthchecks
- Issue #735: Scale backend 2+ réplicas (implementação desta seção)

### 6.6 Connection Pooling com PgBouncer (Escala Avançada)

> **Status:** DOCUMENTADO (Issue #657)
> **Uso:** Recomendado quando escalar além de 4 réplicas ou atingir limite de conexões

O PgBouncer é um pooler de conexões externo que permite escalar significativamente o número de réplicas backend sem esgotar as conexões do PostgreSQL.

#### 6.6.1 Por Que Usar PgBouncer?

**Problema: Esgotamento de Conexões em Alta Escala**

A configuração atual do pool de conexões está otimizada para o limite do Railway PostgreSQL (máximo 20 conexões por instância). Ao escalar horizontalmente (múltiplas réplicas), cada instância abre seu próprio pool, podendo esgotar as conexões do banco.

| Cenário | Conexões Usadas | Status |
| ------------- | --------------- | --------- |
| 1 container | 20 conexões | ✅ OK |
| 2 containers | 40 conexões | ✅ OK |
| 5 containers | 100 conexões | ⚠ Limite |
| 10 containers | 200 conexões | ❌ Falha |

**Configuração Atual (sem PgBouncer):**

```typescript
// backend/src/app.module.ts
extra: {
 max: 20, // Railway Postgres Starter limit
 min: 5,
 idleTimeoutMillis: 30000,
 connectionTimeoutMillis: 5000,
}
```

**Solução: PgBouncer como Intermediário**

```
[Réplica 1] ──┐
[Réplica 2] ──┼── [PgBouncer] ── [PostgreSQL]
[Réplica 3] ──┤ (500 clients) (20 conns)
[Réplica N] ──┘
```

#### 6.6.2 O Que é PgBouncer?

PgBouncer é um connection pooler externo que:

- **Multiplica conexões**: Múltiplas aplicações compartilham poucas conexões reais
- **Modo transaction**: Reutilização agressiva - conexão liberada ao fim de cada transação
- **Reduz overhead**: Elimina handshake SSL repetido entre app e DB
- **Lightweight**: Consome ~2KB de memória por conexão client

**Modos de Pooling:**

| Modo | Descrição | Uso Recomendado |
| ----------- | ------------------------------------- | ------------------------------ |
| session | Conexão mantida durante toda a sessão | Apps com conexões longas |
| transaction | Conexão liberada após cada transação | ✅ **Recomendado para NestJS** |
| statement | Conexão liberada após cada statement | Não recomendado (bugs) |

#### 6.6.3 Quando Usar PgBouncer

**✅ USE PgBouncer se:**

- Escalar para 5+ réplicas backend
- Atingir erros de "too many connections"
- Load testing mostrar gargalo de conexões DB
- Planejar crescimento para 100+ usuários simultâneos

**❌ NÃO PRECISA de PgBouncer se:**

- 2-4 réplicas (configuração atual)
- Menos de 50 usuários simultâneos
- Não há erros de conexão nos logs

#### 6.6.4 Configuração no Railway

**Passo 1: Adicionar Serviço PgBouncer**

1. No projeto Railway, clique **"+ New"**
2. Selecione **"Docker Image"**
3. Use a imagem: `edoburu/pgbouncer:latest`
4. Configure nome: `pgbouncer`

**Passo 2: Configurar Variáveis do PgBouncer**

No serviço `pgbouncer`, adicione estas variáveis:

```bash
# Database connection (usar URL interna do Railway)
DATABASE_URL=${{Postgres.DATABASE_PRIVATE_URL}}

# Pool configuration
POOL_MODE=transaction
MAX_CLIENT_CONN=500
DEFAULT_POOL_SIZE=20
MIN_POOL_SIZE=5
RESERVE_POOL_SIZE=5
RESERVE_POOL_TIMEOUT=3

# Timeouts
SERVER_IDLE_TIMEOUT=600
CLIENT_IDLE_TIMEOUT=0
QUERY_TIMEOUT=120

# Logging
LOG_CONNECTIONS=0
LOG_DISCONNECTIONS=0
LOG_STATS=1
STATS_PERIOD=60

# Auth (usar mesmo usuário do Postgres)
AUTH_TYPE=scram-sha-256
```

**Passo 3: Configurar Internal Networking**

1. No serviço `pgbouncer`, vá em **Settings** → **Networking**
2. Habilite **"Private Networking"**
3. Anote o hostname interno: `pgbouncer.railway.internal`
4. Porta padrão: `6432`

**Passo 4: Atualizar Backend para Usar PgBouncer**

No serviço `etp-express-backend`, atualize as variáveis:

```bash
# ANTES (conexão direta com Postgres)
DATABASE_URL=postgres://user:pass@postgres.railway.internal:5432/railway

# DEPOIS (via PgBouncer)
DATABASE_URL=postgres://user:pass@pgbouncer.railway.internal:6432/railway

# Opcional: flag para código saber que está usando PgBouncer
PGBOUNCER_ENABLED=true
```

#### 6.6.5 Ajustes no Código TypeORM

**Quando usando PgBouncer, ajuste o pool size:**

```typescript
// backend/src/app.module.ts
TypeOrmModule.forRootAsync({
 useFactory: (configService: ConfigService) => ({
 // ... outras configs ...
 extra: {
 // Com PgBouncer: reduzir pool local (PgBouncer gerencia o pool real)
 max: configService.get('PGBOUNCER_ENABLED') === 'true' ? 5 : 20,
 min: configService.get('PGBOUNCER_ENABLED') === 'true' ? 1 : 5,
 idleTimeoutMillis: 30000,
 connectionTimeoutMillis: 5000,
 },
 }),
}),
```

**Explicação:**

- **Sem PgBouncer**: Cada réplica mantém pool de 5-20 conexões
- **Com PgBouncer**: Cada réplica mantém pool de 1-5 conexões (PgBouncer multiplica)

#### 6.6.6 Arquivo de Configuração PgBouncer (Alternativa)

Para configuração mais avançada, crie `pgbouncer.ini`:

```ini
[databases]
; Conexão com o PostgreSQL Railway
railway = host=postgres.railway.internal port=5432 dbname=railway

[pgbouncer]
; Listening
listen_addr = 0.0.0.0
listen_port = 6432

; Pool settings
pool_mode = transaction
max_client_conn = 500
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; Timeouts
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 120
client_login_timeout = 60

; Logging
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60

; Authentication
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Misc
ignore_startup_parameters = extra_float_digits
```

**Arquivo `userlist.txt`:**

```
"postgres" "SCRAM-SHA-256$4096:salt$client_key:server_key"
```

> **Nota:** O hash SCRAM-SHA-256 deve ser obtido do PostgreSQL Railway.

#### 6.6.7 Verificação e Monitoramento

**Verificar Status do PgBouncer:**

```bash
# Via Railway CLI
railway logs --service=pgbouncer | grep -E "stats|error"

# Conexões ativas
railway run --service=pgbouncer psql -p 6432 pgbouncer -c "SHOW POOLS;"
```

**Métricas Importantes:**

| Métrica | Descrição | Threshold Saudável |
| ----------- | ----------------------- | ------------------ |
| `cl_active` | Clientes ativos | < MAX_CLIENT_CONN |
| `sv_active` | Conexões server ativas | < DEFAULT_POOL |
| `sv_idle` | Conexões server ociosas | > 0 |
| `sv_used` | Total conexões usadas | < 20 |
| `maxwait` | Tempo máximo de espera | < 1s |

**Comando para Verificar Pools:**

```sql
-- Conectar ao console admin do PgBouncer
psql -h pgbouncer.railway.internal -p 6432 pgbouncer

-- Ver status dos pools
SHOW POOLS;

-- Ver estatísticas
SHOW STATS;

-- Ver configuração
SHOW CONFIG;
```

#### 6.6.8 Troubleshooting PgBouncer

**Problema: "Auth failed" ao conectar**

```bash
# Verificar credenciais
railway variables --service=pgbouncer | grep -i auth

# Solução: Garantir que userlist.txt tem hash correto
# ou usar AUTH_TYPE=trust para teste (NÃO em produção)
```

**Problema: "No more connections allowed"**

```bash
# Aumentar MAX_CLIENT_CONN
railway variables set MAX_CLIENT_CONN=1000 --service=pgbouncer

# Ou reduzir pool size nos backends
```

**Problema: "Server connection timeout"**

```bash
# Verificar conectividade interna
railway run --service=etp-express-backend ping postgres.railway.internal

# Aumentar timeout
railway variables set SERVER_CONNECT_TIMEOUT=30 --service=pgbouncer
```

**Problema: Queries longas sendo canceladas**

```bash
# Aumentar query_timeout (default 120s pode ser curto para LLM)
railway variables set QUERY_TIMEOUT=300 --service=pgbouncer
```

#### 6.6.9 Checklist de Deploy com PgBouncer

- [ ] Serviço PgBouncer criado no Railway
- [ ] Variáveis configuradas (POOL_MODE=transaction, etc.)
- [ ] Private networking habilitado
- [ ] DATABASE_URL do backend atualizado para pgbouncer:6432
- [ ] Pool size do TypeORM reduzido (max: 5)
- [ ] Teste de conexão bem-sucedido
- [ ] `SHOW POOLS` mostra conexões saudáveis
- [ ] Load test confirmou escalabilidade
- [ ] Alertas configurados para `maxwait > 1s`

#### 6.6.10 Migração para PgBouncer (Zero Downtime)

**Procedimento de Migração:**

1. **Deploy PgBouncer** (sem afetar backend atual)

 ```bash
 # PgBouncer roda em paralelo, não afeta conexões existentes
 railway up --service=pgbouncer
 ```

2. **Testar Conectividade**

 ```bash
 # Testar conexão via PgBouncer manualmente
 railway run psql postgres://user:pass@pgbouncer.railway.internal:6432/railway -c "SELECT 1"
 ```

3. **Atualizar Uma Réplica**

 ```bash
 # Atualizar DATABASE_URL de apenas uma réplica para teste
 # Se Railway não suportar config por réplica, pular para step 4
 ```

4. **Rolling Update do Backend**

 ```bash
 # Atualizar variável DATABASE_URL
 railway variables set DATABASE_URL=postgres://user:pass@pgbouncer.railway.internal:6432/railway --service=etp-express-backend

 # Railway fará rolling update (uma réplica por vez)
 # Tráfego continua sendo servido pelas réplicas antigas até novas estarem healthy
 ```

5. **Validar**

 ```bash
 # Verificar logs por erros
 railway logs --service=etp-express-backend | grep -i "error\|connection"

 # Verificar pools
 railway run --service=pgbouncer psql -p 6432 pgbouncer -c "SHOW POOLS;"
 ```

6. **Rollback (se necessário)**
 ```bash
 # Reverter para conexão direta
 railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}} --service=etp-express-backend
 ```

---

**Referências PgBouncer:**

- Documentação Oficial: https://www.pgbouncer.org/
- Railway PostgreSQL: https://docs.railway.app/databases/postgresql
- Issue #657: Documentar PgBouncer para escala (implementação desta seção)

---

## PASSO 7: MONITORAMENTO PÓS-DEPLOY

### 7.1 Verificações Diárias

- [ ] Backend está UP: `/api`
- [ ] Frontend está UP: `/`
- [ ] Database conectado
- [ ] Logs sem erros críticos

### 7.2 Métricas de Uso

Railway Dashboard mostra:

- Requests/min
- Response time
- Error rate
- Resource usage (CPU/RAM)

### 7.3 Custos

**Railway Hobby Plan ($5/mês)**:

- 3 serviços (PostgreSQL, Backend, Frontend)
- $5 de créditos inclusos
- PostgreSQL: ~$3/mês
- Backend: ~$3/mês
- Frontend: ~$1/mês

**Total estimado**: $7-10/mês

Para ambientes de produção maiores, considere:

- Railway Pro ($20/mês + usage)
- [FUTURE] Multi-cloud migration (AWS/Azure/GCP) only if scaling beyond Railway capacity

---

## TROUBLESHOOTING

### Problema: Backend não inicia

**Solução**:

```bash
# Verificar logs
railway logs --service=etp-express-backend

# Causas comuns:
# 1. DATABASE_URL incorreto
# 2. Migrations não rodaram
# 3. API keys inválidas
# 4. Porta incorreta (usar ${{PORT}})
```

### Problema: Frontend não conecta ao backend

**Solução**:

1. Verificar `VITE_API_URL` no frontend
2. Verificar `CORS_ORIGINS` no backend
3. Testar backend direto: `https://backend-url.railway.app/api`

### Problema: Migrations falham

**Solução**:

```bash
# Conectar ao database
railway connect postgres

# Verificar se schema existe
\dt

# Se vazio, executar manualmente:
\i DATABASE_SCHEMA.sql
```

### Problema: Custo alto

**Solução**:

1. Verificar uso de recursos no Dashboard
2. Desativar logs verbosos (`LOG_LEVEL=warn`)
3. Reduzir `OPENAI_MAX_TOKENS`
4. Implementar cache de respostas LLM

---

## PROBLEMAS CONHECIDOS E SOLUÇÕES (Issue #631)

Esta seção documenta problemas críticos de deploy identificados em dezembro/2025 e suas soluções definitivas.

### 1. Build Timeout por Puppeteer/Chromium Duplicado

**Sintoma**: Build falha com `DeadlineExceeded: context deadline exceeded` durante exportação da imagem Docker.

**Causa Raiz**: Nixpacks instala Chromium do sistema (~400MB), mas Puppeteer também baixa seu próprio Chromium bundled (~400MB), resultando em imagem de ~2GB que excede timeout.

**Solução**:

1. **Configurar skip download em `backend/package.json`**:

```json
{
 "puppeteer": {
 "skipDownload": true
 }
}
```

2. **Criar `.npmrc` na raiz do monorepo**:

```
puppeteer_skip_chromium_download=true
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

3. **Configurar variáveis no Railway**:

```bash
railway variables set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
railway variables set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

4. **Usar executablePath no código** (`backend/src/modules/export/export.service.ts`):

```typescript
browser = await puppeteer.launch({
 headless: true,
 executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
 args: [
 '--no-sandbox',
 '--disable-setuid-sandbox',
 '--disable-dev-shm-usage',
 '--disable-gpu',
 ],
});
```

**Verificação**: Build deve completar em < 5 minutos.

---

### 2. SSL Connection Error nas Migrations

**Sintoma**: `Error: The server does not support SSL connections` durante `migration:run:prod`.

**Causa Raiz**: Railway internal PostgreSQL (pgvector.railway.internal) não requer SSL, mas a configuração estava hardcoded para usar SSL em produção.

**Solução**:

1. **Configurar variável no Railway**:

```bash
railway variables set PGSSLMODE=disable
```

2. **Verificar `backend/src/config/typeorm.config.ts`**:

```typescript
ssl:
 configService.get('PGSSLMODE') === 'disable'
 ? false
 : configService.get('NODE_ENV') === 'production',
```

3. **Verificar `backend/src/app.module.ts`** (mesma lógica):

```typescript
ssl:
 configService.get('PGSSLMODE') === 'disable'
 ? false
 : configService.get('NODE_ENV') === 'production'
 ? { rejectUnauthorized: false }
 : false,
```

**Importante**: Ambos os arquivos DEVEM ter a mesma lógica de SSL. O `app.module.ts` é usado pelo NestJS em runtime, e o `typeorm.config.ts` é usado pelo CLI de migrations.

---

### 3. TypeScript Enum Not Supported in Strip-Only Mode

**Sintoma**: `SyntaxError: TypeScript enum is not supported in strip-only mode` referenciando arquivos em `src/entities/`.

**Causa Raiz**: O `typeorm.config.ts` usava paths hardcoded (`src/**/*.entity{.ts,.js}`) que funcionam apenas com ts-node em desenvolvimento. Em produção, TypeORM roda do `dist/` e tentava carregar arquivos `.ts`.

**Solução**:

Usar paths dinâmicos baseados em `__dirname` (`backend/src/config/typeorm.config.ts`):

```typescript
import { join } from 'path';

// Detecta se está rodando de dist/ (compilado) ou src/ (dev)
const isCompiled = __dirname.includes('dist');
const entitiesPath = isCompiled
 ? join(__dirname, '..', '**', '*.entity.js')
 : join(__dirname, '..', '**', '*.entity.ts');
const migrationsPath = isCompiled
 ? join(__dirname, '..', 'migrations', '*.js')
 : join(__dirname, '..', 'migrations', '*.ts');

export default new DataSource({
 // ...
 entities: [entitiesPath],
 migrations: [migrationsPath],
 // ...
});
```

**Verificação**: Migrations devem rodar sem erros de sintaxe TypeScript.

---

### 4. ts-node MODULE_NOT_FOUND

**Sintoma**: `Cannot find module 'ts-node'` ou `MODULE_NOT_FOUND` durante migrations.

**Causa Raiz**: O script `migration:run` usa `typeorm-ts-node-commonjs` que requer `ts-node` (devDependency não disponível em builds de produção).

**Solução**:

1. **Adicionar script de produção em `backend/package.json`**:

```json
{
 "scripts": {
 "migration:run": "npm run typeorm -- migration:run -d src/config/typeorm.config.ts",
 "migration:run:prod": "typeorm migration:run -d dist/config/typeorm.config.js"
 }
}
```

2. **Atualizar `backend/railway.toml`**:

```toml
[deploy]
startCommand = "npm run migration:run:prod --workspace=etp-express-backend && npm run start:prod --workspace=etp-express-backend"
```

3. **Atualizar `nixpacks.toml`**:

```toml
[start]
cmd = "npm run migration:run:prod --workspace=etp-express-backend && npm run start:prod --workspace=etp-express-backend"
```

4. **Atualizar variável Railway**:

```bash
railway variables set NIXPACKS_START_CMD="npm run migration:run:prod --workspace=etp-express-backend && npm run start:prod --workspace=etp-express-backend"
```

**Importante**: Use SEMPRE `--workspace=etp-express-backend` (nome do package.json), NÃO `--workspace=backend` (nome do diretório).

---

### 5. Template HBS Não Copiado para dist

**Sintoma**: `ENOENT: no such file or directory` para arquivos `.hbs` (ex: `etp-template.hbs`).

**Causa Raiz**: NestJS build (tsc) não copia arquivos não-TypeScript por padrão.

**Solução**:

Criar `backend/nest-cli.json`:

```json
{
 "$schema": "https://json.schemastore.org/nest-cli",
 "collection": "@nestjs/schematics",
 "sourceRoot": "src",
 "compilerOptions": {
 "deleteOutDir": true,
 "assets": [
 {
 "include": "**/*.hbs",
 "watchAssets": true
 }
 ]
 }
}
```

**Verificação**: Após build, verificar que `dist/**/*.hbs` existe.

---

### 6. Workspace Incorreto no NIXPACKS_START_CMD

**Sintoma**: `404 Not Found` em todas as rotas, ou app não inicia.

**Causa Raiz**: Uso de `--workspace=backend` ao invés do nome correto `--workspace=etp-express-backend`.

**Solução**:

```bash
# ERRADO
railway variables set NIXPACKS_START_CMD="npm run start:prod --workspace=backend"

# CORRETO
railway variables set NIXPACKS_START_CMD="npm run start:prod --workspace=etp-express-backend"
```

**Regra**: O valor de `--workspace` deve ser o `name` do `package.json`, não o nome do diretório.

---

### Checklist de Variáveis Railway Obrigatórias

```bash
# Database
DATABASE_URL=<gerado pelo Railway>
PGSSLMODE=disable

# Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Start Command
NIXPACKS_START_CMD=npm run migration:run:prod --workspace=etp-express-backend && npm run start:prod --workspace=etp-express-backend

# Application
NODE_ENV=production
CORS_ORIGINS=https://etp-express-frontend-production.up.railway.app
```

---

### Arquivos Críticos de Configuração

| Arquivo | Propósito | Verificar |
| -------------------------------------- | ------------------------------- | ------------------------------------- |
| `backend/package.json` | puppeteer.skipDownload, scripts | migration:run:prod existe |
| `backend/nest-cli.json` | Assets (.hbs) | assets inclui `**/*.hbs` |
| `backend/railway.toml` | startCommand, healthcheck | Usa migration:run:prod |
| `backend/src/config/typeorm.config.ts` | DB connection, SSL, paths | \_\_dirname paths, PGSSLMODE check |
| `backend/src/app.module.ts` | DB connection runtime | SSL igual ao typeorm.config |
| `nixpacks.toml` | Build e start commands | Workspaces corretos |
| `.npmrc` | Puppeteer skip | PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true |

---

## RECURSOS ADICIONAIS

### Documentação Railway

- Docs oficiais: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

### Railway CLI

```bash
# Login
railway login

# Listar projetos
railway list

# Conectar ao projeto
railway link

# Ver variáveis
railway variables

# Logs
railway logs

# Shell no container
railway run bash
```

### GitHub Actions (CI/CD Automático)

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
 push:
 branches: [main]

jobs:
 deploy:
 runs-on: ubuntu-latest
 steps:
 - uses: actions/checkout@v3
 - name: Deploy Backend
 uses: bervProject/railway-deploy@main
 with:
 service: etp-express-backend
 railway_token: ${{ secrets.RAILWAY_TOKEN }}
 - name: Deploy Frontend
 uses: bervProject/railway-deploy@main
 with:
 service: etp-express-frontend
 railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## ✅ CHECKLIST FINAL DE DEPLOY

Antes de considerar o deploy completo, verifique:

### Infraestrutura Básica

- [ ] PostgreSQL database criado e populado com schema
- [ ] Backend deployado e acessível via URL
- [ ] Frontend deployado e acessível via URL
- [ ] Variáveis de ambiente configuradas (TODAS)
- [ ] CORS configurado corretamente
- [ ] API Keys válidas (OpenAI, Exa)
- [ ] JWT_SECRET configurado e seguro

### Alta Disponibilidade (Issue #735)

- [ ] Backend com 2+ réplicas ativas (Railway Dashboard → Replicas)
- [ ] Health check endpoint `/api/v1/health` retornando 200 OK
- [ ] Auto-scaling configurado (min: 2, max: 4, target CPU 70%)
- [ ] Teste de failover executado (matar uma réplica → recuperação automática)
- [ ] Teste de zero-downtime deploy executado (requisições contínuas sem erro)
- [ ] Logs confirmam rolling update (Railway atualiza uma réplica por vez)

### Funcionalidades

- [ ] Healthchecks passando
- [ ] Logs sem erros críticos
- [ ] Teste de registro de usuário funcionando
- [ ] Teste de criação de ETP funcionando
- [ ] Teste de geração de seção com IA funcionando
- [ ] Swagger acessível e funcional (`/api/docs`)
- [ ] WarningBanner visível em todas as páginas
- [ ] Responsividade mobile testada

### Observabilidade

- [ ] Backups configurados (PostgreSQL 7 dias)
- [ ] Monitoramento ativo (Railway Observability)
- [ ] Alertas configurados (CPU > 80%, Memory > 85%)
- [ ] Sentry configurado para error tracking

---

## PRÓXIMOS PASSOS PÓS-DEPLOY

1. **Testes em Produção**
 - Criar ETPs de teste
 - Gerar seções com IA
 - Exportar PDFs
 - Validar busca de contratações similares

2. **Documentação Interna**
 - Criar manual de uso para servidores
 - Documentar fluxos de trabalho
 - Preparar treinamento

3. **Melhorias Incrementais**
 - Monitorar analytics
 - Coletar feedback de usuários
 - Iterar sobre UX
 - Otimizar prompts de IA

4. **Segurança Contínua**
 - Auditorias de segurança
 - Atualizações de dependências
 - Monitoramento de vulnerabilidades
 - Backups regulares testados

---

**⚠ LEMBRETE IMPORTANTE**

O ETP Express é um **sistema assistivo**. Não substitui:

- Responsabilidade administrativa
- Análise jurídica especializada
- Decisões técnicas de servidores
- Validação humana obrigatória

Todo conteúdo gerado deve ser **revisado criticamente** antes de uso oficial.

---

**Última atualização**: 2025-12-17
**Versão do guia**: 2.2.0

# 🚀 GUIA DE DEPLOY - RAILWAY

> **⚠️ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.**

Este guia detalha o processo completo de deploy do ETP Express na Railway.

---

## 📋 PRÉ-REQUISITOS

1. **Conta Railway**
   - Criar conta em: https://railway.app
   - Conectar com GitHub (recomendado)

2. **API Keys Necessárias**
   - OpenAI API Key (https://platform.openai.com/api-keys)
   - Perplexity API Key (https://www.perplexity.ai/settings/api)

3. **Repositório Git**
   - Código versionado no Git
   - Repositório no GitHub (opcional mas recomendado)

---

## 🏗️ ARQUITETURA NO RAILWAY

O ETP Express usa **3 serviços separados**:

```
Railway Project: etp-express
├── Service 1: PostgreSQL Database (Managed)
├── Service 2: Backend (NestJS)
└── Service 3: Frontend (React + Vite)
```

---

## 📦 PASSO 1: CRIAR PROJETO NO RAILWAY

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

## 🗄️ PASSO 2: CRIAR DATABASE (PostgreSQL)

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

## ⚙️ PASSO 3: DEPLOY DO BACKEND

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
PORT=${{PORT}}  # Railway injeta automaticamente

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

# Perplexity
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PERPLEXITY_MODEL=pplx-7b-online

# Frontend URL (será preenchido após deploy do frontend)
FRONTEND_URL=https://etp-express-frontend.up.railway.app
CORS_ORIGINS=https://etp-express-frontend.up.railway.app

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

## 🎨 PASSO 4: DEPLOY DO FRONTEND

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
4. Anote a URL: `https://etp-express-frontend.up.railway.app`

### 4.5 Atualizar CORS no Backend

**IMPORTANTE**: Agora que você tem a URL do frontend, precisa atualizar o backend:

1. Volte ao serviço `etp-express-backend`
2. Em **"Variables"**, atualize:
   ```bash
   FRONTEND_URL=https://etp-express-frontend.up.railway.app
   CORS_ORIGINS=https://etp-express-frontend.up.railway.app
   ```
3. O serviço reiniciará automaticamente

### 4.6 Verificar Deploy

Acesse: `https://etp-express-frontend.up.railway.app`

Você deve ver:

- Página de login do ETP Express
- WarningBanner no topo
- Interface responsiva

---

## 🔗 PASSO 5: VERIFICAÇÃO FINAL

### 5.1 Teste de Conectividade

1. Acesse o frontend: `https://etp-express-frontend.up.railway.app`
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
- Frontend: `https://etp-express-frontend.up.railway.app`

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

## 🔒 PASSO 6: SEGURANÇA E OTIMIZAÇÕES

### 6.1 Domínio Customizado (Opcional)

Se você tem um domínio próprio:

1. No serviço, vá em **"Settings"** → **"Domains"**
2. Clique **"Custom Domain"**
3. Adicione: `etp.seudominio.gov.br`
4. Configure DNS conforme instruções do Railway

### 6.2 Variáveis Sensíveis

**NUNCA** commite no Git:

- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `JWT_SECRET`
- `DATABASE_URL`

Sempre configure via Railway Dashboard → Variables.

### 6.3 Monitoramento e Alertas

Railway oferece Observability Dashboard com métricas em tempo real e alertas configuráveis.

#### 6.3.1 Métricas Disponíveis

| Métrica         | Descrição                  | Widget Padrão |
| --------------- | -------------------------- | ------------- |
| CPU Usage       | Uso de CPU por serviço     | ✅            |
| Memory (RAM)    | Consumo de memória         | ✅            |
| Disk Usage      | Uso de disco               | ✅            |
| Network Traffic | Tráfego de entrada/saída   | ✅            |
| Project Spend   | Custo acumulado do projeto | ✅            |

#### 6.3.2 Configuração de Alertas (OBRIGATÓRIO para Produção)

**Pré-requisito:** Railway Pro Plan

**Passo a passo para configurar alertas:**

1. Acesse Railway Dashboard → Projeto `etp-express`
2. Clique em **Observability** no menu lateral
3. Para cada métrica, clique no menu de 3 pontos (⋮) do widget
4. Selecione **"Add monitor"**
5. Configure os thresholds conforme tabela abaixo

#### 6.3.3 Thresholds Recomendados

| Alerta             | Threshold  | Trigger | Ação Esperada                             |
| ------------------ | ---------- | ------- | ----------------------------------------- |
| **CPU Alto**       | > 80%      | Above   | Investigar carga; escalar réplicas        |
| **CPU Baixo**      | < 1%       | Below   | App pode ter crashado                     |
| **Memory Alta**    | > 85%      | Above   | Investigar memory leak; reiniciar serviço |
| **Memory Baixa**   | < 10MB     | Below   | App pode ter crashado                     |
| **Disk Alto**      | > 90%      | Above   | Limpar logs antigos; expandir storage     |
| **Network Egress** | > 10GB/dia | Above   | Investigar tráfego; verificar Private Net |

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
curl https://etp-express-backend.railway.app/api/health/metrics
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

### 6.5 Alta Disponibilidade (Múltiplas Réplicas)

O backend está configurado para rodar com **2+ réplicas** para eliminar SPOF (Single Point of Failure).

**Configuração (já aplicada em `railway.json` e `backend/railway.toml`):**

```toml
[deploy]
numReplicas = 2
```

**Como funciona:**

- Railway automaticamente distribui requisições entre réplicas (load balancing)
- Se uma réplica falhar, as outras continuam atendendo
- Health checks (`/api/health`) monitoram cada réplica independentemente
- Réplicas que falham no health check são automaticamente reiniciadas

**Componentes compatíveis com múltiplas réplicas:**

| Componente      | Comportamento                               |
| --------------- | ------------------------------------------- |
| JWT Auth        | ✅ Stateless - funciona em qualquer réplica |
| BullMQ Jobs     | ✅ Redis compartilhado - jobs distribuídos  |
| PostgreSQL      | ✅ Conexões via pool compartilhado          |
| NodeCache (LLM) | ⚠️ Cache por réplica (duplicação aceitável) |
| Rate Limiting   | ⚠️ Contagem por réplica (não blocker)       |

**Verificação via CLI:**

```bash
# Ver réplicas ativas
railway status

# Logs de todas réplicas
railway logs --service=etp-express-backend

# Forçar redeploy com novas réplicas
railway redeploy --service=etp-express-backend
```

**Teste de failover:**

1. Acesse Railway Dashboard → etp-express-backend
2. Verifique que existem 2+ instâncias na aba "Replicas"
3. Mate uma réplica manualmente e observe a recuperação automática
4. Confirme que o serviço permanece acessível durante o processo

**Custo adicional:** ~$3-5/mês por réplica adicional (depende do uso)

---

## 📊 PASSO 7: MONITORAMENTO PÓS-DEPLOY

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

## 🛠️ TROUBLESHOOTING

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

## 🚨 PROBLEMAS CONHECIDOS E SOLUÇÕES (Issue #631)

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

| Arquivo                                | Propósito                       | Verificar                             |
| -------------------------------------- | ------------------------------- | ------------------------------------- |
| `backend/package.json`                 | puppeteer.skipDownload, scripts | migration:run:prod existe             |
| `backend/nest-cli.json`                | Assets (.hbs)                   | assets inclui `**/*.hbs`              |
| `backend/railway.toml`                 | startCommand, healthcheck       | Usa migration:run:prod                |
| `backend/src/config/typeorm.config.ts` | DB connection, SSL, paths       | \_\_dirname paths, PGSSLMODE check    |
| `backend/src/app.module.ts`            | DB connection runtime           | SSL igual ao typeorm.config           |
| `nixpacks.toml`                        | Build e start commands          | Workspaces corretos                   |
| `.npmrc`                               | Puppeteer skip                  | PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true |

---

## 📚 RECURSOS ADICIONAIS

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

- [ ] PostgreSQL database criado e populado com schema
- [ ] Backend deployado e acessível via URL
- [ ] Frontend deployado e acessível via URL
- [ ] Variáveis de ambiente configuradas (TODAS)
- [ ] CORS configurado corretamente
- [ ] API Keys válidas (OpenAI, Perplexity)
- [ ] JWT_SECRET configurado e seguro
- [ ] Healthchecks passando
- [ ] Backend com 2+ réplicas ativas (Railway Dashboard → Replicas)
- [ ] Logs sem erros críticos
- [ ] Teste de registro de usuário funcionando
- [ ] Teste de criação de ETP funcionando
- [ ] Teste de geração de seção com IA funcionando
- [ ] Swagger acessível e funcional
- [ ] WarningBanner visível em todas as páginas
- [ ] Responsividade mobile testada
- [ ] Backups configurados
- [ ] Monitoramento ativo

---

## 🎯 PRÓXIMOS PASSOS PÓS-DEPLOY

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

**⚠️ LEMBRETE IMPORTANTE**

O ETP Express é um **sistema assistivo**. Não substitui:

- Responsabilidade administrativa
- Análise jurídica especializada
- Decisões técnicas de servidores
- Validação humana obrigatória

Todo conteúdo gerado deve ser **revisado criticamente** antes de uso oficial.

---

**Última atualização**: 2025-12-14
**Versão do guia**: 2.1.0

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
4. Anote a URL: `https://etp-express-backend.up.railway.app`
5. Teste: `https://etp-express-backend.up.railway.app/api`
6. Acesse Swagger: `https://etp-express-backend.up.railway.app/api/docs`

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
VITE_API_URL=https://etp-express-backend.up.railway.app/api

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

- Backend: `https://etp-express-backend.up.railway.app/api`
- Backend Info: `https://etp-express-backend.up.railway.app/api/info`
- Swagger: `https://etp-express-backend.up.railway.app/api/docs`
- Frontend: `https://etp-express-frontend.up.railway.app`

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

### 6.3 Monitoramento

Railway oferece:
- Metrics automáticos (CPU, RAM, Network)
- Logs em tempo real
- Alertas de crash

Configure alertas:
1. Settings → Notifications
2. Adicione email ou webhook

### 6.4 Backups do Database

1. Clique no serviço PostgreSQL
2. Settings → Backups
3. Railway faz backups automáticos diariamente
4. Retenção: 7 dias (plano Hobby)

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

**Última atualização**: 2025-11-05
**Versão do guia**: 1.0.0

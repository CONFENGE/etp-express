# ETP Express - Guia de Deploy em Railway

Este documento descreve o processo completo de deploy do ETP Express em Railway, incluindo backend (NestJS), frontend (React/Vite) e PostgreSQL.

## 📋 Pré-requisitos

1. **Conta Railway**: https://railway.app (gratuita com $5/mês de créditos)
2. **Repositório GitHub**: Conectado ao Railway
3. **API Keys necessárias**:
   - OpenAI API Key (obrigatória para geração de seções)
   - Perplexity API Key (opcional, se implementado)
4. **Domínio personalizado** (opcional, mas recomendado)

## 🚀 Processo de Deploy

### 1. Criar Projeto Railway

1. Acesse https://railway.app/new
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório: `tjsasakifln/etp-express`
5. Nome do projeto: **"etp-express-production"**

### 2. Configurar PostgreSQL Database

Railway detectará automaticamente o arquivo `.railway.toml` e criará os serviços.

**Verificação manual (se necessário):**

1. No projeto Railway, clique em **"+ New"**
2. Selecione **"Database" → "PostgreSQL"**
3. Railway gerará automaticamente `DATABASE_URL`
4. Copie o valor de `DATABASE_URL` (necessário para migrations)

**Testar conexão:**
```bash
# Via Railway CLI
railway run psql $DATABASE_URL

# Via cliente local (copie DATABASE_URL do Railway)
psql "postgresql://user:pass@host:port/dbname"
```

### 3. Deploy Backend (NestJS)

Railway criará automaticamente o service `backend` via `.railway.toml`.

#### 3.1. Configurar Variáveis de Ambiente

No Railway UI, acesse **Backend Service → Variables** e adicione:

| Variável | Valor | Fonte |
|----------|-------|-------|
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` | Referência automática |
| `PORT` | `${{PORT}}` | Railway fornece automaticamente |
| `NODE_ENV` | `production` | Manual |
| `JWT_SECRET` | Gerar com `openssl rand -base64 32` | Manual |
| `OPENAI_API_KEY` | Sua chave da OpenAI | Manual |
| `PERPLEXITY_API_KEY` | Sua chave da Perplexity (se houver) | Manual |

#### 3.2. Comandos de Build/Start (já configurados via `.railway.toml`)

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`
- **Root Directory**: `/backend`

#### 3.3. Executar Migrations

```bash
# Conectar ao Railway via CLI
railway link

# Entrar no service backend
railway service backend

# Executar migrations
railway run npm run migration:run

# Verificar tabelas criadas
railway run psql $DATABASE_URL -c "\dt"
```

#### 3.4. Validar Deploy Backend

```bash
# Copiar URL do backend no Railway (ex: https://backend-production-xxxx.up.railway.app)
BACKEND_URL="<sua-url-backend>"

# Testar health endpoint
curl $BACKEND_URL/api/health

# Resposta esperada:
# {"status":"ok","timestamp":"2025-11-14T..."}
```

### 4. Deploy Frontend (React/Vite)

Railway criará automaticamente o service `frontend` via `.railway.toml`.

#### 4.1. Configurar Variáveis de Ambiente

No Railway UI, acesse **Frontend Service → Variables** e adicione:

| Variável | Valor | Exemplo |
|----------|-------|---------|
| `VITE_API_URL` | URL do backend Railway | `https://backend-production-xxxx.up.railway.app` |
| `NODE_ENV` | `production` | - |

**IMPORTANTE**: `VITE_API_URL` deve ser a URL pública do backend (sem `/api` no final).

#### 4.2. Comandos de Build/Start (já configurados via `.railway.toml`)

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npx serve -s dist -l $PORT`
- **Root Directory**: `/frontend`

#### 4.3. Validar Deploy Frontend

1. Abra a URL do frontend no navegador (Railway fornece automaticamente)
2. Exemplo: `https://frontend-production-xxxx.up.railway.app`
3. Verifique se a página carrega sem erros de console

### 5. Configurar Domínio Customizado (Opcional)

#### 5.1. Domínio Frontend

1. No Railway, acesse **Frontend Service → Settings → Networking**
2. Clique em **"Add Custom Domain"**
3. Digite seu domínio: `app.seudominio.com`
4. Railway mostrará um registro CNAME:
   ```
   CNAME: app.seudominio.com → frontend-production-xxxx.up.railway.app
   ```
5. Configure esse CNAME no seu provedor DNS
6. Aguarde 5-15min para propagação DNS
7. Railway provisionará SSL automaticamente (Let's Encrypt)

#### 5.2. Domínio Backend

1. No Railway, acesse **Backend Service → Settings → Networking**
2. Clique em **"Add Custom Domain"**
3. Digite: `api.seudominio.com`
4. Configure CNAME no DNS:
   ```
   CNAME: api.seudominio.com → backend-production-xxxx.up.railway.app
   ```
5. Após propagação, atualize `VITE_API_URL` no frontend para `https://api.seudominio.com`

### 6. Validação Final E2E

Execute estes testes para garantir que tudo funciona:

1. **Criar conta**:
   - Acesse frontend
   - Vá em "Registrar"
   - Crie conta com email/senha
   - Verifique que login funciona

2. **Criar ETP**:
   - Login no sistema
   - Clique em "Novo ETP"
   - Preencha formulário básico
   - Salve o ETP

3. **Gerar Seção com IA** (valida OpenAI):
   - Abra o ETP criado
   - Clique em "Gerar Seção" (ex: "Justificativa")
   - Aguarde geração IA
   - Verifique se texto foi gerado

4. **Exportar PDF**:
   - No ETP, clique em "Exportar PDF"
   - Verifique se PDF baixou com conteúdo

5. **Persistência de Dados**:
   - Faça logout
   - Faça login novamente
   - Verifique se ETPs criados ainda existem

**Se todos os testes passarem**: ✅ Deploy completo e funcional!

## 🔧 Troubleshooting

### Build Frontend Falha

**Erro**: `VITE_API_URL is not defined`

**Solução**:
```bash
# No Railway UI → Frontend Service → Variables
# Adicionar:
VITE_API_URL=https://backend-production-xxxx.up.railway.app
```

**Erro**: `npm run build` falha localmente

**Solução**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Backend Não Conecta no Database

**Erro**: `Connection refused` ou `ECONNREFUSED`

**Solução**:
1. Verificar `DATABASE_URL` está definido:
   ```bash
   railway variables
   ```
2. Deve ser referência: `${{postgres.DATABASE_URL}}`
3. Verificar migrations rodaram:
   ```bash
   railway run npm run migration:run
   ```

### Erro CORS no Frontend

**Sintomas**: Console mostra `CORS policy blocked`

**Solução**: Editar `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: [
    'http://localhost:3000', // Dev
    'https://frontend-production-xxxx.up.railway.app', // Railway URL
    'https://app.seudominio.com', // Domínio customizado (se houver)
  ],
  credentials: true,
});
```

### Migrations Não Aplicam

**Erro**: `No migrations to run`

**Solução**:
```bash
# Verificar se migrations existem
ls backend/src/migrations

# Se não existirem, gerar:
railway run npm run migration:generate -- CreateInitialSchema

# Aplicar:
railway run npm run migration:run
```

### OpenAI API Errors

**Erro**: `401 Unauthorized` ou `Invalid API key`

**Solução**:
1. Verificar `OPENAI_API_KEY` está definido:
   ```bash
   railway variables | grep OPENAI
   ```
2. Validar chave no OpenAI Dashboard: https://platform.openai.com/api-keys
3. Verificar se chave tem créditos disponíveis

### Logs com Erros

**Ver logs em tempo real**:
```bash
# Backend
railway logs --service backend --follow

# Frontend
railway logs --service frontend --follow

# Database
railway logs --service postgres --follow
```

## 📊 Monitoramento

### Métricas Disponíveis no Railway

1. **Deployments**: Ver histórico de deploys
2. **Logs**: Acesso em tempo real via UI ou CLI
3. **Metrics**: CPU, RAM, Network usage
4. **Health Checks**: Status via endpoints definidos em `.railway.toml`

### Comandos Úteis

```bash
# Ver status dos services
railway status

# Ver variáveis de ambiente
railway variables

# Abrir UI do Railway para o projeto
railway open

# Executar comando no contexto Railway
railway run <comando>
```

## 🔐 Segurança

### Secrets Importantes

**NUNCA commitar no Git**:
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `DATABASE_URL` (Railway gera automaticamente)

**Rotação de Secrets**:
```bash
# Gerar novo JWT_SECRET
openssl rand -base64 32

# Atualizar no Railway UI → Variables
# Redeploy será automático
```

### Backups Database

Consulte [`DISASTER_RECOVERY.md`](./docs/DISASTER_RECOVERY.md) para configurar backup automático PostgreSQL.

## 🚀 Zero-Downtime Deployment

**Implementado em Issue #107** - Deploy sem interrupção de serviço para usuários.

### Health Check Endpoint

O backend expõe endpoint de health check para validação de prontidão:

```bash
curl https://seu-backend.railway.app/api/health

# Resposta quando saudável:
{
  "status": "healthy",
  "timestamp": "2025-11-14T12:00:00.000Z",
  "database": "connected"
}
```

### Deploy Automatizado com Validação

```bash
# Deploy com health check automático e rollback em caso de falha
./scripts/deploy.sh

# Deploy de serviço específico
./scripts/deploy.sh etp-express-backend
```

**O script executa:**
1. ✅ Trigger deployment no Railway
2. ✅ Aguarda health check passar (max 5min)
3. ✅ Executa smoke tests (JSON, database, response time)
4. ✅ Rollback automático se algum teste falhar

**Deploy típico:** ~4 minutos (sem downtime visível)

### Pré-requisitos

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Configurar variáveis de ambiente
export RAILWAY_TOKEN="seu-token"
export RAILWAY_BACKEND_URL="https://seu-backend.railway.app"

# 3. Validar testes locais
cd backend && npm test
```

### Documentação Completa

Para detalhes sobre estratégia zero-downtime, health checks, database migrations backward-compatible e troubleshooting:

📖 **Ver [`docs/ZERO_DOWNTIME_DEPLOY.md`](./docs/ZERO_DOWNTIME_DEPLOY.md)**

## 📦 Rollback em Caso de Problema

### Rollback Automatizado (Recomendado)

```bash
# Rollback automático com validação
./scripts/rollback.sh

# Rollback de serviço específico
./scripts/rollback.sh etp-express-backend
```

**O script executa:**
1. ✅ Identifica deployment anterior
2. ✅ Executa rollback no Railway
3. ✅ Valida health check
4. ✅ Confirma serviço está operacional

**Rollback típico:** ~30 segundos

### Rollback Manual (Via Railway CLI)

```bash
# Listar deployments
railway deployment list --service etp-express-backend

# Rollback para deployment específico
railway deployment rollback <deployment-id> --service etp-express-backend

# Validar
curl https://seu-backend.railway.app/api/health
```

### Rollback Manual (Via Railway UI)

1. Acesse **Deployments**
2. Encontre último deploy funcional
3. Clique **"Rollback to this deployment"**
4. Aguarde health check passar

## 🌐 URLs Finais

Após deploy completo, anote suas URLs:

| Service | Railway URL | Domínio Customizado |
|---------|-------------|---------------------|
| **Frontend** | `https://frontend-production-xxxx.up.railway.app` | `https://app.seudominio.com` |
| **Backend** | `https://backend-production-xxxx.up.railway.app` | `https://api.seudominio.com` |
| **Database** | Interno (não exposto publicamente) | - |

## 📚 Recursos Adicionais

- **Railway Docs**: https://docs.railway.app
- **Railway CLI**: https://docs.railway.app/develop/cli
- **Nixpacks Docs**: https://nixpacks.com/docs
- **PostgreSQL Backups**: Ver Issue #45

## ✅ Checklist de Deploy

### Infraestrutura Base
- [ ] Projeto Railway criado: "etp-express-production"
- [ ] PostgreSQL database provisionado
- [ ] Backend service deployado com variáveis configuradas
- [ ] Frontend service deployado com `VITE_API_URL` correto
- [ ] Migrations database executadas (`npm run migration:run`)

### Zero-Downtime Deployment (Issue #107)
- [ ] Health check endpoint respondendo: `GET /api/health`
- [ ] Railway health check configurado em `.railway.toml`
- [ ] Scripts de deploy/rollback testados localmente
- [ ] Variáveis `RAILWAY_TOKEN` e `RAILWAY_BACKEND_URL` configuradas
- [ ] Deploy script executado com sucesso (`./scripts/deploy.sh`)
- [ ] Smoke tests passando (JSON, database, response time <2s)

### Validação
- [ ] CORS configurado com URLs corretas
- [ ] Teste E2E completo executado (Criar conta → Criar ETP → Gerar IA → Exportar PDF)
- [ ] Logs sem erros críticos
- [ ] Error rate <1% (monitorar 15min pós-deploy)
- [ ] Response time (p95) <500ms

### Produção
- [ ] Domínios customizados configurados (opcional)
- [ ] SSL certificates provisionados (automático)
- [ ] URLs finais documentadas
- [ ] Backup database configurado e testado (`DISASTER_RECOVERY.md`)
- [ ] Rollback procedure testado em staging
- [ ] Database migrations são backward-compatible

---

**Última atualização**: 2025-11-14
**Versão**: 1.0
**Responsável**: ETP Express Team

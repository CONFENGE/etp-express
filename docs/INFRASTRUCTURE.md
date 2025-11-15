# 🏗️ INFRASTRUCTURE - ETP Express

**Última atualização:** 2025-11-15
**Status:** Infrastructure as Code completa
**Versão:** 1.0

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Ambientes](#ambientes)
- [Infrastructure as Code](#infrastructure-as-code)
- [Deployment](#deployment)
- [Disaster Recovery](#disaster-recovery)
- [Scaling Strategy](#scaling-strategy)
- [Cost Breakdown](#cost-breakdown)
- [Monitoring & Alerting](#monitoring--alerting)
- [Troubleshooting](#troubleshooting)

---

## Visão Geral

ETP Express utiliza uma arquitetura moderna de 3 camadas hospedada no **Railway**:

- **Frontend:** React 18 + Vite (SPA)
- **Backend:** NestJS 10 + TypeScript
- **Database:** PostgreSQL 15

**Características principais:**
- ✅ Infrastructure as Code (Docker Compose)
- ✅ Zero-downtime deployments
- ✅ Automated backups (PostgreSQL)
- ✅ Health checks configurados
- ✅ Monitoring com Sentry
- ✅ Disaster recovery <4h

---

## Arquitetura

### Diagrama de Arquitetura (Produção)

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Railway    │
                    │  Load Balancer│
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                 │
          ▼                ▼                 ▼
   ┌──────────┐    ┌──────────┐      ┌──────────┐
   │ Frontend │    │ Backend  │      │PostgreSQL│
   │  (React) │◄───┤ (NestJS) │◄─────┤   15     │
   │  +Nginx  │    │  +Node   │      │ (Alpine) │
   └──────────┘    └──────┬───┘      └──────────┘
        │                 │                 │
        │                 ▼                 │
        │          ┌──────────┐             │
        │          │  OpenAI  │             │
        │          │   API    │             │
        │          └──────────┘             │
        │                                   │
        └───────────────┬───────────────────┘
                        ▼
                 ┌──────────┐
                 │  Sentry  │
                 │ (Errors) │
                 └──────────┘
```

### Diagrama de Comunicação

```
Frontend (Port 80)
    │
    └─► Backend API (Port 3001)
            │
            ├─► PostgreSQL (Port 5432)
            ├─► OpenAI API (HTTPS)
            ├─► Perplexity API (HTTPS - optional)
            └─► Sentry (HTTPS - optional)
```

### Stack Tecnológico

| Componente     | Tecnologia            | Versão      | Propósito                    |
|----------------|-----------------------|-------------|------------------------------|
| **Frontend**   | React + TypeScript    | 18.2        | Interface do usuário         |
| **Build Tool** | Vite                  | 5.x         | Build & dev server           |
| **UI Components** | Radix UI + Tailwind| Latest      | Design system                |
| **Backend**    | NestJS + TypeScript   | 10.3        | API REST                     |
| **Database**   | PostgreSQL            | 15-alpine   | Persistência de dados        |
| **ORM**        | TypeORM               | Latest      | Database migrations & queries|
| **Auth**       | JWT (Passport)        | Latest      | Autenticação                 |
| **AI**         | OpenAI API            | GPT-4       | Geração de conteúdo          |
| **Search**     | Perplexity API        | Latest      | Busca avançada (opcional)    |
| **Monitoring** | Sentry                | Latest      | Error tracking & performance |
| **Hosting**    | Railway               | Latest      | Cloud platform (PaaS)        |

---

## Ambientes

### 1. Development (Local - Docker)

**Propósito:** Desenvolvimento local com hot-reload

**Características:**
- Docker Compose com 3 containers
- Hot-reload habilitado (frontend + backend)
- PostgreSQL local com volumes persistentes
- Variáveis de ambiente via `.env` file
- Portas expostas: 5173 (frontend), 3001 (backend), 5432 (postgres)

**Como iniciar:**
```bash
# Setup automático (primeira vez)
bash scripts/setup-local.sh

# Ou manual
cp .env.template .env
# Editar .env com suas API keys
docker-compose up
```

**URLs de acesso:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- PostgreSQL: localhost:5432

---

### 2. Production (Railway)

**Propósito:** Ambiente de produção público

**Características:**
- 3 services separados no Railway (frontend, backend, postgres)
- Auto-scaling vertical (Railway managed)
- Health checks configurados
- Zero-downtime deployments
- Automated backups (PostgreSQL)
- HTTPS automático (Railway SSL)

**Configuração:**
- Definida em `.railway.toml` (Infrastructure as Code)
- Variáveis de ambiente via Railway dashboard
- Build automático via GitHub integration

**URLs de acesso:**
- Frontend: https://\<your-app\>.railway.app
- Backend: https://\<your-backend\>.railway.app
- PostgreSQL: Internal Railway URL (não exposto publicamente)

---

## Infrastructure as Code

### Docker Compose (Local Development)

**Arquivo:** `docker-compose.yml`

**Serviços:**

1. **PostgreSQL** (`postgres`)
   - Image: `postgres:15-alpine`
   - Port: 5432
   - Volume: `postgres_data` (persistente)
   - Healthcheck: `pg_isready` a cada 10s

2. **Backend** (`backend`)
   - Build: `backend/Dockerfile` (target: development)
   - Port: 3001
   - Depends on: `postgres` (healthcheck)
   - Hot-reload: Source code montado como volume
   - Healthcheck: `curl /api/health` a cada 30s

3. **Frontend** (`frontend`)
   - Build: `frontend/Dockerfile` (target: development)
   - Port: 5173
   - Depends on: `backend` (healthcheck)
   - Hot-reload: Source code montado como volume
   - Healthcheck: `curl /` a cada 30s

**Comandos úteis:**

```bash
# Iniciar todos os serviços
docker-compose up

# Iniciar em background
docker-compose up -d

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f backend

# Parar todos os serviços
docker-compose down

# Parar e remover volumes (limpar database)
docker-compose down -v

# Rebuild images (após mudanças no Dockerfile)
docker-compose build

# Rebuild e restart
docker-compose up --build

# Executar comando em container
docker-compose exec backend npm run migration:run

# Entrar no shell do container
docker-compose exec backend sh
```

---

### Dockerfiles

#### Backend Dockerfile

**Arquivo:** `backend/Dockerfile`

**Multi-stage build:**

1. **base** - Common dependencies
2. **development** - Dev mode com hot-reload (target para docker-compose)
3. **build** - Production build (TypeScript → JavaScript)
4. **production** - Optimized runtime (imagem final)

**Características:**
- Node.js 20-alpine (imagem mínima)
- Non-root user (segurança)
- Health check integrado
- Cache layers otimizados
- Image size: ~150MB (development), ~80MB (production)

**Build:**
```bash
# Development
docker build -t etp-backend:dev --target development ./backend

# Production
docker build -t etp-backend:prod --target production ./backend
```

---

#### Frontend Dockerfile

**Arquivo:** `frontend/Dockerfile`

**Multi-stage build:**

1. **base** - Common dependencies
2. **development** - Vite dev server (target para docker-compose)
3. **build** - Vite build (TypeScript + assets → dist/)
4. **production** - Nginx static server (imagem final)

**Características:**
- Node.js 20-alpine (build)
- Nginx-alpine (production runtime)
- Gzip compression habilitada
- Cache headers otimizados
- SPA fallback configurado (React Router)
- Image size: ~180MB (development), ~25MB (production)

**Build:**
```bash
# Development
docker build -t etp-frontend:dev --target development ./frontend

# Production
docker build -t etp-frontend:prod --target production ./frontend
```

---

### Environment Variables

**Arquivo:** `.env.template`

**Categorias:**

1. **Database** (PostgreSQL)
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD` (⚠️ MUDAR EM PRODUÇÃO!)

2. **Server**
   - `NODE_ENV` (development | production | test)
   - `BACKEND_PORT` (default: 3001)
   - `FRONTEND_PORT` (default: 5173)

3. **Authentication**
   - `JWT_SECRET` (⚠️ MUDAR EM PRODUÇÃO! Gerar: `openssl rand -base64 32`)
   - `JWT_EXPIRES_IN` (default: 7d)

4. **OpenAI API** (⚠️ REQUIRED!)
   - `OPENAI_API_KEY` (obter em: https://platform.openai.com/api-keys)
   - `OPENAI_MODEL` (default: gpt-4-turbo-preview)

5. **Perplexity API** (opcional)
   - `PERPLEXITY_API_KEY`

6. **Sentry** (opcional)
   - `SENTRY_DSN`
   - `SENTRY_TRACES_SAMPLE_RATE`

7. **Frontend**
   - `VITE_API_URL` (backend URL)
   - `VITE_SENTRY_DSN`

**Validação:**
```bash
# Validar .env antes de rodar
bash scripts/validate-env.sh
```

---

## Deployment

### Railway Deployment

**Arquivo de configuração:** `.railway.toml`

#### Processo de Deploy

1. **Trigger:** Push para `master` branch (GitHub integration)

2. **Railway Build:**
   - Detecta monorepo structure
   - Build backend:
     ```bash
     cd backend
     npm install
     npm run build
     ```
   - Build frontend:
     ```bash
     cd frontend
     npm install
     npm run build
     ```

3. **Health Checks:**
   - Backend: `GET /api/health` a cada 30s
   - Frontend: `GET /` a cada 60s
   - Se falhar 3x consecutivas → rollback automático

4. **Zero-Downtime:**
   - Railway mantém instância antiga rodando
   - Nova instância passa health checks
   - Traffic switch (blue-green deployment)
   - Instância antiga é destruída

**Timeline típico:**
- Build: ~2-3 minutos
- Health checks: ~30-60 segundos
- Total: ~4 minutos

#### Manual Deploy

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy manualmente
railway up

# Ver logs
railway logs
```

---

### Environment Variables (Railway)

**Configuração via Railway Dashboard:**

1. Acesse Railway project → Service → Variables

2. **Backend variables:**
   ```
   DATABASE_URL=<auto-generated-by-railway>
   PORT=<auto-assigned>
   NODE_ENV=production
   JWT_SECRET=<generate: openssl rand -base64 32>
   OPENAI_API_KEY=sk-...
   PERPLEXITY_API_KEY=<optional>
   SENTRY_DSN=<optional>
   SENTRY_TRACES_SAMPLE_RATE=0.1
   ```

3. **Frontend variables:**
   ```
   VITE_API_URL=${backend.PUBLIC_URL}/api
   NODE_ENV=production
   VITE_SENTRY_DSN=<optional>
   ```

4. **PostgreSQL variables** (auto-managed):
   ```
   POSTGRES_DB=railway
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=<auto-generated>
   DATABASE_URL=postgresql://...<auto-generated>
   ```

---

## Disaster Recovery

### Backup Strategy

**PostgreSQL Backups (Railway):**
- **Frequência:** Daily (automático)
- **Retenção:** 30 days
- **Storage:** Railway internal storage
- **Tipo:** Full dump (pg_dump)

**Backup manual:**
```bash
# Via Railway CLI
railway connect postgres
# Inside PostgreSQL shell:
\! pg_dump -U postgres -d railway > backup_$(date +%Y%m%d).sql
```

**Documentação completa:** `docs/DISASTER_RECOVERY.md`

---

### Recovery Procedures

#### Cenário 1: Database Corruption

**Recovery Time Objective (RTO):** <2 horas

**Procedimento:**
1. Identificar último backup válido (Railway dashboard → PostgreSQL → Backups)
2. Criar novo PostgreSQL service
3. Restore backup:
   ```bash
   railway connect postgres
   psql -U postgres -d railway < backup_latest.sql
   ```
4. Update `DATABASE_URL` no backend service
5. Redeploy backend

**Scripts:** `scripts/restore-db.sh`

---

#### Cenário 2: Complete Infrastructure Loss

**Recovery Time Objective (RTO):** <4 horas

**Procedimento:**

1. **Recriar Railway Project** (15 min)
   - New project no Railway dashboard
   - Add GitHub integration

2. **Recriar Services** (30 min)
   - PostgreSQL: Add database service
   - Backend: Add service, root directory `backend/`
   - Frontend: Add service, root directory `frontend/`

3. **Configurar Variables** (15 min)
   - Copiar values do `.railway.toml` e documentação
   - Set all environment variables via dashboard

4. **Restore Database** (1-2 horas)
   - Upload último backup
   - Run restore script
   - Validate data integrity

5. **Deploy & Validate** (30 min)
   - Trigger deploy (push to GitHub)
   - Run smoke tests
   - Validate all features

**Documentação completa:** `docs/DISASTER_RECOVERY.md`

---

#### Cenário 3: Accidental Data Deletion

**Recovery Time Objective (RTO):** <1 hora

**Procedimento:**
1. Identific

ar timestamp da deleção
2. Restore backup imediatamente anterior
3. Extract deleted records:
   ```sql
   SELECT * FROM backups.users WHERE deleted_at > '2024-01-01';
   ```
4. Insert em production database
5. Validate recovery

---

### Testing Disaster Recovery

**Script:** `scripts/test-disaster-recovery.sh`

**Execução:**
```bash
# Simula perda total e recovery
bash scripts/test-disaster-recovery.sh
```

**Validação:**
- ✅ Recovery em <4h
- ✅ Zero data loss (backup diário)
- ✅ All services operational

**Documentação:** `docs/DISASTER_RECOVERY_TESTING.md`

---

## Scaling Strategy

### Current Scale (MVP)

**Capacity:**
- **Users:** ~100-500 concurrent users
- **Requests:** ~10-50 req/s
- **Database:** ~1GB data
- **Traffic:** ~10GB/month

**Resources (Railway):**
- **Backend:** 512MB RAM, 0.5 vCPU
- **Frontend:** 256MB RAM, 0.25 vCPU
- **PostgreSQL:** 256MB RAM, 1GB storage

**Cost:** ~$20-30/month (Railway Pro Plan)

---

### Vertical Scaling (0-1000 users)

**Railway auto-scales verticalmente:**
- Increase RAM: 512MB → 1GB → 2GB
- Increase vCPU: 0.5 → 1.0 → 2.0

**Trigger points:**
- CPU >70% sustained → upgrade vCPU
- Memory >80% → upgrade RAM
- Response time p95 >500ms → upgrade resources

**Cost:** ~$50-100/month (1000 users)

---

### Horizontal Scaling (1000+ users)

**Quando escalar horizontalmente:**
- >1000 concurrent users
- >100 req/s sustained
- Database >10GB

**Estratégia:**

1. **Database (PostgreSQL):**
   - Read replicas (Railway não suporta nativamente)
   - Migrar para AWS RDS ou Supabase
   - Connection pooling (PgBouncer)

2. **Backend (NestJS):**
   - Múltiplas instâncias (Railway supports)
   - Load balancer (Railway built-in)
   - Stateless design (JWT auth já é stateless)

3. **Frontend (React):**
   - CDN (Cloudflare ou AWS CloudFront)
   - Edge caching
   - Static assets em S3

4. **Caching Layer:**
   - Redis (Railway add-on)
   - Cache API responses
   - Session storage

**Cost:** ~$200-500/month (5000+ users)

---

### Future: Multi-Region

**Quando considerar:**
- >10,000 concurrent users
- International audience
- SLA 99.9% uptime

**Arquitetura:**
- Multi-region deployment (US-East, EU, Asia)
- Global load balancer (AWS Route53 ou Cloudflare)
- Database replication (multi-master ou read replicas)
- CDN edge nodes

**Cost:** ~$1000+/month

---

## Cost Breakdown

### Monthly Cost Estimate (2024)

#### Development (Local)

| Item              | Cost       |
|-------------------|------------|
| Docker Desktop    | Free       |
| OpenAI API (dev)  | ~$5-10     |
| **Total**         | **~$10**   |

---

#### Production (Railway)

**Hobby Plan ($5/month):**
- ❌ Insuficiente (sleep após inatividade)

**Pro Plan ($20/month + usage):**

| Service       | Resources          | Cost/month |
|---------------|--------------------|------------|
| Backend       | 512MB RAM, 0.5 vCPU| $10        |
| Frontend      | 256MB RAM, 0.25 vCPU| $5       |
| PostgreSQL    | 1GB storage        | $5         |
| Bandwidth     | ~10GB/month        | Included   |
| **Subtotal**  |                    | **$20**    |

**External Services:**

| Service         | Tier          | Cost/month |
|-----------------|---------------|------------|
| OpenAI API      | Pay-as-you-go | $20-100    |
| Sentry          | Free (10K events)| Free    |
| Perplexity API  | Optional      | $0-20      |
| **Subtotal**    |               | **$20-120**|

**Total Estimate:**
- **Mínimo:** $40/month (Railway + OpenAI light usage)
- **Médio:** $70/month (Railway + OpenAI moderate usage)
- **Alto:** $140/month (Railway + OpenAI heavy usage + Perplexity)

---

### Cost Optimization Tips

1. **OpenAI API:**
   - Use `gpt-3.5-turbo` para drafts (10x cheaper)
   - Cache responses comuns
   - Implement rate limiting

2. **Railway:**
   - Use sleep policies para staging environments
   - Optimize Docker images (smaller = cheaper bandwidth)
   - Monitor resource usage

3. **Database:**
   - Regular VACUUM (reduce bloat)
   - Archive old ETPs (reduce storage)
   - Optimize queries (reduce CPU)

---

## Monitoring & Alerting

### Sentry Integration

**Backend:**
- Error tracking automático
- Performance monitoring (APM)
- Release tracking (git SHA)

**Frontend:**
- JavaScript errors
- React error boundaries
- User session replay (opt-in)

**Configuration:**
- `backend/src/config/sentry.config.ts`
- `frontend/src/config/sentry.config.ts`

**Dashboard:** https://sentry.io/

**Documentação:** `docs/MONITORING.md`

---

### Health Checks

**Backend (`/api/health`):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

**Railway health check:**
- Interval: 30s
- Timeout: 5s
- Retries: 3
- Action: Auto-restart se falhar

---

### Metrics Endpoint

**Backend (`/api/metrics`):**

```json
{
  "memory": {
    "heapUsed": 45000000,
    "heapTotal": 60000000,
    "rss": 80000000
  },
  "database": {
    "connections": 5,
    "maxConnections": 20
  },
  "uptime": 3600
}
```

**Prometheus format:** Available at `/api/metrics/prometheus`

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to database"

**Sintomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Causa:** PostgreSQL não está rodando ou `DATABASE_URL` incorreto

**Solução:**
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check DATABASE_URL
echo $DATABASE_URL

# Restart PostgreSQL
docker-compose restart postgres
```

---

#### 2. "OpenAI API rate limit exceeded"

**Sintomas:**
```
Error: Rate limit exceeded (429)
```

**Causa:** Muitas requisições para OpenAI API

**Solução:**
- Implement rate limiting (já configurado no backend)
- Check `@nestjs/throttler` configuration
- Upgrade OpenAI API tier

---

#### 3. "Frontend cannot reach backend"

**Sintomas:**
```
Error: Network error (ERR_CONNECTION_REFUSED)
```

**Causa:** `VITE_API_URL` incorreto ou backend down

**Solução:**
```bash
# Check VITE_API_URL
echo $VITE_API_URL

# Should be:
# - Local: http://backend:3001/api (Docker)
# - Local: http://localhost:3001/api (non-Docker)
# - Production: https://your-backend.railway.app/api

# Check backend health
curl http://localhost:3001/api/health
```

---

#### 4. "Docker build fails"

**Sintomas:**
```
Error: COPY failed: no source files were specified
```

**Causa:** Dockerfile context incorreto

**Solução:**
```bash
# Build from correct directory
cd backend
docker build -t etp-backend .

# Or specify context from root
docker build -t etp-backend -f backend/Dockerfile ./backend
```

---

#### 5. "Hot-reload not working"

**Sintomas:** Code changes não refletem imediatamente

**Solução:**
```bash
# Check volumes are mounted correctly
docker-compose config | grep volumes

# Restart with fresh build
docker-compose down
docker-compose up --build
```

---

### Debug Commands

```bash
# View all container logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Inspect container
docker-compose exec backend sh

# Check environment variables inside container
docker-compose exec backend env

# Database shell
docker-compose exec postgres psql -U etp_user -d etp_express

# Check disk usage
docker system df

# Clean unused images/containers
docker system prune -a
```

---

## Security Best Practices

1. **Never commit secrets:**
   - ✅ `.env` in `.gitignore`
   - ✅ Use `.env.template` without real values
   - ✅ Rotate secrets regularly

2. **Production security:**
   - ✅ Strong `JWT_SECRET` (32+ chars, random)
   - ✅ Strong `POSTGRES_PASSWORD` (16+ chars)
   - ✅ HTTPS only (Railway auto-provides)
   - ✅ Rate limiting configured

3. **Docker security:**
   - ✅ Non-root user in production images
   - ✅ Minimal base images (alpine)
   - ✅ No sensitive data in image layers

4. **Database security:**
   - ✅ PostgreSQL não exposto publicamente (Railway internal)
   - ✅ Backups encrypted at rest
   - ✅ Connection pooling

---

## Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Docker Docs:** https://docs.docker.com
- **NestJS Docs:** https://docs.nestjs.com
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## Changelog

### 2025-11-15 - v1.0

- ✅ Infrastructure as Code completa
- ✅ Docker Compose para desenvolvimento local
- ✅ Multi-stage Dockerfiles (backend + frontend)
- ✅ Environment variables template
- ✅ Validation scripts
- ✅ Setup automation script
- ✅ Documentação completa

---

**Maintainer:** ETP Express Team
**Contact:** GitHub Issues (https://github.com/tjsasakifln/etp-express/issues)

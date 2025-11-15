# Zero-Downtime Deployment Strategy

**Versão:** 1.0
**Última atualização:** 2025-11-14
**Status:** Implementado

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Health Check Endpoint](#health-check-endpoint)
4. [Processo de Deploy](#processo-de-deploy)
5. [Processo de Rollback](#processo-de-rollback)
6. [Database Migration Safety](#database-migration-safety)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)
9. [Referências](#referências)

---

## Visão Geral

### Problema

Antes da implementação desta estratégia, **todo deploy causava downtime**:

- Railway substitui containers durante deploy (restart = downtime)
- Backend retorna 502 errors durante build/restart
- Usuários perdem trabalho não salvo em ETPs durante deploy
- **Risco crítico:** Deploy = perda de confiança dos usuários

### Solução

Implementamos **zero-downtime deployment** usando:

1. **Health Check Endpoint** (`/api/health`)
2. **Railway Health Check Integration**
3. **Automated Rollback** em caso de falha
4. **Backward-Compatible Database Migrations**
5. **Smoke Tests** pós-deploy

### Benefícios

✅ **Zero user-visible downtime** durante deploys
✅ **Rollback automático** se deploy falhar
✅ **Database safety** com migrations backward-compatible
✅ **Confiança aumentada** em deploys frequentes
✅ **Deployment time**: <5min (target)

---

## Arquitetura

### Railway Deploy Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOY FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. [Trigger Deploy]
   │
   ├─> Railway builds new container
   │   (old container ainda serve requests)
   │
2. [Health Check]
   │
   ├─> Railway aguarda /api/health return 200 OK
   │   │
   │   ├─> ✅ Success → Switch traffic to new container
   │   │                 (old container gracefully shutdown)
   │   │
   │   └─> ❌ Timeout/500 → Rollback automático
   │                         (new container destroyed)
   │
3. [Smoke Tests]
   │
   ├─> Validate JSON response
   ├─> Validate database connectivity
   └─> Validate response time (<2s)
       │
       ├─> ✅ Success → Deploy complete
       │
       └─> ❌ Failure → Execute rollback.sh
```

### Componentes

| Componente | Descrição | Arquivo |
|------------|-----------|---------|
| **Health Endpoint** | Valida conectividade DB | `backend/src/health/` |
| **Railway Config** | Health check settings | `.railway.toml` |
| **Deploy Script** | Automated deployment | `scripts/deploy.sh` |
| **Rollback Script** | Automated rollback | `scripts/rollback.sh` |
| **Documentation** | Este documento | `docs/ZERO_DOWNTIME_DEPLOY.md` |

---

## Health Check Endpoint

### Endpoint Details

**URL:** `GET /api/health`
**Authentication:** None (public endpoint)
**Response Time:** <2s (target: <500ms)

### Response Format

#### Healthy Response (200 OK)

```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T12:00:00.000Z",
  "database": "connected"
}
```

#### Unhealthy Response (500 Internal Server Error)

```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-14T12:00:00.000Z",
  "database": "disconnected"
}
```

### Implementation

**Controller:** `backend/src/health/health.controller.ts`

```typescript
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.check();
  }
}
```

**Service:** `backend/src/health/health.service.ts`

```typescript
@Injectable()
export class HealthService {
  async check() {
    const dbHealth = await this.checkDatabase();

    return {
      status: dbHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: dbHealth ? 'connected' : 'disconnected',
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.userRepository.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### Railway Configuration

**`.railway.toml`:**

```toml
[[services.healthcheck]]
path = "/api/health"
interval = 30  # Check every 30s
timeout = 5    # 5s timeout

[[services.restart]]
policy = "ON_FAILURE"
max_retries = 10
```

---

## Processo de Deploy

### Pré-requisitos

1. **Railway CLI** instalado:
   ```bash
   npm install -g @railway/cli
   ```

2. **Variáveis de ambiente** configuradas:
   ```bash
   export RAILWAY_TOKEN="your-token"
   export RAILWAY_BACKEND_URL="https://your-backend.railway.app"
   ```

3. **Testes locais** passando:
   ```bash
   cd backend
   npm test
   npm run test:e2e
   ```

### Executar Deploy

#### Opção 1: Script Automatizado (Recomendado)

```bash
# Deploy com validação automática
./scripts/deploy.sh

# Deploy de serviço específico
./scripts/deploy.sh etp-express-backend
```

**O script executa:**

1. ✅ Valida variáveis de ambiente
2. ✅ Trigger deployment no Railway
3. ✅ Aguarda health check (max 30 retries, 10s cada)
4. ✅ Executa smoke tests
5. ✅ Rollback automático se falhar

#### Opção 2: Deploy Manual

```bash
# 1. Trigger deploy
railway up --service etp-express-backend

# 2. Monitor health check
watch -n 5 'curl -s https://your-backend.railway.app/api/health | jq'

# 3. Validate manually
curl https://your-backend.railway.app/api/health
```

### Deploy Flow Timeline

```
00:00 - Trigger deploy (railway up)
00:30 - Railway starts building new container
02:00 - Build complete, container starting
02:30 - Health check starts (every 30s)
03:00 - Health check passes (200 OK)
03:05 - Traffic switches to new container
03:10 - Old container gracefully shutdown
03:30 - Smoke tests execute
04:00 - Deploy complete ✅

Total: ~4 minutes
```

---

## Processo de Rollback

### Quando Fazer Rollback

**Rollback automático** é executado se:

- ❌ Health check falha após 30 tentativas (5min)
- ❌ Smoke tests falham
- ❌ Response time >10s

**Rollback manual** deve ser feito se:

- 🐛 Bug crítico descoberto em produção
- 📊 Métricas de erro aumentaram (>5% error rate)
- 👥 Usuários reportando problemas

### Executar Rollback

#### Script Automatizado

```bash
# Rollback para deployment anterior
./scripts/rollback.sh

# Rollback de serviço específico
./scripts/rollback.sh etp-express-backend
```

**O script executa:**

1. ✅ Identifica deployment anterior
2. ✅ Executa `railway deployment rollback`
3. ✅ Valida health check após rollback
4. ✅ Confirma serviço está healthy

#### Railway CLI Manual

```bash
# 1. Listar deployments
railway deployment list --service etp-express-backend

# 2. Copiar ID do deployment anterior

# 3. Executar rollback
railway deployment rollback <deployment-id> --service etp-express-backend

# 4. Validar
curl https://your-backend.railway.app/api/health
```

### Rollback Timeline

```
00:00 - Trigger rollback
00:10 - Railway switches to previous deployment
00:20 - Health check validates
00:30 - Rollback complete ✅

Total: ~30 seconds
```

---

## Database Migration Safety

### Problema

Database migrations podem **quebrar deploys** se não forem backward-compatible:

❌ **UNSAFE:** Remover coluna → código antigo tenta ler coluna → 500 error
❌ **UNSAFE:** Renomear coluna → código antigo usa nome antigo → 500 error
❌ **UNSAFE:** Alterar tipo → dados incompatíveis → 500 error

### Princípios

✅ **Migrations DEVEM ser backward-compatible**
✅ **Código antigo DEVE funcionar com schema novo**
✅ **Código novo DEVE funcionar com schema antigo**

### Estratégias por Tipo de Mudança

#### ✅ SAFE: Adicionar Coluna

**Migration:**

```typescript
@MigrationInterface()
export class AddEmailVerified1234567890 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "emailVerified" boolean DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "emailVerified"`
    );
  }
}
```

**Por que é safe:**
- Código antigo ignora coluna nova (não lê nem escreve)
- Código novo pode usar coluna imediatamente
- Rollback simplesmente remove coluna

#### ❌ UNSAFE → ✅ SAFE: Remover Coluna (Processo 2-Fases)

**Fase 1: Deploy N (Deprecate)**

```typescript
// 1. Migration: Marcar coluna como nullable
@MigrationInterface()
export class DeprecateOldColumn1234567890 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tornar nullable se não for
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "oldColumn" DROP NOT NULL`
    );
  }
}

// 2. Código: Parar de escrever/ler coluna
// (mas coluna ainda existe)
```

**Fase 2: Deploy N+1 (Remove) - Após 100% certeza**

```typescript
// Migration: Remover coluna
@MigrationInterface()
export class RemoveOldColumn1234567891 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "oldColumn"`
    );
  }
}
```

#### ❌ UNSAFE → ✅ SAFE: Renomear Coluna (Processo 3-Fases)

**Fase 1: Deploy N (Add New Column)**

```typescript
@MigrationInterface()
export class AddNewColumnName1234567890 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Adicionar coluna nova
    await queryRunner.query(
      `ALTER TABLE "user" ADD "newColumnName" varchar`
    );

    // Copiar dados existentes
    await queryRunner.query(
      `UPDATE "user" SET "newColumnName" = "oldColumnName"`
    );
  }
}

// Código: Escrever em AMBAS as colunas (dual-write)
async updateUser(id: number, value: string) {
  await this.userRepository.update(id, {
    oldColumnName: value,  // Compatibilidade com código antigo
    newColumnName: value,  // Código novo usa esta
  });
}
```

**Fase 2: Deploy N+1 (Migrate Reads)**

```typescript
// Código: Ler apenas de newColumnName
// (mas ainda escrever em ambas)
const user = await this.userRepository.findOne(id);
const value = user.newColumnName; // Usar coluna nova
```

**Fase 3: Deploy N+2 (Remove Old Column)**

```typescript
@MigrationInterface()
export class RemoveOldColumnName1234567892 {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "oldColumnName"`
    );
  }
}

// Código: Remover dual-write
async updateUser(id: number, value: string) {
  await this.userRepository.update(id, {
    newColumnName: value,  // Apenas coluna nova
  });
}
```

### Checklist de Migration Safety

Antes de criar migration, pergunte:

- [ ] ✅ Código antigo funcionará com esta migration?
- [ ] ✅ Rollback é possível sem perda de dados?
- [ ] ✅ Migration foi testada em staging?
- [ ] ✅ Existe rollback plan documentado?
- [ ] ❌ Migration remove/renomeia colunas? → Use processo multi-fase
- [ ] ❌ Migration altera tipos de dados? → Valide compatibilidade

---

## Testing & Validation

### Pre-Deploy Testing

#### 1. Testes Locais

```bash
# Backend tests
cd backend
npm test
npm run test:e2e
npm run test:cov

# Frontend tests
cd frontend
npm test
npm run test:coverage
```

#### 2. Health Check Local

```bash
# Start backend
cd backend
npm run start:dev

# Test health check
curl http://localhost:3001/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","database":"connected"}
```

### Deploy Validation (Automated via deploy.sh)

#### Smoke Test 1: JSON Format

```bash
curl -s https://backend.railway.app/api/health | jq
```

**Validações:**
- ✅ Response é JSON válido
- ✅ Campo `status` existe
- ✅ `status === "healthy"`

#### Smoke Test 2: Database Connectivity

```bash
curl -s https://backend.railway.app/api/health | jq '.database'
```

**Validações:**
- ✅ Campo `database` existe
- ✅ `database === "connected"`

#### Smoke Test 3: Response Time

```bash
curl -s -o /dev/null -w '%{time_total}' https://backend.railway.app/api/health
```

**Validações:**
- ✅ Response time <2s (target: <500ms)
- ⚠️ Warning se >2s (mas não bloqueia deploy)

### Post-Deploy Monitoring

#### Railway Logs

```bash
# Stream logs real-time
railway logs --service etp-express-backend --follow

# Search for errors
railway logs --service etp-express-backend | grep ERROR
```

#### Health Check Monitoring

```bash
# Monitor continuamente (cada 5s)
watch -n 5 'curl -s https://backend.railway.app/api/health | jq'
```

#### Error Rate Monitoring

Após deploy, monitor por **15-30 minutos**:

- ✅ Error rate <1%
- ✅ Response time (p95) <500ms
- ✅ Zero 500 errors no Sentry/logging
- ✅ Nenhum report de usuários

---

## Troubleshooting

### Deploy Falha: Health Check Timeout

**Sintoma:**
```
⚠ Health check não respondeu (tentativa 30/30)
❌ Health check falhou após 30 tentativas
🔄 Rollback automático iniciado
```

**Possíveis Causas:**

1. **Database não conecta**
   ```bash
   # Verificar DATABASE_URL
   railway variables --service etp-express-backend

   # Testar conectividade PostgreSQL
   railway run psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Build falhou silenciosamente**
   ```bash
   # Ver logs de build
   railway logs --service etp-express-backend --deployment <id>
   ```

3. **PORT incorreto**
   ```bash
   # Verificar PORT configurado
   railway variables --service etp-express-backend
   ```

**Solução:**
- Corrigir variável de ambiente
- Verificar logs de erro: `railway logs`
- Testar localmente antes de re-deploy

---

### Deploy Passa, Mas Usuários Reportam Erros

**Sintoma:**
- Health check passa (200 OK)
- Smoke tests passam
- Mas usuários reportam 500 errors específicos

**Possíveis Causas:**

1. **Migration incompatível**
   - Código novo tenta usar coluna que não existe em DB antigo
   - **Solução:** Rollback + fix migration

2. **Cache desatualizado**
   - Frontend usa cache antigo com API nova
   - **Solução:** Invalidar cache CloudFlare/CDN

3. **Environment variable faltando**
   - Código novo depende de ENV var não configurada
   - **Solução:** `railway variables set KEY=value`

**Debugging:**

```bash
# 1. Ver logs de erro
railway logs --service etp-express-backend | grep ERROR

# 2. Testar endpoint específico
curl -v https://backend.railway.app/api/etps

# 3. Validar environment
railway variables --service etp-express-backend
```

---

### Rollback Falha

**Sintoma:**
```
❌ Health check falhou após 20 tentativas
❌ Rollback pode ter falhado - intervenção manual necessária!
```

**Ação Imediata:**

1. **Verificar deployment atual:**
   ```bash
   railway deployment list --service etp-express-backend
   ```

2. **Force rollback manual:**
   ```bash
   # Pegar ID do deployment estável conhecido
   railway deployment rollback <stable-deployment-id>
   ```

3. **Verificar database:**
   ```bash
   railway run psql $DATABASE_URL -c "\dt"
   ```

4. **Contact Railway Support** se persistir

---

### Database Migration Rollback

**Cenário:** Migration causou erro, precisa reverter.

**Opção 1: TypeORM Migration Rollback**

```bash
cd backend

# Reverter última migration
npm run migration:revert

# Verificar status
npm run migration:show
```

**Opção 2: Manual SQL Rollback**

```bash
# Conectar ao database
railway run psql $DATABASE_URL

# Executar DOWN migration manualmente
ALTER TABLE "user" DROP COLUMN "emailVerified";
```

**⚠️ ATENÇÃO:**
- Rollback de migration pode causar **perda de dados**
- Sempre ter backup antes de migration complexa
- Testar migration em staging primeiro

---

## Referências

### Documentação Oficial

- [Railway Deployments](https://docs.railway.app/deploy/deployments)
- [Railway Health Checks](https://docs.railway.app/deploy/healthchecks)
- [TypeORM Migrations](https://typeorm.io/migrations)

### Scripts do Projeto

- [`scripts/deploy.sh`](../scripts/deploy.sh) - Deploy automatizado
- [`scripts/rollback.sh`](../scripts/rollback.sh) - Rollback automatizado
- [`.railway.toml`](../.railway.toml) - Configuração Railway

### Documentos Relacionados

- [`DEPLOY.md`](../DEPLOY.md) - Guia de deploy geral
- [`DISASTER_RECOVERY.md`](./DISASTER_RECOVERY.md) - Backup e recovery
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) - Arquitetura do sistema

---

## Changelog

### v1.0 (2025-11-14)

- ✅ Implementação inicial zero-downtime deployment
- ✅ Health check endpoint criado
- ✅ Scripts de deploy e rollback automatizados
- ✅ Railway health check configurado
- ✅ Documentação completa
- ✅ Database migration guidelines

---

**Documento mantido por:** DevOps Team
**Última revisão:** 2025-11-14
**Próxima revisão:** 2025-12-14 (ou após incidente)

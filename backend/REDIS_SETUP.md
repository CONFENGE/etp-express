# Redis Setup - ETP Express

## Overview

Este documento descreve como configurar Redis no ETP Express para suportar processamento assíncrono de jobs via BullMQ.

## Arquitetura

```
┌─────────────┐ ┌──────────┐ ┌──────────────┐
│ Backend │────│ Redis │────│ BullMQ │
│ NestJS │ │ Cache │ │ Queue │
└─────────────┘ └──────────┘ └──────────────┘
```

### Casos de Uso

1. **Job Queue (BullMQ)**: Processar geração de seções longas de forma assíncrona
2. **Cache**: Armazenar resultados temporários de APIs externas (futuro)
3. **Session Storage**: Gerenciar sessões de usuários (futuro)

## Configuração Local

### 1. Instalar Redis Localmente

#### Windows (via Chocolatey)

```powershell
choco install redis-64
redis-server
```

#### macOS (via Homebrew)

```bash
brew install redis
brew services start redis
```

#### Docker

```bash
docker run --name redis -p 6379:6379 -d redis:7-alpine
```

### 2. Configurar Variáveis de Ambiente

Adicione ao `.env`:

```bash
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 3. Verificar Conectividade

```bash
# Via health check
curl http://localhost:3001/health

# Resposta esperada:
{
 "status": "healthy",
 "timestamp": "2025-12-03T12:00:00.000Z",
 "database": "connected",
 "redis": "connected" # ← Confirma Redis conectado
}
```

## Configuração Railway (Production)

### 1. Adicionar Redis Service

1. Acesse o [Railway Dashboard](https://railway.app/dashboard)
2. Selecione o projeto "ETP Express"
3. Clique em **"New Service"** → **"Database"** → **"Add Redis"**
4. Aguarde provisionamento (30-60 segundos)

### 2. Configurar Variáveis de Ambiente

Railway injeta automaticamente `REDIS_URL` quando Redis é adicionado.

**Formato:** `redis://:password@host:port`

Verifique em: **Backend Service → Variables → REDIS_URL**

### 3. Validar Deploy

Após deploy, verifique health check:

```bash
curl https://etp-express-backend-production.up.railway.app/health

# Resposta esperada:
{
 "status": "healthy",
 "timestamp": "2025-12-03T12:00:00.000Z",
 "database": "connected",
 "redis": "connected" # ← Confirma Redis conectado no Railway
}
```

## Arquivos Criados/Modificados

### Novos Arquivos

- **`backend/src/config/redis.config.ts`**: Configuração NestJS para Redis
 - Parse automático de `REDIS_URL`
 - Configurações otimizadas para BullMQ
 - Fallback para localhost em desenvolvimento

### Arquivos Modificados

- **`backend/src/app.module.ts`**: Registra `redisConfig` no ConfigModule
- **`backend/src/health/health.service.ts`**: Adiciona health check Redis
- **`backend/.env.example`**: Documenta variáveis Redis
- **`backend/package.json`**: Adiciona dependência `ioredis`

## Uso

### Health Check Redis

O health check Redis está integrado ao endpoint `/health`:

```typescript
// GET /health
{
 "status": "healthy",
 "database": "connected",
 "redis": "connected" | "not_configured"
}
```

**Comportamento:**

- Se `REDIS_URL` não está configurado: `redis: "connected"` (não bloqueia)
- Se `REDIS_URL` configurado mas Redis offline: `status: "unhealthy"`

### Acessar Configuração Redis

```typescript
import { ConfigService } from '@nestjs/config';

constructor(private configService: ConfigService) {}

const redisConfig = this.configService.get('redis');
// {
// host: 'localhost',
// port: 6379,
// password: undefined,
// db: 0,
// maxRetriesPerRequest: null,
// enableReadyCheck: false
// }
```

### Próximos Passos (Issues Desbloqueadas)

Com Redis configurado, as seguintes issues podem ser implementadas:

1. **#220 - Implementar BullMQ para geração de seções**
 - Criar queue `section-generation`
 - Processar jobs assíncronos
 - Retry logic

2. **#221 - API de status de jobs**
 - Endpoint `GET /jobs/:jobId/status`
 - Retornar progresso, posição na fila, ETA

3. **#222 - UX assíncrona para geração de seções**
 - Frontend polling de status
 - Progress bar real-time
 - Notificações push

## Troubleshooting

### Redis não conecta localmente

```bash
# Verificar se Redis está rodando
redis-cli ping
# Resposta esperada: PONG

# Ver logs do Redis (Docker)
docker logs redis

# Ver logs do Redis (macOS)
tail -f /usr/local/var/log/redis.log
```

### Health check retorna `redis: "not_configured"`

- Redis não está obrigatório para app rodar
- Adicione `REDIS_URL` ao `.env` para ativar

### Railway: Redis desconectado após deploy

1. Verifique se Redis service está ativo no Railway
2. Confirme que `REDIS_URL` foi injetado nas variáveis do backend
3. Verifique logs do backend: `railway logs backend`

## Referências

- [Railway Redis Guide](https://docs.railway.app/guides/redis)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [ioredis GitHub](https://github.com/redis/ioredis)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

## Segurança

### Production Checklist

- ✅ Redis rodando em rede privada (Railway internal network)
- ✅ Senha gerada automaticamente pelo Railway
- ✅ Conexão via SSL/TLS (Railway default)
- ⚠ **TODO:** Implementar rate limiting em endpoints de queue
- ⚠ **TODO:** Monitorar uso de memória Redis (alertas em >80%)

## Monitoramento

### Métricas Importantes

```bash
# Redis CLI (local)
redis-cli INFO stats

# Métricas relevantes:
# - total_connections_received: Total de conexões
# - instantaneous_ops_per_sec: Operações/segundo
# - used_memory_human: Memória usada
# - evicted_keys: Keys removidos por limite de memória
```

### Railway Dashboard

- **Memory Usage**: Verificar em "Metrics" tab
- **Connection Pool**: Health check automático via `/health`

---

**Última atualização:** 2025-12-03
**Issue:** #219 - Setup Redis no Railway
**PR:** TBD

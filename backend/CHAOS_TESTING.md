# Chaos Engineering - ETP Express

Documentação dos testes de resiliência e chaos engineering implementados no sistema.

## Objetivo

Validar comportamento do sistema em condições adversas e garantir graceful degradation quando dependências externas falham.

## Testes Implementados

### 1. Redis Failure Resilience (#1635)

**Arquivo:** `backend/src/modules/cache/chaos/redis-failure.chaos.spec.ts`

**Cenários Testados:**

#### 1.1 Redis Down - Graceful Fallback
- **Cenário:** Redis fica indisponível durante operação
- **Comportamento Esperado:**
  - `get()` retorna `null` (cache miss)
  - `set()` falha silenciosamente sem lançar exceção
  - Sistema continua operando normalmente
  - Stats registram misses/errors corretamente
- **Validação:** ✅ 23 testes passando

#### 1.2 Redis Connection Errors
- **Cenário:** Erros de conexão (ECONNRESET, ENOTFOUND, ETIMEDOUT)
- **Comportamento Esperado:**
  - Logs de erro são emitidos (error level)
  - Sistema não trava (no crash)
  - Stats trackam errors incrementalmente
  - Service marca-se como unavailable
- **Validação:** ✅ Error handling testado

#### 1.3 Redis Recovery - Automatic Reconnection
- **Cenário:** Redis volta após período de indisponibilidade
- **Comportamento Esperado:**
  - Reconexão automática (event 'connect')
  - `isAvailable()` volta a retornar `true`
  - Health check reporta status `healthy`
  - Operações de cache voltam a funcionar
- **Validação:** ✅ Auto-recovery testado

#### 1.4 Connection Timeout - No Hang
- **Cenário:** Conexão Redis demora > 30s ou nunca completa
- **Comportamento Esperado:**
  - Constructor não bloqueia (lazyConnect)
  - Get operations completam em < 5s
  - Processo não trava (event loop livre)
- **Validação:** ✅ Timeout scenarios testados

#### 1.5 Memory Leak Prevention
- **Cenário:** Múltiplos ciclos de connect/disconnect
- **Comportamento Esperado:**
  - Event handlers não se acumulam
  - `onModuleDestroy()` limpa recursos corretamente
  - Redis `quit()` é chamado ao destruir módulo
- **Validação:** ✅ Memory safety testado

## Serviços Testados

### SemanticCacheService
Cache para respostas de LLM (OpenAI, Exa, etc.)

**Métricas Monitoradas:**
- `hits`: Cache hits por tipo de provider
- `misses`: Cache misses por tipo de provider
- `errors`: Erros de operação Redis
- `connected`: Status de conexão booleano

### GovApiCache
Cache para APIs governamentais (PNCP, SINAPI, SICRO)

**Métricas Monitoradas:**
- `hits`: Cache hits por fonte de dados
- `misses`: Cache misses por fonte de dados
- `errors`: Erros de operação Redis
- `latencyMs`: Latência do ping Redis

## Cross-Service Isolation

Os testes validam que:
- Erros em um cache type não afetam outros types
- Stats são mantidos independentemente por provider
- Falhas em SemanticCache não impactam GovApiCache (instâncias separadas)

## Executar Testes

```bash
# Executar todos os testes de chaos
cd backend
npm test -- chaos

# Executar apenas Redis chaos tests
npm test -- redis-failure.chaos.spec.ts

# Executar com coverage
npm run test:cov -- redis-failure.chaos.spec.ts
```

## Resultados

**Status:** ✅ PASSING (37/37 tests)

**Coverage:**
- **Redis Failure (#1635):** 23/23 tests ✅
  - SemanticCacheService: 100% dos cenários de falha
  - GovApiCache: 100% dos cenários de falha
  - Cross-service isolation: ✅ Validado
  - Memory safety: ✅ Validado

- **Inbound Large Payload (#1637):** 14/14 tests ✅
  - Body parser size limits: ✅ Validado
  - Memory leak prevention: ✅ Validado (10.57MB growth)
  - Concurrent handling: ✅ Validado (15.01MB growth)
  - Event loop health: ✅ Validado

### 2. Inbound Large Payload Resilience (#1637)

**Arquivo:** `backend/src/chaos/inbound-payload.chaos.spec.ts`

**Cenários Testados:**

#### 2.1 Body Parser Size Limits
- **Cenário:** Clients send HTTP payloads approaching or exceeding 10MB limit
- **Comportamento Esperado:**
  - Body parser configured with 10MB limit in `main.ts`
  - Large payloads handled gracefully without crashing
  - System rejects payloads > 10MB (413 Payload Too Large expected in production)
- **Validação:** ✅ 3 testes passando

#### 2.2 Memory Leak Prevention
- **Cenário:** Repeated large payload processing (10 iterations of 5MB each)
- **Comportamento Esperado:**
  - Heap growth < 100MB após processamento
  - GC cleanup funciona corretamente
  - Sistema permanece estável após processar múltiplos payloads
- **Validação:** ✅ Memory safety testado (10.57MB growth observed - within limits)

#### 2.3 Concurrent Payload Handling
- **Cenário:** 5 concurrent large payloads (8MB each)
- **Comportamento Esperado:**
  - Sistema processa concorrentemente sem crash
  - Heap growth < 100MB
  - Sem memory leaks (15.01MB growth observed - within limits)
- **Validação:** ✅ Concurrency testado

#### 2.4 Event Loop Health
- **Cenário:** Large payload processing não bloqueia event loop
- **Comportamento Esperado:**
  - Event loop latency < 100ms
  - setImmediate callbacks executam sem delay significativo
  - Sistema permanece responsivo
- **Validação:** ✅ Event loop health testado

## Próximos Testes Planejados

- [ ] #1636 - API Timeout com circuit breaker (Gov APIs)

## Referências

- Issue #1074 - [QA] Implementar chaos engineering (EPIC)
- Issue #1635 - [QA-1074a] Redis failure resilience
- ARCHITECTURE.md - Resilience Patterns
- [Chaos Engineering Principles](https://principlesofchaos.org/)

# Government APIs Troubleshooting Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-21
**Module:** `backend/src/modules/gov-api`

---

## Quick Diagnostics

### Health Check Command

```bash
# Check all government API sources
curl -s http://localhost:3001/api/health/gov-apis | jq

# Check specific source
curl -s http://localhost:3001/api/health | jq '.govApis'
```

### Log Analysis

```bash
# Filter government API logs
npm run logs:backend | grep -E "(GovSearch|ComprasGov|Pncp|Sinapi|Sicro)"

# Railway logs
railway logs | grep -E "(GovSearch|ComprasGov|Pncp|Sinapi|Sicro)"
```

---

## Common Issues

### 1. "Circuit breaker is open" Error

**Symptoms:**

- Log message: `Circuit breaker is open, returning SERVICE_UNAVAILABLE response`
- Status: `SERVICE_UNAVAILABLE`
- All requests to a specific API fail immediately

**Causes:**

- Target API is experiencing downtime
- Network issues between server and API
- Rate limiting by target API

**Solutions:**

1. **Check API status:**

   ```bash
   # Test Compras.gov.br
   curl -I https://compras.dados.gov.br/licitacoes/v1/licitacoes.json

   # Test PNCP
   curl -I https://pncp.gov.br/api/consulta/v1/contratacoes
   ```

2. **Wait for circuit reset:**
   - Circuit breaker resets after 60 seconds (default)
   - Check state: `GET /api/health/gov-apis`

3. **Force cache invalidation:**

   ```bash
   redis-cli KEYS "gov:comprasgov:*" | xargs redis-cli DEL
   redis-cli KEYS "gov:pncp:*" | xargs redis-cli DEL
   ```

4. **Check logs for root cause:**
   ```bash
   railway logs | grep "Circuit breaker" | tail -20
   ```

---

### 2. "TIMEOUT" or Slow Responses

**Symptoms:**

- Status: `TIMEOUT`
- Request duration > 30 seconds
- Log: `Error searching [API]: timeout`

**Causes:**

- Government API experiencing high load
- Network latency
- Large result sets

**Solutions:**

1. **Reduce result set size:**

   ```typescript
   // Reduce maxPerSource
   const results = await govSearchService.search(query, {
     maxPerSource: 20, // Default is 50
   });
   ```

2. **Add date filters:**

   ```typescript
   const results = await govSearchService.search(query, {
     startDate: new Date('2024-01-01'),
     endDate: new Date('2024-12-31'),
   });
   ```

3. **Use cached results:**
   - Check if cache is working: `redis-cli INFO memory`
   - Increase cache TTL if needed

---

### 3. "RATE_LIMITED" Error

**Symptoms:**

- Status: `RATE_LIMITED`
- Log: `Error searching [API]: 429`
- Multiple rapid requests failing

**Causes:**

- Too many requests to government API
- Rate limit exceeded (default: 60 req/min)

**Solutions:**

1. **Wait and retry:**
   - Rate limit window is 60 seconds
   - Built-in retry will handle this automatically

2. **Enable caching:**

   ```env
   GOV_API_CACHE_PNCP_ENABLED=true
   GOV_API_CACHE_COMPRASGOV_ENABLED=true
   ```

3. **Check for request storms:**
   ```bash
   # Check request rate
   railway logs | grep "GovSearch" | awk '{print $1}' | uniq -c | sort -rn
   ```

---

### 4. "No results found" When Results Expected

**Symptoms:**

- `totalResults: 0`
- No errors in logs
- User reports missing data

**Causes:**

- Query too specific
- Date range too narrow
- UF filter excluding results
- API indexing delay (24-48h for new licitacoes)

**Solutions:**

1. **Broaden search:**

   ```typescript
   // Remove restrictive filters
   const results = await govSearchService.search('software', {
     // Remove UF, date range, etc.
   });
   ```

2. **Check each source individually:**

   ```bash
   # Test Compras.gov directly
   curl "https://compras.dados.gov.br/licitacoes/v1/licitacoes.json?objeto=software"

   # Test PNCP directly
   curl "https://pncp.gov.br/api/consulta/v1/contratacoes?pagina=1&tamanhoPagina=10"
   ```

3. **Enable Exa fallback:**
   ```env
   EXA_FALLBACK_ENABLED=true
   EXA_FALLBACK_THRESHOLD=3
   ```

---

### 5. Redis Cache Not Working

**Symptoms:**

- `cached: false` on all responses
- Log: `Redis configuration not found, cache will be disabled`
- High latency on repeated queries

**Causes:**

- Redis not configured
- Redis connection failed
- Cache disabled via environment

**Solutions:**

1. **Check Redis connection:**

   ```bash
   redis-cli PING
   # Expected: PONG
   ```

2. **Verify environment variables:**

   ```bash
   echo $REDIS_URL
   echo $REDIS_HOST
   ```

3. **Check Railway Redis addon:**

   ```bash
   railway variables | grep REDIS
   ```

4. **Test cache manually:**
   ```bash
   redis-cli SET test "hello"
   redis-cli GET test
   ```

---

### 6. SINAPI/SICRO Data Not Loading

**Symptoms:**

- SINAPI/SICRO return empty results
- Log: `SINAPI data not loaded for month X`
- Prices search fails

**Causes:**

- Monthly data files not downloaded
- Parser error on Excel file
- Invalid reference month

**Solutions:**

1. **Check loaded months:**

   ```bash
   # Via API
   curl http://localhost:3001/api/health/gov-apis | jq '.sinapi.loadedMonths'
   ```

2. **Force data sync:**

   ```bash
   # Trigger manual sync (if endpoint available)
   curl -X POST http://localhost:3001/api/gov/sync/sinapi
   ```

3. **Verify file availability:**
   - SINAPI: Check CAIXA website for current month files
   - SICRO: Check DNIT website for current month files

4. **Check parser logs:**
   ```bash
   railway logs | grep -E "(SinapiParser|SicroParser)" | tail -50
   ```

---

### 7. Exa Fallback Not Working

**Symptoms:**

- `fallbackUsed: false` even with few results
- No Exa in `sources` array
- Log: `Error in Exa fallback`

**Causes:**

- Exa API key invalid or expired
- Exa service unavailable
- Fallback disabled

**Solutions:**

1. **Verify API key:**

   ```bash
   curl -H "x-api-key: $EXA_API_KEY" https://api.exa.ai/search -d '{"query":"test"}'
   ```

2. **Check environment:**

   ```bash
   echo $EXA_API_KEY
   echo $EXA_FALLBACK_ENABLED
   echo $EXA_FALLBACK_THRESHOLD
   ```

3. **Renew API key:**
   - Go to https://exa.ai/
   - Generate new API key
   - Update in Railway variables

---

## Forced Recovery Procedures

### Force Reset All Circuit Breakers

```bash
# Restart the backend service
railway service restart backend
```

### Force Clear All Government API Cache

```bash
# Connect to Redis
redis-cli

# Clear all government API cache
KEYS gov:* | xargs DEL

# Verify
KEYS gov:*
```

### Force Refresh SINAPI/SICRO Data

```bash
# Trigger data sync job
curl -X POST http://localhost:3001/api/admin/jobs/gov-data-sync \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Monitoring Alerts

### Set Up Alerts for Government APIs

| Condition                   | Alert Level | Action                 |
| --------------------------- | ----------- | ---------------------- |
| Circuit breaker open > 5min | WARNING     | Check API status       |
| Error rate > 20% for 10min  | CRITICAL    | Investigate root cause |
| Cache hit rate < 50%        | WARNING     | Check Redis health     |
| All sources unavailable     | CRITICAL    | Activate fallback mode |

### Grafana Alert Rules

```yaml
# gov-api-circuit-open
expr: gov_api_circuit_breaker_state{state="open"} == 1
for: 5m
severity: warning
annotations:
  summary: "Government API circuit breaker open"

# gov-api-high-error-rate
expr: rate(gov_api_errors_total[5m]) > 0.2
for: 10m
severity: critical
annotations:
  summary: "High error rate on government APIs"
```

---

## Useful Logs to Collect

When reporting issues, collect these logs:

```bash
# Last 100 lines of government API logs
railway logs | grep -E "(GovSearch|ComprasGov|Pncp|Sinapi|Sicro)" | tail -100 > gov-api-logs.txt

# Circuit breaker state history
railway logs | grep "Circuit" | tail -50 >> gov-api-logs.txt

# Cache statistics
redis-cli INFO memory >> gov-api-logs.txt

# Health check output
curl http://localhost:3001/api/health/gov-apis >> gov-api-logs.txt
```

---

## Related Documentation

- [Integration Guide](./gov-api-integration.md) - Architecture overview
- [Configuration Guide](./gov-api-configuration.md) - Environment setup
- [OPS Runbook](./OPS_RUNBOOK.md) - Operational procedures
- [Incident Response](./INCIDENT_RESPONSE.md) - Incident handling

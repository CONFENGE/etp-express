# Government APIs Configuration Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-21
**Module:** `backend/src/modules/gov-api`

---

## Environment Variables

### Core Configuration

Add the following variables to your `.env` file:

```env
# ============================================================================
# GOVERNMENT APIS CONFIGURATION
# ============================================================================

# Exa Fallback (used when government APIs return insufficient results)
EXA_API_KEY=exa-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXA_FALLBACK_ENABLED=true
EXA_FALLBACK_THRESHOLD=3

# Redis (required for caching)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Cache Configuration (Optional)

Override default cache TTLs per source:

```env
# Cache TTL overrides (in seconds)
# Default: PNCP/Compras.gov = 3600 (1h), SINAPI/SICRO = 604800 (7d)
GOV_API_CACHE_PNCP_TTL=3600
GOV_API_CACHE_PNCP_ENABLED=true
GOV_API_CACHE_COMPRASGOV_TTL=3600
GOV_API_CACHE_COMPRASGOV_ENABLED=true
GOV_API_CACHE_SINAPI_TTL=604800
GOV_API_CACHE_SINAPI_ENABLED=true
GOV_API_CACHE_SICRO_TTL=604800
GOV_API_CACHE_SICRO_ENABLED=true
```

### Rate Limiting (Advanced)

These are internal defaults, but can be adjusted if needed:

| API         | Default Rate     | Window |
| ----------- | ---------------- | ------ |
| Compras.gov | 60 req/min       | 60s    |
| PNCP        | 60 req/min       | 60s    |
| SINAPI      | N/A (file-based) | -      |
| SICRO       | N/A (file-based) | -      |

## Railway Configuration

### Required Variables

In Railway dashboard, ensure these variables are set:

```
# Redis service (auto-injected when Redis addon is enabled)
REDIS_URL=${{Redis.REDIS_URL}}

# Exa API for fallback
EXA_API_KEY=exa-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXA_FALLBACK_ENABLED=true
EXA_FALLBACK_THRESHOLD=3
```

### Optional Performance Tuning

```
# Increase cache TTL in production for better performance
GOV_API_CACHE_PNCP_TTL=7200
GOV_API_CACHE_COMPRASGOV_TTL=7200
```

## API Endpoints Reference

### Compras.gov.br (SIASG)

**Base URL:** `https://compras.dados.gov.br`

| Endpoint                         | Description         |
| -------------------------------- | ------------------- |
| `/licitacoes/v1/licitacoes.json` | Search licitacoes   |
| `/licitacoes/id/{id}.json`       | Get licitacao by ID |
| `/contratos/v1/contratos.json`   | Search contratos    |
| `/materiais/v1/materiais.json`   | CATMAT catalog      |
| `/servicos/v1/servicos.json`     | CATSER catalog      |

**Query Parameters:**

- `objeto`: Search term for objeto field
- `uf_uasg`: State filter (e.g., "DF", "SP")
- `data_publicacao_min`: Start date (YYYY-MM-DD)
- `data_publicacao_max`: End date (YYYY-MM-DD)
- `modalidade`: Modality filter (1-9)
- `offset`: Pagination offset
- `formato`: Response format (always "json")

### PNCP - Portal Nacional

**Base URL:** `https://pncp.gov.br/api/consulta`

| Endpoint           | Description             |
| ------------------ | ----------------------- |
| `/v1/contratacoes` | Search contratacoes     |
| `/v1/contratos`    | Search contratos        |
| `/v1/atas`         | Search atas de registro |

**Query Parameters:**

- `dataInicial`: Start date (YYYY-MM-DD)
- `dataFinal`: End date (YYYY-MM-DD)
- `uf`: State filter
- `cnpjOrgao`: CNPJ filter
- `codigoModalidadeContratacao`: Modality code
- `pagina`: Page number (1-based)
- `tamanhoPagina`: Page size (max 500)

### SINAPI - Reference Prices

**Data Source:** CAIXA Economica Federal (Excel files)

| Data Type   | Description                |
| ----------- | -------------------------- |
| Insumos     | Raw materials and inputs   |
| Composicoes | Composed services with BDI |
| Precos      | Prices by UF and month     |

**Reference Month Format:** `YYYY-MM` (e.g., "2024-12")

### SICRO - Road Infrastructure Prices

**Data Source:** DNIT (Excel files)

| Data Type    | Description                 |
| ------------ | --------------------------- |
| Insumos      | Road construction materials |
| Composicoes  | Road service compositions   |
| Equipamentos | Equipment costs             |

## Circuit Breaker Configuration

Default settings for resilience:

```typescript
circuitBreaker: {
  timeout: 30000,              // 30s request timeout
  errorThresholdPercentage: 50, // Open at 50% errors
  resetTimeout: 60000,          // 60s before half-open
  volumeThreshold: 5,           // Min requests before tripping
}
```

**States:**

- **Closed:** Normal operation
- **Open:** All requests fail fast
- **Half-Open:** Testing if service recovered

## Retry Configuration

Exponential backoff with jitter:

```typescript
retry: {
  maxRetries: 3,      // Max retry attempts
  baseDelay: 2000,    // Initial delay (2s)
  maxDelay: 15000,    // Max delay (15s)
}
```

**Retry sequence:** 2s -> 4s -> 8s (capped at 15s)

## Module Import

```typescript
// app.module.ts
import { GovApiModule } from './modules/gov-api/gov-api.module';
import { GovSearchModule } from './modules/gov-api/gov-search/gov-search.module';
import { ComprasGovModule } from './modules/gov-api/compras-gov/compras-gov.module';
import { PncpModule } from './modules/gov-api/pncp/pncp.module';
import { SinapiModule } from './modules/gov-api/sinapi/sinapi.module';
import { SicroModule } from './modules/gov-api/sicro/sicro.module';

@Module({
  imports: [
    // Base module (global, provides cache and metrics)
    GovApiModule,

    // Individual API modules
    ComprasGovModule,
    PncpModule,
    SinapiModule,
    SicroModule,

    // Unified search (depends on all above)
    GovSearchModule,
  ],
})
export class AppModule {}
```

## Verification Commands

### Test API Connectivity

```bash
# Test Compras.gov.br
curl -s "https://compras.dados.gov.br/licitacoes/v1/licitacoes.json?offset=0" | head -c 500

# Test PNCP
curl -s "https://pncp.gov.br/api/consulta/v1/contratacoes?pagina=1&tamanhoPagina=1" | head -c 500
```

### Verify Redis Cache

```bash
# Connect to Redis
redis-cli

# List government API cache keys
KEYS gov:*

# Get cache stats
INFO memory
```

### Health Check Endpoint

```bash
# Check all government API sources
curl http://localhost:3001/api/health/gov-apis

# Expected response:
{
  "comprasgov": { "healthy": true, "latencyMs": 245 },
  "pncp": { "healthy": true, "latencyMs": 312 },
  "sinapi": { "healthy": true, "latencyMs": 15 },
  "sicro": { "healthy": true, "latencyMs": 12 }
}
```

## Feature Flags

Control API sources via feature flags (if enabled):

| Flag                   | Description           | Default |
| ---------------------- | --------------------- | ------- |
| `gov-api-comprasgov`   | Enable Compras.gov.br | true    |
| `gov-api-pncp`         | Enable PNCP           | true    |
| `gov-api-sinapi`       | Enable SINAPI         | true    |
| `gov-api-sicro`        | Enable SICRO          | true    |
| `gov-api-exa-fallback` | Enable Exa fallback   | true    |

## Monitoring

### Key Metrics

| Metric                             | Description    | Alert Threshold |
| ---------------------------------- | -------------- | --------------- |
| `gov_api_requests_total`           | Total requests | -               |
| `gov_api_request_duration_seconds` | Latency        | > 5s            |
| `gov_api_errors_total`             | Error count    | > 10/min        |
| `gov_api_circuit_breaker_state`    | CB state       | = open          |

### Grafana Dashboard

Import the government APIs dashboard from:

```
/docs/monitoring/gov-apis-dashboard.json
```

## Related Documentation

- [Integration Guide](./gov-api-integration.md) - Architecture overview
- [Troubleshooting Guide](./gov-api-troubleshooting.md) - Common issues
- [OPS Runbook](./OPS_RUNBOOK.md) - Operational procedures

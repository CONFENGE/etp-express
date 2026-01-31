# Public Prices API Documentation

**Version:** 1.0.0
**Base URL:** `/api/v1/prices`
**Authentication:** API Key (X-API-Key header)
**Issue:** [#1275](https://github.com/YOUR_ORG/etp-express/issues/1275)

## Overview

The Public Prices API provides third-party access to Brazilian government procurement price benchmarks. This monetizable API allows partners and clients to query historical price data, search for specific items, and access category information.

### Key Features

- **Regional Price Benchmarks**: Statistical price data segmented by category, state (UF), and organization size
- **Item Search**: Full-text search across normalized contract items with similarity scoring
- **Category Catalog**: Browse available CATMAT/CATSER categories with benchmark availability
- **API Key Authentication**: Secure access using X-API-Key header
- **Rate Limiting**: Tiered subscription plans with quota enforcement
- **OpenAPI Documentation**: Auto-generated Swagger docs at `/api/docs`

### Legal Basis

- Lei 14.133/2021 Art. 23 (Price Research Requirement)
- IN SEGES/ME nº 65/2021 (Price Benchmark Methodology)

---

## Authentication

All requests require an API Key passed in the `X-API-Key` header:

```http
GET /api/v1/prices/benchmark
X-API-Key: your-api-key-here
```

### Obtaining an API Key

1. Register for an account on the ETP Express platform
2. Navigate to **Settings → API Keys**
3. Generate a new API Key
4. Select your subscription plan (FREE, PRO, or ENTERPRISE)

### Security Notes

- API Keys are encrypted using bcrypt (TD-001 Security Hardening)
- Keys should be stored securely and never committed to version control
- Regenerate keys immediately if compromised

---

## Subscription Plans

| Plan | Quota | Price | Use Case |
|------|-------|-------|----------|
| **FREE** | 100 requests/month | Free | Testing, prototypes |
| **PRO** | 5,000 requests/month | R$ 500/month | Small-medium integrations |
| **ENTERPRISE** | Unlimited | R$ 2,000/month | Large-scale integrations |

### Rate Limiting

- Quota is enforced monthly (rolling 30-day window)
- Exceeded quota returns `429 Too Many Requests`
- Response headers include quota information:
  ```
  X-RateLimit-Limit: 5000
  X-RateLimit-Remaining: 4823
  X-RateLimit-Reset: 2026-02-28T00:00:00Z
  ```

---

## Endpoints

### 1. GET /api/v1/prices/benchmark

Retrieve regional price benchmarks filtered by category, region, and organization size.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `categoryId` | UUID | No | Filter by category UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `categoryCode` | string | No | Filter by category code (alternative to categoryId) | `CATMAT-44122` |
| `uf` | string | No | Brazilian state code (2 letters) or "BR" for national | `SP` |
| `orgaoPorte` | enum | No | Organization size: `SMALL`, `MEDIUM`, `LARGE`, `TODOS` | `MEDIUM` |
| `periodMonths` | integer | No | Period in months (1-60, default: 12) | `12` |
| `page` | integer | No | Page number (default: 1) | `1` |
| `limit` | integer | No | Results per page (max: 100, default: 20) | `20` |

#### Example Request

```bash
curl -X GET 'https://api.etpexpress.com/api/v1/prices/benchmark?categoryCode=CATMAT-44122&uf=SP&orgaoPorte=MEDIUM&limit=10' \
  -H 'X-API-Key: your-api-key-here'
```

#### Example Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "categoryId": "660e8400-e29b-41d4-a716-446655440001",
      "categoryCode": "CATMAT-44122",
      "categoryName": "Microcomputador",
      "uf": "SP",
      "ufName": "São Paulo",
      "orgaoPorte": "MEDIUM",
      "median": 3500.00,
      "average": 3650.00,
      "priceRange": {
        "min": 2800.00,
        "max": 4200.00,
        "p25": 3200.00,
        "p75": 3900.00
      },
      "stdDev": 450.00,
      "sampleSize": 87,
      "confidence": "HIGH",
      "period": {
        "start": "2025-01-25T00:00:00.000Z",
        "end": "2026-01-25T00:00:00.000Z"
      },
      "lastCalculatedAt": "2026-01-25T04:00:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `median` | number | Median price (50th percentile) - most reliable indicator |
| `average` | number | Mean price |
| `priceRange.min` | number | Minimum observed price |
| `priceRange.max` | number | Maximum observed price |
| `priceRange.p25` | number | 25th percentile (Q1) |
| `priceRange.p75` | number | 75th percentile (Q3) |
| `stdDev` | number | Standard deviation |
| `sampleSize` | number | Number of contracts analyzed |
| `confidence` | enum | Confidence level: `HIGH`, `MEDIUM`, `LOW`, `UNRELIABLE` |

#### Confidence Levels

- **HIGH**: 50+ contracts, low variance
- **MEDIUM**: 10-49 contracts
- **LOW**: 5-9 contracts
- **UNRELIABLE**: <5 contracts

---

### 2. GET /api/v1/prices/search

Search for normalized price items across all contracts with text similarity scoring.

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `query` | string | **Yes** | Search query (min 3 characters) | `microcomputador` |
| `category` | string | No | Filter by category code | `CATMAT-44122` |
| `limit` | integer | No | Max results (max: 100, default: 20) | `50` |
| `offset` | integer | No | Pagination offset (default: 0) | `0` |

#### Example Request

```bash
curl -X GET 'https://api.etpexpress.com/api/v1/prices/search?query=microcomputador%20intel&category=CATMAT-44122&limit=50' \
  -H 'X-API-Key: your-api-key-here'
```

#### Example Response

```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "description": "Microcomputador Intel Core i5 8GB RAM 256GB SSD",
      "categoryCode": "CATMAT-44122",
      "categoryName": "Microcomputador",
      "price": 3200.00,
      "unit": "UN",
      "contractDate": "2025-11-15T00:00:00.000Z",
      "uf": "SP",
      "similarity": 0.92
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "description": "Microcomputador AMD Ryzen 5 16GB RAM 512GB SSD Windows 11",
      "categoryCode": "CATMAT-44122",
      "categoryName": "Microcomputador",
      "price": 3800.00,
      "unit": "UN",
      "contractDate": "2025-10-20T00:00:00.000Z",
      "uf": "RJ",
      "similarity": 0.88
    }
  ],
  "total": 234,
  "limit": 20,
  "offset": 0
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `similarity` | number | Relevance score (0-1) based on text similarity |
| `price` | number | Unit price in BRL |
| `unit` | string | Unit of measurement (UN, M, KG, etc.) |
| `contractDate` | string | Contract signature date (ISO 8601) |

**Note:** Search endpoint currently returns empty results (placeholder implementation). Full-text search with similarity scoring will be implemented in a future sub-issue.

---

### 3. GET /api/v1/prices/categories

Retrieve list of available CATMAT/CATSER categories with price benchmark data.

#### Query Parameters

None.

#### Example Request

```bash
curl -X GET 'https://api.etpexpress.com/api/v1/prices/categories' \
  -H 'X-API-Key: your-api-key-here'
```

#### Example Response

```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "code": "CATMAT-44122",
      "name": "Microcomputador",
      "type": "CATMAT",
      "benchmarkCount": 156,
      "active": true
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "code": "CATMAT-45001",
      "name": "Impressora",
      "type": "CATMAT",
      "benchmarkCount": 98,
      "active": true
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "code": "CATSER-17012",
      "name": "Serviços de Limpeza",
      "type": "CATSER",
      "benchmarkCount": 72,
      "active": true
    }
  ],
  "total": 245
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | CATMAT/CATSER category code |
| `type` | enum | Category type: `CATMAT` (materials) or `CATSER` (services) |
| `benchmarkCount` | number | Number of benchmarks available for this category |
| `active` | boolean | Whether category is active for queries |

**Note:** Categories are sorted by type (CATMAT first), then alphabetically by name.

---

## Error Handling

All errors follow a consistent JSON format:

```json
{
  "statusCode": 401,
  "message": "API Key is required",
  "error": "Unauthorized",
  "details": "Please provide a valid API Key in the X-API-Key header"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `400` | Bad Request | Invalid parameters (e.g., missing query, invalid limit) |
| `401` | Unauthorized | API Key missing |
| `403` | Forbidden | Invalid/revoked API Key or inactive account |
| `429` | Too Many Requests | API quota exceeded |
| `500` | Internal Server Error | Server error (logged to Sentry) |

### Error Examples

#### 401 Unauthorized (Missing API Key)

```bash
curl -X GET 'https://api.etpexpress.com/api/v1/prices/benchmark'
```

```json
{
  "statusCode": 401,
  "message": "API Key is required",
  "error": "Unauthorized",
  "details": "Please provide a valid API Key in the X-API-Key header"
}
```

#### 403 Forbidden (Invalid API Key)

```bash
curl -X GET 'https://api.etpexpress.com/api/v1/prices/benchmark' \
  -H 'X-API-Key: invalid-key'
```

```json
{
  "statusCode": 403,
  "message": "Invalid API Key",
  "error": "Forbidden",
  "details": "The provided API Key is not valid or has been revoked"
}
```

#### 429 Too Many Requests (Quota Exceeded)

```json
{
  "statusCode": 429,
  "message": "API quota exceeded. Plan: Pro (5000 requests/month). Upgrade your plan or wait for quota reset at the start of next month.",
  "error": "Too Many Requests"
}
```

---

## Code Examples

### JavaScript (Node.js)

```javascript
const axios = require('axios');

const API_KEY = 'your-api-key-here';
const BASE_URL = 'https://api.etpexpress.com/api/v1/prices';

async function getBenchmark(categoryCode, uf) {
  try {
    const response = await axios.get(`${BASE_URL}/benchmark`, {
      headers: { 'X-API-Key': API_KEY },
      params: { categoryCode, uf, limit: 10 }
    });

    console.log('Benchmarks:', response.data.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
getBenchmark('CATMAT-44122', 'SP');
```

### Python

```python
import requests

API_KEY = 'your-api-key-here'
BASE_URL = 'https://api.etpexpress.com/api/v1/prices'

def get_benchmark(category_code, uf):
    headers = {'X-API-Key': API_KEY}
    params = {'categoryCode': category_code, 'uf': uf, 'limit': 10}

    response = requests.get(f'{BASE_URL}/benchmark', headers=headers, params=params)
    response.raise_for_status()

    data = response.json()
    print(f"Found {data['total']} benchmarks")
    return data['data']

# Usage
benchmarks = get_benchmark('CATMAT-44122', 'SP')
for benchmark in benchmarks:
    print(f"{benchmark['categoryName']}: R$ {benchmark['median']:.2f}")
```

### cURL

```bash
#!/bin/bash

API_KEY="your-api-key-here"
BASE_URL="https://api.etpexpress.com/api/v1/prices"

# Get benchmark
curl -X GET "${BASE_URL}/benchmark?categoryCode=CATMAT-44122&uf=SP&limit=10" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Accept: application/json"

# Search items
curl -X GET "${BASE_URL}/search?query=microcomputador&limit=50" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Accept: application/json"

# Get categories
curl -X GET "${BASE_URL}/categories" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Accept: application/json"
```

---

## Best Practices

### 1. Caching

Cache responses to reduce API calls and stay within quota:

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

async function getCachedBenchmark(categoryCode, uf) {
  const cacheKey = `benchmark:${categoryCode}:${uf}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Fetch from API if not cached
  const data = await getBenchmark(categoryCode, uf);
  cache.set(cacheKey, data);

  return data;
}
```

### 2. Retry Logic

Implement exponential backoff for transient errors:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios.get(url, options);
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limit - wait and retry
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error; // Non-retryable error
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3. Pagination

Handle large result sets efficiently:

```javascript
async function getAllBenchmarks(categoryCode) {
  const allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await getBenchmark({ categoryCode, page, limit: 100 });
    allData.push(...response.data);

    hasMore = page < response.totalPages;
    page++;
  }

  return allData;
}
```

### 4. Error Handling

Always handle API errors gracefully:

```javascript
async function safeFetch(categoryCode, uf) {
  try {
    return await getBenchmark(categoryCode, uf);
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Invalid API Key - check credentials');
    } else if (error.response?.status === 429) {
      console.error('Quota exceeded - upgrade plan or wait');
    } else {
      console.error('Unexpected error:', error.message);
    }
    return null; // Fallback value
  }
}
```

---

## OpenAPI/Swagger Documentation

Interactive API documentation is available at:

- **Development**: `http://localhost:3001/api/docs`
- **Production**: Disabled for security (use this document)

The Swagger UI provides:
- Interactive endpoint testing with "Try it out" buttons
- Request/response schema validation
- Example payloads for all endpoints
- Authentication testing with API Key input

---

## Usage Monitoring

Track your API usage via the dashboard:

1. Navigate to **Settings → API Usage**
2. View metrics:
   - Total requests this month
   - Remaining quota
   - Top endpoints by usage
   - Request history
3. Download usage reports (CSV export)

---

## Support & Contact

- **Documentation**: https://docs.etpexpress.com/public-api
- **Issues**: https://github.com/YOUR_ORG/etp-express/issues
- **Email**: api-support@etpexpress.com
- **Slack**: #public-api-support

---

## Changelog

### v1.0.0 (2026-01-31)

- Initial release of Public Prices API
- Three endpoints: `/benchmark`, `/search`, `/categories`
- API Key authentication with bcrypt encryption
- Rate limiting by subscription plan (FREE/PRO/ENTERPRISE)
- Comprehensive OpenAPI/Swagger documentation
- Implemented as part of issue #1275

---

## Related Documentation

- [Market Intelligence Architecture](../architecture/MARKET_INTELLIGENCE.md)
- [API Security Best Practices](../security/API_SECURITY.md)
- [Price Benchmark Methodology](../methodology/PRICE_BENCHMARKS.md)
- [CATMAT/CATSER Taxonomy](../taxonomy/ITEM_CATEGORIES.md)

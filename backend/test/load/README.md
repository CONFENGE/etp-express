# Load Tests - Public API

## Overview

This directory contains load tests for the Public API endpoints using **autocannon**, validating performance under various load scenarios.

## Tests Included

### Normal Load (100 req/s for 1 minute)
- Tests sustained load at expected normal operation
- Validates P95 latency < 200ms
- Error rate < 0.1%

### Burst Load (500 req/s for 30 seconds)
- Tests system resilience under burst traffic
- Validates degraded but acceptable performance
- P95 latency < 500ms (more lenient)

### Rate Limiting Under Load
- Tests Free plan quota enforcement (100/month)
- Tests Pro plan quota (5000/month)
- Tests Enterprise plan unlimited access

### Endpoint-Specific Tests
- `/prices/categories` - High concurrency test
- `/prices/search` - Complex query performance
- `/prices/benchmark` - Various query complexity

## Running Load Tests

### Prerequisites

```bash
# Install dependencies
npm install --workspace=backend
```

### Run All Load Tests

```bash
cd backend
npm run test -- test/load/public-api.load.spec.ts
```

### Run Specific Test Suite

```bash
# Normal load only
npm run test -- test/load/public-api.load.spec.ts -t "Normal Load"

# Burst load only
npm run test -- test/load/public-api.load.spec.ts -t "Burst Load"

# Rate limiting tests
npm run test -- test/load/public-api.load.spec.ts -t "Rate Limiting"
```

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| P95 Latency (Normal) | < 200ms | autocannon p97.5 |
| P95 Latency (Burst) | < 500ms | autocannon p97.5 |
| Error Rate (Normal) | < 0.1% | non2xx/total |
| Error Rate (Burst) | < 1.0% | non2xx/total |
| Throughput (Normal) | ≥ 90 req/s | Average req/s |
| Throughput (Burst) | ≥ 400 req/s | Average req/s |

## Test Configuration

Tests use autocannon with the following settings:

- **Normal Load**: 10 connections, 60s duration
- **Burst Load**: 50 connections, 30s duration
- **Rate Limiting**: Variable connections, amount-based

## Interpreting Results

### Successful Test
```
P95 Latency: 145ms ✅
Error Rate: 0.05% ✅
Throughput: 102 req/s ✅
```

### Failed Test
```
P95 Latency: 350ms ❌ (exceeds 200ms)
Error Rate: 0.8% ❌ (exceeds 0.1%)
Throughput: 65 req/s ❌ (below 90 req/s)
```

## Troubleshooting

### High Latency
- Check database connection pool
- Verify Redis cache is working
- Review slow query logs

### High Error Rate
- Check application logs for exceptions
- Verify database connection limits
- Check memory/CPU usage

### Low Throughput
- Increase worker processes
- Optimize database queries
- Review rate limiting configuration

## CI/CD Integration

Load tests can be run in CI with environment flag:

```bash
# Run in CI mode (shorter duration)
LOAD_TEST_CI=true npm run test -- test/load/public-api.load.spec.ts
```

## Related Documentation

- [E2E Tests](../e2e/public-api.e2e.spec.ts)
- [API Documentation](../../../docs/API_PUBLIC.md)
- [Business Model](../../../docs/BUSINESS_MODEL_API.md)

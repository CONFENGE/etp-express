# Load Testing CI/CD Integration Guide

**Purpose:** Automated load and performance testing for Public Prices API
**Tool:** Jest + autocannon
**Location:** `/backend/test/load/public-api.load.spec.ts`
**Framework:** GitHub Actions / Railway.app

---

## Quick Start

### Local Testing

```bash
cd backend

# Run all tests including load tests
npm run test:e2e

# Run only load tests
npm run test:e2e -- --testNamePattern="Public API Load Tests"

# Run only E2E tests
npm run test:e2e -- --testNamePattern="Public API E2E Tests"

# Run with coverage
npm run test:cov -- --testPathPattern=public-api
```

### Requirements

- Node.js 18+
- Jest testing framework
- autocannon (already in package.json)
- NestJS application running on port 3000

---

## Test Files Overview

### `/backend/test/load/public-api.load.spec.ts`

**Purpose:** Load testing with autocannon
**Scenarios:**
- Normal load: 100 req/s for 1 minute
- Burst load: 500 req/s for 30 seconds
- Rate limiting under load
- Endpoint-specific performance tests

**Run:**
```bash
npm run test:e2e -- --testPathPattern="load"
```

### `/backend/test/e2e/public-api.e2e.spec.ts`

**Purpose:** End-to-end testing of all subscription plans
**Scenarios:**
- Authentication (401, 403, 200)
- Free plan rate limiting (100 requests/month)
- Pro plan rate limiting (5000 requests/month)
- Enterprise plan (unlimited)
- Endpoint functionality validation

**Run:**
```bash
npm run test:e2e -- --testNamePattern="Public API E2E Tests"
```

---

## GitHub Actions Integration

### Step 1: Create Workflow File

Create `.github/workflows/load-testing.yml`:

```yaml
name: Load Testing - Public Prices API

on:
  pull_request:
    paths:
      - 'backend/src/modules/market-intelligence/**'
      - 'backend/test/load/**'
      - 'backend/test/e2e/public-api.e2e.spec.ts'
  push:
    branches:
      - main
      - develop
    paths:
      - 'backend/src/modules/market-intelligence/**'
  schedule:
    # Run nightly regression tests at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:  # Manual trigger

jobs:
  load-testing:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: etp_express_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Setup test database
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_NAME: etp_express_test
        run: |
          npm run migration:run

      - name: Run E2E Tests
        working-directory: ./backend
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_NAME: etp_express_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          NODE_ENV: test
        run: npm run test:e2e

      - name: Generate Performance Report
        if: always()
        working-directory: ./backend
        run: |
          echo "## Load Testing Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "✅ All load tests completed" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Test Coverage" >> $GITHUB_STEP_SUMMARY
          echo "- Normal Load (100 req/s): PASS" >> $GITHUB_STEP_SUMMARY
          echo "- Burst Load (500 req/s): PASS" >> $GITHUB_STEP_SUMMARY
          echo "- Rate Limiting: PASS" >> $GITHUB_STEP_SUMMARY
          echo "- E2E Tests: PASS" >> $GITHUB_STEP_SUMMARY

      - name: Notify Slack
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "❌ Load tests failed on ${{ github.ref }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "❌ Load Tests Failed\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}\nActor: ${{ github.actor }}"
                  }
                },
                {
                  "type": "actions",
                  "elements": [
                    {
                      "type": "button",
                      "text": {
                        "type": "plain_text",
                        "text": "View Logs"
                      },
                      "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                    }
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Step 2: Add Environment Variables

In GitHub repository settings, add secrets:
- `SLACK_WEBHOOK`: Your Slack webhook URL (optional)

### Step 3: Monitor Workflow

1. Go to **Actions** tab in GitHub
2. Select **Load Testing - Public Prices API** workflow
3. View recent runs and logs

---

## Railway.app Integration

### Step 1: Create Railway Configuration

Create `railway.toml`:

```toml
[build]
builder = "nixpacks"
buildCommand = "cd backend && npm ci && npm run build"

[deploy]
startCommand = "cd backend && npm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 30

[env]
NODE_ENV = "production"
DATABASE_URL = "${{ DATABASE_URL }}"
REDIS_URL = "${{ REDIS_URL }}"
```

### Step 2: Pre-deployment Testing

Add to your deploy workflow (`.railway/deploy.yml`):

```bash
#!/bin/bash
set -e

echo "Starting pre-deployment load testing..."

# Start the application
cd backend
npm run start:dev &
APP_PID=$!

# Wait for app to start
sleep 5

# Run load tests
echo "Running load tests..."
npm run test:e2e -- --testNamePattern="Normal Load"

TEST_RESULT=$?

# Kill the app
kill $APP_PID

if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ Load tests passed - proceeding with deployment"
  exit 0
else
  echo "❌ Load tests failed - aborting deployment"
  exit 1
fi
```

---

## Performance Regression Detection

### Baseline Collection

Store baseline metrics in JSON:

```json
{
  "date": "2026-01-31",
  "results": {
    "normalLoad": {
      "p95Latency": 185,
      "p99Latency": 420,
      "throughput": 98,
      "errorRate": 0.05
    },
    "burstLoad": {
      "p95Latency": 380,
      "p99Latency": 850,
      "throughput": 480,
      "errorRate": 0.3
    }
  }
}
```

### Regression Alert

```javascript
// In test teardown
const baseline = require('./baseline.json');
const currentResults = resultsFromTest;

const regressions = {
  p95Latency: currentResults.p95Latency / baseline.normalLoad.p95Latency,
  errorRate: currentResults.errorRate / baseline.normalLoad.errorRate
};

if (regressions.p95Latency > 1.2) {
  console.warn(`⚠️ P95 latency regressed by ${((regressions.p95Latency - 1) * 100).toFixed(1)}%`);
  // Fail or warn based on threshold
}

if (regressions.errorRate > 1.5) {
  console.error(`❌ Error rate regressed by ${((regressions.errorRate - 1) * 100).toFixed(1)}%`);
  process.exit(1);
}
```

---

## Troubleshooting

### Issue: "Cannot find module 'autocannon'"

**Solution:**
```bash
cd backend
npm install autocannon --save-dev
npm ci
```

### Issue: Tests timeout

**Cause:** Database not ready or app takes too long to start

**Solution:**
```bash
# Increase Jest timeout
jest.setTimeout(180000);  // 3 minutes

# Or in jest.config.js
module.exports = {
  testTimeout: 180000,
  ...
}
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill process on port 3000
lsof -i :3000 | grep -v COMMAND | awk '{print $2}' | xargs kill -9

# Or use different port
const PORT = process.env.TEST_PORT || 3001;
```

### Issue: Database connection refused

**Solution:**
```bash
# Check postgres is running
docker ps | grep postgres

# Or start postgres
docker run -d \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=etp_express_test \
  -p 5432:5432 \
  postgres:15-alpine
```

---

## Performance Tuning for Tests

### Parallel Execution

```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',      // Use 50% of CPU cores
  testTimeout: 180000,
  bail: false,            // Continue after first failure
  ...
}
```

### Memory Management

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run test:e2e
```

### Database Optimization for Tests

```sql
-- Disable unnecessary indexes during testing
ALTER TABLE benchmarks DISABLE TRIGGER ALL;

-- Run tests

-- Re-enable triggers
ALTER TABLE benchmarks ENABLE TRIGGER ALL;
```

---

## Monitoring Test Results

### Prometheus Metrics Export

```javascript
// In test teardown
const prometheus = require('prom-client');

const latencyHistogram = new prometheus.Histogram({
  name: 'api_load_test_latency_seconds',
  help: 'API latency during load tests',
  buckets: [0.05, 0.1, 0.2, 0.5, 1.0]
});

latencyHistogram.observe(p95Latency / 1000);  // Convert ms to seconds
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Load Testing - Public Prices API",
    "panels": [
      {
        "title": "P95 Latency Trend",
        "targets": [
          {
            "expr": "api_load_test_latency_seconds{quantile=\"0.95\"}"
          }
        ]
      },
      {
        "title": "Throughput",
        "targets": [
          {
            "expr": "rate(api_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(api_errors_total[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## Best Practices

### 1. Isolated Test Environment

- Use separate database for tests (etp_express_test)
- Clear data between test runs
- Mock external APIs (gov-api, SINAPI)

### 2. Realistic Load Patterns

- Vary request types (simple, complex, bulk)
- Simulate multiple users with different plans
- Include think time between requests

### 3. Resource Cleanup

```javascript
afterAll(async () => {
  // Clean up test users
  await userRepository.delete({ email: Like('%@test.example.com') });

  // Clean up API usage logs
  await apiUsageRepository.delete({ createdAt: LessThan(testStartTime) });

  // Close database connection
  await app.close();
});
```

### 4. Logging & Debugging

```bash
# Enable verbose logging
DEBUG=etp-express:* npm run test:e2e

# Generate performance profile
node --prof ./node_modules/.bin/jest --testNamePattern="Normal Load"
node --prof-process isolate-*.log > analysis.txt
```

---

## Maintenance Checklist

- [ ] Weekly: Verify tests pass in CI
- [ ] Monthly: Review performance trends
- [ ] Quarterly: Update test data and scenarios
- [ ] Annually: Full capacity test (2-3x expected load)
- [ ] After deployment: Monitor in production for 24 hours

---

## Related Documentation

- [Performance Report](./PERFORMANCE_REPORT_LOAD_TESTING.md)
- [Public API Documentation](./public-api/PUBLIC_PRICES_API.md)
- [Business Model](./BUSINESS_MODEL_API.md)

---

**Last Updated:** 2026-01-31
**Maintained By:** QA Team

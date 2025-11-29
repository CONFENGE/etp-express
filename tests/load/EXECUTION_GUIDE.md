# Progressive Load Test - Execution Guide

**Issue:** #89 - Execute progressive load tests for 100+ concurrent users
**Purpose:** Identify system breaking point and capacity limits
**Duration:** ~40 minutes total

---

## Prerequisites

### 1. Install k6

Choose your platform:

**Windows (Chocolatey):**

```powershell
choco install k6
```

**macOS (Homebrew):**

```bash
brew install k6
```

**Linux (Debian/Ubuntu):**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Verify installation:**

```bash
k6 version
```

### 2. Start Backend Server

```bash
cd backend
npm install  # If first time
npm run start:dev
```

**Verify backend is running:**

```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### 3. Create Test User

If you don't have a test user yet:

```bash
# Option 1: Via API (requires existing admin user)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@1234",
    "name": "Test User"
  }'

# Option 2: Via database (PostgreSQL)
psql -d etp_express -c "
INSERT INTO users (email, password, name, created_at, updated_at)
VALUES (
  'testuser@example.com',
  '<bcrypt_hashed_password>',
  'Test User',
  NOW(),
  NOW()
);
"
```

**Verify user exists:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test@1234"
  }'
# Should return: {"access_token":"eyJ..."}
```

---

## Execution

### Automated Execution (Recommended)

**Linux/macOS (Bash):**

```bash
# Make script executable
chmod +x tests/load/run-progressive-load-test.sh

# Run with default credentials
./tests/load/run-progressive-load-test.sh

# Or with custom credentials
export TEST_EMAIL="another@example.com"
export TEST_PASSWORD="AnotherPassword@123"
./tests/load/run-progressive-load-test.sh
```

**Windows (PowerShell):**

```powershell
# Run with default credentials
.\tests\load\run-progressive-load-test.ps1

# Or with custom credentials
$env:TEST_EMAIL = "another@example.com"
$env:TEST_PASSWORD = "AnotherPassword@123"
.\tests\load\run-progressive-load-test.ps1
```

### Manual Execution

If you prefer to run tests individually:

#### Step 1: Get Authentication Token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test@1234"}' \
  | jq -r '.access_token')

echo $TOKEN  # Verify token exists
```

#### Step 2: Run Individual Test Scenarios

**Scenario 1: Baseline (10 VUs × 5 min)**

```bash
# Auth test
K6_ACCESS_TOKEN="$TOKEN" k6 run --vus 10 --duration 5m \
  --out json=tests/load/results/auth_baseline.json \
  tests/load/auth-login.js

# ETP create test
K6_ACCESS_TOKEN="$TOKEN" k6 run --vus 10 --duration 5m \
  --out json=tests/load/results/etp_baseline.json \
  tests/load/etp-create.js
```

**Scenario 2: Medium Load (50 VUs × 10 min)**

```bash
K6_ACCESS_TOKEN="$TOKEN" k6 run --vus 50 --duration 10m \
  --out json=tests/load/results/auth_medium.json \
  tests/load/auth-login.js

K6_ACCESS_TOKEN="$TOKEN" k6 run --vus 50 --duration 10m \
  --out json=tests/load/results/etp_medium.json \
  tests/load/etp-create.js
```

**Scenario 3: High Load (100 VUs × 15 min)**

```bash
K6_ACCESS_TOKEN="$TOKEN" k6 run --vus 100 --duration 15m \
  --out json=tests/load/results/auth_high.json \
  tests/load/auth-login.js

K6_ACCESS_TOKEN="$TOKEN" k6 run --vus 100 --duration 15m \
  --out json=tests/load/results/etp_high.json \
  tests/load/etp-create.js
```

**Scenario 4: Peak Stress (200 VUs × 10 min)**

```bash
K6_ACCESS_TOKEN="$TOKEN" k6 run --vus 200 --duration 10m \
  --out json=tests/load/results/auth_peak.json \
  tests/load/auth-login.js

K6_ACCESS_TOKEN="$TOKEN" k6 run --vus 200 --duration 10m \
  --out json=tests/load/results/etp_peak.json \
  tests/load/etp-create.js
```

---

## Analyzing Results

### Automated Report

If you used the automated scripts, a markdown report is generated:

```bash
# View report
cat tests/load/results/progressive_load_test_<timestamp>.md

# Or open in browser/markdown viewer
code tests/load/results/progressive_load_test_<timestamp>.md
```

### Manual Analysis

Extract key metrics from JSON outputs:

```bash
# p95 latency
jq '.metrics.http_req_duration.values.p95' tests/load/results/auth_baseline.json | tail -n 1

# p99 latency
jq '.metrics.http_req_duration.values.p99' tests/load/results/auth_baseline.json | tail -n 1

# Error rate
jq '.metrics.http_req_failed.values.rate' tests/load/results/auth_baseline.json | tail -n 1

# Total requests
jq '.metrics.http_reqs.values.count' tests/load/results/auth_baseline.json | tail -n 1
```

### Key Metrics to Review

| Metric          | Threshold                     | What It Means                 |
| --------------- | ----------------------------- | ----------------------------- |
| **p95 latency** | < 500ms (auth), < 1.5s (CRUD) | 95% of requests faster than   |
| **p99 latency** | < 1s (auth), < 3s (CRUD)      | 99% of requests faster than   |
| **Error rate**  | < 5%                          | Percentage of failed requests |
| **Throughput**  | -                             | Requests per second           |

### Identifying Breaking Point

The breaking point is where:

- Error rate exceeds 5%
- p95 latency exceeds thresholds by 2x
- System becomes unresponsive
- Database connections saturate

**Example:**

- 10 VUs: Error rate 0.1%, p95 300ms ✅
- 50 VUs: Error rate 1.2%, p95 450ms ✅
- 100 VUs: Error rate 3.8%, p95 800ms ⚠️
- 200 VUs: Error rate 12%, p95 2.5s ❌ **← Breaking point**

**Conclusion:** System can handle ~150 VUs before degradation.

---

## Filling Out Results Template

1. Copy template:

   ```bash
   cp tests/load/RESULTS_TEMPLATE.md tests/load/results/results_$(date +%Y%m%d).md
   ```

2. Fill in each section:
   - **Executive Summary:** High-level findings
   - **Test Scenarios:** Detailed metrics for each scenario
   - **Bottlenecks:** Identified performance issues
   - **Capacity Analysis:** Breaking point and recommendations
   - **Database Performance:** Connection pool, query analysis
   - **External APIs:** OpenAI/Perplexity performance
   - **Recommendations:** Prioritized action items

3. Include raw outputs:
   - Attach JSON files to report
   - Reference specific metrics
   - Include screenshots if helpful

---

## Troubleshooting

### Backend Not Responding

```bash
# Check if backend is running
curl http://localhost:3000/api/health

# Restart backend
cd backend
npm run start:dev
```

### Authentication Failures

```bash
# Verify user exists
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test@1234"}'

# Check environment variables
echo $TEST_EMAIL
echo $TEST_PASSWORD
```

### k6 Not Found

```bash
# Verify k6 is installed
which k6  # Linux/macOS
where k6  # Windows

# Install if missing (see Prerequisites)
```

### High Error Rates During Tests

**Common causes:**

1. **Rate limiting:** Backend rate limit is 5 req/min per user
   - **Solution:** Temporarily disable rate limiting or use multiple test users
2. **Database connections:** Connection pool saturated
   - **Solution:** Increase pool size in backend config
3. **OpenAI rate limits:** LLM API quota exceeded
   - **Solution:** Use lower VUs for section-generate tests

### Out of Memory

```bash
# Reduce VUs or duration
k6 run --vus 50 --duration 5m tests/load/auth-login.js  # Instead of 200 VUs

# Or split tests into smaller chunks
```

---

## Best Practices

### Before Running Tests

1. ✅ Backend is in stable state (no active development)
2. ✅ Database has recent backup
3. ✅ Sufficient disk space for outputs (>500 MB)
4. ✅ No other heavy processes running
5. ✅ Rate limiting disabled or configured for testing

### During Tests

1. 📊 Monitor system resources (CPU, RAM, DB connections)
2. 📝 Take notes on observed behavior
3. 🚨 Be ready to stop tests if system crashes
4. 💰 Monitor OpenAI costs (section-generate tests)

### After Tests

1. ✅ Review all metrics against thresholds
2. ✅ Fill out results template completely
3. ✅ Identify top 3-5 bottlenecks
4. ✅ Create follow-up issues (#90, #91)
5. ✅ Commit results to repository

---

## Cost Considerations

### OpenAI API Costs

**section-generate.js** makes real OpenAI API calls:

- Cost: ~$0.01-0.05 per request
- 10 VUs × 5 min ≈ 50-100 requests ≈ $0.50-$5
- 200 VUs × 10 min ≈ 2,000 requests ≈ $20-$100

**Recommendation:**

- Skip section-generate tests if cost is a concern
- Use `--vus 1 --duration 1m` for validation only
- Monitor OpenAI dashboard during tests

### Infrastructure Costs

Running load tests may increase:

- Railway database CPU usage (free tier limits)
- Railway bandwidth usage
- PostgreSQL storage (if logging verbose)

**Recommendation:**

- Run on local environment first
- Use staging before production
- Monitor Railway metrics dashboard

---

## Next Steps

After completing progressive load tests:

1. **Issue #90:** Analyze bottlenecks
   - Deep-dive profiling
   - CPU/memory analysis
   - Database query optimization

2. **Issue #91:** Implement optimizations
   - Fix identified bottlenecks
   - Re-run load tests to validate
   - Document performance improvements

3. **Documentation:**
   - Update ARCHITECTURE.md with capacity limits
   - Add performance recommendations to README
   - Document known limitations

---

## Reference

- **Issue #89:** Execute progressive load tests
- **Issue #88:** k6 setup and initial scripts
- **Issue #90:** Bottleneck analysis and profiling
- **Issue #91:** Performance optimization implementation

**Related Documentation:**

- [k6 Documentation](https://k6.io/docs/)
- [Load Testing Best Practices](https://k6.io/docs/testing-guides/test-types/)
- [ARCHITECTURE.md](../../ARCHITECTURE.md)
- [tests/load/README.md](./README.md)

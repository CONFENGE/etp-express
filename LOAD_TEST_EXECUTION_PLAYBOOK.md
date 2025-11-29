# 🧪 Load Test Execution Playbook - ETP Express

**Purpose:** Step-by-step guide for executing progressive load tests and analyzing results
**Related Issues:** #88 (setup), #89 (automation), #90 (analysis)
**Target Audience:** DevOps, QA Engineers, Backend Developers

---

## 📋 Prerequisites Checklist

Before executing load tests, ensure all prerequisites are met:

### Environment Setup

- [ ] **Backend running:** `cd backend && npm run start:dev`
  - Verify at: http://localhost:3000/api/health
  - Expected response: `{"status":"ok","database":"connected"}`

- [ ] **Database accessible:** PostgreSQL running (local or Railway)
  - Check connection: `psql $DATABASE_URL -c "SELECT 1"`

- [ ] **API Keys configured:**
  - `OPENAI_API_KEY` set in `.env` or environment
  - `PERPLEXITY_API_KEY` set (optional but recommended)
  - Verify: Keys should NOT be empty strings

- [ ] **Test user created:**
  - Email: `testuser@example.com`
  - Password: `Test@1234`
  - Create via: `POST /api/auth/register` or SQL insert

- [ ] **k6 installed:**
  - Verify: `k6 version` → Should show v1.x.x
  - Install if missing: See `tests/load/README.md`

### Cost Awareness

- [ ] **OpenAI budget confirmed:**
  - Each section generation: ~$0.01-0.05 (GPT-4 Turbo)
  - 100 VUs × 15 min × 1 section/min ≈ 1500 generations ≈ **$15-75**
  - Check current usage: https://platform.openai.com/usage

- [ ] **Rate limits understood:**
  - OpenAI Standard Tier: ~500 RPM (requests per minute)
  - Perplexity: ~60 RPM
  - Circuit breakers will open if exceeded (expected behavior)

### Monitoring Setup (Optional but Recommended)

- [ ] **Metrics collection enabled:**
  - Backend logs to file: `backend/logs/app.log`
  - PostgreSQL slow query log enabled (if self-hosted)

- [ ] **Baseline metrics captured:**
  - Run smoke test first: `k6 run tests/load/auth-login.js`
  - Document baseline latency

---

## 🚀 Execution Steps

### Step 1: Environment Verification (5 min)

```bash
# Navigate to project root
cd "C:\Users\tj_sa\OneDrive\CONFENGE\Vision\Git Projects\ETP Express"

# Verify backend is running
curl http://localhost:3000/api/health

# Verify test user exists
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test@1234"}'

# Expected: { "access_token": "eyJhbGc..." }
```

If user doesn't exist:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"Test@1234",
    "name":"Test User",
    "orgao":"Load Testing"
  }'
```

### Step 2: Run Progressive Load Tests (40 min)

**Option A: Automated Script (Recommended)**

```powershell
# Windows (PowerShell)
cd tests\load
.\run-progressive-load-test.ps1
```

```bash
# Linux/macOS (Bash)
cd tests/load
chmod +x run-progressive-load-test.sh
./run-progressive-load-test.sh
```

The script will:

1. Authenticate test user
2. Run 4 progressive scenarios (10 → 50 → 100 → 200 VUs)
3. Generate markdown report in `tests/load/results/`
4. Save JSON metrics for each scenario

**Option B: Manual Execution**

If automated script fails, run manually:

```bash
cd tests/load

# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test@1234"}' \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# Scenario 1: Baseline (10 VUs, 5 min)
K6_ACCESS_TOKEN="$TOKEN" k6 run \
  --vus 10 \
  --duration 5m \
  --out json=results/baseline_$(date +%Y%m%d_%H%M%S).json \
  tests/load/section-generate.js

# Scenario 2: Normal Load (50 VUs, 10 min)
K6_ACCESS_TOKEN="$TOKEN" k6 run \
  --vus 50 \
  --duration 10m \
  --out json=results/normal_$(date +%Y%m%d_%H%M%S).json \
  tests/load/section-generate.js

# Scenario 3: Stress (100 VUs, 15 min)
K6_ACCESS_TOKEN="$TOKEN" k6 run \
  --vus 100 \
  --duration 15m \
  --out json=results/stress_$(date +%Y%m%d_%H%M%S).json \
  tests/load/section-generate.js

# Scenario 4: Breaking Point (200 VUs, 10 min)
K6_ACCESS_TOKEN="$TOKEN" k6 run \
  --vus 200 \
  --duration 10m \
  --out json=results/breaking_$(date +%Y%m%d_%H%M%S).json \
  tests/load/section-generate.js
```

### Step 3: Monitor During Execution

**Real-time Monitoring:**

```bash
# Terminal 1: Watch backend logs
tail -f backend/logs/app.log | grep -E "(ERROR|WARN|circuit)"

# Terminal 2: Watch PostgreSQL connections (if local)
watch -n 5 'psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"'

# Terminal 3: Monitor OpenAI rate limits
# Check OpenAI dashboard: https://platform.openai.com/usage
```

**Expected Behaviors:**

- ✅ **10 VUs:** Smooth, no errors
- ✅ **50 VUs:** Some OpenAI queuing (latency increases to 70-90s)
- ⚠️ **100 VUs:** Circuit breakers may open (Perplexity first)
- ⚠️ **200 VUs:** High error rate (50%+), circuit breakers open, system degraded

**Red Flags to Watch:**

- 🚨 **OOM (Out of Memory):** Backend crashes
- 🚨 **Database connection errors:** Pool exhausted
- 🚨 **100% error rate:** Complete system failure

If any red flag occurs, **STOP THE TEST IMMEDIATELY** and investigate.

---

## 📊 Results Analysis

### Step 4: Review Auto-Generated Report

Location: `tests/load/results/progressive_load_test_YYYYMMDD_HHMMSS.md`

The report includes:

- Executive summary
- Metrics per scenario (latency, throughput, error rate)
- Bottleneck identification
- Capacity analysis
- Recommendations

**Key Metrics to Extract:**

| Metric                   | Baseline (10 VUs) | Normal (50 VUs) | Stress (100 VUs) | Breaking (200 VUs) |
| ------------------------ | ----------------- | --------------- | ---------------- | ------------------ |
| **Latency p50**          | \_\_\_ s          | \_\_\_ s        | \_\_\_ s         | \_\_\_ s           |
| **Latency p95**          | \_\_\_ s          | \_\_\_ s        | \_\_\_ s         | \_\_\_ s           |
| **Latency p99**          | \_\_\_ s          | \_\_\_ s        | \_\_\_ s         | \_\_\_ s           |
| **Error Rate**           | \_\_\_%           | \_\_\_%         | \_\_\_%          | \_\_\_%            |
| **Throughput (req/s)**   | \_\_\_            | \_\_\_          | \_\_\_           | \_\_\_             |
| **OpenAI 429 Errors**    | \_\_\_            | \_\_\_          | \_\_\_           | \_\_\_             |
| **Perplexity Timeouts**  | \_\_\_            | \_\_\_          | \_\_\_           | \_\_\_             |
| **DB Connection Errors** | \_\_\_            | \_\_\_          | \_\_\_           | \_\_\_             |

### Step 5: Deep Dive with JSON Metrics

Parse JSON outputs for detailed analysis:

```bash
# Extract latencies
jq '.metrics.http_req_duration | {p50, p95, p99}' results/stress_*.json

# Count errors by status code
jq '.root_group.checks[] | select(.passes == 0)' results/stress_*.json | wc -l

# Extract custom metrics (LLM calls, circuit breaker events)
jq '.metrics | with_entries(select(.key | startswith("llm_")))' results/stress_*.json
```

### Step 6: Compare Against Thresholds (SLAs)

Reference: `tests/load/README.md` - Thresholds section

**Endpoint: `POST /sections/etp/:id/generate`**

| SLA         | Threshold | Baseline | Normal   | Stress   | Status |
| ----------- | --------- | -------- | -------- | -------- | ------ |
| p95 latency | < 60s     | \_\_\_ s | \_\_\_ s | \_\_\_ s | ✅/❌  |
| p99 latency | < 120s    | \_\_\_ s | \_\_\_ s | \_\_\_ s | ✅/❌  |
| Error rate  | < 10%     | \_\_\_%  | \_\_\_%  | \_\_\_%  | ✅/❌  |

**Endpoint: `POST /auth/login`**

| SLA         | Threshold | Baseline  | Normal    | Stress    | Status |
| ----------- | --------- | --------- | --------- | --------- | ------ |
| p95 latency | < 500ms   | \_\_\_ ms | \_\_\_ ms | \_\_\_ ms | ✅/❌  |
| Error rate  | < 5%      | \_\_\_%   | \_\_\_%   | \_\_\_%   | ✅/❌  |

---

## 🔍 Profiling Deep Dive

If bottlenecks are unclear from load tests, use profiling tools:

### Option 1: Node.js Built-in Profiler

```bash
# Start backend with inspector
cd backend
node --inspect dist/main.js

# In Chrome: chrome://inspect
# Click "inspect" on the Node process
# Go to "Profiler" tab
# Record CPU profile during load test
```

**What to look for:**

- Hot functions (high self-time)
- Synchronous blocking (long stack depths)
- Event loop blocking

### Option 2: clinic.js (Recommended)

```bash
# Install
npm install -g clinic

# CPU profiling
cd backend
clinic flame -- node dist/main.js

# Run load test in another terminal
k6 run --vus 50 --duration 2m tests/load/section-generate.js

# Stop backend (Ctrl+C)
# clinic.js will generate HTML report
```

**Outputs:**

- `clinic.flamegraph.html` - CPU flame graph
- Identify slow functions visually

### Option 3: PostgreSQL Query Analysis

```sql
-- Enable pg_stat_statements extension (if not enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset stats before test
SELECT pg_stat_statements_reset();

-- Run load test

-- View slow queries
SELECT
  query,
  calls,
  mean_exec_time AS avg_ms,
  max_exec_time AS max_ms,
  (total_exec_time / 1000 / 60) AS total_minutes
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**What to look for:**

- Queries with `mean_exec_time > 100ms`
- High `calls` count (N+1 problem)
- Sequential scans on large tables

---

## 📈 Reporting Results

### Template for GitHub Issue Comment

```markdown
## Load Test Results - YYYY-MM-DD

### Environment

- Backend: Railway/Local
- Database: PostgreSQL (Railway/Local)
- k6 version: v1.x.x
- Test duration: 40 minutes
- Total cost: ~$XX (OpenAI usage)

### Summary

| Scenario | VUs | Duration | p95 Latency | Error Rate | Status   |
| -------- | --- | -------- | ----------- | ---------- | -------- |
| Baseline | 10  | 5 min    | XX s        | X%         | ✅/⚠️/❌ |
| Normal   | 50  | 10 min   | XX s        | X%         | ✅/⚠️/❌ |
| Stress   | 100 | 15 min   | XX s        | X%         | ✅/⚠️/❌ |
| Breaking | 200 | 10 min   | XX s        | X%         | ✅/⚠️/❌ |

### Key Findings

**Bottlenecks Identified:**

1. [Bottleneck 1] - Impact: X%, Location: file.ts:line
2. [Bottleneck 2] - Impact: X%, Location: file.ts:line

**Circuit Breaker Events:**

- OpenAI: Opened at X VUs, closed after Xs
- Perplexity: Opened at X VUs, remained open

**Capacity Limits:**

- Maximum sustainable VUs: ~XX
- Breaking point: ~XX VUs (XX% error rate)

**Cost Analysis:**

- Total OpenAI calls: XXXX
- Cached responses: XX%
- Total cost: $XX

### Recommendations

1. [Recommendation 1] - Priority: P0/P1/P2
2. [Recommendation 2] - Priority: P0/P1/P2

### Artifacts

- Full report: `tests/load/results/progressive_load_test_YYYYMMDD_HHMMSS.md`
- JSON metrics: `tests/load/results/*.json`
- Profiling data: `clinic.*.html` (if generated)
```

---

## 🛠️ Troubleshooting Guide

### Problem: k6 Authentication Fails

**Error:** `401 Unauthorized` in test output

**Solution:**

```bash
# Verify credentials
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@example.com","password":"Test@1234"}'

# If fails, recreate user:
# 1. Delete existing: DELETE /users/me (need admin access)
# 2. Register new: POST /auth/register
```

### Problem: OpenAI Rate Limit Errors (429)

**Error:** `rate_limit` in logs, circuit breaker opens

**Expected Behavior:** This is NORMAL at high VUs (100+)

**Actions:**

- ✅ Verify circuit breaker closes after cooldown (30s)
- ✅ Check OpenAI dashboard for usage
- ✅ Consider upgrading OpenAI tier if needed

**Not a Bug:** System is behaving correctly with graceful degradation

### Problem: Database Connection Errors

**Error:** `Connection pool exhausted`, `ECONNREFUSED`

**Solution:**

```typescript
// backend/src/app.module.ts
// Increase connection pool size
TypeOrmModule.forRoot({
  // ... existing config
  extra: {
    max: 50, // Increase from default 10
  },
});
```

Restart backend after change.

### Problem: Backend Crashes (OOM)

**Error:** `JavaScript heap out of memory`

**Solution:**

```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm run start:dev
```

**Investigate:**

- Check for memory leaks with clinic.js
- Review large object allocations

### Problem: Perplexity Always Returns Fallback

**Symptom:** All requests have `isFallback: true`

**Possible Causes:**

1. API key not configured: Check `.env` for `PERPLEXITY_API_KEY`
2. API quota exceeded: Check Perplexity dashboard
3. Network issues: Verify `curl https://api.perplexity.ai`

**Action:**

```bash
# Test Perplexity directly
curl -X POST https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"pplx-7b-online","messages":[{"role":"user","content":"test"}]}'
```

---

## 🔄 Iteration Workflow

### After Implementing Optimizations (Issue #91)

1. **Re-run baseline test:**

   ```bash
   k6 run --vus 10 --duration 5m tests/load/section-generate.js \
     --out json=results/baseline_v2_$(date +%Y%m%d).json
   ```

2. **Compare metrics:**

   ```bash
   # Extract p95 latency from both versions
   jq '.metrics.http_req_duration.values.p95' results/baseline_v1.json
   jq '.metrics.http_req_duration.values.p95' results/baseline_v2.json
   ```

3. **Calculate improvement:**
   - Latency reduction: `(v1_p95 - v2_p95) / v1_p95 * 100%`
   - Example: `(60s - 40s) / 60s = 33% improvement`

4. **Document in PR:**
   - Include before/after metrics
   - Link to JSON artifacts
   - Update `PERFORMANCE_BOTTLENECK_ANALYSIS.md` with actuals

---

## 📚 Reference Links

- **Load Test README:** `tests/load/README.md`
- **Execution Guide:** `tests/load/EXECUTION_GUIDE.md`
- **Results Template:** `tests/load/RESULTS_TEMPLATE.md`
- **Bottleneck Analysis:** `PERFORMANCE_BOTTLENECK_ANALYSIS.md`
- **Architecture:** `ARCHITECTURE.md`

---

## ✅ Checklist for Complete Load Test

- [ ] Environment verified (backend running, test user exists)
- [ ] Progressive tests executed (all 4 scenarios)
- [ ] Results report generated
- [ ] Bottlenecks identified and prioritized
- [ ] Profiling data collected (clinic.js or Node inspector)
- [ ] Database query analysis completed
- [ ] Findings documented in GitHub issue
- [ ] Recommendations created for Issue #91
- [ ] Costs tracked and documented
- [ ] Results archived in `tests/load/results/`

---

**Next Step:** Execute tests and fill `RESULTS_TEMPLATE.md` with actual metrics. Feed results into Issue #91 for optimization implementation.

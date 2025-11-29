#!/bin/bash

# ============================================================================
# ETP Express - Progressive Load Testing Script
# Issue #89: Execute load tests with progressive ramp-up
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESULTS_DIR="tests/load/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$RESULTS_DIR/progressive_load_test_$TIMESTAMP.md"

# Create results directory
mkdir -p "$RESULTS_DIR"

echo -e "${BLUE}============================================================================${NC}"
echo -e "${BLUE}ETP Express - Progressive Load Testing${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo "Please install k6:"
    echo "  - Windows: choco install k6"
    echo "  - macOS: brew install k6"
    echo "  - Linux: See https://k6.io/docs/get-started/installation/"
    exit 1
fi

echo -e "${GREEN}✅ k6 found: $(k6 version | head -n 1)${NC}"
echo ""

# Check if backend is running
echo -e "${YELLOW}⏳ Checking if backend is running...${NC}"
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is not running on http://localhost:3000${NC}"
    echo "Please start the backend with: cd backend && npm run start:dev"
    exit 1
fi

echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

# Get authentication token
echo -e "${YELLOW}⏳ Authenticating test user...${NC}"
TEST_EMAIL="${TEST_EMAIL:-testuser@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Test@1234}"

TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Failed to authenticate. Response: $TOKEN_RESPONSE${NC}"
    echo "Please ensure test user exists or update TEST_EMAIL and TEST_PASSWORD"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Initialize report
cat > "$REPORT_FILE" << EOF
# Progressive Load Test Report

**Timestamp:** $(date +"%Y-%m-%d %H:%M:%S")
**Environment:** \`${K6_ENV:-local}\`
**Base URL:** \`${BASE_URL:-http://localhost:3000}\`

## Test Configuration

| Parameter | Value |
|-----------|-------|
| Test User | $TEST_EMAIL |
| k6 Version | $(k6 version | head -n 1) |
| Test Date | $(date +"%Y-%m-%d %H:%M:%S") |

---

## Test Results

EOF

# Function to run test and append results
run_test() {
    local TEST_NAME=$1
    local VUS=$2
    local DURATION=$3
    local DESCRIPTION=$4

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test $TEST_NAME: $DESCRIPTION${NC}"
    echo -e "${BLUE}VUs: $VUS | Duration: $DURATION${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Append to report
    cat >> "$REPORT_FILE" << EOF
### Test $TEST_NAME: $DESCRIPTION

**Configuration:**
- Virtual Users: $VUS
- Duration: $DURATION

EOF

    # Run auth test
    echo -e "${YELLOW}⏳ Running auth-login test...${NC}"
    AUTH_OUTPUT_FILE="$RESULTS_DIR/auth_${TEST_NAME}_$TIMESTAMP.json"

    if K6_ACCESS_TOKEN="$ACCESS_TOKEN" \
       k6 run --vus "$VUS" --duration "$DURATION" \
       --out "json=$AUTH_OUTPUT_FILE" \
       tests/load/auth-login.js; then
        echo -e "${GREEN}✅ Auth test passed${NC}"

        # Extract key metrics
        AUTH_P95=$(jq -r '[.metrics.http_req_duration.values.p95] | .[0]' "$AUTH_OUTPUT_FILE" | tail -n 1)
        AUTH_P99=$(jq -r '[.metrics.http_req_duration.values.p99] | .[0]' "$AUTH_OUTPUT_FILE" | tail -n 1)
        AUTH_ERROR_RATE=$(jq -r '[.metrics.http_req_failed.values.rate] | .[0]' "$AUTH_OUTPUT_FILE" | tail -n 1)
        AUTH_REQUESTS=$(jq -r '[.metrics.http_reqs.values.count] | .[0]' "$AUTH_OUTPUT_FILE" | tail -n 1)

        cat >> "$REPORT_FILE" << EOF
**Auth Login Results:**
- Total Requests: $(printf "%.0f" "$AUTH_REQUESTS")
- p95 Latency: $(printf "%.2f" "$AUTH_P95")ms
- p99 Latency: $(printf "%.2f" "$AUTH_P99")ms
- Error Rate: $(printf "%.2f" "$AUTH_ERROR_RATE")%

EOF
    else
        echo -e "${RED}❌ Auth test failed${NC}"
        cat >> "$REPORT_FILE" << EOF
**Auth Login Results:**
- ❌ Test failed

EOF
    fi

    echo ""

    # Run ETP create test
    echo -e "${YELLOW}⏳ Running etp-create test...${NC}"
    ETP_OUTPUT_FILE="$RESULTS_DIR/etp_${TEST_NAME}_$TIMESTAMP.json"

    if K6_ACCESS_TOKEN="$ACCESS_TOKEN" \
       k6 run --vus "$VUS" --duration "$DURATION" \
       --out "json=$ETP_OUTPUT_FILE" \
       tests/load/etp-create.js; then
        echo -e "${GREEN}✅ ETP create test passed${NC}"

        # Extract key metrics
        ETP_P95=$(jq -r '[.metrics.http_req_duration.values.p95] | .[0]' "$ETP_OUTPUT_FILE" | tail -n 1)
        ETP_P99=$(jq -r '[.metrics.http_req_duration.values.p99] | .[0]' "$ETP_OUTPUT_FILE" | tail -n 1)
        ETP_ERROR_RATE=$(jq -r '[.metrics.http_req_failed.values.rate] | .[0]' "$ETP_OUTPUT_FILE" | tail -n 1)
        ETP_REQUESTS=$(jq -r '[.metrics.http_reqs.values.count] | .[0]' "$ETP_OUTPUT_FILE" | tail -n 1)

        cat >> "$REPORT_FILE" << EOF
**ETP Create Results:**
- Total Requests: $(printf "%.0f" "$ETP_REQUESTS")
- p95 Latency: $(printf "%.2f" "$ETP_P95")ms
- p99 Latency: $(printf "%.2f" "$ETP_P99")ms
- Error Rate: $(printf "%.2f" "$ETP_ERROR_RATE")%

EOF
    else
        echo -e "${RED}❌ ETP create test failed${NC}"
        cat >> "$REPORT_FILE" << EOF
**ETP Create Results:**
- ❌ Test failed

EOF
    fi

    echo ""
    echo -e "${GREEN}✅ Test $TEST_NAME completed${NC}"
    echo ""
}

# ============================================================================
# Execute Progressive Load Tests (Issue #89 Requirements)
# ============================================================================

# Test 1: Baseline (10 VUs x 5min)
run_test "1_Baseline" "10" "5m" "Baseline load with 10 concurrent users"

# Test 2: Medium Load (50 VUs x 10min)
run_test "2_Medium" "50" "10m" "Medium load with 50 concurrent users"

# Test 3: High Load (100 VUs x 15min)
run_test "3_High" "100" "15m" "High load with 100 concurrent users"

# Test 4: Peak Load (200 VUs x 10min)
run_test "4_Peak" "200" "10m" "Peak stress test with 200 concurrent users"

# ============================================================================
# Finalize Report
# ============================================================================

cat >> "$REPORT_FILE" << EOF

---

## Summary

This progressive load test executed 4 scenarios with increasing concurrency to identify the system's breaking point.

### Key Findings

**System Capacity:**
- Baseline (10 VUs): ✅ Expected to pass
- Medium (50 VUs): ⚠️ Monitor for degradation
- High (100 VUs): ⚠️ Stress test - identify limits
- Peak (200 VUs): 🔴 Expected to show degradation

**Recommendations:**
1. Review metrics where error rate > 5%
2. Investigate p95 latency > thresholds
3. Monitor database connection pool usage
4. Check OpenAI API rate limits
5. Consider implementing queue for LLM operations

### Resource Usage

Review the following metrics in individual test outputs:
- CPU usage during peak load
- Memory consumption patterns
- Database connection pool saturation
- LLM API rate limiting

### Next Steps

1. Analyze detailed metrics in \`$RESULTS_DIR/\`
2. Identify bottlenecks (Issue #90)
3. Implement performance optimizations (Issue #91)

---

**Report generated:** $(date +"%Y-%m-%d %H:%M:%S")
**Output files:** \`$RESULTS_DIR/*_$TIMESTAMP.json\`
EOF

echo -e "${BLUE}============================================================================${NC}"
echo -e "${GREEN}✅ Progressive load test completed successfully${NC}"
echo -e "${BLUE}============================================================================${NC}"
echo ""
echo -e "📊 Report saved to: ${GREEN}$REPORT_FILE${NC}"
echo -e "📁 Raw outputs: ${GREEN}$RESULTS_DIR/*_$TIMESTAMP.json${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review the report: cat $REPORT_FILE"
echo "  2. Analyze bottlenecks: Issue #90"
echo "  3. Implement optimizations: Issue #91"
echo ""

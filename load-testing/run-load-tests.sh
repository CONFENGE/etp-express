#!/bin/bash

# Load Testing Suite Runner
# Executes all load test scenarios and generates consolidated report

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-loadtest@etp-express.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-LoadTest123!}"
RESULTS_DIR="./results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== ETP Express Load Testing Suite ===${NC}"
echo "Base URL: $BASE_URL"
echo "Timestamp: $TIMESTAMP"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to run a scenario
run_scenario() {
  local scenario_file=$1
  local scenario_name=$2

  echo -e "${YELLOW}Running: $scenario_name${NC}"

  k6 run \
    --env BASE_URL="$BASE_URL" \
    --env TEST_USER_EMAIL="$TEST_USER_EMAIL" \
    --env TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
    --summary-export="$RESULTS_DIR/${scenario_name}_${TIMESTAMP}.json" \
    "$scenario_file"

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $scenario_name completed successfully${NC}"
  else
    echo -e "${RED}✗ $scenario_name failed${NC}"
    exit 1
  fi

  echo ""
  sleep 5 # Cool-down between scenarios
}

# Run all scenarios
run_scenario "scenarios/etp-creation.load.js" "etp-creation"
run_scenario "scenarios/section-approval-concurrent.load.js" "section-approval"
run_scenario "scenarios/gov-api-search.load.js" "gov-api-search"

# Generate consolidated report
echo -e "${GREEN}=== Load Test Results ===${NC}"
echo "Results saved to: $RESULTS_DIR"
echo ""

# Extract key metrics from JSON results
for result_file in "$RESULTS_DIR"/*_${TIMESTAMP}.json; do
  if [ -f "$result_file" ]; then
    scenario_name=$(basename "$result_file" "_${TIMESTAMP}.json")
    echo -e "${YELLOW}$scenario_name:${NC}"

    # Use jq to extract metrics if available
    if command -v jq &> /dev/null; then
      echo "  P95 Latency: $(jq -r '.metrics.http_req_duration.values["p(95)"]' "$result_file") ms"
      echo "  Error Rate: $(jq -r '.metrics.errors.values.rate' "$result_file")"
      echo "  Requests: $(jq -r '.metrics.http_reqs.values.count' "$result_file")"
    else
      echo "  (Install jq to see detailed metrics)"
    fi

    echo ""
  fi
done

echo -e "${GREEN}Load testing suite completed successfully!${NC}"
echo "View detailed results in: $RESULTS_DIR"

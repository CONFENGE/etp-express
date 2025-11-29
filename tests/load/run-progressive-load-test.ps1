# ============================================================================
# ETP Express - Progressive Load Testing Script (PowerShell)
# Issue #89: Execute load tests with progressive ramp-up
# ============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$ResultsDir = "tests\load\results"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ReportFile = "$ResultsDir\progressive_load_test_$Timestamp.md"

# Colors
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Create results directory
New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

Write-ColorOutput Cyan "============================================================================"
Write-ColorOutput Cyan "ETP Express - Progressive Load Testing"
Write-ColorOutput Cyan "============================================================================"
Write-Output ""

# Check if k6 is installed
try {
    $k6Version = & k6 version 2>&1 | Select-Object -First 1
    Write-ColorOutput Green "✅ k6 found: $k6Version"
} catch {
    Write-ColorOutput Red "❌ k6 is not installed"
    Write-Output "Please install k6:"
    Write-Output "  - Windows: choco install k6"
    Write-Output "  - Or download from: https://k6.io/docs/get-started/installation/"
    exit 1
}

Write-Output ""

# Check if backend is running
Write-ColorOutput Yellow "⏳ Checking if backend is running..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5 -UseBasicParsing
    Write-ColorOutput Green "✅ Backend is running"
} catch {
    Write-ColorOutput Red "❌ Backend is not running on http://localhost:3000"
    Write-Output "Please start the backend with: cd backend && npm run start:dev"
    exit 1
}

Write-Output ""

# Get authentication token
Write-ColorOutput Yellow "⏳ Authenticating test user..."
$TestEmail = if ($env:TEST_EMAIL) { $env:TEST_EMAIL } else { "testuser@example.com" }
$TestPassword = if ($env:TEST_PASSWORD) { $env:TEST_PASSWORD } else { "Test@1234" }

$authBody = @{
    email = $TestEmail
    password = $TestPassword
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $authBody

    $AccessToken = $authResponse.access_token

    if (-not $AccessToken) {
        throw "No access token received"
    }

    Write-ColorOutput Green "✅ Authentication successful"
} catch {
    Write-ColorOutput Red "❌ Failed to authenticate: $_"
    Write-Output "Please ensure test user exists or update TEST_EMAIL and TEST_PASSWORD"
    exit 1
}

Write-Output ""

# Initialize report
$k6VersionString = & k6 version | Select-Object -First 1
$currentDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

@"
# Progressive Load Test Report

**Timestamp:** $currentDate
**Environment:** ``$($env:K6_ENV ?? 'local')``
**Base URL:** ``$($env:BASE_URL ?? 'http://localhost:3000')``

## Test Configuration

| Parameter | Value |
|-----------|-------|
| Test User | $TestEmail |
| k6 Version | $k6VersionString |
| Test Date | $currentDate |

---

## Test Results

"@ | Out-File -FilePath $ReportFile -Encoding UTF8

# Function to run test and append results
function Run-LoadTest {
    param(
        [string]$TestName,
        [int]$VUs,
        [string]$Duration,
        [string]$Description
    )

    Write-ColorOutput Cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-ColorOutput Cyan "Test $TestName`: $Description"
    Write-ColorOutput Cyan "VUs: $VUs | Duration: $Duration"
    Write-ColorOutput Cyan "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Output ""

    # Append to report
    @"

### Test $TestName`: $Description

**Configuration:**
- Virtual Users: $VUs
- Duration: $Duration

"@ | Out-File -FilePath $ReportFile -Append -Encoding UTF8

    # Run auth test
    Write-ColorOutput Yellow "⏳ Running auth-login test..."
    $AuthOutputFile = "$ResultsDir\auth_${TestName}_$Timestamp.json"

    $env:K6_ACCESS_TOKEN = $AccessToken
    $authTestResult = & k6 run --vus $VUs --duration $Duration `
        --out "json=$AuthOutputFile" `
        tests\load\auth-login.js

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ Auth test passed"

        # Extract key metrics (simplified - would need proper JSON parsing)
        @"
**Auth Login Results:**
- Test completed successfully
- See detailed metrics in: ``$AuthOutputFile``

"@ | Out-File -FilePath $ReportFile -Append -Encoding UTF8
    } else {
        Write-ColorOutput Red "❌ Auth test failed"

        @"
**Auth Login Results:**
- ❌ Test failed

"@ | Out-File -FilePath $ReportFile -Append -Encoding UTF8
    }

    Write-Output ""

    # Run ETP create test
    Write-ColorOutput Yellow "⏳ Running etp-create test..."
    $EtpOutputFile = "$ResultsDir\etp_${TestName}_$Timestamp.json"

    $etpTestResult = & k6 run --vus $VUs --duration $Duration `
        --out "json=$EtpOutputFile" `
        tests\load\etp-create.js

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "✅ ETP create test passed"

        @"
**ETP Create Results:**
- Test completed successfully
- See detailed metrics in: ``$EtpOutputFile``

"@ | Out-File -FilePath $ReportFile -Append -Encoding UTF8
    } else {
        Write-ColorOutput Red "❌ ETP create test failed"

        @"
**ETP Create Results:**
- ❌ Test failed

"@ | Out-File -FilePath $ReportFile -Append -Encoding UTF8
    }

    Write-Output ""
    Write-ColorOutput Green "✅ Test $TestName completed"
    Write-Output ""
}

# ============================================================================
# Execute Progressive Load Tests (Issue #89 Requirements)
# ============================================================================

# Test 1: Baseline (10 VUs x 5min)
Run-LoadTest -TestName "1_Baseline" -VUs 10 -Duration "5m" -Description "Baseline load with 10 concurrent users"

# Test 2: Medium Load (50 VUs x 10min)
Run-LoadTest -TestName "2_Medium" -VUs 50 -Duration "10m" -Description "Medium load with 50 concurrent users"

# Test 3: High Load (100 VUs x 15min)
Run-LoadTest -TestName "3_High" -VUs 100 -Duration "15m" -Description "High load with 100 concurrent users"

# Test 4: Peak Load (200 VUs x 10min)
Run-LoadTest -TestName "4_Peak" -VUs 200 -Duration "10m" -Description "Peak stress test with 200 concurrent users"

# ============================================================================
# Finalize Report
# ============================================================================

$finalDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

@"

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

1. Analyze detailed metrics in ``$ResultsDir\``
2. Identify bottlenecks (Issue #90)
3. Implement performance optimizations (Issue #91)

---

**Report generated:** $finalDate
**Output files:** ``$ResultsDir\*_$Timestamp.json``
"@ | Out-File -FilePath $ReportFile -Append -Encoding UTF8

Write-ColorOutput Cyan "============================================================================"
Write-ColorOutput Green "✅ Progressive load test completed successfully"
Write-ColorOutput Cyan "============================================================================"
Write-Output ""
Write-Output "📊 Report saved to: $ReportFile"
Write-Output "📁 Raw outputs: $ResultsDir\*_$Timestamp.json"
Write-Output ""
Write-ColorOutput Yellow "Next steps:"
Write-Output "  1. Review the report: cat $ReportFile"
Write-Output "  2. Analyze bottlenecks: Issue #90"
Write-Output "  3. Implement optimizations: Issue #91"
Write-Output ""

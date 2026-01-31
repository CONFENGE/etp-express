# E2E Tests - ETP Express

End-to-end tests using Playwright for browser automation and testing.

## Quick Start

### Prerequisites

1. **Running Services**
   ```bash
   # Terminal 1 - Backend (port 3001)
   cd backend
   npm run start:dev

   # Terminal 2 - Frontend (port 5173)
   cd frontend
   npm run dev
   ```

2. **Environment Variables**

   Create `.env` in project root with:
   ```env
   # E2E Test Credentials
   E2E_ADMIN_EMAIL=admin@confenge.com.br
   E2E_ADMIN_PASSWORD=Admin@123
   E2E_DEMO_EMAIL=demo@confenge.com.br
   E2E_DEMO_PASSWORD=Demo@123
   E2E_MANAGER_EMAIL=manager@confenge.com.br
   E2E_MANAGER_PASSWORD=Manager@123
   E2E_USER_EMAIL=user@confenge.com.br
   E2E_USER_PASSWORD=User@123
   ```

### Run Tests

```bash
# Run all tests
npx playwright test

# Run specific project
npx playwright test --project=chromium
npx playwright test --project=auth

# Run specific file
npx playwright test e2e/auth/login-flow.spec.ts

# Debug mode
npx playwright test --debug

# UI mode (interactive)
npx playwright test --ui

# Show report
npx playwright show-report
```

## Test Architecture

### Global Setup
- **File**: `e2e/setup/global-setup.ts`
- **Purpose**: Performs single login before all tests, saves auth state
- **Performance**: Saves ~1500ms per test by reusing authentication
- **Output**: `e2e/.auth/user.json` (storage state)

### Test Projects

1. **auth** - Authentication flows (no pre-auth)
   - Login/logout tests
   - Password reset
   - Session management

2. **chromium** - Main test suite (pre-authenticated)
   - Uses storage state from global setup
   - Skips login in each test
   - Covers: dashboard, ETPs, admin, manager, chat, exports

3. **firefox** - Cross-browser validation (pre-authenticated)

4. **webkit** - Safari compatibility (pre-authenticated)

5. **visual** - Visual regression testing
   - Pixel-perfect screenshot comparison
   - Run with: `npx playwright test --project=visual`

### Test Categories

```
e2e/
├── auth/              # Authentication & authorization tests
├── admin/             # Admin panel tests (SYSTEM_ADMIN role)
├── manager/           # Manager dashboard tests (DOMAIN_MANAGER role)
├── etp/               # ETP CRUD and lifecycle tests
├── chat/              # Chatbot widget tests
├── contracts/         # Contracts dashboard tests
├── export/            # PDF/DOCX export tests
├── visual/            # Visual regression tests
├── setup/             # Global setup scripts
└── utils/             # Test utilities and helpers
```

## Configuration

### playwright.config.ts
- **Base URL**: `http://localhost:5173` (local) or `E2E_BASE_URL` (CI)
- **Timeout**: 60s (local), 120s (remote/Railway)
- **Workers**: Auto (local), 1 per shard (CI)
- **Retries**: 0 (local), 2 (CI)

### CI Configuration (.github/workflows/playwright.yml)
- **Sharding**: Tests split across 3 parallel runners
- **Timeout**: 20 minutes total
- **Environment**: Railway Staging (isolated database)
- **Optimizations**:
  - Docs-only PR detection (skips E2E for JSDoc changes)
  - AI tests excluded (run in nightly workflow)
  - Rate limiting disabled on staging

## Troubleshooting

### Error: auth state file not found
```
Error: ENOENT: no such file or directory, open 'e2e/.auth/user.json'
```

**Solution**:
1. Set `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` in `.env`
2. Ensure services are running
3. Run global setup: `npx playwright test --project=setup` (if configured)
   OR just run tests - global setup runs automatically

### Error: Cannot connect to http://localhost:5173
```
Error: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
```

**Solution**: Start frontend dev server:
```bash
cd frontend && npm run dev
```

### Error: Cannot connect to http://localhost:3001
```
Error: Failed to fetch from http://localhost:3001/api/v1/...
```

**Solution**: Start backend dev server:
```bash
cd backend && npm run start:dev
```

### Tests hang or timeout
**Solution**:
- Check if services are responding: `curl http://localhost:5173`
- Check backend health: `curl http://localhost:3001/api/v1/health`
- Increase timeout in test file: `test.setTimeout(120000)`

### Global setup fails
```
[Global Setup] Login failed: Error: ...
```

**Solutions**:
1. Verify credentials in `.env` match seeded users
2. Check backend is running and accessible
3. Check frontend is rendering login page
4. Try manual login at http://localhost:5173/login

## Performance Optimization

### Auth State Caching
Tests reuse authentication state instead of logging in every time:
- **Without caching**: ~1500ms per test for login
- **With caching**: ~0ms (instant authentication)
- **Savings**: 270 seconds (4.5 min) for 180 tests

### Sharding (CI only)
Tests run in parallel across 3 runners:
- **Serial**: ~20 minutes
- **Sharded (3x)**: ~7-8 minutes per shard
- **Savings**: ~60% faster execution

### AI Test Exclusion
AI-powered tests (section generation) run in nightly workflow:
- Slow: 2-5 minutes per test
- Unreliable (depends on external AI API)
- Better suited for scheduled runs

## Best Practices

### Writing Tests
1. **Use storage state** - Don't login in every test
2. **Use page object model** - Create reusable page classes
3. **Wait for conditions** - Use `waitForSelector`, `waitForURL`
4. **Cleanup** - Reset state in `afterEach` hooks
5. **Descriptive names** - Test names should explain what is tested

### Selectors
1. **Prefer semantic selectors**:
   - `getByRole('button', { name: 'Login' })`
   - `getByLabel('Email')`
   - `getByText('Welcome')`

2. **Avoid fragile selectors**:
   - ❌ `.css-123456` (generated classes)
   - ❌ `div > div > button` (structure-dependent)
   - ✅ `button[type="submit"]` (semantic)
   - ✅ `[data-testid="login-btn"]` (test IDs)

### Assertions
```typescript
// ❌ Bad - no error message
expect(page.locator('.error')).toBeVisible();

// ✅ Good - descriptive message
await expect(page.locator('.error'))
  .toBeVisible({ message: 'Error message should be visible after invalid login' });
```

## CI/CD Integration

### Workflows
1. **playwright.yml** - Main E2E workflow (20min)
   - Runs on PR to master
   - Tests against Railway Staging
   - Sharded across 3 runners
   - Skips docs-only changes

2. **playwright-nightly.yml** - Extended tests
   - Runs daily at 2 AM UTC
   - Includes AI tests (section generation)
   - Full browser matrix (Chrome, Firefox, Safari)
   - Visual regression tests

### Environment Variables (CI)
Set in GitHub Actions secrets:
```
E2E_BASE_URL_STAGING      # Railway staging frontend URL
E2E_API_URL_STAGING       # Railway staging backend URL
E2E_ADMIN_EMAIL_STAGING   # Staging admin user
E2E_ADMIN_PASSWORD_STAGING
E2E_DEMO_EMAIL_STAGING
E2E_DEMO_PASSWORD_STAGING
# ... other staging user credentials
```

## Useful Commands

```bash
# List all tests
npx playwright test --list

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=firefox

# Run with video recording
npx playwright test --video=on

# Generate test report
npx playwright test --reporter=html

# Update snapshots (visual tests)
npx playwright test --update-snapshots

# Check Playwright installation
npx playwright --version

# Install/update browsers
npx playwright install
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

## Related Issues

- #1190 - E2E pipeline timeout reduction (target 20min) ✅ **RESOLVED**
- #1137 - Fix failing E2E tests (73 tests identified) 🔧 **IN PROGRESS**
- #1138 - Railway E2E testing configuration
- #1189 - Docs-only PR detection to skip E2E
- #1191 - Railway staging environment for E2E

## Status

- **Total Tests**: 595
- **Passing**: Pending validation (environment setup required)
- **CI Timeout**: 20 minutes ✅
- **Sharding**: 3 parallel runners ✅
- **Performance**: ~1500ms saved per test via auth caching ✅

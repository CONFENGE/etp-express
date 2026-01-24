# Contracts Dashboard E2E Tests (#1663)

## Overview

End-to-end tests for the contracts dashboard, validating all functionality defined in issue #1663 (sub-issue 6/6 of #1288).

## Test Scenarios

### Scenario 1: Initial Visualization
- Validates KPI cards load correctly
- Verifies pie chart is visible
- Checks contracts table appears
- Confirms timeline component renders

### Scenario 2: Contract Filters
- Tests status filter (e.g., "em_execucao")
- Tests fornecedor autocomplete filter
- Tests valor range filters (min/max)
- Tests "Limpar filtros" functionality

### Scenario 3: Pagination
- Tests pagination when >10 contracts exist
- Verifies URL updates with `?page=2`
- Tests "Próxima"/"Anterior" navigation

### Scenario 4: Navigation to Detail
- Tests clicking "Ver" button
- Verifies navigation to `/contratos/:id`
- Checks breadcrumb updates

### Scenario 5: Empty States
- Tests empty state message when no results
- Verifies "Limpar filtros" button in EmptyState

### Scenario 6: Responsive Design
- Mobile: KPI cards stack vertically
- Desktop: KPI cards in grid layout
- Mobile: Table converts to scrollable or cards
- Mobile: Filters collapse into accordion

### Scenario 7: Permissions
- Tests admin can access dashboard
- Verifies KPIs and charts render for authenticated user

## Running the Tests

### Prerequisites

1. **Backend must be running:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend must be running:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Set environment variables** (optional, defaults to localhost):
   ```bash
   # .env.test or terminal
   export E2E_BASE_URL="http://localhost:5173"
   export E2E_API_URL="http://localhost:3000"
   export E2E_ADMIN_EMAIL="admin@confenge.com.br"
   export E2E_ADMIN_PASSWORD="Admin@123"
   ```

### Run Tests

```bash
# Run all contracts dashboard tests
cd e2e
npx playwright test contracts/contracts-dashboard.spec.ts

# Run with UI mode (interactive)
npx playwright test contracts/contracts-dashboard.spec.ts --ui

# Run specific scenario
npx playwright test contracts/contracts-dashboard.spec.ts -g "Initial Visualization"

# Run in headed mode (see browser)
npx playwright test contracts/contracts-dashboard.spec.ts --headed

# Debug mode
npx playwright test contracts/contracts-dashboard.spec.ts --debug
```

### CI/CD Execution

These tests are automatically skipped in CI if `E2E_API_URL` is not set. When running in Railway CI:

```bash
# Railway CI automatically sets:
E2E_BASE_URL="https://your-railway-app.railway.app"
E2E_API_URL="https://your-railway-api.railway.app"
PLAYWRIGHT_WORKERS=4  # Parallel execution
```

## Test Structure

- **Global Setup**: Uses pre-authenticated storage state (from `e2e/setup/global-setup.ts`)
- **No manual login**: Tests reuse auth state (~1500ms saved per test)
- **Parallel execution**: All tests run in parallel by default
- **Responsive testing**: Uses Playwright viewport configuration
- **Screenshots on failure**: Auto-captured in `test-results/`

## Fixtures

No custom fixtures required. Tests use mocked or real backend data depending on environment.

## Expected Behavior

- **Development**: Tests run against `localhost:5173` (Vite) + `localhost:3000` (NestJS)
- **CI/CD**: Tests run against Railway preview/production deployment
- **Skipped**: If E2E_API_URL not set in CI (protects against broken pipelines)

## Troubleshooting

### Error: "Cannot navigate to invalid URL"
- **Cause**: `E2E_BASE_URL` not set or frontend not running
- **Fix**: Start frontend (`npm run dev`) or set `E2E_BASE_URL` explicitly

### Error: "Timeout waiting for dashboard load"
- **Cause**: Backend not running or API returning errors
- **Fix**: Check backend logs, ensure database is accessible

### Error: "Storage state not found"
- **Cause**: Global setup failed to login
- **Fix**: Check `e2e/.auth/user.json` exists, verify admin credentials

## Related Issues

- **Parent**: #1288 - Painel de acompanhamento de contratos
- **Siblings**: #1658 (page structure), #1659 (KPI cards), #1660 (table), #1661 (chart), #1662 (timeline)
- **Milestone**: M15 - Gestão de Contratos

## Coverage

These E2E tests cover:
- ✅ Component rendering
- ✅ User interactions (filters, pagination, navigation)
- ✅ Responsive design (mobile + desktop)
- ✅ Empty states
- ✅ Authentication/authorization
- ✅ Real API integration

Unit tests for individual components are in `frontend/src/components/contracts/*.test.tsx`.

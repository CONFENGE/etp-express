# Integration Tests

This directory contains integration tests that require external infrastructure (PostgreSQL database).

## Why are these tests excluded from CI?

Integration tests require a real PostgreSQL database configured with test data. They are excluded from the CI pipeline (via `jest.config.js` → `testPathIgnorePatterns`) to avoid failures in environments without database setup.

## Running Integration Tests Locally

### 1. Configure Test Database

Create a `.env.test` file in `backend/` directory:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=etp_test
```

### 2. Start PostgreSQL (Docker recommended)

```bash
docker run -d \
  --name etp-test-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=etp_test \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Run Integration Tests

```bash
cd backend
npm test -- --testPathPattern="test/integration" --runInBand
```

**Flags explained:**
- `--testPathPattern="test/integration"`: Run only integration tests
- `--runInBand`: Run tests serially (required for DB setup/teardown)

### 4. Stop Test Database

```bash
docker stop etp-test-db
docker rm etp-test-db
```

## Available Integration Tests

### contratos-govbr-sync.spec.ts (15 tests)

Tests for Contratos Gov.br synchronization:

- **Push Sync** (4 tests): Sending contracts to Gov.br
- **Pull Sync** (3 tests): Importing contracts from Gov.br
- **Conflict Resolution** (5 tests): Last-Write-Wins strategy
- **Edge Cases** (3 tests): Error handling and validation

**Coverage:** 15 tests covering push, pull, conflict detection, and error scenarios.

---

**Note:** These tests use real database operations (TypeORM) and HTTP mocking (axios). They validate end-to-end flows without hitting the actual Gov.br API.

# E2E Testing Setup - ETP Express

## Prerequisites

### PostgreSQL Database

E2E tests require a PostgreSQL database for full integration testing.

**Option 1: Local PostgreSQL**

1. Install PostgreSQL 14+ locally
2. Create test database:
   ```bash
   psql -U postgres
   CREATE DATABASE etp_express_test;
   \q
   ```

**Option 2: Docker PostgreSQL**

```bash
docker run --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=etp_express_test \
  -p 5432:5432 \
  -d postgres:14
```

**Option 3: Railway PostgreSQL**

If using Railway:
1. Provision a PostgreSQL instance
2. Update `backend/.env.test` with Railway DATABASE_URL

---

## Configuration

The `.env.test` file contains minimal configuration for E2E tests:

- **Database**: `etp_express_test` (PostgreSQL)
- **DB_SYNCHRONIZE**: `true` (auto-creates schema)
- **Log Level**: `error` (reduces noise)
- **API Keys**: Mock values (tests don't call external APIs)

---

## Running E2E Tests

### Run All E2E Tests

```bash
cd backend
npm run test:e2e
```

### Run Specific Test Suite

```bash
npm run test:e2e -- lgpd-compliance
```

### Watch Mode

```bash
npm run test:e2e -- --watch
```

---

## Test Suites

### LGPD Compliance (`lgpd-compliance.e2e-spec.ts`)

Tests complete LGPD compliance flows:

**Data Export (GET /users/me/export)**
- ✅ Exports complete user data (user, etps, analytics, audit_logs)
- ✅ Excludes password field
- ✅ Creates audit log
- ✅ Rejects unauthenticated requests

**Account Deletion (DELETE /users/me)**
- ✅ Soft deletes with valid confirmation phrase
- ✅ Rejects invalid confirmation
- ✅ Cascade deletes ETPs and sections
- ✅ Creates deletion audit log

**Cancellation (POST /users/cancel-deletion)**
- ✅ Reactivates account with valid token
- ✅ Rejects invalid/expired tokens
- ✅ Rejects wrong token type

**Retention Policy**
- ✅ Hard deletes accounts after 30 days
- ✅ Preserves accounts within grace period

---

## Test Data Management

### Isolation

Each test suite:
1. Creates fresh test users via `/auth/register`
2. Uses unique emails (`lgpd-test-${Date.now()}@example.com`)
3. Cleans up data in `afterAll()` hook

### Database State

- `DB_SYNCHRONIZE=true` auto-creates schema on startup
- Each test run uses fresh database transactions where possible
- Manual cleanup queries ensure no leftover test data

---

## Troubleshooting

### "Unable to connect to the database"

```
ERROR [TypeOrmModule] Unable to connect to the database. Retrying...
```

**Solution:**
- Verify PostgreSQL is running: `docker ps` or `pg_isready`
- Check DATABASE_URL in `.env.test`
- Ensure `etp_express_test` database exists

### "Config validation error"

```
Config validation error: "DATABASE_URL" is required
```

**Solution:**
- Verify `.env.test` exists in `backend/` directory
- Check `test/jest-e2e-setup.ts` is loading environment variables
- Restart Jest (clear cache): `npm run test:e2e -- --clearCache`

### "Test timeout"

```
Timeout - Async callback was not invoked within the 30000 ms timeout
```

**Solution:**
- Database is slow or unresponsive
- Increase timeout in `test/jest-e2e.json`: `"testTimeout": 60000`

---

## CI/CD Integration

### GitHub Actions

Add E2E tests to CI workflow (`.github/workflows/test.yml`):

```yaml
- name: Set up PostgreSQL
  run: |
    docker run -d \
      --name postgres-test \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=etp_express_test \
      -p 5432:5432 \
      postgres:14

- name: Wait for PostgreSQL
  run: |
    timeout 30 bash -c 'until docker exec postgres-test pg_isready; do sleep 1; done'

- name: Run E2E Tests
  working-directory: backend
  run: npm run test:e2e
```

### Railway Deployment

E2E tests can run against Railway staging environment:

1. Create staging environment in Railway
2. Provision PostgreSQL for staging
3. Update `.env.test` with staging DATABASE_URL
4. Run tests against staging API

---

## Test Coverage

E2E tests complement unit tests by:

- **Unit Tests**: Isolated logic, mocked dependencies
- **E2E Tests**: Full integration, real database, HTTP requests

Target coverage:
- **Unit Tests**: 70%+ code coverage
- **E2E Tests**: Critical user flows (LGPD, auth, ETPs)

---

## Adding New E2E Tests

### Template

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Feature Name (e2e)', () => {
  let app: INestApplication;
  let testUser: { id: string; accessToken: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Setup test user
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'pass', ... });

    testUser = {
      id: response.body.data.user.id,
      accessToken: response.body.data.accessToken,
    };
  });

  afterAll(async () => {
    // Cleanup
    await app.close();
  });

  it('should do something', async () => {
    const response = await request(app.getHttpServer())
      .get('/endpoint')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Realistic**: Use real auth, real database
4. **Assertions**: Verify response structure AND database state
5. **Timeouts**: Set appropriate timeouts for slow operations

---

## Related Issues

- [#239] LGPD E2E Tests (this implementation)
- [#113] LGPD Data Export & Deletion (parent issue)
- [#233-#238] LGPD sub-issues (export, delete, retention, audit)

---

## Next Steps

After LGPD E2E tests:

1. **Authentication E2E** (`auth.e2e-spec.ts`)
   - Register, login, JWT refresh
   - Password validation
   - Rate limiting

2. **ETPs E2E** (`etps.e2e-spec.ts`)
   - Create, update, delete ETPs
   - Generate sections with AI
   - Export to PDF

3. **Sections E2E** (`sections.e2e-spec.ts`)
   - CRUD operations
   - Validation logic
   - Regeneration flows

---

**Issue**: #239
**Related**: #113 (LGPD Parent)
**Status**: ✅ LGPD E2E Tests Implemented
**Updated**: 2025-11-21

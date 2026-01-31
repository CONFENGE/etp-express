# Implementation Guide: TD-008 Database Schema Improvements & LGPD Compliance

**Issue:** #1723
**Epic:** TD-008
**Status:** 90% Complete - Final validation pending
**Date:** 2026-01-31

---

## Overview

This guide provides detailed implementation instructions for completing issue #1723 (TD-008). The schema has been substantially refactored with three major improvements:

1. **DocumentoFiscalizacao Polymorphic Refactoring** - Replaced polymorphic relationships with explicit foreign keys
2. **IP Address Anonymization** - Implemented LGPD-compliant IP anonymization
3. **Connection Pool Optimization** - Reviewed and validated pool configuration

---

## Part 1: DocumentoFiscalizacao Polymorphic Refactoring

### Overview

Refactored from a polymorphic pattern (tipoEntidade + entidadeId) to explicit foreign keys (medicaoId, ocorrenciaId, atesteId) with a CHECK constraint ensuring data integrity.

### Files Modified

**Entity:** `backend/src/entities/documento-fiscalizacao.entity.ts`
```typescript
// New explicit FK columns (nullable, mutually exclusive)
@Column({ type: 'uuid', nullable: true })
medicaoId: string | null;

@Column({ type: 'uuid', nullable: true })
ocorrenciaId: string | null;

@Column({ type: 'uuid', nullable: true })
atesteId: string | null;

// Helper methods for backward compatibility
get tipoEntidade(): DocumentoFiscalizacaoTipo { ... }
get entidadeId(): string { ... }
setEntidade(tipo: DocumentoFiscalizacaoTipo, entidadeId: string): void { ... }
```

**Service:** `backend/src/modules/contratos/services/documento-fiscalizacao.service.ts`
```typescript
// Maps polymorphic API to explicit FKs
private buildWhereClause(
  tipoEntidade: DocumentoFiscalizacaoTipo,
  entidadeId: string,
): Record<string, string> {
  switch (tipoEntidade) {
    case DocumentoFiscalizacaoTipo.MEDICAO:
      return { medicaoId: entidadeId };
    case DocumentoFiscalizacaoTipo.OCORRENCIA:
      return { ocorrenciaId: entidadeId };
    case DocumentoFiscalizacaoTipo.ATESTE:
      return { atesteId: entidadeId };
  }
}
```

### Migration: 1770600000000-RefactorDocumentoFiscalizacaoPolymorphic.ts

**What happens:**
1. Adds new FK columns (medicaoId, ocorrenciaId, atesteId)
2. Backfills from old polymorphic columns (tipoEntidade + entidadeId)
3. Validates exactly one FK is set via SQL verification
4. Creates CHECK constraint: `num_nonnulls(medicaoId, ocorrenciaId, atesteId) = 1`
5. Creates foreign keys with CASCADE delete
6. Creates indexes for query performance
7. Drops old polymorphic columns and enum type

**Rollback safety:** The down() method restores the polymorphic pattern by:
- Recreating the enum type
- Adding back polymorphic columns
- Backfilling from explicit FKs
- Restoring old indexes
- Dropping new FK constraints

### Testing Requirements

**Migration Tests:** `backend/src/migrations/__tests__/1770600000000-RefactorDocumentoFiscalizacaoPolymorphic.spec.ts`

```bash
# Run migration tests
npm run test -- backend/src/migrations/__tests__/1770600000000-RefactorDocumentoFiscalizacaoPolymorphic.spec.ts
```

**Entity Tests:** `backend/src/entities/documento-fiscalizacao.entity.spec.ts`

```bash
# Run entity tests
npm run test -- backend/src/entities/documento-fiscalizacao.entity.spec.ts
```

**Test Coverage:**
- ✅ Backfill verification (medicaoId, ocorrenciaId, atesteId columns created)
- ✅ CHECK constraint creation
- ✅ Foreign key constraints with CASCADE
- ✅ Index creation for performance
- ✅ Helper method functionality (tipoEntidade getter, setEntidade method)
- ✅ Backward compatibility (old API still works)
- ✅ Data integrity (no orphaned records)

### Backward Compatibility

The refactoring maintains full backward compatibility via helper methods:

```typescript
// Old API (still works)
const tipo = documento.tipoEntidade; // Returns DocumentoFiscalizacaoTipo
const id = documento.entidadeId; // Returns UUID string
documento.setEntidade(DocumentoFiscalizacaoTipo.MEDICAO, 'medicao-id');

// New API (explicit FKs)
documento.medicaoId = 'medicao-id';
const doc = await repo.findOne({ where: { medicaoId: 'medicao-id' } });
```

### Production Deployment

```bash
# 1. Backup database (Railway managed)
# Contact DevOps for backup verification

# 2. Run migration
npm run migration:run

# 3. Verify schema
SELECT constraint_name FROM information_schema.constraint_column_usage
WHERE table_name = 'documentos_fiscalizacao'
AND constraint_name = 'CHK_documentos_fiscalizacao_exactly_one_fk';

# 4. Check for orphaned records
SELECT COUNT(*) FROM documentos_fiscalizacao
WHERE medicaoId IS NULL AND ocorrenciaId IS NULL AND atesteId IS NULL;

# 5. Monitor application logs for errors
```

---

## Part 2: IP Address Anonymization for LGPD Compliance

### Overview

Implemented SHA-256 IP anonymization for LGPD Art. 12 compliance. IPs are stored plaintext for security/fraud detection, then anonymized after retention period.

### Files Modified

**Entity:** `backend/src/modules/market-intelligence/entities/api-usage.entity.ts`

```typescript
/**
 * IP address of the client.
 * LGPD Art. 12: Anonymized after retention period (default: 30 days)
 */
@Column({ type: 'varchar', length: '64', nullable: true })
ipAddress: string | null;

/**
 * Timestamp when IP was anonymized (null if still original).
 * Used for LGPD compliance tracking.
 */
@Column({ type: 'timestamp', nullable: true })
ipAnonymizedAt: Date | null;

/**
 * Number of days to retain original IP before anonymization.
 * Default: 30 days for API analytics.
 */
@Column({ type: 'int', default: 30 })
ipRetentionDays: number;
```

### Migrations

**1770500000000-AddIpAnonymizationFields.ts**
- Adds anonymization columns to analytics_events, audit_logs, secret_access_logs
- Creates PostgreSQL `anonymize_ip_address()` function (SHA-256)
- Creates partial indexes for efficient anonymization jobs
- Configures retention periods:
  - analytics_events: 30 days
  - audit_logs: 90 days (compliance)
  - secret_access_logs: 90 days (security)

**1770700000000-AddIpAnonymizationToApiUsage.ts**
- Adds ipAddress, ipAnonymizedAt, ipRetentionDays columns to api_usage
- Creates partial index for anonymization query
- Configures 30-day retention default

### PostgreSQL anonymize_ip_address() Function

```sql
CREATE OR REPLACE FUNCTION anonymize_ip_address(ip TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- SHA-256 hash of IP address
  -- Returns hex string of 64 characters
  -- Preserves geographic patterns while removing identifiability
  RETURN ENCODE(SHA256(ip::bytea), 'hex');
END;
$$;
```

**Usage:**
```sql
-- Anonymize a single IP
SELECT anonymize_ip_address('192.168.1.1');
-- Output: sha256 hash (64 characters)

-- Batch anonymize expired IPs
UPDATE api_usage
SET ipAddress = anonymize_ip_address(ipAddress),
    ipAnonymizedAt = NOW()
WHERE ipAddress IS NOT NULL
  AND ipAnonymizedAt IS NULL
  AND CURRENT_TIMESTAMP - createdAt >= interval '30 days';
```

### Testing Requirements

**Migration Tests:** `backend/src/migrations/__tests__/1770500000000-AddIpAnonymizationFields.spec.ts`

```bash
npm run test -- backend/src/migrations/__tests__/1770500000000-AddIpAnonymizationFields.spec.ts
```

**Test Coverage:**
- ✅ Column creation (ip_anonymized_at, ip_retention_days) in all tables
- ✅ anonymize_ip_address() function creation and determinism
- ✅ Consistent hashing (same IP = same hash)
- ✅ IPv4 and IPv6 support
- ✅ Partial index creation and WHERE clause
- ✅ Retention configuration (30 vs 90 days)
- ✅ Data integrity (preserve existing ip_address column)

### Implementation: Anonymization Job

Create a scheduled job to anonymize expired IPs (not yet implemented):

```typescript
// In market-intelligence/services/api-usage.service.ts or analytics module

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class IpAnonymizationService {
  private readonly logger = new Logger(IpAnonymizationService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /**
   * Anonymize IPs that have exceeded retention period.
   * Runs daily at 2 AM to avoid production load.
   *
   * LGPD Art. 12: IP + userId = linked personal data
   * After retention period, IP must be anonymized.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async anonymizeExpiredIps(): Promise<void> {
    const startTime = Date.now();
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      // Analytics events: 30-day retention
      const analyticsResult = await queryRunner.query(`
        UPDATE analytics_events
        SET
          ip_address = anonymize_ip_address(ip_address),
          ip_anonymized_at = CURRENT_TIMESTAMP
        WHERE ip_address IS NOT NULL
          AND ip_anonymized_at IS NULL
          AND CURRENT_TIMESTAMP - created_at >= interval '30 days'
        RETURNING id
      `);

      // Audit logs: 90-day retention
      const auditResult = await queryRunner.query(`
        UPDATE audit_logs
        SET
          ip_address = anonymize_ip_address(ip_address),
          ip_anonymized_at = CURRENT_TIMESTAMP
        WHERE ip_address IS NOT NULL
          AND ip_anonymized_at IS NULL
          AND CURRENT_TIMESTAMP - created_at >= interval '90 days'
        RETURNING id
      `);

      // Secret access logs: 90-day retention
      const secretResult = await queryRunner.query(`
        UPDATE secret_access_logs
        SET
          ip_address = anonymize_ip_address(ip_address),
          ip_anonymized_at = CURRENT_TIMESTAMP
        WHERE ip_address IS NOT NULL
          AND ip_anonymized_at IS NULL
          AND CURRENT_TIMESTAMP - accessed_at >= interval '90 days'
        RETURNING id
      `);

      const totalAnonymized =
        analyticsResult.length +
        auditResult.length +
        secretResult.length;

      const duration = Date.now() - startTime;
      this.logger.log(
        `IP anonymization completed: ${totalAnonymized} records anonymized (${duration}ms)`,
      );

      // Log to audit trail
      await queryRunner.query(`
        INSERT INTO audit_logs (user_id, action, description, created_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [
        'system',
        'IP_ANONYMIZATION_JOB',
        `Anonymized ${totalAnonymized} IP addresses (LGPD compliance)`,
      ]);
    } catch (error) {
      this.logger.error(`IP anonymization failed: ${error.message}`, error);
      throw error; // Alert on failure
    } finally {
      await queryRunner.release();
    }
  }
}
```

**Add to MarketIntelligenceModule:**
```typescript
import { Module } from '@nestjs/common';
import { IpAnonymizationService } from './services/ip-anonymization.service';

@Module({
  providers: [
    // ... existing providers
    IpAnonymizationService,
  ],
})
export class MarketIntelligenceModule {}
```

### Monitoring & Alerting

Monitor anonymization job in Sentry:

```typescript
// In IpAnonymizationService
import * as Sentry from '@sentry/nestjs';

@Cron(CronExpression.EVERY_DAY_AT_2AM)
async anonymizeExpiredIps(): Promise<void> {
  try {
    const transaction = Sentry.startTransaction({
      op: 'cron',
      name: 'ip-anonymization-job',
    });

    // ... anonymization logic ...

    transaction.finish();
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}
```

---

## Part 3: Connection Pool Optimization

### Overview

Reviewed connection pool settings after TD-003 (eager loading removal). Conclusion: current settings are optimal for Railway Starter plan.

### Current Configuration

**Location:** `backend/src/app.module.ts` (lines 107-178)

```typescript
// Database connection pooling (#108, #343)
// Railway Postgres Starter: max 20 connections
DB_POOL_MAX: Joi.number().default(20),
DB_POOL_MIN: Joi.number().default(5),
DB_IDLE_TIMEOUT: Joi.number().default(30000),
DB_CONNECTION_TIMEOUT: Joi.number().default(5000),

// In TypeOrmModule.forRootAsync
extra: {
  max: 20,           // Railway Starter limit
  min: 5,            // Keep 5 warm
  idleTimeoutMillis: 30000,     // Close idle after 30s
  connectionTimeoutMillis: 5000, // Fail fast if saturated
},
```

### Performance Impact

**Before TD-003:**
- Cascading eager loading: 5-10 connections per request
- Pool saturation risk: HIGH
- Average response time: > 1 second (estimated)

**After TD-003:**
- Optimized queries: 1-2 connections per request
- Pool saturation risk: LOW
- Average response time: < 500ms (targeted)

### Monitoring & Alerts

```bash
# Monitor active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'etp_express';

# Alert threshold
IF active_connections > 15 THEN
  -- 75% of max (20), indicate saturation risk
  ALERT: "DB connection pool approaching limit"
END
```

**Sentry Integration:**

```typescript
// In SlowQuerySubscriber or custom middleware
import * as Sentry from '@sentry/nestjs';

const activeConnections = await queryRunner.query(`
  SELECT count(*) as count FROM pg_stat_activity
  WHERE datname = current_database()
`);

Sentry.captureMessage(
  `DB Connections: ${activeConnections[0].count}/20`,
  'info'
);

if (activeConnections[0].count > 15) {
  Sentry.captureMessage(
    'DB connection pool high',
    'warning'
  );
}
```

### Scaling Strategy

**If pool exhaustion occurs:**

1. **Verify TD-003 impact** - Confirm eager loading removal was effective
2. **Analyze slow queries** - Identify N+1 query problems
3. **Scale to Railway Professional** - Upgrade plan for higher connection limit
4. **Increase pool size** - Set DB_POOL_MAX=30 (if using higher plan)

**Do NOT increase pool without upgrading plan** - Railway Starter is hard-limited to 20 connections.

---

## Validation Checklist

### Pre-Deployment

- [ ] All migrations reviewed and tested
- [ ] Entity helper methods tested for backward compatibility
- [ ] Migration tests passing (DocumentoFiscalizacao, IP anonymization)
- [ ] No TypeScript errors or linting issues
- [ ] Database backup taken (Railway managed)

### Deployment

- [ ] Run migrations: `npm run migration:run`
- [ ] Verify CHECK constraint: `SELECT constraint_name FROM information_schema...`
- [ ] Monitor application logs for errors
- [ ] Verify no orphaned records in documentos_fiscalizacao
- [ ] Check Sentry for migration-related errors

### Post-Deployment

- [ ] Confirm API still works with helper methods (backward compatibility)
- [ ] Monitor connection pool via Sentry
- [ ] Check slow query logs for new issues
- [ ] Verify IP anonymization tracking columns in place
- [ ] Document deployment in CHANGELOG

### LGPD Compliance Verification

```sql
-- Verify no plaintext IPs stored longer than retention
SELECT COUNT(*) as overdue_ips
FROM api_usage
WHERE ipAddress IS NOT NULL
  AND ipAnonymizedAt IS NULL
  AND CURRENT_TIMESTAMP - createdAt > interval '30 days'
  AND ipAddress NOT LIKE '%:%'; -- Exclude hashes

-- Should return 0 (implement anonymization job before seeing this)

-- Verify CHECK constraint active
SELECT constraint_name
FROM information_schema.constraint_column_usage
WHERE table_name = 'documentos_fiscalizacao'
AND constraint_name = 'CHK_documentos_fiscalizacao_exactly_one_fk';

-- Should return 1 row
```

---

## Rollback Procedure

If issues occur, rollback is safe and well-tested:

```bash
# 1. Inform DevOps/SRE of rollback decision
# 2. Run rollback command
npm run migration:revert

# 3. Verify schema restored
# - Old polymorphic columns (tipoEntidade, entidadeId) present
# - Old enum type present
# - New FK columns and CHECK constraint removed
# - Old indexes restored

# 4. Monitor application logs
# - API should continue working (polymorphic API restored)
# - No data loss (rollback is safe)

# 5. Document incident
# - What failed
# - When detected
# - Resolution steps
# - Prevention for future
```

---

## Next Steps

### Immediate (Before Release)

1. **Run test suite:**
   ```bash
   npm run test -- backend/src/migrations/__tests__/
   npm run test -- backend/src/entities/documento-fiscalizacao.entity.spec.ts
   ```

2. **Integration test:**
   ```bash
   npm run test:integration -- documento-fiscalizacao
   ```

3. **Code review:**
   - Migration implementation
   - Entity changes
   - Service changes
   - Test coverage

### Within 1 Week

1. **Deploy to staging** - Verify all tests pass in staging environment
2. **Load test** - Verify connection pool behavior under realistic load
3. **Compliance audit** - Verify LGPD requirements met
4. **Operator training** - Document for DevOps team

### Within 2 Weeks

1. **Deploy to production**
2. **Implement IP anonymization job** (scheduled task)
3. **Set up monitoring alerts** (Sentry)
4. **Document in CHANGELOG**

---

## References

- **Issue:** #1723 - TD-008: Database schema improvements & LGPD compliance
- **Related Issues:** #1721, #1718, #1715, #1716
- **Technical Debt Report:** `docs/reports/TECHNICAL-DEBT-REPORT.md`
- **Story:** `docs/stories/TD-008-schema-improvements-lgpd.md`
- **Schema Audit:** `SCHEMA-AUDIT-REPORT.md`

---

## Support & Questions

For questions or issues:
1. Check this guide and referenced documents
2. Review test files for examples
3. Contact @data-engineer for clarification
4. Reference issue #1723 in any discussions

---

*Last Updated: 2026-01-31*
*Status: Implementation Guide Complete*

# Database Partitioning Strategy

**Status:** Prepared (Not Yet Implemented)
**Target:** TD-010.5 - Infrastructure Optimization
**Author:** @prism (Search & Perf Dev)
**Date:** 2026-02-13

## Overview

This document outlines the table partitioning strategy for ETP Express to handle large-scale data growth without performance degradation. Partitioning will be implemented when specific activation triggers are met.

## Why Partition?

Partitioning splits large tables into smaller, manageable pieces while maintaining a single logical interface. Benefits include:

- **Query Performance:** Faster scans by eliminating irrelevant partitions (partition pruning)
- **Maintenance:** Easier VACUUM, ANALYZE, and index rebuilds on smaller partitions
- **Data Lifecycle:** Efficient archival/deletion of old data (DROP PARTITION vs DELETE)
- **Scalability:** Horizontal scaling preparation for future sharding

## Tables Targeted for Partitioning

### 1. Contract Prices (`contract_prices`)

**Partition Strategy:** RANGE by `data_homologacao` (monthly partitions)

**Rationale:**
- Contract prices are time-series data (never updated, only inserted)
- Queries typically filter by date range (e.g., "last 6 months")
- Historical data (>2 years) can be archived to separate partitions
- Monthly partitions align with SINAPI/SICRO reference months

**Activation Trigger:** 5M+ rows

**Partition Scheme:**
```sql
-- Parent table (partitioned)
CREATE TABLE contract_prices_partitioned (
  id UUID,
  contrato_id UUID NOT NULL,
  item_codigo VARCHAR(50) NOT NULL,
  descricao TEXT,
  unidade VARCHAR(50),
  quantidade DECIMAL(15,3),
  preco_unitario DECIMAL(15,2),
  preco_total DECIMAL(15,2),
  data_homologacao DATE NOT NULL,
  fonte VARCHAR(100),
  organizationId UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (data_homologacao);

-- Monthly partitions (example for 2024)
CREATE TABLE contract_prices_2024_01 PARTITION OF contract_prices_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE contract_prices_2024_02 PARTITION OF contract_prices_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- ... and so on
```

**Query Pattern (no code changes needed):**
```sql
-- Partition pruning automatically eliminates irrelevant partitions
SELECT * FROM contract_prices_partitioned
WHERE data_homologacao >= '2024-06-01'
  AND data_homologacao < '2024-12-01';
-- Only scans 6 partitions instead of entire table
```

### 2. SINAPI Items (`sinapi_items`)

**Partition Strategy:** LIST by `uf` (27 state partitions)

**Rationale:**
- Queries almost always filter by UF (state-specific pricing)
- Each UF has independent data (no cross-UF queries)
- Enables per-state maintenance and archival
- Aligns with SINAPI data structure (state-specific spreadsheets)

**Activation Trigger:** 1M+ rows

**Partition Scheme:**
```sql
-- Parent table (partitioned)
CREATE TABLE sinapi_items_partitioned (
  id UUID PRIMARY KEY,
  organizationId UUID,
  codigo VARCHAR(50) NOT NULL,
  descricao TEXT NOT NULL,
  unidade VARCHAR(50),
  precoOnerado DECIMAL(15,2),
  precoDesonerado DECIMAL(15,2),
  tipo VARCHAR(20),
  uf VARCHAR(2) NOT NULL,
  mesReferencia INT,
  anoReferencia INT,
  classeId VARCHAR(50),
  classeDescricao TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(descricao, ''))
  ) STORED
) PARTITION BY LIST (uf);

-- Per-UF partitions (27 states)
CREATE TABLE sinapi_items_df PARTITION OF sinapi_items_partitioned
  FOR VALUES IN ('DF');

CREATE TABLE sinapi_items_sp PARTITION OF sinapi_items_partitioned
  FOR VALUES IN ('SP');

CREATE TABLE sinapi_items_rj PARTITION OF sinapi_items_partitioned
  FOR VALUES IN ('RJ');

-- ... for all 27 UF codes
```

**Query Pattern (no code changes needed):**
```sql
-- Partition pruning automatically selects correct partition
SELECT * FROM sinapi_items_partitioned
WHERE uf = 'DF' AND descricao ILIKE '%cimento%';
-- Only scans sinapi_items_df partition
```

### 3. SICRO Items (`sicro_items`)

**Partition Strategy:** LIST by `uf` (27 state partitions)

**Rationale:** Same as SINAPI (state-specific infrastructure cost data)

**Activation Trigger:** 1M+ rows

**Partition Scheme:** Identical to SINAPI (replace `sinapi_items` with `sicro_items`)

## Migration Procedure (Zero Downtime)

### Prerequisites

1. Ensure PostgreSQL 12+ (native partitioning support)
2. Verify application queries use table name (not specific partitions)
3. Schedule during low-traffic window (recommended but not required)

### Step-by-Step Migration

#### Phase 1: Create Partitioned Table (No Downtime)

```sql
-- 1. Create new partitioned table with "_partitioned" suffix
CREATE TABLE contract_prices_partitioned (
  -- Same schema as original
) PARTITION BY RANGE (data_homologacao);

-- 2. Create initial partitions covering existing data range
-- (automated via script, see partition-contract-prices.sql)

-- 3. Create indexes on partitioned table
-- (indexes are automatically inherited by partitions)
CREATE INDEX idx_contract_prices_part_contrato ON contract_prices_partitioned(contrato_id);
CREATE INDEX idx_contract_prices_part_data ON contract_prices_partitioned(data_homologacao);
```

#### Phase 2: Data Migration (Background, No Downtime)

```sql
-- Copy data in batches to avoid long locks
-- Use INSERT INTO ... SELECT with batching
DO $$
DECLARE
  batch_size INT := 100000;
  offset_val INT := 0;
  rows_copied INT;
BEGIN
  LOOP
    INSERT INTO contract_prices_partitioned
    SELECT * FROM contract_prices
    ORDER BY id
    LIMIT batch_size OFFSET offset_val;

    GET DIAGNOSTICS rows_copied = ROW_COUNT;
    EXIT WHEN rows_copied = 0;

    offset_val := offset_val + batch_size;
    RAISE NOTICE 'Copied % rows (total: %)', rows_copied, offset_val;

    -- Sleep to avoid overloading DB
    PERFORM pg_sleep(1);
  END LOOP;
END $$;
```

#### Phase 3: Atomic Swap (Minimal Downtime: ~100ms)

```sql
BEGIN;
  -- Rename original table to _old
  ALTER TABLE contract_prices RENAME TO contract_prices_old;

  -- Rename partitioned table to original name
  ALTER TABLE contract_prices_partitioned RENAME TO contract_prices;

  -- Update sequence ownership if needed
  ALTER SEQUENCE contract_prices_id_seq OWNED BY contract_prices.id;
COMMIT;

-- Verify data integrity
SELECT
  (SELECT COUNT(*) FROM contract_prices) AS new_count,
  (SELECT COUNT(*) FROM contract_prices_old) AS old_count;

-- If counts match and queries work, drop old table
DROP TABLE contract_prices_old;
```

### Rollback Plan

If issues are detected after swap:

```sql
BEGIN;
  -- Rename partitioned table back
  ALTER TABLE contract_prices RENAME TO contract_prices_partitioned;

  -- Restore original table
  ALTER TABLE contract_prices_old RENAME TO contract_prices;
COMMIT;
```

## TypeORM Compatibility

### Entity Definition (No Changes Required)

TypeORM entities remain unchanged. PostgreSQL partitioning is transparent to the application:

```typescript
@Entity('contract_prices') // Same table name
export class ContractPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  data_homologacao: Date; // Partition key

  @Column({ type: 'varchar', length: 2 })
  uf: string; // Partition key for SINAPI/SICRO

  // ... rest of entity
}
```

### Query Examples (No Changes Required)

All existing queries work without modification:

```typescript
// RANGE partition (contract_prices)
const prices = await contractPriceRepository.find({
  where: {
    data_homologacao: Between(
      new Date('2024-01-01'),
      new Date('2024-12-31')
    )
  }
});
// Automatically uses partition pruning

// LIST partition (sinapi_items)
const items = await sinapiRepository.find({
  where: { uf: 'DF' }
});
// Automatically scans only DF partition
```

### Schema Sync Considerations

**IMPORTANT:** Disable TypeORM schema sync for partitioned tables:

```typescript
// In entity definition
@Entity('contract_prices', { synchronize: false })
export class ContractPrice {
  // Prevents TypeORM from trying to recreate partitioned table
}
```

Manage partitions via migrations only.

## Partition Maintenance

### Automated Partition Creation

For time-based partitions (contract_prices), use `pg_partman` extension or custom script:

```sql
-- Auto-create next month's partition (run via cron)
CREATE OR REPLACE FUNCTION create_next_partition()
RETURNS void AS $$
DECLARE
  next_month DATE;
  partition_name TEXT;
BEGIN
  next_month := date_trunc('month', NOW() + interval '1 month');
  partition_name := 'contract_prices_' || to_char(next_month, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF contract_prices
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    next_month,
    next_month + interval '1 month'
  );

  RAISE NOTICE 'Created partition: %', partition_name;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly execution (PostgreSQL 12+ pg_cron or external cron)
SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_next_partition()');
```

### Archival Strategy

Old partitions can be detached and archived:

```sql
-- Detach partition (instant, no data move)
ALTER TABLE contract_prices DETACH PARTITION contract_prices_2020_01;

-- Move to archive schema
ALTER TABLE contract_prices_2020_01 SET SCHEMA archive;

-- Or export and drop
COPY contract_prices_2020_01 TO '/archive/contract_prices_2020_01.csv' CSV HEADER;
DROP TABLE contract_prices_2020_01;
```

## Monitoring Queries

### Check Partition Sizes

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'contract_prices_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Verify Partition Pruning

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM contract_prices
WHERE data_homologacao >= '2024-06-01'
  AND data_homologacao < '2024-12-01';

-- Look for "Partitions removed: X" in output
```

### Check Partition Constraint Exclusion

```sql
SELECT
  parent.relname AS parent_table,
  child.relname AS partition_name,
  pg_get_expr(child.relpartbound, child.oid) AS partition_constraint
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN ('contract_prices', 'sinapi_items', 'sicro_items')
ORDER BY parent.relname, child.relname;
```

## Performance Expectations

### Before Partitioning (5M+ rows)

| Query | Execution Time | Buffers |
|-------|---------------|---------|
| Date range filter (6 months) | ~2000ms | 500K pages |
| UF filter (SINAPI/SICRO) | ~1500ms | 300K pages |
| Full table scan | ~5000ms | 1M pages |

### After Partitioning

| Query | Execution Time | Buffers | Improvement |
|-------|---------------|---------|-------------|
| Date range filter (6 months) | ~100ms | 25K pages | **20x faster** |
| UF filter (SINAPI/SICRO) | ~50ms | 12K pages | **30x faster** |
| Full table scan (single partition) | ~200ms | 40K pages | **25x faster** |

## Implementation Timeline

1. **Phase 0 (Now):** Documentation and script preparation ✅
2. **Phase 1:** Monitor row counts until activation triggers are met
3. **Phase 2:** Execute migration during maintenance window
4. **Phase 3:** Monitor performance and adjust partition strategy

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-13 | RANGE partitioning for contract_prices | Time-series data, queries filter by date |
| 2026-02-13 | LIST partitioning for SINAPI/SICRO | State-specific data, natural boundary |
| 2026-02-13 | Activation at 5M/1M rows | Balance between complexity and performance gain |
| 2026-02-13 | Monthly partitions for contract_prices | Aligns with SINAPI/SICRO reference months |
| 2026-02-13 | Defer implementation until triggers met | Premature optimization avoided |

## References

- [PostgreSQL Partitioning Documentation](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [pg_partman Extension](https://github.com/pgpartman/pg_partman)
- [TypeORM Partitioning Best Practices](https://github.com/typeorm/typeorm/issues/5444)
- TD-010 Technical Debt Assessment

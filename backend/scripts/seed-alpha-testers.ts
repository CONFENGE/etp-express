/**
 * Alpha Testers Seed Script
 *
 * Configures users for the Alpha phase of staged rollout.
 * These users will have access to features in Alpha testing.
 *
 * Usage: npm run seed:alpha-testers
 *
 * @see #867 - Staged Rollout: Estrategia Alpha/Beta/GA
 * @see #110 - [EPIC] Staged Rollout Strategy
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import Redis from 'ioredis';
import { User } from '../src/entities/user.entity';
import { Organization } from '../src/entities/organization.entity';
import { Etp } from '../src/entities/etp.entity';
import { EtpSection } from '../src/entities/etp-section.entity';
import { EtpVersion } from '../src/entities/etp-version.entity';
import { AuditLog } from '../src/entities/audit-log.entity';
import { AnalyticsEvent } from '../src/entities/analytics-event.entity';
import { Legislation } from '../src/entities/legislation.entity';
import { SectionTemplate } from '../src/entities/section-template.entity';
import { SecretAccessLog } from '../src/entities/secret-access-log.entity';
import { SimilarContract } from '../src/entities/similar-contract.entity';
import { GovContract } from '../src/entities/gov-contract.entity';
import { PasswordReset } from '../src/entities/password-reset.entity';
import { SicroItem } from '../src/entities/sicro-item.entity';
import { SinapiItem } from '../src/entities/sinapi-item.entity';
import { AuthorizedDomain } from '../src/entities/authorized-domain.entity';

config();

/**
 * Alpha testers configuration
 *
 * Add user emails here to include them in Alpha testing.
 * These users will have early access to new features.
 */
const ALPHA_TESTERS = [
  // Internal team
  'tiago@confenge.com.br',
  'dev@confenge.com.br',
  'qa@confenge.com.br',

  // Power users (add as needed)
  // 'poweruser@example.com',
];

/**
 * Feature flags Redis key prefix
 */
const REDIS_PREFIX = 'ff:';

/**
 * Features to enable for alpha testers
 */
const ALPHA_FEATURES = [
  'staged_rollout_alpha',
  'new_dashboard',
  'ai_suggestions',
  'export_v2',
  'advanced_analytics',
];

async function getDataSource(): Promise<DataSource> {
  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
      User,
      Organization,
      Etp,
      EtpSection,
      EtpVersion,
      AuditLog,
      AnalyticsEvent,
      Legislation,
      SectionTemplate,
      SecretAccessLog,
      SimilarContract,
      GovContract,
      PasswordReset,
      SicroItem,
      SinapiItem,
      AuthorizedDomain,
    ],
    synchronize: false,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });
}

async function getRedis(): Promise<Redis | null> {
  const redisHost = process.env.REDIS_HOST;
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;

  if (!redisHost) {
    console.log('Redis not configured, skipping Redis setup');
    return null;
  }

  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    console.log('Connected to Redis');
    return redis;
  } catch (error) {
    console.warn('Failed to connect to Redis:', error);
    return null;
  }
}

async function seedAlphaTesters(): Promise<void> {
  console.log('\n=== Alpha Testers Seed Script ===\n');
  console.log('Alpha testers to configure:', ALPHA_TESTERS.length);

  const dataSource = await getDataSource();
  await dataSource.initialize();
  console.log('Database connected');

  const redis = await getRedis();

  try {
    const userRepository = dataSource.getRepository(User);

    // Find users by email
    const users = await userRepository.find({
      where: ALPHA_TESTERS.map((email) => ({ email })),
    });

    console.log(`\nFound ${users.length} users in database`);

    if (users.length === 0) {
      console.log('No alpha testers found in database');
      console.log('Create users first with: npm run seed:admin');
      return;
    }

    // Output user IDs for reference
    console.log('\n--- Alpha Testers ---');
    for (const user of users) {
      console.log(`  ${user.email} -> ${user.id}`);
    }

    // Configure feature flags in Redis if available
    if (redis) {
      console.log('\n--- Configuring Feature Flags in Redis ---');

      for (const user of users) {
        for (const feature of ALPHA_FEATURES) {
          const key = `${REDIS_PREFIX}${feature}:user:${user.id}`;
          await redis.set(key, 'true');
          console.log(`  Enabled ${feature} for ${user.email}`);
        }
      }

      console.log('\nFeature flags configured successfully');
    } else {
      console.log('\n--- Alpha Testers User IDs (for manual config) ---');
      console.log('Add these IDs to feature flag configuration:');
      console.log(
        JSON.stringify(
          users.map((u) => u.id),
          null,
          2,
        ),
      );
    }

    console.log('\n=== Alpha Testers Seed Complete ===\n');
  } finally {
    await dataSource.destroy();
    if (redis) {
      await redis.quit();
    }
  }
}

// Run if executed directly
seedAlphaTesters().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

export { ALPHA_TESTERS, ALPHA_FEATURES, seedAlphaTesters };

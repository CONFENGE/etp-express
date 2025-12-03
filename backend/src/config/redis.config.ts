import { registerAs } from '@nestjs/config';

/**
 * Redis Configuration
 *
 * Provides Redis connection settings for BullMQ queues and caching.
 * Railway automatically provides REDIS_URL when Redis service is added.
 *
 * @see https://docs.railway.app/guides/redis
 * @see https://docs.bullmq.io/guide/connections
 */
export default registerAs('redis', () => {
  const redisUrl = process.env.REDIS_URL;

  // Parse REDIS_URL (format: redis://:password@host:port)
  if (redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      db: 0,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false, // Recommended for BullMQ
    };
  }

  // Fallback configuration (local development)
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
});

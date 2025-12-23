import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SemanticCacheService, LLMCacheType } from './semantic-cache.service';

/**
 * Test suite for SemanticCacheService
 *
 * Tests Redis-based caching for LLM responses (OpenAI, Exa)
 * @see Issue #811 - Implementar cache Redis para respostas LLM similares
 */
describe('SemanticCacheService', () => {
  let service: SemanticCacheService;
  let configService: ConfigService;

  // Mock Redis configuration
  const mockRedisConfig = {
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'redis') {
                return mockRedisConfig;
              }
              if (key === 'LLM_CACHE_OPENAI_TTL') {
                return 86400; // 24h
              }
              if (key === 'LLM_CACHE_EXA_TTL') {
                return 604800; // 7 days
              }
              if (key === 'LLM_CACHE_OPENAI_ENABLED') {
                return true;
              }
              if (key === 'LLM_CACHE_EXA_ENABLED') {
                return true;
              }
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SemanticCacheService>(SemanticCacheService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    // Clean up Redis connection
    await service.onModuleDestroy();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct configurations', () => {
      const openaiConfig = service.getConfig('openai');
      const exaConfig = service.getConfig('exa');

      expect(openaiConfig).toBeDefined();
      expect(openaiConfig?.prefix).toBe('llm:openai');
      expect(openaiConfig?.ttlSeconds).toBe(86400);
      expect(openaiConfig?.enabled).toBe(true);

      expect(exaConfig).toBeDefined();
      expect(exaConfig?.prefix).toBe('llm:exa');
      expect(exaConfig?.ttlSeconds).toBe(604800);
      expect(exaConfig?.enabled).toBe(true);
    });
  });

  describe('generateOpenAIKey', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = service.generateOpenAIKey(
        'You are a helpful assistant',
        'Hello world',
        'gpt-4.1-nano',
        0.7,
      );
      const key2 = service.generateOpenAIKey(
        'You are a helpful assistant',
        'Hello world',
        'gpt-4.1-nano',
        0.7,
      );

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = service.generateOpenAIKey(
        'You are a helpful assistant',
        'Hello world',
        'gpt-4.1-nano',
        0.7,
      );
      const key2 = service.generateOpenAIKey(
        'You are a helpful assistant',
        'Goodbye world',
        'gpt-4.1-nano',
        0.7,
      );

      expect(key1).not.toBe(key2);
    });

    it('should include temperature in key', () => {
      const key1 = service.generateOpenAIKey('system', 'user', 'model', 0.5);
      const key2 = service.generateOpenAIKey('system', 'user', 'model', 0.7);

      expect(key1).not.toBe(key2);
    });

    it('should include model in key', () => {
      const key1 = service.generateOpenAIKey(
        'system',
        'user',
        'gpt-4.1-nano',
        0.7,
      );
      const key2 = service.generateOpenAIKey('system', 'user', 'gpt-4o', 0.7);

      expect(key1).not.toBe(key2);
    });
  });

  describe('generateExaKey', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = service.generateExaKey('software contracts', 'auto', 5);
      const key2 = service.generateExaKey('software contracts', 'auto', 5);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different search types', () => {
      const key1 = service.generateExaKey('software contracts', 'auto', 5);
      const key2 = service.generateExaKey('software contracts', 'neural', 5);

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different result counts', () => {
      const key1 = service.generateExaKey('software contracts', 'auto', 5);
      const key2 = service.generateExaKey('software contracts', 'auto', 10);

      expect(key1).not.toBe(key2);
    });
  });

  describe('getStats', () => {
    it('should return stats for openai cache type', () => {
      const stats = service.getStats('openai');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.hitRate).toBe('number');
    });

    it('should return stats for exa cache type', () => {
      const stats = service.getStats('exa');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('hitRate');
    });

    it('should calculate correct hit rate when no requests', () => {
      const stats = service.getStats('openai');
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all cache types', () => {
      const allStats = service.getAllStats();

      expect(allStats).toBeDefined();
      expect(allStats).toHaveProperty('openai');
      expect(allStats).toHaveProperty('exa');
    });
  });

  describe('isAvailable', () => {
    it('should return availability status', () => {
      const available = service.isAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('healthCheck', () => {
    it('should return health status object', async () => {
      const health = await service.healthCheck();

      expect(health).toBeDefined();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('latencyMs');
      expect(health).toHaveProperty('connected');
      expect(['healthy', 'unhealthy']).toContain(health.status);
      expect(typeof health.latencyMs).toBe('number');
      expect(typeof health.connected).toBe('boolean');
    });
  });

  describe('cache operations with unavailable Redis', () => {
    let serviceWithoutRedis: SemanticCacheService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SemanticCacheService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: unknown) => {
                // Return null for redis to simulate no Redis config
                if (key === 'redis') {
                  return null;
                }
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      serviceWithoutRedis =
        module.get<SemanticCacheService>(SemanticCacheService);
    });

    afterEach(async () => {
      await serviceWithoutRedis.onModuleDestroy();
    });

    it('should return null for get when Redis unavailable', async () => {
      const result = await serviceWithoutRedis.get('openai', 'test-key');
      expect(result).toBeNull();
    });

    it('should not throw on set when Redis unavailable', async () => {
      await expect(
        serviceWithoutRedis.set('openai', 'test-key', { test: 'data' }),
      ).resolves.not.toThrow();
    });

    it('should return false for has when Redis unavailable', async () => {
      const result = await serviceWithoutRedis.has('openai', 'test-key');
      expect(result).toBe(false);
    });

    it('should return false for isAvailable when Redis not configured', () => {
      expect(serviceWithoutRedis.isAvailable()).toBe(false);
    });

    it('should return 0 for getKeyCount when Redis unavailable', async () => {
      const count = await serviceWithoutRedis.getKeyCount('openai');
      expect(count).toBe(0);
    });

    it('should return 0 for invalidateType when Redis unavailable', async () => {
      const count = await serviceWithoutRedis.invalidateType('openai');
      expect(count).toBe(0);
    });

    it('should return unhealthy status when Redis unavailable', async () => {
      const health = await serviceWithoutRedis.healthCheck();
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should not throw when destroying', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});

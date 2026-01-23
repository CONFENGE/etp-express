/**
 * PNCP API Integration Tests
 *
 * Tests real integration with Portal Nacional de Contratações Públicas.
 * These tests make actual HTTP calls to the PNCP API.
 *
 * Purpose:
 * - Validate parsing of real API responses
 * - Test error handling with actual timeouts and rate limits
 * - Ensure data contracts remain stable
 *
 * Usage:
 * - Run with: npm run test:integration:gov-api
 * - Not included in normal CI pipeline (use @integration tag)
 * - Failures may indicate API changes or network issues
 *
 * @see https://pncp.gov.br/api/consulta/swagger-ui/index.html
 * @see https://github.com/CONFENGE/etp-express/issues/1073
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PncpService } from '../src/modules/gov-api/pncp/pncp.service';
import { GovApiCache } from '../src/modules/gov-api/utils/gov-api-cache';
import { SearchStatus } from '../src/modules/gov-api/types/search-result';

describe('PNCP API Integration Tests (@integration)', () => {
  let service: PncpService;
  let configService: ConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PncpService,
        {
          provide: GovApiCache,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                GOV_API_RATE_LIMIT_MAX: '10',
                GOV_API_RATE_LIMIT_WINDOW_MS: '60000',
                GOV_API_TIMEOUT_MS: '30000',
                GOV_API_MAX_RETRIES: '3',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PncpService>(PncpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    // Clean up cache connections
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe('PNCP Search Endpoint', () => {
    it('should successfully fetch contratacoes from PNCP', async () => {
      // Arrange
      const query = 'software';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 10,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      expect(response).toBeDefined();
      expect(response.source).toBe('pncp');
      expect(response.status).toBe(SearchStatus.SUCCESS);
      expect(Array.isArray(response.results)).toBe(true);
      expect(response.metadata).toHaveProperty('query', query);
      expect(response.metadata).toHaveProperty('totalResults');

      // Validate response structure
      if (response.results.length > 0) {
        const firstResult = response.results[0];
        expect(firstResult).toHaveProperty('id');
        expect(firstResult).toHaveProperty('title');
        expect(firstResult).toHaveProperty('description');
        expect(firstResult).toHaveProperty('organization');
      }
    }, 60000);

    it('should handle empty results gracefully', async () => {
      // Arrange
      const query = 'xyzabc123nonexistentquery999';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        limit: 10,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      expect(response).toBeDefined();
      expect(response.status).toBe(SearchStatus.SUCCESS);
      expect(response.results).toEqual([]);
      expect(response.metadata.totalResults).toBe(0);
    }, 60000);

    it('should enforce pagination limits correctly', async () => {
      // Arrange
      const query = 'construção';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 5,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      expect(response).toBeDefined();
      expect(response.results.length).toBeLessThanOrEqual(5);
    }, 60000);

    it('should handle API timeout gracefully', async () => {
      // Arrange
      const query = 'test';
      const options = {
        startDate: new Date('2020-01-01'),
        endDate: new Date('2024-12-31'), // Large date range to potentially trigger timeout
        limit: 500,
      };

      // Act & Assert
      // Should either succeed or handle timeout gracefully
      await expect(service.search(query, options)).resolves.toBeDefined();
    }, 90000);
  });

  describe('PNCP Contract Search', () => {
    it('should search contracts by date range', async () => {
      // Arrange
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        page: 1,
        pageSize: 10,
      };

      // Act
      const response = await service.searchContracts(filters);

      // Assert
      expect(response).toBeDefined();
      expect(response.source).toBe('pncp');
      expect(response.status).toBe(SearchStatus.SUCCESS);

      // Validate contract structure if results exist
      if (response.results.length > 0) {
        const contract = response.results[0];
        expect(contract).toHaveProperty('numeroContrato');
        expect(contract).toHaveProperty('valorInicial');
        expect(contract).toHaveProperty('dataAssinatura');
      }
    }, 60000);
  });

  describe('PNCP Health Check', () => {
    it('should report healthy status when API is accessible', async () => {
      // Act
      const health = await service.checkHealth();

      // Assert
      expect(health).toBeDefined();
      expect(['healthy', 'degraded']).toContain(health.status);
      expect(health.source).toBe('pncp');
      expect(health).toHaveProperty('lastChecked');
      expect(health).toHaveProperty('responseTime');

      // Response time should be reasonable
      expect(health.responseTime).toBeLessThan(10000); // 10 seconds max
    }, 60000);
  });

  describe('PNCP Error Handling', () => {
    it('should handle invalid date ranges', async () => {
      // Arrange
      const query = 'test';
      const options = {
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'), // End before start
        limit: 10,
      };

      // Act & Assert
      // Should handle gracefully without throwing unhandled errors
      const response = await service.search(query, options);
      expect(response).toBeDefined();
      // May return error status or empty results
      expect([SearchStatus.SUCCESS, SearchStatus.ERROR]).toContain(
        response.status,
      );
    }, 60000);
  });

  describe('PNCP Response Parsing', () => {
    it('should correctly parse and transform PNCP response to GovApiContract', async () => {
      // Arrange
      const query = 'equipamento';
      const options = {
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        limit: 1,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      if (response.results.length > 0) {
        const contract = response.results[0];

        // Validate required fields exist
        expect(contract.id).toBeTruthy();
        expect(contract.title).toBeTruthy();
        expect(contract.organization).toBeTruthy();

        // Validate data types
        expect(typeof contract.id).toBe('string');
        expect(typeof contract.title).toBe('string');
        expect(typeof contract.organization).toBe('string');

        // Validate date parsing
        if (contract.publicationDate) {
          expect(contract.publicationDate instanceof Date).toBe(true);
          expect(isNaN(contract.publicationDate.getTime())).toBe(false);
        }

        // Validate price parsing
        if (contract.estimatedValue) {
          expect(typeof contract.estimatedValue).toBe('number');
          expect(contract.estimatedValue).toBeGreaterThanOrEqual(0);
        }
      }
    }, 60000);
  });

  describe('PNCP Rate Limiting', () => {
    it('should handle rate limiting gracefully', async () => {
      // Arrange
      const query = 'test';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        limit: 10,
      };

      // Act - Make multiple rapid requests
      const requests = Array.from({ length: 15 }, () =>
        service.search(query, options),
      );

      // Assert - All requests should complete without unhandled errors
      const results = await Promise.allSettled(requests);
      expect(results.length).toBe(15);

      // Some may be rate limited, but shouldn't crash
      const successful = results.filter((r) => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    }, 120000);
  });
});

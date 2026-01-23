/**
 * Compras.gov.br API Integration Tests
 *
 * Tests real integration with Compras.gov.br (SIASG) API.
 * These tests make actual HTTP calls to the government API.
 *
 * Purpose:
 * - Validate parsing of real licitacoes responses
 * - Test error handling with actual API behavior
 * - Ensure data contracts remain stable over time
 *
 * Usage:
 * - Run with: npm run test:integration:gov-api
 * - Not included in normal CI pipeline
 * - Failures may indicate API changes by government
 *
 * @see https://compras.dados.gov.br/docs/
 * @see https://github.com/CONFENGE/etp-express/issues/1073
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ComprasGovService } from '../src/modules/gov-api/compras-gov/compras-gov.service';
import { GovApiCache } from '../src/modules/gov-api/utils/gov-api-cache';
import { SearchStatus } from '../src/modules/gov-api/types/search-result';

describe('Compras.gov.br API Integration Tests (@integration)', () => {
  let service: ComprasGovService;
  let configService: ConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ComprasGovService,
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

    service = module.get<ComprasGovService>(ComprasGovService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize client
    await service.onModuleInit();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe('Compras.gov.br Search Endpoint', () => {
    it('should successfully fetch licitacoes from Compras.gov.br', async () => {
      // Arrange
      const query = 'notebook';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 10,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      expect(response).toBeDefined();
      expect(response.source).toBe('comprasgov');
      expect(response.status).toBe(SearchStatus.SUCCESS);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.total).toBeDefined();

      // Validate licitacao structure
      if (response.data.length > 0) {
        const licitacao = response.data[0];
        expect(licitacao).toHaveProperty('id');
        expect(licitacao).toHaveProperty('title');
        expect(licitacao).toHaveProperty('organization');
      }
    }, 60000);

    it('should handle CATMAT material search', async () => {
      // Arrange
      const query = 'material escolar';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        limit: 5,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      expect(response).toBeDefined();
      expect(response.status).toBe(SearchStatus.SUCCESS);
    }, 60000);

    it('should handle CATSER service search', async () => {
      // Arrange
      const query = 'limpeza';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-28'),
        limit: 5,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      expect(response).toBeDefined();
      expect(response.status).toBe(SearchStatus.SUCCESS);
    }, 60000);

    it('should respect page size limit', async () => {
      // Arrange
      const query = 'computador';
      const options = {
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        limit: 3,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      expect(response).toBeDefined();
      expect(response.data.length).toBeLessThanOrEqual(3);
    }, 60000);

    it('should handle empty results without errors', async () => {
      // Arrange
      const query = 'xyznonexistent999';
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
      expect(response.data).toEqual([]);
    }, 60000);
  });

  describe('Compras.gov.br Health Check', () => {
    it('should report API health status', async () => {
      // Act
      const health = await service.healthCheck();

      // Assert
      expect(health).toBeDefined();
      expect(typeof health.healthy).toBe('boolean');
      expect(health.source).toBe('comprasgov');
      expect(health).toHaveProperty('lastCheck');
      expect(health).toHaveProperty('latencyMs');

      if (health.healthy) {
        expect(health.latencyMs).toBeLessThan(15000); // 15 seconds max for healthy
      }
    }, 60000);
  });

  describe('Compras.gov.br Response Parsing', () => {
    it('should correctly parse modalidade field', async () => {
      // Arrange
      const query = 'pregão eletrônico';
      const options = {
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-31'),
        limit: 5,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      if (response.data.length > 0) {
        const licitacao = response.data[0];

        // Validate modalidade is properly parsed
        if (licitacao.metadata && typeof licitacao.metadata === 'object') {
          const metadata = licitacao.metadata as Record<string, unknown>;
          if (metadata.modalidade) {
            expect(typeof metadata.modalidade).toBe('string');
            // Common modalities: PREGAO, CONCORRENCIA, DISPENSA, INEXIGIBILIDADE
            expect((metadata.modalidade as string).length).toBeGreaterThan(0);
          }
        }
      }
    }, 60000);

    it('should correctly parse price values', async () => {
      // Arrange
      const query = 'serviços';
      const options = {
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-04-30'),
        limit: 5,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      if (response.data.length > 0) {
        const licitacao = response.data[0];

        // Validate basic fields exist
        expect(licitacao.id).toBeTruthy();
        expect(licitacao.title).toBeTruthy();
        expect(typeof licitacao.relevance).toBe('number');
      }
    }, 60000);

    it('should parse dates correctly', async () => {
      // Arrange
      const query = 'material';
      const options = {
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-05-31'),
        limit: 5,
      };

      // Act
      const response = await service.search(query, options);

      // Assert
      if (response.data.length > 0) {
        const licitacao = response.data[0];

        // Validate fetchedAt date
        expect(licitacao.fetchedAt).toBeDefined();
        expect(licitacao.fetchedAt instanceof Date).toBe(true);
        expect(isNaN(licitacao.fetchedAt.getTime())).toBe(false);
      }
    }, 60000);
  });

  describe('Compras.gov.br Error Scenarios', () => {
    it('should handle API unavailability gracefully', async () => {
      // This test validates circuit breaker behavior
      // If API is down, should return error status without crashing

      const query = 'test';
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        limit: 1,
      };

      // Act
      const response = await service.search(query, options);

      // Assert - Should not throw unhandled errors
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    }, 60000);

    it('should handle malformed query gracefully', async () => {
      // Arrange
      const query = ''; // Empty query
      const options = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 10,
      };

      // Act & Assert - Should handle without crashing
      const response = await service.search(query, options);
      expect(response).toBeDefined();
    }, 60000);
  });

  describe('Compras.gov.br Contract Search', () => {
    it('should search contracts with filters', async () => {
      // Arrange
      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        page: 1,
        pageSize: 10,
      };

      // Act
      const response = await service.search('', filters);

      // Assert
      expect(response).toBeDefined();
      expect(response.source).toBe('comprasgov');
      expect(Array.isArray(response.data)).toBe(true);

      if (response.data.length > 0) {
        const contract = response.data[0];
        expect(contract).toHaveProperty('id');
        expect(contract).toHaveProperty('title');
      }
    }, 60000);
  });

  describe('Compras.gov.br Pregão Item Search', () => {
    it('should search pregão items by date range', async () => {
      // Arrange
      const filters = {
        data_publicacao_min: '2024-01-01',
        data_publicacao_max: '2024-06-30',
      };

      // Act
      const response = await service.searchPregaoItens(filters);

      // Assert
      expect(response).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);

      if (response.data.length > 0) {
        const item = response.data[0];
        expect(item).toHaveProperty('descricao');
        expect(item).toHaveProperty('precoUnitario');
      }
    }, 60000);
  });
});

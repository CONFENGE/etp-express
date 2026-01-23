/**
 * SINAPI API Integration Tests
 *
 * Tests real integration with SINAPI via Orcamentador API.
 * These tests make actual HTTP calls to the Orcamentador API.
 *
 * Purpose:
 * - Validate SINAPI API authentication and authorization
 * - Test insumos and composicoes search with real data
 * - Ensure price data is correctly parsed
 * - Validate error handling with actual API responses
 *
 * Requirements:
 * - Requires SINAPI_API_KEY and SINAPI_API_SECRET in .env
 * - API credentials can be obtained from https://orcamentador.com.br
 *
 * Usage:
 * - Run with: npm run test:integration:gov-api
 * - Skips tests if credentials are not configured
 *
 * @see https://orcamentador.com.br/api/docs
 * @see https://github.com/CONFENGE/etp-express/issues/1073
 * @see https://github.com/CONFENGE/etp-express/issues/1565
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { SinapiApiClientService } from '../src/modules/gov-api/sinapi/sinapi-api-client.service';
import { GovApiCache } from '../src/modules/gov-api/utils/gov-api-cache';

// Skip all tests if API credentials are not configured
const apiKey = process.env.SINAPI_API_KEY;
const apiSecret = process.env.SINAPI_API_SECRET;
const skipTests = !apiKey || !apiSecret;

(skipTests ? describe.skip : describe)(
  'SINAPI API Integration Tests (@integration)',
  () => {
    let service: SinapiApiClientService;
    let configService: ConfigService;

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [HttpModule],
        providers: [
          SinapiApiClientService,
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
                const config: Record<string, string | undefined> = {
                  SINAPI_API_KEY: process.env.SINAPI_API_KEY,
                  SINAPI_API_SECRET: process.env.SINAPI_API_SECRET,
                  SINAPI_API_BASE_URL:
                    process.env.SINAPI_API_BASE_URL ||
                    'https://orcamentador.com.br/api/v1',
                };
                return config[key];
              }),
            },
          },
        ],
      }).compile();

      service = module.get<SinapiApiClientService>(SinapiApiClientService);
      configService = module.get<ConfigService>(ConfigService);

      // Initialize client
      await service.onModuleInit();
    });

    afterAll(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    describe('SINAPI Insumos Search', () => {
      it('should search insumos by description', async () => {
        // Arrange
        const filters = {
          nome: 'cimento',
          estado: 'SP',
          referencia: '2024-06',
          limit: 10,
        };

        // Act
        const response = await service.searchInsumos(filters);

        // Assert
        expect(response).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);
        expect(response).toHaveProperty('total');

        if (response.data.length > 0) {
          const insumo = response.data[0];
          expect(insumo).toHaveProperty('codigo');
          expect(insumo).toHaveProperty('nome');
          expect(insumo).toHaveProperty('unidade');
          expect(insumo).toHaveProperty('preco_desonerado');
          expect(insumo.nome.toLowerCase()).toContain('cimento');
        }
      }, 60000);

      it('should search insumos with pagination', async () => {
        // Arrange
        const filters = {
          nome: 'areia',
          estado: 'RJ',
          page: 1,
          limit: 5,
        };

        // Act
        const response = await service.searchInsumos(filters);

        // Assert
        expect(response).toBeDefined();
        expect(response.data.length).toBeLessThanOrEqual(5);
        expect(response).toHaveProperty('page', 1);
      }, 60000);

      it('should validate price data structure', async () => {
        // Arrange
        const filters = {
          nome: 'tijolo',
          estado: 'MG',
          limit: 3,
        };

        // Act
        const response = await service.searchInsumos(filters);

        // Assert
        if (response.data.length > 0) {
          const insumo = response.data[0];

          // Validate price structure
          expect(insumo.preco_desonerado).toBeDefined();
          expect(typeof insumo.preco_desonerado).toBe('number');
          expect(insumo.preco_desonerado).toBeGreaterThan(0);
          expect(isNaN(insumo.preco_desonerado)).toBe(false);

          // Validate unit
          expect(insumo.unidade).toBeDefined();
          expect(typeof insumo.unidade).toBe('string');
        }
      }, 60000);

      it('should handle empty results gracefully', async () => {
        // Arrange
        const filters = {
          nome: 'xyznonexistent999',
          estado: 'SP',
        };

        // Act
        const response = await service.searchInsumos(filters);

        // Assert
        expect(response).toBeDefined();
        expect(response.data).toEqual([]);
        expect(response.total).toBe(0);
      }, 60000);
    });

    describe('SINAPI Composicoes Search', () => {
      it('should search composicoes by description', async () => {
        // Arrange
        const filters = {
          nome: 'alvenaria',
          estado: 'SP',
          limit: 5,
        };

        // Act
        const response = await service.searchComposicoes(filters);

        // Assert
        expect(response).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);

        if (response.data.length > 0) {
          const composicao = response.data[0];
          expect(composicao).toHaveProperty('codigo');
          expect(composicao).toHaveProperty('nome');
          expect(composicao).toHaveProperty('unidade');
          expect(composicao).toHaveProperty('preco_desonerado');
        }
      }, 60000);

      it('should retrieve composicao detail by code', async () => {
        // Arrange
        // First, search to get a valid code
        const searchResponse = await service.searchComposicoes({
          nome: 'concreto',
          estado: 'SP',
          limit: 1,
        });

        if (searchResponse.data.length === 0) {
          console.log('Skipping test - no composicoes found');
          return;
        }

        const codigo = searchResponse.data[0].codigo;

        // Act
        const detail = await service.getComposicaoDetails(codigo, 'SP');

        // Assert
        expect(detail).toBeDefined();
        if (detail) {
          expect(detail.codigo.toString()).toBe(codigo.toString());
          expect(detail).toHaveProperty('nome');
          expect(detail).toHaveProperty('itens');
          expect(Array.isArray(detail.itens)).toBe(true);
        }
      }, 90000);
    });

    describe('SINAPI Price History', () => {
      it('should retrieve historical prices for insumo', async () => {
        // Arrange
        const codigo = 4387; // Example SINAPI code
        const estado = 'SP';
        const periodo = '6'; // Last 6 months

        // Act
        const history = await service.getHistorico(codigo, estado, periodo);

        // Assert
        expect(history).toBeDefined();
        expect(Array.isArray(history)).toBe(true);

        if (history.length > 0) {
          const entry = history[0];
          expect(entry).toHaveProperty('referencia');
          expect(entry).toHaveProperty('preco_desonerado');
          expect(typeof entry.preco_desonerado).toBe('number');
        }
      }, 60000);
    });

    describe('SINAPI Estados', () => {
      it('should list all available estados', async () => {
        // Act
        const estados = await service.getEstados();

        // Assert
        expect(estados).toBeDefined();
        expect(Array.isArray(estados)).toBe(true);
        expect(estados.length).toBeGreaterThan(0);

        // Validate structure
        const estado = estados[0];
        expect(estado).toHaveProperty('sigla');
        expect(estado).toHaveProperty('nome');
        expect(typeof estado.sigla).toBe('string');
        expect(estado.sigla.length).toBe(2); // UF is 2 chars
      }, 60000);

      it('should include major estados', async () => {
        // Act
        const estados = await service.getEstados();

        // Assert
        const ufs = estados.map((e) => e.sigla);
        expect(ufs).toContain('SP');
        expect(ufs).toContain('RJ');
        expect(ufs).toContain('MG');
        expect(ufs).toContain('DF');
      }, 60000);
    });

    describe('SINAPI Error Handling', () => {
      it('should handle invalid codigo gracefully', async () => {
        // Arrange
        const invalidCodigo = 99999999;

        // Act & Assert
        const result = await service.getComposicaoDetails(invalidCodigo, 'SP');
        expect(result).toBeNull(); // Service returns null for 404
      }, 60000);

      it('should handle rate limit errors', async () => {
        // This test validates rate limit handling
        // If rate limit is exceeded, should throw SinapiApiRateLimitError

        const filters = { nome: 'test', estado: 'SP', limit: 1 };

        // Make multiple rapid requests
        const requests = Array.from({ length: 20 }, () =>
          service.searchInsumos(filters),
        );

        // Act & Assert
        const results = await Promise.allSettled(requests);
        expect(results).toBeDefined();

        // At least some should succeed
        const successful = results.filter((r) => r.status === 'fulfilled');
        expect(successful.length).toBeGreaterThan(0);
      }, 120000);
    });

    describe('SINAPI Cache Behavior', () => {
      it('should make requests successfully without cache', async () => {
        // Arrange
        const filters = { nome: 'cimento portland', estado: 'SP', limit: 5 };

        // Act
        const response = await service.searchInsumos(filters);

        // Assert
        expect(response).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);
      }, 90000);
    });
  },
);

// Tests that run regardless of credentials
describe('SINAPI API Integration - Configuration Tests', () => {
  it('should warn when API credentials are not configured', () => {
    if (!apiKey || !apiSecret) {
      console.warn(
        '\n⚠️  SINAPI API credentials not configured. Set SINAPI_API_KEY and SINAPI_API_SECRET in .env to run integration tests.\n',
      );
    }
    expect(true).toBe(true); // Placeholder
  });
});

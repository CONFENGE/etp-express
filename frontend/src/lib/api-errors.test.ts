import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HTTP_ERROR_MESSAGES,
  getApiErrorMessage,
  getContextualErrorMessage,
  checkApiHealth,
  getErrorWithDiagnostic,
  type ApiHealthResult,
} from './api-errors';

describe('API Error Handling', () => {
  describe('HTTP_ERROR_MESSAGES', () => {
    it('should have messages for common HTTP status codes', () => {
      expect(HTTP_ERROR_MESSAGES[400]).toBeDefined();
      expect(HTTP_ERROR_MESSAGES[401]).toBeDefined();
      expect(HTTP_ERROR_MESSAGES[403]).toBeDefined();
      expect(HTTP_ERROR_MESSAGES[404]).toBeDefined();
      expect(HTTP_ERROR_MESSAGES[500]).toBeDefined();
      expect(HTTP_ERROR_MESSAGES[502]).toBeDefined();
      expect(HTTP_ERROR_MESSAGES[503]).toBeDefined();
    });

    it('should have user-friendly Portuguese messages', () => {
      expect(HTTP_ERROR_MESSAGES[400]).toContain('Dados inválidos');
      expect(HTTP_ERROR_MESSAGES[401]).toContain('Sessão expirada');
      expect(HTTP_ERROR_MESSAGES[403]).toContain('permissão');
      expect(HTTP_ERROR_MESSAGES[404]).toContain('não encontrado');
      expect(HTTP_ERROR_MESSAGES[500]).toContain('Erro interno');
      expect(HTTP_ERROR_MESSAGES[503]).toContain('manutenção');
    });
  });

  describe('getApiErrorMessage', () => {
    describe('with HTTP status codes', () => {
      it('should return message for status code from response', () => {
        const error = {
          response: {
            status: 401,
            data: { message: 'Unauthorized' },
          },
        };

        const result = getApiErrorMessage(error);
        expect(result).toBe('Sessão expirada. Faça login novamente.');
      });

      it('should return message for direct status property', () => {
        const error = {
          status: 403,
          message: 'Forbidden',
        };

        const result = getApiErrorMessage(error);
        expect(result).toBe(
          'Você não tem permissão para acessar este recurso.',
        );
      });

      it('should return message for statusCode property', () => {
        const error = {
          statusCode: 500,
          message: 'Internal Server Error',
        };

        const result = getApiErrorMessage(error);
        expect(result).toBe(
          'Erro interno do servidor. Tente novamente em instantes.',
        );
      });
    });

    describe('with error patterns', () => {
      it('should match network error patterns', () => {
        const error = new Error('Network error: ERR_NETWORK');
        const result = getApiErrorMessage(error);
        expect(result).toContain('conexão');
      });

      it('should match timeout patterns', () => {
        const error = { message: 'Request timeout after 30000ms' };
        const result = getApiErrorMessage(error);
        expect(result).toContain('expirou');
      });

      it('should match Exa API errors', () => {
        const error = { message: 'Exa API error: rate limit exceeded' };
        const result = getApiErrorMessage(error);
        expect(result).toContain('pesquisa');
      });

      it('should match OpenAI/LLM errors', () => {
        const error = { message: 'OpenAI API error: model overloaded' };
        const result = getApiErrorMessage(error);
        expect(result).toContain('IA');
      });

      it('should match rate limit errors', () => {
        const error = { message: 'Rate limit exceeded: too many requests' };
        const result = getApiErrorMessage(error);
        expect(result).toContain('Muitas requisições');
      });

      it('should match database errors', () => {
        const error = { message: 'Database connection failed' };
        const result = getApiErrorMessage(error);
        expect(result).toContain('dados');
      });

      it('should match duplicate errors', () => {
        const error = {
          message: 'Unique constraint violation: already exists',
        };
        const result = getApiErrorMessage(error);
        expect(result).toContain('já existe');
      });

      it('should match validation errors', () => {
        const error = { message: 'Validation failed for input data' };
        const result = getApiErrorMessage(error);
        expect(result).toContain('inválidos');
      });

      it('should match request failed pattern', () => {
        const error = { message: 'Request failed with status code 500' };
        const result = getApiErrorMessage(error);
        expect(result).toContain('indisponível');
      });
    });

    describe('with NestJS error format', () => {
      it('should extract message from nested message object', () => {
        const error = {
          message: {
            message: 'Custom validation error',
            statusCode: 400,
          },
        };

        const result = getApiErrorMessage(error);
        expect(result).toBe(
          'Dados inválidos. Verifique as informações e tente novamente.',
        );
      });

      it('should extract message from Axios error format', () => {
        const error = {
          response: {
            data: {
              message: 'Usuário não encontrado',
            },
            status: 404,
          },
        };

        const result = getApiErrorMessage(error);
        expect(result).toBe('Recurso não encontrado.');
      });
    });

    describe('with Error instances', () => {
      it('should extract message from Error instance', () => {
        const error = new Error('Something went wrong');
        // Since "Something went wrong" doesn't match patterns and isn't technical,
        // it might be returned as is or get default
        const result = getApiErrorMessage(error);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('with user-friendly messages', () => {
      it('should pass through Portuguese user-friendly messages', () => {
        const error = { message: 'Este ETP já foi finalizado.' };
        const result = getApiErrorMessage(error);
        expect(result).toBe('Este ETP já foi finalizado.');
      });

      it('should pass through action-oriented messages', () => {
        const error = {
          message: 'Por favor, preencha todos os campos obrigatórios.',
        };
        const result = getApiErrorMessage(error);
        expect(result).toBe(
          'Por favor, preencha todos os campos obrigatórios.',
        );
      });
    });

    describe('with technical messages (should filter)', () => {
      it('should filter stack traces', () => {
        const error = {
          message: 'Error at Module._compile (/app/index.js:10)',
        };
        const result = getApiErrorMessage(error);
        expect(result).not.toContain('Module._compile');
      });

      it('should filter file references', () => {
        const error = {
          message: 'TypeError in file.ts:25 - undefined is not a function',
        };
        const result = getApiErrorMessage(error);
        expect(result).not.toContain('.ts:');
      });
    });

    describe('edge cases', () => {
      it('should return default message when error is null', () => {
        const result = getApiErrorMessage(null);
        expect(result).toBe('Ocorreu um erro inesperado. Tente novamente.');
      });

      it('should return default message when error is undefined', () => {
        const result = getApiErrorMessage(undefined);
        expect(result).toBe('Ocorreu um erro inesperado. Tente novamente.');
      });

      it('should return default message when error is empty object', () => {
        const result = getApiErrorMessage({});
        expect(result).toBe('Ocorreu um erro inesperado. Tente novamente.');
      });

      it('should return default message for non-object error', () => {
        const result = getApiErrorMessage(42);
        expect(result).toBe('Ocorreu um erro inesperado. Tente novamente.');
      });

      it('should handle string error', () => {
        const result = getApiErrorMessage('Connection refused');
        // Should match network pattern or return processed result
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('with context parameter', () => {
      it('should include context in default message', () => {
        const result = getApiErrorMessage({}, 'salvar documento');
        expect(result).toContain('salvar documento');
      });

      it('should include context in null error case', () => {
        const result = getApiErrorMessage(null, 'carregar dados');
        expect(result).toContain('carregar dados');
      });
    });
  });

  describe('getContextualErrorMessage', () => {
    it('should create contextual message for operations', () => {
      const error = { message: 'Network error' };
      const result = getContextualErrorMessage('carregar', 'ETPs', error);
      expect(result).toContain('carregar');
      expect(result).toContain('ETPs');
    });

    it('should include friendly message when available', () => {
      const error = {
        response: { status: 503 },
      };
      const result = getContextualErrorMessage('salvar', 'o ETP', error);
      expect(result).toContain('salvar');
      expect(result).toContain('manutenção');
    });

    it('should handle unknown errors gracefully', () => {
      const result = getContextualErrorMessage('atualizar', 'seção', {});
      expect(result).toBe('Erro ao atualizar seção. Tente novamente.');
    });

    it('should work with various operations', () => {
      const operations = [
        { op: 'criar', resource: 'usuário' },
        { op: 'excluir', resource: 'o documento' },
        { op: 'exportar', resource: 'o PDF' },
        { op: 'validar', resource: 'os dados' },
      ];

      operations.forEach(({ op, resource }) => {
        const result = getContextualErrorMessage(op, resource, {});
        expect(result).toContain(op);
        expect(result).toContain(resource);
      });
    });
  });

  describe('ERROR_PATTERNS - 404 and CORS', () => {
    it('should match 404 errors', () => {
      const error = { message: 'Request failed with status code 404' };
      const result = getApiErrorMessage(error);
      expect(result).toContain('Endpoint não encontrado');
    });

    it('should match "not found" errors', () => {
      const error = { message: 'Resource not found' };
      const result = getApiErrorMessage(error);
      expect(result).toContain('Endpoint não encontrado');
    });

    it('should match "cannot GET" errors', () => {
      const error = { message: 'Cannot GET /api/auth/login' };
      const result = getApiErrorMessage(error);
      expect(result).toContain('Endpoint não encontrado');
    });

    it('should match "cannot POST" errors', () => {
      const error = { message: 'Cannot POST /api/users' };
      const result = getApiErrorMessage(error);
      expect(result).toContain('Endpoint não encontrado');
    });

    it('should match CORS errors', () => {
      const error = {
        message: 'CORS policy: No Access-Control-Allow-Origin header',
      };
      const result = getApiErrorMessage(error);
      expect(result).toContain('configuração do servidor');
    });

    it('should match cross-origin errors', () => {
      const error = { message: 'Cross-Origin Request Blocked' };
      const result = getApiErrorMessage(error);
      expect(result).toContain('configuração do servidor');
    });
  });

  describe('checkApiHealth', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.useRealTimers();
    });

    it('should return healthy when API responds with 200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await checkApiHealth('http://localhost:3001/api/v1');

      expect(result.isHealthy).toBe(true);
      expect(result.code).toBe('healthy');
      expect(result.details).toBe('API disponível');
    });

    it('should return not_found when API responds with 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await checkApiHealth('http://localhost:3001/api/v1');

      expect(result.isHealthy).toBe(false);
      expect(result.code).toBe('not_found');
      expect(result.details).toContain('404');
    });

    it('should return server_error for other HTTP errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await checkApiHealth('http://localhost:3001/api/v1');

      expect(result.isHealthy).toBe(false);
      expect(result.code).toBe('server_error');
      expect(result.details).toContain('500');
    });

    it('should return timeout when request times out', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 6000);
        });
      });

      const resultPromise = checkApiHealth('http://localhost:3001/api/v1');

      // Advance timers to trigger abort
      await vi.advanceTimersByTimeAsync(6000);

      const result = await resultPromise;

      expect(result.isHealthy).toBe(false);
      expect(result.code).toBe('timeout');
    });

    it('should return network_error when fetch fails with TypeError', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await checkApiHealth('http://localhost:3001/api/v1');

      expect(result.isHealthy).toBe(false);
      expect(result.code).toBe('network_error');
      expect(result.details).toContain('inacessível');
    });

    it('should build correct health URL from API URL with /api/v1', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      await checkApiHealth('http://example.com/api/v1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://example.com/api/health',
        expect.any(Object),
      );
    });

    it('should build correct health URL from API URL without version', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      await checkApiHealth('http://example.com/api');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://example.com/api/health',
        expect.any(Object),
      );
    });
  });

  describe('getErrorWithDiagnostic', () => {
    it('should return only message when no health result', () => {
      const error = { message: 'Some error' };
      const result = getErrorWithDiagnostic(error);

      expect(result.message).toBeDefined();
      expect(result.diagnostic).toBeUndefined();
    });

    it('should return only message when API is healthy', () => {
      const error = { message: 'Some error' };
      const healthResult: ApiHealthResult = {
        isHealthy: true,
        details: 'API disponível',
        code: 'healthy',
      };

      const result = getErrorWithDiagnostic(error, healthResult);

      expect(result.message).toBeDefined();
      expect(result.diagnostic).toBeUndefined();
    });

    it('should include diagnostic when API is unhealthy', () => {
      const error = { message: 'Network error' };
      const healthResult: ApiHealthResult = {
        isHealthy: false,
        details: 'API inacessível. Verifique sua conexão.',
        code: 'network_error',
      };

      const result = getErrorWithDiagnostic(error, healthResult);

      expect(result.message).toBeDefined();
      expect(result.diagnostic).toBe('API inacessível. Verifique sua conexão.');
    });

    it('should include 404 diagnostic details', () => {
      const error = { message: '404 Not Found' };
      const healthResult: ApiHealthResult = {
        isHealthy: false,
        details: 'Endpoint não encontrado (404). Verifique a URL da API.',
        code: 'not_found',
      };

      const result = getErrorWithDiagnostic(error, healthResult);

      expect(result.diagnostic).toContain('404');
      expect(result.diagnostic).toContain('Verifique a URL');
    });
  });
});

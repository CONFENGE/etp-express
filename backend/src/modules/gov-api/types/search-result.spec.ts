/**
 * Search Result Types Tests
 *
 * Unit tests for SearchStatus enum and utility functions
 *
 * @see https://github.com/CONFENGE/etp-express/issues/755
 */

import {
  SearchStatus,
  SourceStatus,
  calculateOverallStatus,
  getStatusMessage,
  createSuccessResult,
  createPartialResult,
  createUnavailableResult,
} from './search-result';

describe('SearchStatus', () => {
  describe('calculateOverallStatus', () => {
    it('should return SUCCESS when all sources succeeded', () => {
      const sources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 10 },
        { name: 'comprasgov', status: SearchStatus.SUCCESS, resultCount: 5 },
      ];

      expect(calculateOverallStatus(sources)).toBe(SearchStatus.SUCCESS);
    });

    it('should return SERVICE_UNAVAILABLE when all sources failed', () => {
      const sources: SourceStatus[] = [
        {
          name: 'pncp',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: 'API down',
        },
        {
          name: 'comprasgov',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: 'Circuit breaker open',
        },
      ];

      expect(calculateOverallStatus(sources)).toBe(
        SearchStatus.SERVICE_UNAVAILABLE,
      );
    });

    it('should return PARTIAL when some sources succeeded and some failed', () => {
      const sources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 10 },
        {
          name: 'comprasgov',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: 'Timeout',
        },
      ];

      expect(calculateOverallStatus(sources)).toBe(SearchStatus.PARTIAL);
    });

    it('should return TIMEOUT when all sources timed out', () => {
      const sources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.TIMEOUT, error: 'Timeout' },
        { name: 'comprasgov', status: SearchStatus.TIMEOUT, error: 'Timeout' },
      ];

      expect(calculateOverallStatus(sources)).toBe(SearchStatus.TIMEOUT);
    });

    it('should return RATE_LIMITED when all sources rate limited', () => {
      const sources: SourceStatus[] = [
        {
          name: 'pncp',
          status: SearchStatus.RATE_LIMITED,
          error: 'Rate limit exceeded',
        },
        {
          name: 'comprasgov',
          status: SearchStatus.RATE_LIMITED,
          error: 'Rate limit exceeded',
        },
      ];

      expect(calculateOverallStatus(sources)).toBe(SearchStatus.RATE_LIMITED);
    });

    it('should return SERVICE_UNAVAILABLE for empty sources array', () => {
      expect(calculateOverallStatus([])).toBe(SearchStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('getStatusMessage', () => {
    it('should return success message for SUCCESS status', () => {
      const message = getStatusMessage(SearchStatus.SUCCESS);
      expect(message).toBe('Busca realizada com sucesso');
    });

    it('should return partial message with failed sources for PARTIAL status', () => {
      const message = getStatusMessage(SearchStatus.PARTIAL, [
        'pncp',
        'comprasgov',
      ]);
      expect(message).toBe('Busca parcial: pncp, comprasgov indisponível(is)');
    });

    it('should return service unavailable message for SERVICE_UNAVAILABLE status', () => {
      const message = getStatusMessage(SearchStatus.SERVICE_UNAVAILABLE);
      expect(message).toContain('temporariamente indisponíveis');
    });

    it('should return rate limited message for RATE_LIMITED status', () => {
      const message = getStatusMessage(SearchStatus.RATE_LIMITED);
      expect(message).toContain('Limite de requisições');
    });

    it('should return timeout message for TIMEOUT status', () => {
      const message = getStatusMessage(SearchStatus.TIMEOUT);
      expect(message).toContain('demorou mais que o esperado');
    });
  });

  describe('createSuccessResult', () => {
    it('should create a success result with correct structure', () => {
      const data = [{ id: '1', name: 'Test' }];
      const sources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 1 },
      ];

      const result = createSuccessResult(data, sources);

      expect(result.status).toBe(SearchStatus.SUCCESS);
      expect(result.data).toEqual(data);
      expect(result.sources).toEqual(sources);
      expect(result.total).toBe(1);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should use provided total if specified', () => {
      const data = [{ id: '1' }];
      const sources: SourceStatus[] = [];

      const result = createSuccessResult(data, sources, 100);

      expect(result.total).toBe(100);
    });

    it('should set cached flag if provided', () => {
      const data: unknown[] = [];
      const sources: SourceStatus[] = [];

      const result = createSuccessResult(data, sources, undefined, true);

      expect(result.cached).toBe(true);
    });
  });

  describe('createPartialResult', () => {
    it('should create a partial result with failed sources in message', () => {
      const data = [{ id: '1' }];
      const sources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.SUCCESS, resultCount: 1 },
        {
          name: 'comprasgov',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: 'Down',
        },
      ];

      const result = createPartialResult(data, sources);

      expect(result.status).toBe(SearchStatus.PARTIAL);
      expect(result.message).toContain('comprasgov');
    });
  });

  describe('createUnavailableResult', () => {
    it('should create an unavailable result with empty data', () => {
      const sources: SourceStatus[] = [
        {
          name: 'pncp',
          status: SearchStatus.SERVICE_UNAVAILABLE,
          error: 'Down',
        },
      ];

      const result = createUnavailableResult<unknown>(sources);

      expect(result.status).toBe(SearchStatus.SERVICE_UNAVAILABLE);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use custom error message if provided', () => {
      const sources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.TIMEOUT, error: 'Timeout' },
      ];

      const result = createUnavailableResult<unknown>(
        sources,
        'Custom error message',
      );

      expect(result.message).toBe('Custom error message');
    });

    it('should calculate correct status from sources', () => {
      const sources: SourceStatus[] = [
        { name: 'pncp', status: SearchStatus.TIMEOUT, error: 'Timeout' },
        { name: 'comprasgov', status: SearchStatus.TIMEOUT, error: 'Timeout' },
      ];

      const result = createUnavailableResult<unknown>(sources);

      expect(result.status).toBe(SearchStatus.TIMEOUT);
    });
  });
});

describe('SourceStatus interface', () => {
  it('should allow creating a SourceStatus with all fields', () => {
    const status: SourceStatus = {
      name: 'pncp',
      status: SearchStatus.SUCCESS,
      error: undefined,
      latencyMs: 150,
      resultCount: 10,
    };

    expect(status.name).toBe('pncp');
    expect(status.latencyMs).toBe(150);
    expect(status.resultCount).toBe(10);
  });

  it('should allow creating a SourceStatus with minimal fields', () => {
    const status: SourceStatus = {
      name: 'comprasgov',
      status: SearchStatus.SERVICE_UNAVAILABLE,
    };

    expect(status.name).toBe('comprasgov');
    expect(status.error).toBeUndefined();
  });
});

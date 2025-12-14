import {
  requestContextStorage,
  getRequestContext,
  getRequestId,
  getRequestStartTime,
  runInRequestContext,
  RequestContextData,
} from './request-context';

describe('RequestContext', () => {
  describe('getRequestContext', () => {
    it('should return undefined when not in a request context', () => {
      expect(getRequestContext()).toBeUndefined();
    });

    it('should return context when inside runInRequestContext', () => {
      const testContext: RequestContextData = {
        requestId: 'test-request-id-123',
        startTime: Date.now(),
      };

      runInRequestContext(testContext, () => {
        const context = getRequestContext();
        expect(context).toBeDefined();
        expect(context?.requestId).toBe('test-request-id-123');
      });
    });
  });

  describe('getRequestId', () => {
    it('should return undefined when not in a request context', () => {
      expect(getRequestId()).toBeUndefined();
    });

    it('should return requestId when inside context', () => {
      const testContext: RequestContextData = {
        requestId: 'uuid-v4-format-id',
      };

      runInRequestContext(testContext, () => {
        expect(getRequestId()).toBe('uuid-v4-format-id');
      });
    });
  });

  describe('getRequestStartTime', () => {
    it('should return undefined when not in a request context', () => {
      expect(getRequestStartTime()).toBeUndefined();
    });

    it('should return startTime when inside context', () => {
      const startTime = Date.now();
      const testContext: RequestContextData = {
        requestId: 'test-id',
        startTime,
      };

      runInRequestContext(testContext, () => {
        expect(getRequestStartTime()).toBe(startTime);
      });
    });
  });

  describe('runInRequestContext', () => {
    it('should propagate context through sync function calls', () => {
      const testContext: RequestContextData = {
        requestId: 'sync-test-id',
      };

      const innerFunction = (): string | undefined => {
        return getRequestId();
      };

      runInRequestContext(testContext, () => {
        const result = innerFunction();
        expect(result).toBe('sync-test-id');
      });
    });

    it('should propagate context through async function calls', async () => {
      const testContext: RequestContextData = {
        requestId: 'async-test-id',
      };

      const asyncInnerFunction = async (): Promise<string | undefined> => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return getRequestId();
      };

      await runInRequestContext(testContext, async () => {
        const result = await asyncInnerFunction();
        expect(result).toBe('async-test-id');
      });
    });

    it('should isolate contexts between different calls', async () => {
      const context1: RequestContextData = { requestId: 'context-1' };
      const context2: RequestContextData = { requestId: 'context-2' };

      const results: string[] = [];

      await Promise.all([
        runInRequestContext(context1, async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          results.push(getRequestId() || 'undefined');
        }),
        runInRequestContext(context2, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(getRequestId() || 'undefined');
        }),
      ]);

      // Context 2 finishes first (10ms) then Context 1 (20ms)
      expect(results).toContain('context-1');
      expect(results).toContain('context-2');
    });

    it('should return the result of the wrapped function', () => {
      const testContext: RequestContextData = { requestId: 'test' };

      const result = runInRequestContext(testContext, () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it('should return async result of the wrapped function', async () => {
      const testContext: RequestContextData = { requestId: 'test' };

      const result = await runInRequestContext(testContext, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 'async-result';
      });

      expect(result).toBe('async-result');
    });
  });

  describe('requestContextStorage', () => {
    it('should be an AsyncLocalStorage instance', () => {
      expect(requestContextStorage).toBeDefined();
      expect(typeof requestContextStorage.run).toBe('function');
      expect(typeof requestContextStorage.getStore).toBe('function');
    });
  });
});

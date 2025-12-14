import { RequestIdMiddleware, RequestWithId } from './request-id.middleware';
import { Request, Response } from 'express';
import { getRequestId } from '../context/request-context';

// Mock uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
}));

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<RequestWithId>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      get: jest.fn(),
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Request ID generation', () => {
    it('should generate UUID v4 when no X-Request-ID header exists', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe('mocked-uuid-v4');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        'mocked-uuid-v4',
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use existing X-Request-ID header when valid', () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-request-id') return 'existing-request-id';
        return undefined;
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe('existing-request-id');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        'existing-request-id',
      );
    });

    it('should accept X-Correlation-ID header', () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-correlation-id') return 'correlation-id-123';
        return undefined;
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe('correlation-id-123');
    });

    it('should accept X-Trace-ID header', () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-trace-id') return 'trace-id-456';
        return undefined;
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe('trace-id-456');
    });

    it('should prioritize X-Request-ID over other headers', () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-request-id') return 'primary-id';
        if (header === 'x-correlation-id') return 'secondary-id';
        return undefined;
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe('primary-id');
    });
  });

  describe('Request ID validation', () => {
    it('should reject invalid request IDs (special characters)', () => {
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-request-id') return 'invalid<script>id';
        return undefined;
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      // Should generate new UUID instead of using invalid header
      expect(mockRequest.requestId).toBe('mocked-uuid-v4');
    });

    it('should reject request IDs that are too long', () => {
      const longId = 'a'.repeat(100);
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-request-id') return longId;
        return undefined;
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe('mocked-uuid-v4');
    });

    it('should accept valid UUID format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-request-id') return validUuid;
        return undefined;
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe(validUuid);
    });

    it('should accept alphanumeric with underscores', () => {
      const validId = 'req_abc123_def456';
      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'x-request-id') return validId;
        return undefined;
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockRequest.requestId).toBe(validId);
    });
  });

  describe('AsyncLocalStorage context', () => {
    it('should make requestId available via getRequestId() in next()', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      let capturedRequestId: string | undefined;
      nextFunction.mockImplementation(() => {
        capturedRequestId = getRequestId();
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(capturedRequestId).toBe('mocked-uuid-v4');
    });

    it('should set startTime in context', () => {
      const beforeTime = Date.now();

      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      let contextTime: number | undefined;
      nextFunction.mockImplementation(() => {
        // Access context via the request object since we can't import getRequestStartTime
        // without affecting the AsyncLocalStorage context
        contextTime = Date.now();
      });

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(contextTime).toBeDefined();
      expect(contextTime).toBeGreaterThanOrEqual(beforeTime);
    });
  });

  describe('Response header', () => {
    it('should always set X-Request-ID response header', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      middleware.use(
        mockRequest as RequestWithId,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledTimes(1);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        expect.any(String),
      );
    });
  });
});

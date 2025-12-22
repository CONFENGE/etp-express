import { SecurityMiddleware } from './security.middleware';
import { Request, Response } from 'express';

// Mock request type that allows reassigning readonly properties for testing
interface MockRequest {
  path: string;
  method: string;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  ip: string;
  socket: { remoteAddress: string };
}

describe('SecurityMiddleware', () => {
  let middleware: SecurityMiddleware;
  let mockRequest: MockRequest;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    middleware = new SecurityMiddleware();
    mockRequest = {
      path: '/api/v1/etps',
      method: 'GET',
      query: {},
      params: {},
      body: {},
      headers: {
        'user-agent': 'Mozilla/5.0 Test Browser',
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('Legitimate Requests', () => {
    it('should allow normal GET request', () => {
      mockRequest.query = { page: '1', limit: '10' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow normal POST request with body', () => {
      mockRequest.method = 'POST';
      mockRequest.body = {
        title: 'Estudo Técnico Preliminar',
        description: 'Contratação de serviços de TI',
        sections: [{ name: 'Descrição', content: 'Conteúdo válido' }],
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow health check endpoints without checks', () => {
      mockRequest.path = '/api/v1/health';

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow special characters in legitimate content', () => {
      mockRequest.body = {
        content:
          'O valor é R$ 1.000,00 (mil reais) - conforme art. 75, inciso II',
        email: 'usuario@example.com',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow Portuguese text with accents', () => {
      mockRequest.body = {
        description:
          'Aquisição de equipamentos para órgão público, conforme especificação técnica.',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('SQL Injection Detection', () => {
    it('should block UNION SELECT injection in query params', () => {
      mockRequest.query = { search: "' UNION SELECT * FROM users --" };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block OR 1=1 injection', () => {
      mockRequest.query = { id: "1' OR 1=1 --" };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block DROP TABLE injection', () => {
      mockRequest.body = { name: '; DROP TABLE users; --' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block SQL injection in body', () => {
      mockRequest.body = {
        title: "Test'; DELETE FROM etps WHERE '1'='1",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block time-based SQL injection (WAITFOR DELAY)', () => {
      mockRequest.query = { id: "1; WAITFOR DELAY '0:0:5' --" };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block SLEEP injection', () => {
      mockRequest.query = { id: '1 AND SLEEP(5)' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block SQL comments', () => {
      mockRequest.query = { id: "1'--" };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('XSS Detection', () => {
    it('should block script tags', () => {
      mockRequest.body = {
        content: '<script>alert("XSS")</script>',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block javascript: protocol', () => {
      mockRequest.body = {
        link: 'javascript:alert(1)',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block event handlers (onerror, onclick, etc)', () => {
      mockRequest.body = {
        content: '<img src=x onerror=alert(1)>',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block iframe injection', () => {
      mockRequest.body = {
        content: '<iframe src="https://malicious.com"></iframe>',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block SVG onload XSS', () => {
      mockRequest.body = {
        content: '<svg onload=alert(1)>',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block vbscript protocol', () => {
      mockRequest.body = {
        link: 'vbscript:msgbox("XSS")',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Path Traversal Detection', () => {
    it('should block ../ path traversal', () => {
      mockRequest.query = { file: '../../../etc/passwd' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block URL-encoded path traversal', () => {
      mockRequest.query = { file: '%2e%2e%2fetc/passwd' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block double-encoded path traversal', () => {
      mockRequest.query = { file: '%252e%252e%252f' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block null byte injection', () => {
      mockRequest.query = { file: 'file.txt%00.jpg' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block backslash path traversal (Windows)', () => {
      mockRequest.query = { file: '..\\..\\windows\\system32' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Command Injection Detection', () => {
    it('should block semicolon command chaining', () => {
      mockRequest.body = { command: 'input; rm -rf /' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block pipe command injection', () => {
      mockRequest.body = { input: 'data | cat /etc/passwd' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block backtick command execution', () => {
      mockRequest.body = { input: '`whoami`' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block $() command substitution', () => {
      mockRequest.body = { input: '$(cat /etc/passwd)' };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Header Validation', () => {
    it('should block SQL injection in User-Agent', () => {
      mockRequest.headers = {
        'user-agent': "Mozilla'; DROP TABLE users; --",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block XSS in Content-Type header', () => {
      mockRequest.headers = {
        'user-agent': 'Mozilla/5.0',
        'content-type': 'text/html<script>alert(1)</script>',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Nested Object Handling', () => {
    it('should detect injection in nested objects', () => {
      mockRequest.body = {
        user: {
          profile: {
            bio: '<script>alert(1)</script>',
          },
        },
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should detect injection in array values', () => {
      mockRequest.body = {
        tags: ['valid', '<script>evil</script>', 'another'],
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Response Format', () => {
    it('should return 403 with correct JSON structure', () => {
      mockRequest.query = { search: "' OR 1=1 --" };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 403,
        message: 'Forbidden',
        error: 'Request blocked by security policy',
      });
    });
  });

  describe('IP Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      mockRequest.headers = {
        'user-agent': 'Test',
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      };
      mockRequest.query = { attack: "' OR 1=1 --" };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      // Just verify the request was blocked (IP extraction is internal)
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query params', () => {
      mockRequest.query = {};

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      mockRequest.body = {};

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle null values in body', () => {
      mockRequest.body = {
        field: null,
        otherField: 'valid',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle numeric values', () => {
      mockRequest.body = {
        count: 42,
        price: 99.99,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle boolean values', () => {
      mockRequest.body = {
        active: true,
        deleted: false,
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Real-world Attack Payloads', () => {
    it('should block SQLMap default payload', () => {
      mockRequest.query = {
        id: "1' AND '1'='1",
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block Burp Suite XSS payload', () => {
      mockRequest.body = {
        input: '"><script>alert(String.fromCharCode(88,83,83))</script>',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should block polyglot XSS payload', () => {
      mockRequest.body = {
        input: 'jaVasCript:/*-/*`/*\\`/*\'/*"/**/(/* */oNcLiCk=alert() )//',
      };

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});

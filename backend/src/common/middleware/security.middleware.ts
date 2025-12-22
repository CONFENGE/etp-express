import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Security patterns for detecting malicious requests (OWASP Top 10)
 *
 * @remarks
 * These patterns are designed to catch common attack vectors while
 * minimizing false positives. They complement helmet and rate limiting.
 *
 * @see https://owasp.org/www-project-top-ten/
 */
const SECURITY_PATTERNS = {
  /**
   * SQL Injection patterns
   * Detects common SQL injection attempts in query params and body
   */
  sqlInjection: [
    /(\b(union|select|insert|update|delete|drop|truncate|alter|exec|execute)\b.*\b(from|into|table|database|where)\b)/i,
    /(\bor\b\s+\d+\s*=\s*\d+)/i, // OR 1=1
    /(\band\b\s+\d+\s*=\s*\d+)/i, // AND 1=1
    /(\band\b\s+['"][^'"]*['"]\s*=\s*['"][^'"]*)/i, // AND '1'='1 or AND "1"="1 (with or without closing quote)
    /(\bor\b\s+['"][^'"]*['"]\s*=\s*['"][^'"]*)/i, // OR '1'='1 or OR "1"="1 (with or without closing quote)
    /(--\s*$|;\s*--)/i, // SQL comments
    /(\b(xp_|sp_)\w+)/i, // SQL Server stored procedures
    /(\/\*.*\*\/)/i, // SQL block comments
    /(\bwaitfor\b\s+\bdelay\b)/i, // Time-based injection
    /(\bbenchmark\b\s*\()/i, // MySQL benchmark
    /(\bsleep\b\s*\(\s*\d+\s*\))/i, // Sleep injection
  ],

  /**
   * XSS (Cross-Site Scripting) patterns
   * Detects script injection attempts
   */
  xss: [
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    /<script\b[^>]*>/gi,
    /javascript\s*:/gi,
    /on(error|load|click|mouse|focus|blur|change|submit|key|touch)\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<svg\b[^>]*onload/gi,
    /expression\s*\(/gi, // CSS expression
    /vbscript\s*:/gi,
  ],

  /**
   * Path Traversal patterns
   * Detects attempts to access files outside allowed directories
   */
  pathTraversal: [
    /\.\.[/\\]/g, // ../
    /%2e%2e[/\\%]/gi, // URL encoded ../
    /\.\.%2f/gi, // Mixed encoding
    /%252e%252e/gi, // Double encoding
    /%c0%ae/gi, // UTF-8 encoding bypass
    /%00/gi, // Null byte injection (URL encoded)
  ],

  /**
   * Command Injection patterns
   * Detects OS command injection attempts
   * Note: Avoid matching currency symbols like R$ or US$
   */
  commandInjection: [
    /[;&|`]|\$\(/gi, // Shell metacharacters (excluding lone $ to avoid currency false positives)
    /\b(cat|ls|dir|rm|del|wget|curl|nc|netcat|bash|sh|cmd|powershell)\b\s/gi,
  ],
};

/**
 * Suspicious headers that may indicate automated attacks
 */
const SUSPICIOUS_HEADERS = {
  emptyUserAgent: true, // Bots often have empty user-agent
  sqlInUserAgent: true, // SQL in user-agent is always suspicious
};

export interface SecurityViolation {
  type:
    | 'sql_injection'
    | 'xss'
    | 'path_traversal'
    | 'command_injection'
    | 'ldap_injection'
    | 'suspicious_header';
  pattern: string;
  location: 'query' | 'body' | 'params' | 'headers' | 'path';
  value: string;
}

/**
 * SecurityMiddleware - WAF-like protection for NestJS
 *
 * @description
 * Middleware that analyzes incoming requests for malicious patterns
 * and blocks them with 403 Forbidden. Complements helmet and rate limiting.
 *
 * @remarks
 * - Checks query params, body, URL params, and headers
 * - Detects SQL injection, XSS, path traversal, command injection
 * - Logs all blocked requests for monitoring (Sentry integration)
 * - Returns 403 with generic message (no information disclosure)
 *
 * **Performance:**
 * - Patterns are compiled once at module load
 * - Early exit on first violation detected
 * - Minimal overhead for legitimate requests (~1-2ms)
 *
 * @example
 * ```typescript
 * // In AppModule
 * configure(consumer: MiddlewareConsumer): void {
 *   consumer
 *     .apply(SecurityMiddleware)
 *     .forRoutes('*');
 * }
 * ```
 *
 * @see ARCHITECTURE.md - Security Best Practices
 * @see https://owasp.org/www-project-top-ten/
 *
 * @since 1.0.0
 * @category Middleware
 * @module Common
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  /**
   * Paths to exclude from security checks (e.g., health endpoints)
   * These paths are typically called frequently and don't accept user input
   */
  private readonly excludedPaths = ['/health', '/api/health', '/api/v1/health'];

  /**
   * Process incoming request and check for malicious patterns
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Skip security checks for excluded paths (health checks, etc.)
    if (this.isExcludedPath(req.path)) {
      return next();
    }

    const violations: SecurityViolation[] = [];

    // Check URL path
    this.checkValue(req.path, 'path', violations);

    // Check query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      this.checkObject(req.query, 'query', violations);
    }

    // Check URL parameters
    if (req.params && Object.keys(req.params).length > 0) {
      this.checkObject(req.params, 'params', violations);
    }

    // Check request body (for POST/PUT/PATCH)
    if (req.body && Object.keys(req.body).length > 0) {
      this.checkObject(req.body, 'body', violations);
    }

    // Check suspicious headers
    this.checkHeaders(req, violations);

    // If violations found, block request
    if (violations.length > 0) {
      this.logViolation(req, violations);
      return this.blockRequest(res);
    }

    next();
  }

  /**
   * Check if path should be excluded from security checks
   */
  private isExcludedPath(path: string): boolean {
    return this.excludedPaths.some(
      (excluded) => path === excluded || path.startsWith(excluded + '/'),
    );
  }

  /**
   * Check an object (query, params, body) for malicious patterns
   */
  private checkObject(
    obj: Record<string, unknown>,
    location: SecurityViolation['location'],
    violations: SecurityViolation[],
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      // Check key name
      this.checkValue(key, location, violations);

      // Check value
      if (typeof value === 'string') {
        this.checkValue(value, location, violations);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively check nested objects
        this.checkObject(
          value as Record<string, unknown>,
          location,
          violations,
        );
      }
    }
  }

  /**
   * Check a string value against all security patterns
   */
  private checkValue(
    value: string,
    location: SecurityViolation['location'],
    violations: SecurityViolation[],
  ): void {
    // Skip empty values
    if (!value || value.length === 0) {
      return;
    }

    // Decode URL encoding for thorough checking
    const decodedValue = this.decodeValue(value);

    // Check SQL Injection
    for (const pattern of SECURITY_PATTERNS.sqlInjection) {
      if (pattern.test(decodedValue)) {
        violations.push({
          type: 'sql_injection',
          pattern: pattern.source,
          location,
          value: this.truncateValue(value),
        });
        return; // Early exit on first violation
      }
    }

    // Check XSS
    for (const pattern of SECURITY_PATTERNS.xss) {
      if (pattern.test(decodedValue)) {
        violations.push({
          type: 'xss',
          pattern: pattern.source,
          location,
          value: this.truncateValue(value),
        });
        return;
      }
    }

    // Check Path Traversal (check both original and decoded to catch URL-encoded attacks like %00)
    for (const pattern of SECURITY_PATTERNS.pathTraversal) {
      if (pattern.test(value) || pattern.test(decodedValue)) {
        violations.push({
          type: 'path_traversal',
          pattern: pattern.source,
          location,
          value: this.truncateValue(value),
        });
        return;
      }
    }

    // Check Command Injection
    for (const pattern of SECURITY_PATTERNS.commandInjection) {
      if (pattern.test(decodedValue)) {
        violations.push({
          type: 'command_injection',
          pattern: pattern.source,
          location,
          value: this.truncateValue(value),
        });
        return;
      }
    }
  }

  /**
   * Check request headers for suspicious patterns
   */
  private checkHeaders(req: Request, violations: SecurityViolation[]): void {
    const userAgent = req.headers['user-agent'];

    // Check for empty user-agent (common in automated attacks)
    if (SUSPICIOUS_HEADERS.emptyUserAgent && !userAgent) {
      // Don't block empty user-agent, just log (some legitimate tools don't send it)
      // This is informational only
    }

    // Check for SQL injection in user-agent (always suspicious)
    if (SUSPICIOUS_HEADERS.sqlInUserAgent && userAgent) {
      for (const pattern of SECURITY_PATTERNS.sqlInjection) {
        if (pattern.test(userAgent)) {
          violations.push({
            type: 'sql_injection',
            pattern: pattern.source,
            location: 'headers',
            value: this.truncateValue(userAgent),
          });
          return;
        }
      }
    }

    // Check Content-Type header for manipulation
    const contentType = req.headers['content-type'];
    if (contentType) {
      // Check for XSS in content-type (rare but possible attack vector)
      for (const pattern of SECURITY_PATTERNS.xss) {
        if (pattern.test(contentType)) {
          violations.push({
            type: 'xss',
            pattern: pattern.source,
            location: 'headers',
            value: this.truncateValue(contentType),
          });
          return;
        }
      }
    }
  }

  /**
   * Decode URL-encoded values for thorough checking
   */
  private decodeValue(value: string): string {
    try {
      // Attempt multiple decode passes to catch double-encoding
      let decoded = value;
      let previousDecoded = '';

      // Decode up to 3 times to catch multi-level encoding
      for (let i = 0; i < 3 && decoded !== previousDecoded; i++) {
        previousDecoded = decoded;
        decoded = decodeURIComponent(decoded);
      }

      return decoded;
    } catch {
      // If decoding fails, return original value
      return value;
    }
  }

  /**
   * Truncate value for logging (avoid log injection)
   */
  private truncateValue(value: string, maxLength = 100): string {
    if (value.length <= maxLength) {
      return value;
    }
    return value.substring(0, maxLength) + '...[truncated]';
  }

  /**
   * Log security violation for monitoring
   */
  private logViolation(req: Request, violations: SecurityViolation[]): void {
    const clientIp = this.getClientIp(req);
    const violation = violations[0]; // Log first violation

    this.logger.warn({
      message: 'Security violation blocked',
      type: violation.type,
      pattern: violation.pattern,
      location: violation.location,
      ip: clientIp,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'] || 'none',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get client IP address (handles proxies)
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * Block request with 403 Forbidden
   * Generic message to avoid information disclosure
   */
  private blockRequest(res: Response): void {
    res.status(403).json({
      statusCode: 403,
      message: 'Forbidden',
      error: 'Request blocked by security policy',
    });
  }
}

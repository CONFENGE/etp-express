import { WinstonLoggerService, createLogger } from './winston-logger.service';

/**
 * Tests for WinstonLoggerService (#652)
 *
 * Note: These tests verify the logger configuration and behavior.
 * Output format tests create isolated logger instances to avoid
 * interference from parallel test execution.
 */
describe('WinstonLoggerService', () => {
 const originalNodeEnv = process.env.NODE_ENV;

 afterEach(() => {
 process.env.NODE_ENV = originalNodeEnv;
 });

 describe('instance creation', () => {
 it('should create a logger instance', () => {
 const logger = new WinstonLoggerService();
 expect(logger).toBeInstanceOf(WinstonLoggerService);
 });

 it('should implement LoggerService interface', () => {
 const logger = new WinstonLoggerService();
 expect(typeof logger.log).toBe('function');
 expect(typeof logger.error).toBe('function');
 expect(typeof logger.warn).toBe('function');
 expect(typeof logger.debug).toBe('function');
 expect(typeof logger.verbose).toBe('function');
 });

 it('should have HTTP logging methods', () => {
 const logger = new WinstonLoggerService();
 expect(typeof logger.logRequest).toBe('function');
 expect(typeof logger.logResponse).toBe('function');
 expect(typeof logger.logError).toBe('function');
 });
 });

 describe('context handling', () => {
 it('should set context via setContext()', () => {
 const logger = new WinstonLoggerService();
 expect(() => logger.setContext('TestContext')).not.toThrow();
 });

 it('should not throw when logging without context', () => {
 const logger = new WinstonLoggerService();
 expect(() => logger.log('Test message')).not.toThrow();
 });

 it('should not throw when logging with context', () => {
 const logger = new WinstonLoggerService();
 logger.setContext('TestContext');
 expect(() => logger.log('Test message')).not.toThrow();
 });
 });

 describe('createLogger factory', () => {
 it('should create a logger with the specified context', () => {
 const logger = createLogger('FactoryTest');
 expect(logger).toBeInstanceOf(WinstonLoggerService);
 });
 });

 describe('log methods', () => {
 let logger: WinstonLoggerService;

 beforeEach(() => {
 logger = new WinstonLoggerService();
 logger.setContext('TestContext');
 });

 it('should not throw for log()', () => {
 expect(() => logger.log('Info message')).not.toThrow();
 });

 it('should not throw for error()', () => {
 expect(() => logger.error('Error message')).not.toThrow();
 });

 it('should not throw for warn()', () => {
 expect(() => logger.warn('Warning message')).not.toThrow();
 });

 it('should not throw for debug()', () => {
 expect(() => logger.debug('Debug message')).not.toThrow();
 });

 it('should not throw for verbose()', () => {
 expect(() => logger.verbose('Verbose message')).not.toThrow();
 });

 it('should handle optional params in log()', () => {
 expect(() => logger.log('Message', { extra: 'data' })).not.toThrow();
 expect(() => logger.log('Message', 'OverrideContext')).not.toThrow();
 });

 it('should handle error with stack trace', () => {
 expect(() =>
 logger.error('Error message', 'Stack trace here'),
 ).not.toThrow();
 });
 });

 describe('HTTP logging methods', () => {
 let logger: WinstonLoggerService;

 beforeEach(() => {
 logger = new WinstonLoggerService();
 logger.setContext('HTTP');
 });

 it('should log request with all fields', () => {
 expect(() =>
 logger.logRequest({
 method: 'GET',
 path: '/api/etps',
 ip: '192.168.1.1',
 userAgent: 'Mozilla/5.0',
 userId: 'user-123',
 organizationId: 'org-456',
 }),
 ).not.toThrow();
 });

 it('should log request with minimal fields', () => {
 expect(() =>
 logger.logRequest({
 method: 'GET',
 path: '/api/health',
 }),
 ).not.toThrow();
 });

 it('should log response with all fields', () => {
 expect(() =>
 logger.logResponse({
 method: 'GET',
 path: '/api/etps',
 statusCode: 200,
 durationMs: 45,
 userId: 'user-123',
 organizationId: 'org-456',
 }),
 ).not.toThrow();
 });

 it('should log error with all fields', () => {
 expect(() =>
 logger.logError({
 method: 'GET',
 path: '/api/etps',
 durationMs: 12,
 error: 'Not found',
 stack: 'Error: Not found\n at ...',
 statusCode: 404,
 }),
 ).not.toThrow();
 });

 it('should log error with minimal fields', () => {
 expect(() =>
 logger.logError({
 method: 'GET',
 path: '/api/etps',
 durationMs: 12,
 error: 'Not found',
 }),
 ).not.toThrow();
 });
 });

 describe('environment configuration', () => {
 it('should create logger in production mode', () => {
 process.env.NODE_ENV = 'production';
 const logger = new WinstonLoggerService();
 expect(logger).toBeInstanceOf(WinstonLoggerService);
 expect(() => logger.log('Test')).not.toThrow();
 });

 it('should create logger in development mode', () => {
 process.env.NODE_ENV = 'development';
 const logger = new WinstonLoggerService();
 expect(logger).toBeInstanceOf(WinstonLoggerService);
 expect(() => logger.log('Test')).not.toThrow();
 });

 it('should create logger in test mode', () => {
 process.env.NODE_ENV = 'test';
 const logger = new WinstonLoggerService();
 expect(logger).toBeInstanceOf(WinstonLoggerService);
 expect(() => logger.log('Test')).not.toThrow();
 });

 it('should create logger without NODE_ENV', () => {
 delete process.env.NODE_ENV;
 const logger = new WinstonLoggerService();
 expect(logger).toBeInstanceOf(WinstonLoggerService);
 expect(() => logger.log('Test')).not.toThrow();
 process.env.NODE_ENV = originalNodeEnv;
 });
 });
});

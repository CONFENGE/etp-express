import { getLogLevels, LOG_LEVELS, LogLevel } from './logger.config';

describe('Logger Configuration (#608)', () => {
 // Save original NODE_ENV
 const originalNodeEnv = process.env.NODE_ENV;

 afterEach(() => {
 // Restore NODE_ENV after each test
 process.env.NODE_ENV = originalNodeEnv;
 });

 describe('LOG_LEVELS', () => {
 it('should define production with only error and warn', () => {
 expect(LOG_LEVELS.production).toEqual(['error', 'warn']);
 });

 it('should define staging with error, warn, and log', () => {
 expect(LOG_LEVELS.staging).toEqual(['error', 'warn', 'log']);
 });

 it('should define development with all log levels', () => {
 expect(LOG_LEVELS.development).toEqual([
 'error',
 'warn',
 'log',
 'debug',
 'verbose',
 ]);
 });

 it('should define test with minimal logging', () => {
 expect(LOG_LEVELS.test).toEqual(['error', 'warn']);
 });

 it('should NOT include debug in production (security)', () => {
 expect(LOG_LEVELS.production).not.toContain('debug');
 expect(LOG_LEVELS.production).not.toContain('verbose');
 });

 it('should NOT include debug in staging (security)', () => {
 expect(LOG_LEVELS.staging).not.toContain('debug');
 expect(LOG_LEVELS.staging).not.toContain('verbose');
 });
 });

 describe('getLogLevels()', () => {
 describe('with explicit environment parameter', () => {
 it('should return production levels for "production"', () => {
 const levels = getLogLevels('production');
 expect(levels).toEqual(['error', 'warn']);
 });

 it('should return staging levels for "staging"', () => {
 const levels = getLogLevels('staging');
 expect(levels).toEqual(['error', 'warn', 'log']);
 });

 it('should return development levels for "development"', () => {
 const levels = getLogLevels('development');
 expect(levels).toEqual(['error', 'warn', 'log', 'debug', 'verbose']);
 });

 it('should return test levels for "test"', () => {
 const levels = getLogLevels('test');
 expect(levels).toEqual(['error', 'warn']);
 });

 it('should fallback to development for unknown environment', () => {
 const levels = getLogLevels('unknown-env');
 expect(levels).toEqual(LOG_LEVELS.development);
 });
 });

 describe('with process.env.NODE_ENV', () => {
 it('should use NODE_ENV when no parameter provided', () => {
 process.env.NODE_ENV = 'production';
 const levels = getLogLevels();
 expect(levels).toEqual(['error', 'warn']);
 });

 it('should fallback to development when NODE_ENV is undefined', () => {
 delete process.env.NODE_ENV;
 const levels = getLogLevels();
 expect(levels).toEqual(LOG_LEVELS.development);
 });

 it('should fallback to development when NODE_ENV is empty string', () => {
 process.env.NODE_ENV = '';
 const levels = getLogLevels();
 expect(levels).toEqual(LOG_LEVELS.development);
 });
 });

 describe('type safety', () => {
 it('should return valid LogLevel array', () => {
 const validLevels: LogLevel[] = [
 'error',
 'warn',
 'log',
 'debug',
 'verbose',
 ];

 const levels = getLogLevels('development');
 levels.forEach((level) => {
 expect(validLevels).toContain(level);
 });
 });
 });
 });

 describe('security requirements', () => {
 it('should minimize production logs to prevent data leakage', () => {
 const productionLevels = getLogLevels('production');
 // Maximum 2 levels in production
 expect(productionLevels.length).toBeLessThanOrEqual(2);
 // Must include at least error and warn for operational visibility
 expect(productionLevels).toContain('error');
 expect(productionLevels).toContain('warn');
 });

 it('should have more restrictive levels than development', () => {
 const prodLevels = getLogLevels('production');
 const devLevels = getLogLevels('development');
 expect(prodLevels.length).toBeLessThan(devLevels.length);
 });
 });
});

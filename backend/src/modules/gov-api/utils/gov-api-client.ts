/**
 * Government API HTTP Client
 *
 * Provides resilient HTTP client with:
 * - Circuit breaker (Opossum)
 * - Retry with exponential backoff
 * - Rate limiting
 * - Request timeout
 *
 * @module modules/gov-api/utils/gov-api-client
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import CircuitBreaker from 'opossum';
import { withRetry, RetryOptions } from '../../../common/utils/retry';
import {
 GovApiSource,
 GovApiRateLimitConfig,
} from '../interfaces/gov-api.interface';

/**
 * Configuration options for GovApiClient
 */
export interface GovApiClientConfig {
 /** Base URL for the API */
 baseUrl: string;
 /** API source identifier */
 source: GovApiSource;
 /** Request timeout in milliseconds */
 timeout?: number;
 /** Additional headers */
 headers?: Record<string, string>;
 /** Circuit breaker configuration */
 circuitBreaker?: {
 timeout?: number;
 errorThresholdPercentage?: number;
 resetTimeout?: number;
 volumeThreshold?: number;
 };
 /** Retry configuration */
 retry?: Partial<RetryOptions>;
 /** Rate limiting configuration */
 rateLimit?: GovApiRateLimitConfig;
}

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CIRCUIT_CONFIG = {
 timeout: 30000, // 30s timeout
 errorThresholdPercentage: 50, // Open after 50% errors
 resetTimeout: 60000, // Try again after 60s
 volumeThreshold: 5, // Minimum requests to evaluate
};

/**
 * Default retry configuration for government APIs
 */
const DEFAULT_RETRY_OPTIONS: Partial<RetryOptions> = {
 maxRetries: 3,
 baseDelay: 2000, // 2s base delay
 maxDelay: 15000, // 15s max delay
 retryableErrors: [
 'ETIMEDOUT',
 'ECONNRESET',
 'ECONNREFUSED',
 'ENOTFOUND',
 '429',
 '500',
 '502',
 '503',
 '504',
 'timeout',
 'network error',
 ],
};

/**
 * Default rate limit configuration
 */
const DEFAULT_RATE_LIMIT: GovApiRateLimitConfig = {
 maxRequests: 100, // 100 requests
 windowMs: 60000, // per minute
 throwOnLimit: false, // Don't throw, just delay
};

/**
 * Rate limiter using sliding window algorithm
 */
class RateLimiter {
 private requests: number[] = [];
 private readonly config: GovApiRateLimitConfig;
 private readonly logger: Logger;

 constructor(config: GovApiRateLimitConfig, logger: Logger) {
 this.config = config;
 this.logger = logger;
 }

 async acquire(): Promise<void> {
 const now = Date.now();

 // Remove expired requests
 this.requests = this.requests.filter(
 (time) => now - time < this.config.windowMs,
 );

 if (this.requests.length >= this.config.maxRequests) {
 if (this.config.throwOnLimit) {
 throw new Error(
 `Rate limit exceeded: ${this.config.maxRequests} requests per ${this.config.windowMs}ms`,
 );
 }

 // Calculate wait time until oldest request expires
 const oldestRequest = this.requests[0];
 const waitTime = oldestRequest + this.config.windowMs - now;

 this.logger.warn(
 `Rate limit reached, waiting ${waitTime}ms before next request`,
 );

 await this.sleep(waitTime);

 // Re-check after waiting
 return this.acquire();
 }

 this.requests.push(now);
 }

 private sleep(ms: number): Promise<void> {
 return new Promise((resolve) => setTimeout(resolve, ms));
 }

 getStats(): { current: number; max: number; windowMs: number } {
 const now = Date.now();
 this.requests = this.requests.filter(
 (time) => now - time < this.config.windowMs,
 );

 return {
 current: this.requests.length,
 max: this.config.maxRequests,
 windowMs: this.config.windowMs,
 };
 }
}

/**
 * GovApiClient - Resilient HTTP client for government APIs
 *
 * Features:
 * - Circuit breaker pattern to prevent cascade failures
 * - Automatic retry with exponential backoff
 * - Rate limiting to respect API quotas
 * - Request/response logging
 *
 * @example
 * ```typescript
 * const client = new GovApiClient(configService, {
 * baseUrl: 'https://pncp.gov.br/api/consulta',
 * source: 'pncp',
 * timeout: 30000,
 * });
 *
 * const response = await client.get('/v1/contratacoes', { params: { q: 'software' } });
 * ```
 */
@Injectable()
export class GovApiClient {
 private readonly logger: Logger;
 private readonly axios: AxiosInstance;
 private readonly circuitBreaker: CircuitBreaker;
 private readonly rateLimiter: RateLimiter;
 private readonly retryOptions: Partial<RetryOptions>;
 private readonly source: GovApiSource;

 constructor(
 private readonly configService: ConfigService,
 private readonly config: GovApiClientConfig,
 ) {
 this.source = config.source;
 this.logger = new Logger(`GovApiClient:${config.source.toUpperCase()}`);

 // Initialize Axios instance
 this.axios = axios.create({
 baseURL: config.baseUrl,
 timeout: config.timeout || 30000,
 headers: {
 'Content-Type': 'application/json',
 Accept: 'application/json',
 'User-Agent': 'ETPExpress/1.0 (Government API Integration)',
 ...config.headers,
 },
 });

 // Initialize retry options
 this.retryOptions = {
 ...DEFAULT_RETRY_OPTIONS,
 ...config.retry,
 logger: this.logger,
 operationName: `GovAPI:${config.source}`,
 };

 // Initialize rate limiter
 this.rateLimiter = new RateLimiter(
 config.rateLimit || DEFAULT_RATE_LIMIT,
 this.logger,
 );

 // Initialize circuit breaker
 const cbConfig = {
 ...DEFAULT_CIRCUIT_CONFIG,
 ...config.circuitBreaker,
 };

 this.circuitBreaker = new CircuitBreaker(
 async (request: () => Promise<AxiosResponse>) => request(),
 {
 timeout: cbConfig.timeout,
 errorThresholdPercentage: cbConfig.errorThresholdPercentage,
 resetTimeout: cbConfig.resetTimeout,
 volumeThreshold: cbConfig.volumeThreshold,
 },
 );

 // Circuit breaker event listeners
 this.setupCircuitBreakerEvents();
 }

 /**
 * Setup circuit breaker event listeners for monitoring
 */
 private setupCircuitBreakerEvents(): void {
 this.circuitBreaker.on('open', () => {
 this.logger.warn(
 `Circuit breaker OPENED for ${this.source} - too many failures, requests will be rejected`,
 );
 });

 this.circuitBreaker.on('halfOpen', () => {
 this.logger.log(
 `Circuit breaker HALF-OPEN for ${this.source} - testing connection...`,
 );
 });

 this.circuitBreaker.on('close', () => {
 this.logger.log(
 `Circuit breaker CLOSED for ${this.source} - service healthy`,
 );
 });

 this.circuitBreaker.on('timeout', () => {
 this.logger.warn(`Request timeout for ${this.source}`);
 });

 this.circuitBreaker.on('reject', () => {
 this.logger.warn(`Request rejected for ${this.source} - circuit is open`);
 });

 this.circuitBreaker.on('fallback', () => {
 this.logger.log(`Fallback triggered for ${this.source}`);
 });
 }

 /**
 * Execute GET request with resilience patterns
 *
 * @param url Request URL (relative to baseUrl)
 * @param config Axios request config
 * @returns Response data
 */
 async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
 return this.request<T>({ ...config, method: 'GET', url });
 }

 /**
 * Execute POST request with resilience patterns
 *
 * @param url Request URL (relative to baseUrl)
 * @param data Request body
 * @param config Axios request config
 * @returns Response data
 */
 async post<T>(
 url: string,
 data?: unknown,
 config?: AxiosRequestConfig,
 ): Promise<T> {
 return this.request<T>({ ...config, method: 'POST', url, data });
 }

 /**
 * Execute request with all resilience patterns applied
 *
 * Order of execution:
 * 1. Rate limiting (wait if necessary)
 * 2. Circuit breaker check
 * 3. Retry with exponential backoff
 * 4. Actual HTTP request
 */
 private async request<T>(config: AxiosRequestConfig): Promise<T> {
 const startTime = Date.now();
 const { method, url } = config;

 this.logger.debug(`[${method}] ${url} - Starting request`);

 // 1. Rate limiting
 await this.rateLimiter.acquire();

 // 2. Circuit breaker + 3. Retry
 try {
 const response = (await this.circuitBreaker.fire(async () => {
 return withRetry(
 () => this.axios.request<T>(config),
 this.retryOptions,
 );
 })) as AxiosResponse<T>;

 const duration = Date.now() - startTime;
 this.logger.debug(
 `[${method}] ${url} - Success (${duration}ms, status: ${response.status})`,
 );

 return response.data;
 } catch (error) {
 const duration = Date.now() - startTime;
 const errorMessage =
 error instanceof Error ? error.message : 'Unknown error';

 this.logger.error(
 `[${method}] ${url} - Failed after ${duration}ms: ${errorMessage}`,
 );

 throw error;
 }
 }

 /**
 * Execute a health check request (bypasses circuit breaker)
 *
 * @param url Health check URL
 * @param timeoutMs Timeout in milliseconds
 * @returns Latency in milliseconds
 */
 async healthCheck(
 url: string = '/',
 timeoutMs: number = 5000,
 ): Promise<number> {
 const startTime = Date.now();

 try {
 await this.axios.get(url, { timeout: timeoutMs });
 return Date.now() - startTime;
 } catch {
 throw new Error(`Health check failed for ${this.source}`);
 }
 }

 /**
 * Get current circuit breaker state
 */
 getCircuitState(): {
 opened: boolean;
 halfOpen: boolean;
 closed: boolean;
 stats: Record<string, unknown>;
 } {
 return {
 opened: this.circuitBreaker.opened,
 halfOpen: this.circuitBreaker.halfOpen,
 closed: this.circuitBreaker.closed,
 stats: this.circuitBreaker.stats as unknown as Record<string, unknown>,
 };
 }

 /**
 * Get rate limiter statistics
 */
 getRateLimitStats(): { current: number; max: number; windowMs: number } {
 return this.rateLimiter.getStats();
 }

 /**
 * Check if circuit breaker is allowing requests
 */
 isAvailable(): boolean {
 return !this.circuitBreaker.opened;
 }
}

/**
 * Factory function to create GovApiClient instances
 */
export function createGovApiClient(
 configService: ConfigService,
 config: GovApiClientConfig,
): GovApiClient {
 return new GovApiClient(configService, config);
}

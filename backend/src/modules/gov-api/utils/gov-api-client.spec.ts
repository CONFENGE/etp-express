import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GovApiClient, GovApiClientConfig } from './gov-api-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock opossum (circuit breaker)
jest.mock('opossum', () => {
 return jest.fn().mockImplementation((fn) => {
 const mockCircuitBreaker = {
 fire: jest
 .fn()
 .mockImplementation(async (request: () => Promise<unknown>) => {
 return request();
 }),
 on: jest.fn(),
 opened: false,
 halfOpen: false,
 closed: true,
 stats: {
 failures: 0,
 successes: 0,
 rejects: 0,
 fires: 0,
 timeouts: 0,
 cacheHits: 0,
 cacheMisses: 0,
 fallbacks: 0,
 },
 };
 return mockCircuitBreaker;
 });
});

describe('GovApiClient', () => {
 let client: GovApiClient;
 let configService: ConfigService;
 let mockAxiosInstance: jest.Mocked<ReturnType<typeof axios.create>>;

 const defaultConfig: GovApiClientConfig = {
 baseUrl: 'https://api.test.gov.br',
 source: 'pncp',
 timeout: 30000,
 };

 beforeEach(() => {
 jest.clearAllMocks();

 // Setup mock axios instance
 mockAxiosInstance = {
 request: jest.fn(),
 get: jest.fn(),
 post: jest.fn(),
 defaults: { baseURL: defaultConfig.baseUrl },
 } as unknown as jest.Mocked<ReturnType<typeof axios.create>>;

 mockedAxios.create.mockReturnValue(mockAxiosInstance);

 // Setup config service
 configService = {
 get: jest.fn().mockReturnValue(null),
 } as unknown as ConfigService;

 // Create client instance
 client = new GovApiClient(configService, defaultConfig);
 });

 describe('constructor', () => {
 it('should create axios instance with correct configuration', () => {
 expect(mockedAxios.create).toHaveBeenCalledWith(
 expect.objectContaining({
 baseURL: defaultConfig.baseUrl,
 timeout: defaultConfig.timeout,
 headers: expect.objectContaining({
 'Content-Type': 'application/json',
 Accept: 'application/json',
 }),
 }),
 );
 });

 it('should merge custom headers', () => {
 const customHeaders = { 'X-Custom-Header': 'test-value' };
 new GovApiClient(configService, {
 ...defaultConfig,
 headers: customHeaders,
 });

 expect(mockedAxios.create).toHaveBeenCalledWith(
 expect.objectContaining({
 headers: expect.objectContaining(customHeaders),
 }),
 );
 });

 it('should use default timeout if not provided', () => {
 new GovApiClient(configService, {
 baseUrl: 'https://api.test.gov.br',
 source: 'pncp',
 });

 expect(mockedAxios.create).toHaveBeenCalledWith(
 expect.objectContaining({
 timeout: 30000,
 }),
 );
 });
 });

 describe('get()', () => {
 it('should execute GET request successfully', async () => {
 const responseData = { items: [{ id: '1', name: 'Test' }] };
 mockAxiosInstance.request.mockResolvedValue({
 data: responseData,
 status: 200,
 });

 const result = await client.get('/v1/items');

 expect(mockAxiosInstance.request).toHaveBeenCalledWith(
 expect.objectContaining({
 method: 'GET',
 url: '/v1/items',
 }),
 );
 expect(result).toEqual(responseData);
 });

 it('should pass query parameters', async () => {
 const responseData = { items: [] };
 mockAxiosInstance.request.mockResolvedValue({
 data: responseData,
 status: 200,
 });

 await client.get('/v1/items', { params: { q: 'software', page: 1 } });

 expect(mockAxiosInstance.request).toHaveBeenCalledWith(
 expect.objectContaining({
 params: { q: 'software', page: 1 },
 }),
 );
 });

 it('should throw error on request failure', async () => {
 // Use a non-retryable error to avoid retry delays
 const error = new Error('Non-retryable error');
 mockAxiosInstance.request.mockRejectedValue(error);

 await expect(client.get('/v1/items')).rejects.toThrow(
 'Non-retryable error',
 );
 }, 10000);
 });

 describe('post()', () => {
 it('should execute POST request with data', async () => {
 const requestData = { name: 'Test Item' };
 const responseData = { id: '123', name: 'Test Item' };
 mockAxiosInstance.request.mockResolvedValue({
 data: responseData,
 status: 201,
 });

 const result = await client.post('/v1/items', requestData);

 expect(mockAxiosInstance.request).toHaveBeenCalledWith(
 expect.objectContaining({
 method: 'POST',
 url: '/v1/items',
 data: requestData,
 }),
 );
 expect(result).toEqual(responseData);
 });

 it('should handle POST without body', async () => {
 const responseData = { success: true };
 mockAxiosInstance.request.mockResolvedValue({
 data: responseData,
 status: 200,
 });

 const result = await client.post('/v1/action');

 expect(mockAxiosInstance.request).toHaveBeenCalledWith(
 expect.objectContaining({
 method: 'POST',
 url: '/v1/action',
 }),
 );
 expect(result).toEqual(responseData);
 });
 });

 describe('healthCheck()', () => {
 it('should return latency on successful health check', async () => {
 mockAxiosInstance.get.mockResolvedValue({ status: 200 });

 const latency = await client.healthCheck('/health');

 expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', {
 timeout: 5000,
 });
 expect(typeof latency).toBe('number');
 expect(latency).toBeGreaterThanOrEqual(0);
 });

 it('should use default URL if not provided', async () => {
 mockAxiosInstance.get.mockResolvedValue({ status: 200 });

 await client.healthCheck();

 expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
 timeout: 5000,
 });
 });

 it('should throw error on health check failure', async () => {
 mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

 await expect(client.healthCheck()).rejects.toThrow(
 'Health check failed for pncp',
 );
 });

 it('should use custom timeout', async () => {
 mockAxiosInstance.get.mockResolvedValue({ status: 200 });

 await client.healthCheck('/health', 10000);

 expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health', {
 timeout: 10000,
 });
 });
 });

 describe('getCircuitState()', () => {
 it('should return circuit breaker state', () => {
 const state = client.getCircuitState();

 expect(state).toEqual(
 expect.objectContaining({
 opened: expect.any(Boolean),
 halfOpen: expect.any(Boolean),
 closed: expect.any(Boolean),
 stats: expect.any(Object),
 }),
 );
 });

 it('should return closed state initially', () => {
 const state = client.getCircuitState();

 expect(state.closed).toBe(true);
 expect(state.opened).toBe(false);
 expect(state.halfOpen).toBe(false);
 });
 });

 describe('getRateLimitStats()', () => {
 it('should return rate limit statistics', () => {
 const stats = client.getRateLimitStats();

 expect(stats).toEqual(
 expect.objectContaining({
 current: expect.any(Number),
 max: expect.any(Number),
 windowMs: expect.any(Number),
 }),
 );
 });

 it('should start with zero current requests', () => {
 const stats = client.getRateLimitStats();

 expect(stats.current).toBe(0);
 });
 });

 describe('isAvailable()', () => {
 it('should return true when circuit is closed', () => {
 expect(client.isAvailable()).toBe(true);
 });
 });

 describe('rate limiting', () => {
 it('should track requests in rate limiter', async () => {
 mockAxiosInstance.request.mockResolvedValue({
 data: {},
 status: 200,
 });

 await client.get('/v1/items');

 const stats = client.getRateLimitStats();
 expect(stats.current).toBe(1);
 });

 it('should allow multiple requests within limit', async () => {
 mockAxiosInstance.request.mockResolvedValue({
 data: {},
 status: 200,
 });

 // Make 5 requests
 for (let i = 0; i < 5; i++) {
 await client.get('/v1/items');
 }

 const stats = client.getRateLimitStats();
 expect(stats.current).toBe(5);
 });
 });

 describe('different sources', () => {
 it.each([
 ['pncp', 'PNCP'],
 ['comprasgov', 'COMPRASGOV'],
 ['sinapi', 'SINAPI'],
 ['sicro', 'SICRO'],
 ] as const)(
 'should create client for %s source',
 (source, expectedLogName) => {
 const sourceClient = new GovApiClient(configService, {
 ...defaultConfig,
 source,
 });

 expect(sourceClient).toBeInstanceOf(GovApiClient);
 expect(sourceClient.getCircuitState()).toBeDefined();
 },
 );
 });
});

describe('createGovApiClient', () => {
 it('should create a GovApiClient instance', () => {
 // Import the factory function
 const { createGovApiClient } = require('./gov-api-client');

 const configService = {
 get: jest.fn().mockReturnValue(null),
 } as unknown as ConfigService;

 const client = createGovApiClient(configService, {
 baseUrl: 'https://api.test.gov.br',
 source: 'pncp',
 });

 expect(client).toBeInstanceOf(GovApiClient);
 });
});

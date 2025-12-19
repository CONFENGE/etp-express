import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAIService, LLMRequest } from './openai.service';
import OpenAI from 'openai';

// Mock the OpenAI module
jest.mock('openai');

describe('OpenAIService', () => {
 let service: OpenAIService;
 let configService: ConfigService;

 const mockOpenAIInstance = {
 chat: {
 completions: {
 create: jest.fn(),
 },
 },
 };

 const mockConfigService = {
 get: jest.fn((key: string, defaultValue?: unknown) => {
 const config: Record<string, string | number> = {
 OPENAI_API_KEY: 'test-api-key',
 OPENAI_TEMPERATURE: 0.7,
 OPENAI_MAX_TOKENS: 4000,
 OPENAI_MODEL: 'gpt-4.1-nano',
 };
 return config[key] || defaultValue;
 }),
 };

 beforeEach(async () => {
 // Reset the OpenAI mock
 (OpenAI as jest.MockedClass<typeof OpenAI>).mockClear();
 (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
 () => mockOpenAIInstance as any,
 );

 const module: TestingModule = await Test.createTestingModule({
 providers: [
 OpenAIService,
 {
 provide: ConfigService,
 useValue: mockConfigService,
 },
 ],
 }).compile();

 service = module.get<OpenAIService>(OpenAIService);
 configService = module.get<ConfigService>(ConfigService);

 // Clear all mocks before each test
 jest.clearAllMocks();
 });

 it('should be defined', () => {
 expect(service).toBeDefined();
 });

 describe('generateCompletion', () => {
 const mockRequest: LLMRequest = {
 systemPrompt: 'You are a helpful assistant',
 userPrompt: 'Write a short essay',
 };

 const mockCompletion = {
 model: 'gpt-4.1-nano',
 choices: [
 {
 message: {
 content: 'This is a generated essay.',
 },
 finish_reason: 'stop',
 },
 ],
 usage: {
 total_tokens: 150,
 },
 };

 it('should generate completion successfully', async () => {
 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 const result = await service.generateCompletion(mockRequest);

 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
 model: 'gpt-4.1-nano',
 messages: [
 { role: 'system', content: 'You are a helpful assistant' },
 { role: 'user', content: 'Write a short essay' },
 ],
 temperature: 0.7,
 max_tokens: 4000,
 });

 expect(result).toEqual({
 content: 'This is a generated essay.',
 tokens: 150,
 model: 'gpt-4.1-nano',
 finishReason: 'stop',
 });
 });

 it('should use custom temperature and maxTokens when provided', async () => {
 const requestWithCustomParams: LLMRequest = {
 ...mockRequest,
 temperature: 0.9,
 maxTokens: 2000,
 };

 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 await service.generateCompletion(requestWithCustomParams);

 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
 expect.objectContaining({
 temperature: 0.9,
 max_tokens: 2000,
 }),
 );
 });

 it('should use custom model when provided', async () => {
 const requestWithCustomModel: LLMRequest = {
 ...mockRequest,
 model: 'gpt-3.5-turbo',
 };

 mockOpenAIInstance.chat.completions.create.mockResolvedValue({
 ...mockCompletion,
 model: 'gpt-3.5-turbo',
 });

 const result = await service.generateCompletion(requestWithCustomModel);

 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
 expect.objectContaining({
 model: 'gpt-3.5-turbo',
 }),
 );
 expect(result.model).toBe('gpt-3.5-turbo');
 });

 it('should handle empty content gracefully', async () => {
 const emptyCompletion = {
 ...mockCompletion,
 choices: [
 {
 message: {
 content: null,
 },
 finish_reason: 'stop',
 },
 ],
 };

 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 emptyCompletion,
 );

 const result = await service.generateCompletion(mockRequest);

 expect(result.content).toBe('');
 });

 it('should handle missing usage data', async () => {
 const completionWithoutUsage = {
 ...mockCompletion,
 usage: undefined,
 };

 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 completionWithoutUsage,
 );

 const result = await service.generateCompletion(mockRequest);

 expect(result.tokens).toBe(0);
 });

 it('should throw error when API call fails', async () => {
 const apiError = new Error('API rate limit exceeded');
 mockOpenAIInstance.chat.completions.create.mockRejectedValue(apiError);

 await expect(service.generateCompletion(mockRequest)).rejects.toThrow(
 'API rate limit exceeded',
 );
 });

 it('should log generation time and token usage', async () => {
 const loggerSpy = jest.spyOn(service['logger'], 'log');
 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 await service.generateCompletion(mockRequest);

 expect(loggerSpy).toHaveBeenCalledWith(
 'Generating completion with model: gpt-4.1-nano',
 );
 expect(loggerSpy).toHaveBeenCalledWith(
 expect.stringContaining('Completion generated in'),
 );
 expect(loggerSpy).toHaveBeenCalledWith(
 expect.stringContaining('Tokens: 150'),
 );
 });
 });

 describe('generateStreamCompletion', () => {
 const mockRequest: LLMRequest = {
 systemPrompt: 'You are a helpful assistant',
 userPrompt: 'Write a story',
 };

 it('should generate streaming completion successfully', async () => {
 const mockChunks = [
 {
 choices: [
 {
 delta: {
 content: 'Once ',
 },
 },
 ],
 },
 {
 choices: [
 {
 delta: {
 content: 'upon ',
 },
 },
 ],
 },
 {
 choices: [
 {
 delta: {
 content: 'a time...',
 },
 },
 ],
 },
 ];

 // Create an async iterable mock
 const mockStream = {
 [Symbol.asyncIterator]: async function* () {
 for (const chunk of mockChunks) {
 yield chunk;
 }
 },
 };

 mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockStream);

 const onChunkMock = jest.fn();
 const result = await service.generateStreamCompletion(
 mockRequest,
 onChunkMock,
 );

 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
 model: 'gpt-4.1-nano',
 messages: [
 { role: 'system', content: 'You are a helpful assistant' },
 { role: 'user', content: 'Write a story' },
 ],
 temperature: 0.7,
 max_tokens: 4000,
 stream: true,
 });

 expect(onChunkMock).toHaveBeenCalledTimes(3);
 expect(onChunkMock).toHaveBeenCalledWith('Once ');
 expect(onChunkMock).toHaveBeenCalledWith('upon ');
 expect(onChunkMock).toHaveBeenCalledWith('a time...');

 expect(result.content).toBe('Once upon a time...');
 expect(result.model).toBe('gpt-4.1-nano');
 expect(result.finishReason).toBe('stop');
 expect(result.tokens).toBeGreaterThan(0);
 });

 it('should handle empty chunks', async () => {
 const mockChunks = [
 {
 choices: [
 {
 delta: {},
 },
 ],
 },
 {
 choices: [
 {
 delta: {
 content: 'Hello',
 },
 },
 ],
 },
 ];

 const mockStream = {
 [Symbol.asyncIterator]: async function* () {
 for (const chunk of mockChunks) {
 yield chunk;
 }
 },
 };

 mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockStream);

 const onChunkMock = jest.fn();
 const result = await service.generateStreamCompletion(
 mockRequest,
 onChunkMock,
 );

 // Only the chunk with content should be passed to onChunk
 expect(onChunkMock).toHaveBeenCalledTimes(1);
 expect(onChunkMock).toHaveBeenCalledWith('Hello');
 expect(result.content).toBe('Hello');
 });

 it('should throw error when streaming API call fails', async () => {
 const apiError = new Error('Streaming API error');
 mockOpenAIInstance.chat.completions.create.mockRejectedValue(apiError);

 const onChunkMock = jest.fn();

 await expect(
 service.generateStreamCompletion(mockRequest, onChunkMock),
 ).rejects.toThrow('Streaming API error');
 });

 it('should estimate tokens based on content length', async () => {
 // Content with 100 characters should estimate ~25 tokens (100/4)
 const longContent = 'a'.repeat(100);
 const mockChunks = [
 {
 choices: [
 {
 delta: {
 content: longContent,
 },
 },
 ],
 },
 ];

 const mockStream = {
 [Symbol.asyncIterator]: async function* () {
 for (const chunk of mockChunks) {
 yield chunk;
 }
 },
 };

 mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockStream);

 const onChunkMock = jest.fn();
 const result = await service.generateStreamCompletion(
 mockRequest,
 onChunkMock,
 );

 expect(result.tokens).toBe(25); // 100 / 4 = 25
 });
 });

 describe('Cache', () => {
 const mockRequest: LLMRequest = {
 systemPrompt: 'You are a helpful assistant',
 userPrompt: 'Test prompt for cache',
 };

 const mockCompletion = {
 model: 'gpt-4.1-nano',
 choices: [
 {
 message: {
 content: 'Cached response',
 },
 finish_reason: 'stop',
 },
 ],
 usage: {
 total_tokens: 100,
 },
 };

 it('should call OpenAI on cache MISS', async () => {
 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 const result = await service.generateCompletion(mockRequest);

 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
 1,
 );
 expect(result.content).toBe('Cached response');
 });

 it('should NOT call OpenAI on cache HIT (second identical request)', async () => {
 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 // First call - cache MISS
 await service.generateCompletion(mockRequest);
 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
 1,
 );

 // Second call - cache HIT (should not call OpenAI again)
 const result = await service.generateCompletion(mockRequest);
 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
 1,
 ); // Still 1, not 2
 expect(result.content).toBe('Cached response');
 });

 it('should generate different cache keys for different temperatures', async () => {
 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 // First request with temperature 0.7
 const request1: LLMRequest = {
 ...mockRequest,
 temperature: 0.7,
 };
 await service.generateCompletion(request1);
 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
 1,
 );

 // Second request with temperature 0.9 (different cache key)
 const request2: LLMRequest = {
 ...mockRequest,
 temperature: 0.9,
 };
 await service.generateCompletion(request2);
 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
 2,
 ); // Should call OpenAI again (different cache key)
 });

 it('should generate different cache keys for different prompts', async () => {
 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 // First request
 await service.generateCompletion(mockRequest);
 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
 1,
 );

 // Second request with different user prompt
 const differentRequest: LLMRequest = {
 ...mockRequest,
 userPrompt: 'Different prompt',
 };
 await service.generateCompletion(differentRequest);
 expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(
 2,
 ); // Should call OpenAI again
 });

 it('should log Cache HIT and Cache MISS correctly', async () => {
 const loggerSpy = jest.spyOn(service['logger'], 'log');
 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 // First call - cache MISS
 await service.generateCompletion(mockRequest);
 expect(loggerSpy).toHaveBeenCalledWith(
 expect.stringContaining('Cache MISS:'),
 );

 loggerSpy.mockClear();

 // Second call - cache HIT
 await service.generateCompletion(mockRequest);
 expect(loggerSpy).toHaveBeenCalledWith(
 expect.stringContaining('Cache HIT:'),
 );
 });

 it('should return cache stats with correct structure', () => {
 const stats = service.getCacheStats();

 expect(stats).toHaveProperty('keys');
 expect(stats).toHaveProperty('maxKeys');
 expect(stats).toHaveProperty('hits');
 expect(stats).toHaveProperty('misses');
 expect(stats).toHaveProperty('hitRate');
 expect(typeof stats.keys).toBe('number');
 expect(typeof stats.maxKeys).toBe('number');
 expect(typeof stats.hits).toBe('number');
 expect(typeof stats.misses).toBe('number');
 expect(typeof stats.hitRate).toBe('number');
 });

 it('should include maxKeys limit in cache stats to prevent memory leak', () => {
 const stats = service.getCacheStats();

 expect(stats.maxKeys).toBe(1000);
 expect(stats.keys).toBeLessThanOrEqual(stats.maxKeys);
 });

 it('should calculate hitRate correctly', async () => {
 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 // First call - cache MISS
 await service.generateCompletion(mockRequest);

 // Second call - cache HIT
 await service.generateCompletion(mockRequest);

 const stats = service.getCacheStats();

 expect(stats.misses).toBeGreaterThan(0);
 expect(stats.hits).toBeGreaterThan(0);
 expect(stats.hitRate).toBeGreaterThan(0);
 expect(stats.hitRate).toBeLessThanOrEqual(1);
 });

 it('should handle hitRate when no requests have been made', () => {
 const stats = service.getCacheStats();

 // When there are no hits or misses, hitRate should be 0
 if (stats.hits === 0 && stats.misses === 0) {
 expect(stats.hitRate).toBe(0);
 }
 });
 });

 describe('Circuit Breaker', () => {
 const mockRequest: LLMRequest = {
 systemPrompt: 'You are a helpful assistant',
 userPrompt: 'Test prompt',
 };

 it('should return circuit state when circuit is closed', () => {
 const state = service.getCircuitState();

 expect(state).toHaveProperty('stats');
 expect(state).toHaveProperty('opened');
 expect(state).toHaveProperty('halfOpen');
 expect(state).toHaveProperty('closed');
 expect(state.closed).toBe(true);
 });

 it('should throw ServiceUnavailableException when circuit breaker is open', async () => {
 // Force circuit breaker to open by simulating multiple failures
 const apiError = new Error('API error');
 mockOpenAIInstance.chat.completions.create.mockRejectedValue(apiError);

 // Generate enough failures to open the circuit (5 minimum threshold + 50% error rate)
 const promises: Promise<void>[] = [];
 for (let i = 0; i < 10; i++) {
 promises.push(
 service.generateCompletion(mockRequest).catch(() => {
 // ignore errors
 }) as Promise<void>,
 );
 }
 await Promise.all(promises);

 // Wait a bit for circuit to fully open
 await new Promise((resolve) => setTimeout(resolve, 100));

 // Now the circuit should be open, and next call should throw ServiceUnavailableException
 await expect(service.generateCompletion(mockRequest)).rejects.toThrow(
 'Serviço de IA temporariamente indisponível',
 );
 });

 it('should track circuit breaker statistics', async () => {
 const mockCompletion = {
 model: 'gpt-4.1-nano',
 choices: [
 {
 message: {
 content: 'Test response',
 },
 finish_reason: 'stop',
 },
 ],
 usage: {
 total_tokens: 50,
 },
 };

 mockOpenAIInstance.chat.completions.create.mockResolvedValue(
 mockCompletion,
 );

 // Make successful call
 await service.generateCompletion(mockRequest);

 const state = service.getCircuitState();

 expect(state.stats).toHaveProperty('fires');
 expect(state.stats).toHaveProperty('successes');
 expect(state.stats).toHaveProperty('failures');
 expect(state.stats.fires).toBeGreaterThan(0);
 expect(state.stats.successes).toBeGreaterThan(0);
 });

 it('should log when circuit breaker opens', async () => {
 const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');
 const apiError = new Error('API error');
 mockOpenAIInstance.chat.completions.create.mockRejectedValue(apiError);

 // Generate enough failures to open the circuit
 for (let i = 0; i < 10; i++) {
 await service.generateCompletion(mockRequest).catch(() => {
 /* ignore */
 });
 }

 // Wait for circuit to open
 await new Promise((resolve) => setTimeout(resolve, 100));

 // Check if warning was logged
 expect(loggerWarnSpy).toHaveBeenCalledWith(
 expect.stringContaining('OpenAI circuit breaker OPENED'),
 );
 });

 it('should handle timeout correctly', async () => {
 // Use fake timers to avoid waiting 60s in real time
 jest.useFakeTimers();

 // Mock a slow API call that will never resolve (simulates timeout scenario)
 mockOpenAIInstance.chat.completions.create.mockImplementation(
 () =>
 new Promise(() => {
 // Never resolves - circuit breaker should timeout
 }),
 );

 // Start the request (it will be pending)
 const requestPromise = service.generateCompletion(mockRequest);

 // Advance timers past the circuit breaker timeout (60s + buffer)
 jest.advanceTimersByTime(61000);

 // Now the request should reject due to timeout
 await expect(requestPromise).rejects.toThrow();

 // Restore real timers
 jest.useRealTimers();
 }, 10000); // 10s Jest timeout is enough with fake timers
 });
});

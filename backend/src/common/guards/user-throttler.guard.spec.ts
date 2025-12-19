import { ExecutionContext } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { UserThrottlerGuard } from './user-throttler.guard';

/**
 * Unit tests for UserThrottlerGuard
 *
 * Tests Issue #38: Rate limiting per authenticated user (not IP)
 * - Validates getTracker() method logic
 * - Tests fallback to IP when user not authenticated
 * - Tests fallback to "unknown" when IP not available
 * - Validates custom error message (Portuguese)
 *
 * @remarks
 * Tests focus on the custom logic in UserThrottlerGuard:
 * - getTracker() - User ID vs IP priority logic
 * - throwThrottlingException() - Portuguese error message
 *
 * Full integration tests are in sections-rate-limit.spec.ts
 *
 * @see https://github.com/tjsasakifln/etp-express/issues/38
 */
describe('UserThrottlerGuard', () => {
 let guard: UserThrottlerGuard;

 beforeEach(() => {
 // Create guard instance without full DI (we only test custom methods)
 // @ts-ignore - Bypass constructor for unit testing protected methods
 guard = Object.create(UserThrottlerGuard.prototype);
 });

 describe('getTracker', () => {
 it('deve usar user.id como tracker quando usuário autenticado', async () => {
 // Mock request with authenticated user
 const mockRequest = {
 user: {
 id: 'user-abc-123',
 email: 'test@example.com',
 },
 ip: '192.168.1.1', // IP should be ignored when user is present
 } as any;

 const tracker = await guard['getTracker'](mockRequest);

 expect(tracker).toBe('user-user-abc-123');
 });

 it('deve usar IP quando usuário não autenticado', async () => {
 // Mock request without user (public endpoint)
 const mockRequest = {
 user: undefined,
 ip: '192.168.1.100',
 } as any;

 const tracker = await guard['getTracker'](mockRequest);

 expect(tracker).toBe('192.168.1.100');
 });

 it('deve usar "unknown" quando IP não disponível', async () => {
 // Mock request without user and without IP (edge case)
 const mockRequest = {
 user: undefined,
 ip: undefined,
 } as any;

 const tracker = await guard['getTracker'](mockRequest);

 expect(tracker).toBe('unknown');
 });

 it('deve priorizar user.id mesmo quando IP disponível', async () => {
 // Mock request with BOTH user and IP
 const mockRequest = {
 user: {
 id: 'user-xyz-789',
 email: 'another@example.com',
 },
 ip: '10.0.0.1',
 } as any;

 const tracker = await guard['getTracker'](mockRequest);

 // Should use user ID, not IP
 expect(tracker).toBe('user-user-xyz-789');
 expect(tracker).not.toBe('10.0.0.1');
 });

 it('deve ignorar user sem propriedade id', async () => {
 // Mock request with user object but no id property (malformed user)
 const mockRequest = {
 user: {
 email: 'noId@example.com',
 // id property missing
 },
 ip: '172.16.0.1',
 } as any;

 const tracker = await guard['getTracker'](mockRequest);

 // Should fallback to IP when user.id is undefined
 expect(tracker).toBe('172.16.0.1');
 });

 it('deve criar trackers únicos para diferentes usuários', async () => {
 const mockRequest1 = {
 user: { id: 'user-1', email: 'user1@example.com' },
 ip: '192.168.1.1',
 } as any;

 const mockRequest2 = {
 user: { id: 'user-2', email: 'user2@example.com' },
 ip: '192.168.1.1', // Same IP
 } as any;

 const tracker1 = await guard['getTracker'](mockRequest1);
 const tracker2 = await guard['getTracker'](mockRequest2);

 // Different trackers despite same IP (proves user-based tracking)
 expect(tracker1).toBe('user-user-1');
 expect(tracker2).toBe('user-user-2');
 expect(tracker1).not.toBe(tracker2);
 });
 });

 describe('throwThrottlingException', () => {
 it('deve lançar ThrottlerException com mensagem customizada em português', async () => {
 // Mock ExecutionContext (required by throwThrottlingException signature)
 const mockContext = {} as ExecutionContext;

 try {
 await guard['throwThrottlingException'](mockContext);
 fail('Expected ThrottlerException to be thrown');
 } catch (error) {
 expect(error).toBeInstanceOf(ThrottlerException);

 // Validate Portuguese error message
 expect(error.message).toContain('Limite de gerações excedido');
 expect(error.message).toContain('60 segundos');
 expect(error.message).toContain('5 gerações por minuto');
 }
 });

 it('ThrottlerException deve ter status code 429', async () => {
 const mockContext = {} as ExecutionContext;

 try {
 await guard['throwThrottlingException'](mockContext);
 fail('Expected ThrottlerException to be thrown');
 } catch (error) {
 expect(error).toBeInstanceOf(ThrottlerException);

 // ThrottlerException inherits from HttpException
 // HttpException has getStatus() method
 expect(error.getStatus()).toBe(429);
 }
 });
 });
});

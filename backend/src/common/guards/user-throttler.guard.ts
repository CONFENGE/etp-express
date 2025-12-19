import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

interface RequestWithUser extends Request {
 user?: { id: string };
}

/**
 * Custom throttler guard que usa user ID ao invés de IP para rate limiting
 *
 * @remarks
 * Este guard protege endpoints de geração de IA contra abuse de custo (OpenAI API).
 * Utiliza `user.id` como chave de throttling ao invés de IP, permitindo rate limiting
 * preciso por usuário autenticado.
 *
 * **Comportamento:**
 * - Se usuário autenticado → usa `user.id` como chave
 * - Se não autenticado → fallback para IP (comportamento padrão)
 * - Se IP não disponível → usa "unknown" (extremo edge case)
 *
 * **Configuração:**
 * - TTL e limit são configurados via `@Throttle()` decorator no controller
 * - Configuração global definida em `app.module.ts` (ThrottlerModule)
 *
 * **Uso:**
 * ```typescript
 * @UseGuards(UserThrottlerGuard)
 * @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/min
 * @Post('generate')
 * async generate(@CurrentUser() user: User) {
 * // Endpoint protegido contra abuse
 * }
 * ```
 *
 * **Segurança:**
 * - Previne abuse de API OpenAI (proteção financeira)
 * - Reduz risco de DDoS em endpoints de IA
 * - Protege backend de sobrecarga (múltiplas chamadas LLM simultâneas)
 *
 * @see https://docs.nestjs.com/security/rate-limiting
 * @see ARCHITECTURE.md - Security Best Practices
 *
 * @author ETP Express Team
 * @since 1.0.0
 * @category Guards
 * @module Common
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
 /**
 * Gera chave de throttling baseada em user ID ou IP
 *
 * @param req - Express request object (contém user injetado por JwtAuthGuard)
 * @returns Chave única para rate limiting ("user-{id}" ou IP ou "unknown")
 *
 * @remarks
 * - `req.user` é injetado pelo `JwtAuthGuard` (@CurrentUser decorator)
 * - Se `user.id` disponível → usa "user-{id}" (isolamento por usuário)
 * - Se não → fallback para IP (útil para endpoints públicos futuros)
 * - Se IP não disponível → usa "unknown" (edge case raro)
 *
 * @example
 * ```typescript
 * // Usuário autenticado
 * req.user = { id: 'abc-123', email: 'user@example.com' }
 * // Retorna: "user-abc-123"
 *
 * // Usuário não autenticado
 * req.user = undefined
 * req.ip = '192.168.1.1'
 * // Retorna: "192.168.1.1"
 * ```
 *
 * @protected
 * @override
 */
 protected async getTracker(req: Request): Promise<string> {
 // Casting para acessar propriedade 'user' injetada pelo JwtAuthGuard
 const reqWithUser = req as RequestWithUser;
 const user = reqWithUser.user;

 // Prioridade 1: User ID (rate limiting por usuário autenticado)
 if (user && user.id) {
 return `user-${user.id}`; // Ex: "user-abc-123"
 }

 // Prioridade 2: IP Address (fallback para endpoints públicos)
 if (req.ip) {
 return req.ip; // Ex: "192.168.1.1"
 }

 // Prioridade 3: Unknown (edge case extremo - servidor sem IP forwarding)
 return 'unknown';
 }

 /**
 * Hook executado quando rate limit é excedido
 *
 * @param context - Execution context do NestJS
 * @throws ThrottlerException com mensagem customizada
 *
 * @remarks
 * Sobrescreve método padrão para adicionar mensagem mais clara para usuário.
 * Response HTTP 429 inclui:
 * - `message`: "Too Many Requests. Limite: 5 gerações/minuto. Aguarde {X} segundos."
 * - `statusCode`: 429
 * - `error`: "Too Many Requests"
 *
 * @protected
 * @override
 */
 protected async throwThrottlingException(
 _context: ExecutionContext,
 ): Promise<void> {
 throw new ThrottlerException(
 'Limite de gerações excedido. Aguarde 60 segundos antes de tentar novamente. (Máximo: 5 gerações por minuto)',
 );
 }
}

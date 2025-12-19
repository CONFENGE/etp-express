import {
 Catch,
 ArgumentsHost,
 HttpException,
 HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { getRequestId } from '../context/request-context';

/**
 * Global exception filter que captura todas as exceptions e envia para Sentry
 *
 * Funcionalidade:
 * - Captura todas as exceptions não tratadas
 * - Envia para Sentry com contexto completo (user, request, etc)
 * - Delega para HttpExceptionFilter padrão para response HTTP
 * - Adiciona tags e contexto customizado
 *
 * Uso:
 * ```typescript
 * app.useGlobalFilters(new SentryExceptionFilter());
 * ```
 *
 * @see https://docs.sentry.io/platforms/node/guides/nestjs/usage/
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
 catch(exception: unknown, host: ArgumentsHost) {
 const ctx = host.switchToHttp();
 const request = ctx.getRequest();

 // Capturar exception no Sentry
 Sentry.withScope((scope) => {
 // Adicionar contexto do request
 scope.setContext('request', {
 method: request.method,
 url: request.url,
 headers: this.sanitizeHeaders(request.headers),
 query: request.query,
 body: this.sanitizeBody(request.body),
 });

 // Adicionar contexto do usuário (se autenticado)
 if (request.user) {
 scope.setUser({
 id: request.user.id,
 email: request.user.email,
 username: request.user.name,
 });
 }

 // Adicionar tags customizadas
 scope.setTag('endpoint', `${request.method} ${request.route?.path}`);
 scope.setTag('status_code', this.getStatusCode(exception));

 // Add request ID for log correlation (#653)
 const requestId = getRequestId();
 if (requestId) {
 scope.setTag('request_id', requestId);
 scope.setContext('tracing', { requestId });
 }

 // Capturar exception
 Sentry.captureException(exception);
 });

 // Delegar para exception filter padrão (retorna response HTTP)
 super.catch(exception, host);
 }

 /**
 * Extrai status code da exception
 */
 private getStatusCode(exception: unknown): number {
 if (exception instanceof HttpException) {
 return exception.getStatus();
 }
 return HttpStatus.INTERNAL_SERVER_ERROR;
 }

 /**
 * Sanitiza headers sensíveis antes de enviar para Sentry
 */
 private sanitizeHeaders(
 headers: Record<string, unknown>,
 ): Record<string, unknown> {
 const sanitized = { ...headers };
 delete sanitized.authorization;
 delete sanitized.cookie;
 delete sanitized['x-api-key'];
 return sanitized;
 }

 /**
 * Sanitiza body sensível antes de enviar para Sentry
 */
 private sanitizeBody(body: unknown): unknown {
 if (!body || typeof body !== 'object') {
 return body;
 }

 const sanitized = { ...(body as Record<string, unknown>) };
 delete sanitized.password;
 delete sanitized.token;
 delete sanitized.apiKey;
 delete sanitized.secret;

 return sanitized;
 }
}

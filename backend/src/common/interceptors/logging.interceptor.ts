import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, ip } = request;

    const now = Date.now();
    const userAgent = request.get('user-agent') || '';

    // Log da requisição
    this.logger.log(
      `[Request] ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: (_data) => {
          const duration = Date.now() - now;
          const { statusCode } = response;

          // Log da resposta
          this.logger.log(
            `[Response] ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - now;

          // Log do erro
          this.logger.error(
            `[Error] ${method} ${url} - Duration: ${duration}ms - Error: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}

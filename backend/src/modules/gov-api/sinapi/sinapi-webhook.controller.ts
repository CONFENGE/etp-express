/**
 * SINAPI Webhook Controller
 *
 * Handles webhook notifications from Orcamentador API for SINAPI updates.
 * Provides real-time cache invalidation when SINAPI data is updated.
 *
 * Security:
 * - HMAC SHA256 signature validation
 * - Rate limiting to prevent abuse
 *
 * @module modules/gov-api/sinapi
 * @see Issue #1569 for implementation details
 * @see Issue #1539 for SINAPI API integration epic
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { SinapiSyncJob } from './sinapi-sync.job';

/**
 * Webhook event types from Orcamentador API
 */
export enum SinapiWebhookEventType {
  /** SINAPI data was updated (monthly) */
  SINAPI_ATUALIZADO = 'SINAPI_ATUALIZADO',
  /** SINAPI data corrections published */
  SINAPI_CORRECAO = 'SINAPI_CORRECAO',
  /** API maintenance scheduled */
  MANUTENCAO = 'MANUTENCAO',
}

/**
 * Webhook payload structure
 */
export interface SinapiWebhookPayload {
  /** Event type */
  evento: SinapiWebhookEventType | string;
  /** Event data (usually reference date) */
  data: string;
  /** SINAPI table type (insumos, composicoes, etc.) */
  tabela?: string;
  /** Timestamp of the event */
  timestamp?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Webhook response structure
 */
export interface SinapiWebhookResponse {
  /** Whether the webhook was received successfully */
  received: boolean;
  /** Message describing the action taken */
  message: string;
  /** Timestamp of processing */
  processedAt: string;
}

/**
 * SinapiWebhookController - Handles SINAPI update notifications
 *
 * @example
 * ```bash
 * # Webhook call from Orcamentador API
 * curl -X POST https://api.etpexpress.com.br/api/webhooks/sinapi/update \
 *   -H "X-Webhook-Signature: <hmac-signature>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"evento": "SINAPI_ATUALIZADO", "data": "2025-01", "tabela": "insumos"}'
 * ```
 */
@Controller('api/webhooks/sinapi')
export class SinapiWebhookController {
  private readonly logger = new Logger(SinapiWebhookController.name);
  private readonly webhookEnabled: boolean;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly syncJob: SinapiSyncJob,
  ) {
    this.webhookEnabled = this.configService.get<boolean>(
      'SINAPI_WEBHOOK_ENABLED',
      true,
    );
    this.webhookSecret =
      this.configService.get<string>('SINAPI_WEBHOOK_SECRET') || '';

    if (this.webhookEnabled && !this.webhookSecret) {
      this.logger.warn(
        'SINAPI_WEBHOOK_SECRET not configured - webhook signature validation disabled',
      );
    }
  }

  /**
   * Handle SINAPI update webhook notification
   *
   * Validates signature and triggers cache invalidation + warmup
   *
   * @param signature Webhook signature from X-Webhook-Signature header
   * @param payload Webhook payload with event details
   * @returns Confirmation response
   */
  @Post('update')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Max 10 requests per minute
  async handleUpdate(
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() payload: SinapiWebhookPayload,
  ): Promise<SinapiWebhookResponse> {
    // Check if webhook is enabled
    if (!this.webhookEnabled) {
      throw new BadRequestException('Webhook endpoint is disabled');
    }

    // Validate payload structure
    if (!payload || !payload.evento) {
      throw new BadRequestException('Invalid webhook payload: missing evento');
    }

    this.logger.log(
      `Webhook received: ${payload.evento} (data: ${payload.data || 'N/A'})`,
    );

    // Validate signature if secret is configured
    if (this.webhookSecret) {
      if (!signature) {
        this.logger.warn('Webhook received without signature');
        throw new UnauthorizedException('Missing webhook signature');
      }

      if (!this.verifySignature(signature, payload)) {
        this.logger.warn('Webhook signature validation failed');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Process based on event type
    let message = 'Webhook received';

    switch (payload.evento) {
      case SinapiWebhookEventType.SINAPI_ATUALIZADO:
        this.logger.log(
          `SINAPI update notification received for ${payload.data}`,
        );

        // Trigger async update check and warmup
        setImmediate(async () => {
          try {
            await this.syncJob.checkForUpdates();
          } catch (error) {
            this.logger.error(
              `Webhook-triggered update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        });

        message = `SINAPI update ${payload.data} acknowledged, cache invalidation scheduled`;
        break;

      case SinapiWebhookEventType.SINAPI_CORRECAO:
        this.logger.log(
          `SINAPI correction notification received for ${payload.data}`,
        );

        // Same handling as update
        setImmediate(async () => {
          try {
            await this.syncJob.checkForUpdates();
          } catch (error) {
            this.logger.error(
              `Webhook-triggered correction handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        });

        message = `SINAPI correction ${payload.data} acknowledged, cache invalidation scheduled`;
        break;

      case SinapiWebhookEventType.MANUTENCAO:
        this.logger.log(`Maintenance notification received: ${payload.data}`);
        message = `Maintenance notification acknowledged`;
        // No action needed for maintenance notifications
        break;

      default:
        this.logger.debug(`Unknown webhook event type: ${payload.evento}`);
        message = `Unknown event type ${payload.evento} received`;
    }

    return {
      received: true,
      message,
      processedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify webhook signature using HMAC SHA256
   *
   * @param signature Signature from header
   * @param payload Request body
   * @returns True if signature is valid
   */
  private verifySignature(
    signature: string,
    payload: SinapiWebhookPayload,
  ): boolean {
    try {
      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      this.logger.debug(
        `Signature verification error: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      return false;
    }
  }

  /**
   * Health check endpoint for webhook configuration
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  getHealth(): {
    enabled: boolean;
    hasSecret: boolean;
    schedulerStatus: ReturnType<SinapiSyncJob['getSchedulerStatus']>;
  } {
    return {
      enabled: this.webhookEnabled,
      hasSecret: !!this.webhookSecret,
      schedulerStatus: this.syncJob.getSchedulerStatus(),
    };
  }
}

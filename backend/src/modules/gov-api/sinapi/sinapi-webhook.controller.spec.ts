/**
 * SINAPI Webhook Controller Tests
 *
 * @see https://github.com/CONFENGE/etp-express/issues/1569
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  SinapiWebhookController,
  SinapiWebhookEventType,
  SinapiWebhookPayload,
} from './sinapi-webhook.controller';
import { SinapiSyncJob, SinapiSyncSchedulerStatus } from './sinapi-sync.job';

describe('SinapiWebhookController', () => {
  let controller: SinapiWebhookController;
  let syncJob: jest.Mocked<SinapiSyncJob>;
  let configService: jest.Mocked<ConfigService>;

  const WEBHOOK_SECRET = 'test-webhook-secret-12345';

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, boolean | string | undefined> = {
        SINAPI_WEBHOOK_ENABLED: true,
        SINAPI_WEBHOOK_SECRET: WEBHOOK_SECRET,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockSchedulerStatus: SinapiSyncSchedulerStatus = {
    enabled: true,
    lastRun: null,
    lastUpdate: '2025-01',
    nextRun: new Date(),
    cronExpression: '0 3 * * *',
    status: 'idle',
  };

  const mockSyncJob = {
    checkForUpdates: jest.fn(),
    getSchedulerStatus: jest.fn(() => mockSchedulerStatus),
  };

  /**
   * Generate valid webhook signature for a payload
   */
  function generateSignature(payload: SinapiWebhookPayload): string {
    return crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mock to default values
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: unknown) => {
        const config: Record<string, boolean | string | undefined> = {
          SINAPI_WEBHOOK_ENABLED: true,
          SINAPI_WEBHOOK_SECRET: WEBHOOK_SECRET,
        };
        return config[key] ?? defaultValue;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SinapiWebhookController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SinapiSyncJob,
          useValue: mockSyncJob,
        },
      ],
    }).compile();

    controller = module.get<SinapiWebhookController>(SinapiWebhookController);
    syncJob = module.get(SinapiSyncJob);
    configService = module.get(ConfigService);
  });

  describe('handleUpdate', () => {
    describe('validation', () => {
      it('should reject requests when webhook is disabled', async () => {
        // Create new controller with disabled webhook
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'SINAPI_WEBHOOK_ENABLED') return false;
          return WEBHOOK_SECRET;
        });

        const disabledModule = await Test.createTestingModule({
          controllers: [SinapiWebhookController],
          providers: [
            { provide: ConfigService, useValue: mockConfigService },
            { provide: SinapiSyncJob, useValue: mockSyncJob },
          ],
        }).compile();

        const disabledController = disabledModule.get<SinapiWebhookController>(
          SinapiWebhookController,
        );

        const payload: SinapiWebhookPayload = {
          evento: SinapiWebhookEventType.SINAPI_ATUALIZADO,
          data: '2025-01',
        };

        await expect(
          disabledController.handleUpdate(generateSignature(payload), payload),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject requests with missing evento', async () => {
        const invalidPayload = { data: '2025-01' } as SinapiWebhookPayload;

        await expect(
          controller.handleUpdate(
            generateSignature(invalidPayload),
            invalidPayload,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject requests without signature when secret is configured', async () => {
        const payload: SinapiWebhookPayload = {
          evento: SinapiWebhookEventType.SINAPI_ATUALIZADO,
          data: '2025-01',
        };

        await expect(
          controller.handleUpdate(undefined, payload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should reject requests with invalid signature', async () => {
        const payload: SinapiWebhookPayload = {
          evento: SinapiWebhookEventType.SINAPI_ATUALIZADO,
          data: '2025-01',
        };

        const invalidSignature = 'invalid-signature';

        await expect(
          controller.handleUpdate(invalidSignature, payload),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should accept requests with valid signature', async () => {
        const payload: SinapiWebhookPayload = {
          evento: SinapiWebhookEventType.SINAPI_ATUALIZADO,
          data: '2025-01',
        };
        const signature = generateSignature(payload);

        const result = await controller.handleUpdate(signature, payload);

        expect(result.received).toBe(true);
        expect(result.message).toContain('2025-01');
      });
    });

    describe('event handling', () => {
      it('should trigger update check for SINAPI_ATUALIZADO event', async () => {
        const payload: SinapiWebhookPayload = {
          evento: SinapiWebhookEventType.SINAPI_ATUALIZADO,
          data: '2025-02',
          tabela: 'insumos',
        };
        const signature = generateSignature(payload);

        const result = await controller.handleUpdate(signature, payload);

        expect(result.received).toBe(true);
        expect(result.message).toContain('update');
        expect(result.message).toContain('2025-02');
        expect(result.processedAt).toBeDefined();

        // Wait for async operation
        await new Promise((resolve) => setImmediate(resolve));
      });

      it('should trigger update check for SINAPI_CORRECAO event', async () => {
        const payload: SinapiWebhookPayload = {
          evento: SinapiWebhookEventType.SINAPI_CORRECAO,
          data: '2025-01',
        };
        const signature = generateSignature(payload);

        const result = await controller.handleUpdate(signature, payload);

        expect(result.received).toBe(true);
        expect(result.message).toContain('correction');

        // Wait for async operation
        await new Promise((resolve) => setImmediate(resolve));
      });

      it('should handle MANUTENCAO event without triggering update', async () => {
        const payload: SinapiWebhookPayload = {
          evento: SinapiWebhookEventType.MANUTENCAO,
          data: '2025-01-20 03:00',
        };
        const signature = generateSignature(payload);

        const result = await controller.handleUpdate(signature, payload);

        expect(result.received).toBe(true);
        expect(result.message).toContain('Maintenance');
      });

      it('should handle unknown event types', async () => {
        const payload: SinapiWebhookPayload = {
          evento: 'UNKNOWN_EVENT',
          data: '2025-01',
        };
        const signature = generateSignature(payload);

        const result = await controller.handleUpdate(signature, payload);

        expect(result.received).toBe(true);
        expect(result.message).toContain('Unknown');
      });
    });

    describe('signature validation without secret', () => {
      it('should accept requests without signature when secret is not configured', async () => {
        // Create controller without secret
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'SINAPI_WEBHOOK_SECRET') return '';
          if (key === 'SINAPI_WEBHOOK_ENABLED') return true;
          return undefined;
        });

        const noSecretModule = await Test.createTestingModule({
          controllers: [SinapiWebhookController],
          providers: [
            { provide: ConfigService, useValue: mockConfigService },
            { provide: SinapiSyncJob, useValue: mockSyncJob },
          ],
        }).compile();

        const noSecretController = noSecretModule.get<SinapiWebhookController>(
          SinapiWebhookController,
        );

        const payload: SinapiWebhookPayload = {
          evento: SinapiWebhookEventType.SINAPI_ATUALIZADO,
          data: '2025-01',
        };

        const result = await noSecretController.handleUpdate(
          undefined,
          payload,
        );

        expect(result.received).toBe(true);
      });
    });
  });

  describe('getHealth', () => {
    it('should return webhook health status', () => {
      const health = controller.getHealth();

      expect(health.enabled).toBe(true);
      expect(health.hasSecret).toBe(true);
      expect(health.schedulerStatus).toBeDefined();
      expect(health.schedulerStatus.enabled).toBe(true);
      expect(health.schedulerStatus.cronExpression).toBe('0 3 * * *');
    });

    it('should report when webhook is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SINAPI_WEBHOOK_ENABLED') return false;
        if (key === 'SINAPI_WEBHOOK_SECRET') return WEBHOOK_SECRET;
        return undefined;
      });

      const disabledModule = await Test.createTestingModule({
        controllers: [SinapiWebhookController],
        providers: [
          { provide: ConfigService, useValue: mockConfigService },
          { provide: SinapiSyncJob, useValue: mockSyncJob },
        ],
      }).compile();

      const disabledController = disabledModule.get<SinapiWebhookController>(
        SinapiWebhookController,
      );

      const health = disabledController.getHealth();

      expect(health.enabled).toBe(false);
    });

    it('should report when secret is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'SINAPI_WEBHOOK_ENABLED') return true;
        if (key === 'SINAPI_WEBHOOK_SECRET') return '';
        return undefined;
      });

      const noSecretModule = await Test.createTestingModule({
        controllers: [SinapiWebhookController],
        providers: [
          { provide: ConfigService, useValue: mockConfigService },
          { provide: SinapiSyncJob, useValue: mockSyncJob },
        ],
      }).compile();

      const noSecretController = noSecretModule.get<SinapiWebhookController>(
        SinapiWebhookController,
      );

      const health = noSecretController.getHealth();

      expect(health.enabled).toBe(true);
      expect(health.hasSecret).toBe(false);
    });
  });
});

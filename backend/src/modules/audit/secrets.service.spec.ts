import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from './secrets.service';
import { AuditService } from './audit.service';
import { SecretAccessStatus } from '../../entities/secret-access-log.entity';

describe('SecretsService', () => {
  let service: SecretsService;
  let configService: jest.Mocked<ConfigService>;
  let auditService: jest.Mocked<AuditService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAuditService = {
    logSecretAccess: jest.fn(),
    detectAnomalies: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<SecretsService>(SecretsService);
    configService = module.get(ConfigService);
    auditService = module.get(AuditService);

    // Reset mocks
    jest.clearAllMocks();

    // Mock setImmediate to run synchronously for testing
    jest.spyOn(global, 'setImmediate').mockImplementation((callback: any) => {
      callback();
      return {} as NodeJS.Immediate;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('get', () => {
    it('should return secret value and log access for sensitive keys', async () => {
      mockConfigService.get.mockReturnValue('test-secret-value');
      mockAuditService.logSecretAccess.mockResolvedValue(undefined);
      mockAuditService.detectAnomalies.mockResolvedValue(false);

      const result = await service.get('JWT_SECRET', 'AuthService');

      expect(result).toBe('test-secret-value');
      expect(mockConfigService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should not log access for non-sensitive keys', async () => {
      mockConfigService.get.mockReturnValue('5173');

      const result = await service.get('PORT', 'MainService');

      expect(result).toBe('5173');
      expect(mockAuditService.logSecretAccess).not.toHaveBeenCalled();
    });

    it('should throw error and log failed access for missing secrets', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockAuditService.logSecretAccess.mockResolvedValue(undefined);

      await expect(
        service.get('MISSING_SECRET', 'TestService'),
      ).rejects.toThrow("Secret 'MISSING_SECRET' not found in configuration");

      expect(mockAuditService.logSecretAccess).toHaveBeenCalledWith(
        'MISSING_SECRET',
        'TestService',
        SecretAccessStatus.FAILED,
        undefined,
        "Secret 'MISSING_SECRET' not found",
      );
    });

    it('should include IP address in access log when provided', async () => {
      mockConfigService.get.mockReturnValue('api-key-value');
      mockAuditService.logSecretAccess.mockResolvedValue(undefined);
      mockAuditService.detectAnomalies.mockResolvedValue(false);

      await service.get('OPENAI_API_KEY', 'OpenAIService', '192.168.1.1');

      // Wait for setImmediate callback
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAuditService.logSecretAccess).toHaveBeenCalledWith(
        'OPENAI_API_KEY',
        'OpenAIService',
        SecretAccessStatus.SUCCESS,
        '192.168.1.1',
        undefined,
      );
    });

    it('should check for anomalies after successful access', async () => {
      mockConfigService.get.mockReturnValue('secret-value');
      mockAuditService.logSecretAccess.mockResolvedValue(undefined);
      mockAuditService.detectAnomalies.mockResolvedValue(true);

      await service.get('JWT_SECRET', 'AuthService');

      // Wait for setImmediate callback
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAuditService.detectAnomalies).toHaveBeenCalledWith(
        'JWT_SECRET',
      );
    });
  });

  describe('getOrDefault', () => {
    it('should return secret value when it exists', async () => {
      mockConfigService.get.mockReturnValue('existing-value');
      mockAuditService.logSecretAccess.mockResolvedValue(undefined);
      mockAuditService.detectAnomalies.mockResolvedValue(false);

      const result = await service.getOrDefault(
        'JWT_SECRET',
        'AuthService',
        'default-value',
      );

      expect(result).toBe('existing-value');
    });

    it('should return default value when secret is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = await service.getOrDefault(
        'OPTIONAL_SECRET',
        'TestService',
        'default-value',
      );

      expect(result).toBe('default-value');
      expect(mockAuditService.logSecretAccess).not.toHaveBeenCalled();
    });

    it('should not log access for non-sensitive keys even when they exist', async () => {
      mockConfigService.get.mockReturnValue('value');

      await service.getOrDefault('SOME_CONFIG', 'TestService', 'default');

      expect(mockAuditService.logSecretAccess).not.toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should return true when secret exists', () => {
      mockConfigService.get.mockReturnValue('some-value');

      const result = service.has('JWT_SECRET');

      expect(result).toBe(true);
    });

    it('should return false when secret does not exist', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = service.has('MISSING_SECRET');

      expect(result).toBe(false);
    });
  });

  describe('addSensitiveKey', () => {
    it('should add new key to sensitive keys list', async () => {
      // Initially CUSTOM_KEY is not sensitive
      mockConfigService.get.mockReturnValue('custom-value');
      mockAuditService.logSecretAccess.mockResolvedValue(undefined);
      mockAuditService.detectAnomalies.mockResolvedValue(false);

      await service.get('CUSTOM_KEY', 'TestService');
      expect(mockAuditService.logSecretAccess).not.toHaveBeenCalled();

      // Add CUSTOM_KEY as sensitive
      service.addSensitiveKey('CUSTOM_KEY');

      await service.get('CUSTOM_KEY', 'TestService');

      // Wait for setImmediate callback
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAuditService.logSecretAccess).toHaveBeenCalled();
    });
  });

  describe('isSensitive', () => {
    it('should return true for predefined sensitive keys', () => {
      expect(service.isSensitive('JWT_SECRET')).toBe(true);
      expect(service.isSensitive('OPENAI_API_KEY')).toBe(true);
      expect(service.isSensitive('DATABASE_URL')).toBe(true);
    });

    it('should return false for non-sensitive keys', () => {
      expect(service.isSensitive('PORT')).toBe(false);
      expect(service.isSensitive('NODE_ENV')).toBe(false);
      expect(service.isSensitive('RANDOM_CONFIG')).toBe(false);
    });
  });
});

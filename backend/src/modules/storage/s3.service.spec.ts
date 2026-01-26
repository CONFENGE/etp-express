import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

describe('S3Service', () => {
  let service: S3Service;
  let configService: ConfigService;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'test-bucket',
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      };
      return config[key];
    }),
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET: 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize S3Client with correct config', () => {
      expect(configService.getOrThrow).toHaveBeenCalledWith('AWS_S3_BUCKET');
      expect(configService.getOrThrow).toHaveBeenCalledWith('AWS_REGION');
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'AWS_ACCESS_KEY_ID',
      );
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'AWS_SECRET_ACCESS_KEY',
      );
    });

    it('should set bucketName from config', () => {
      expect(service.getBucketName()).toBe('test-bucket');
    });

    it('should throw error if AWS_S3_BUCKET is missing', () => {
      const invalidConfigService = {
        getOrThrow: jest.fn(() => {
          throw new Error('Missing required config: AWS_S3_BUCKET');
        }),
      };

      expect(() => {
        new S3Service(invalidConfigService as any);
      }).toThrow('Missing required config: AWS_S3_BUCKET');
    });

    it('should throw error if AWS_REGION is missing', () => {
      const invalidConfigService = {
        getOrThrow: jest.fn((key: string) => {
          if (key === 'AWS_S3_BUCKET') return 'test-bucket';
          throw new Error(`Missing required config: ${key}`);
        }),
      };

      expect(() => {
        new S3Service(invalidConfigService as any);
      }).toThrow('Missing required config: AWS_REGION');
    });

    it('should throw error if AWS_ACCESS_KEY_ID is missing', () => {
      const invalidConfigService = {
        getOrThrow: jest.fn((key: string) => {
          if (key === 'AWS_S3_BUCKET') return 'test-bucket';
          if (key === 'AWS_REGION') return 'us-east-1';
          throw new Error(`Missing required config: ${key}`);
        }),
      };

      expect(() => {
        new S3Service(invalidConfigService as any);
      }).toThrow('Missing required config: AWS_ACCESS_KEY_ID');
    });

    it('should throw error if AWS_SECRET_ACCESS_KEY is missing', () => {
      const invalidConfigService = {
        getOrThrow: jest.fn((key: string) => {
          if (key === 'AWS_S3_BUCKET') return 'test-bucket';
          if (key === 'AWS_REGION') return 'us-east-1';
          if (key === 'AWS_ACCESS_KEY_ID') return 'test-key';
          throw new Error(`Missing required config: ${key}`);
        }),
      };

      expect(() => {
        new S3Service(invalidConfigService as any);
      }).toThrow('Missing required config: AWS_SECRET_ACCESS_KEY');
    });
  });

  describe('getBucketName', () => {
    it('should return the configured bucket name', () => {
      expect(service.getBucketName()).toBe('test-bucket');
    });
  });

  describe('isConfigured', () => {
    it('should return true when all required env vars are set', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('should have isConfigured method defined', () => {
      // The isConfigured method validates if all env vars are present
      // This test ensures the method exists and is callable
      expect(service.isConfigured).toBeDefined();
      expect(typeof service.isConfigured).toBe('function');
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('uploadFile (stub)', () => {
    it('should return empty string (stub implementation)', async () => {
      const buffer = Buffer.from('test content');
      const result = await service.uploadFile(
        'test/key.pdf',
        buffer,
        'application/pdf',
      );
      expect(result).toBe('');
    });

    it('should log debug message with file details', async () => {
      const buffer = Buffer.from('test content');
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      await service.uploadFile('test/key.pdf', buffer, 'application/pdf');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('uploadFile stub called'),
      );
    });
  });

  describe('getSignedUrl (stub)', () => {
    it('should return empty string (stub implementation)', async () => {
      const result = await service.getSignedUrl('test/key.pdf', 3600);
      expect(result).toBe('');
    });

    it('should log debug message with key and expiration', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      await service.getSignedUrl('test/key.pdf', 3600);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('getSignedUrl stub called'),
      );
    });
  });
});

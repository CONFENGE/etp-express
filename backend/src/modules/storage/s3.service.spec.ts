import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

// Mock S3Client at the module level
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

const mockGetSignedUrl = jest.fn();
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

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

  describe('uploadFile', () => {
    it('should upload file to S3 successfully', async () => {
      const buffer = Buffer.from('test content');
      const key = 'test/key.pdf';
      const contentType = 'application/pdf';

      const mockSend = jest.fn().mockResolvedValue({});
      (service as any).s3Client.send = mockSend;

      const result = await service.uploadFile(key, buffer, contentType);

      expect(result).toBe('s3://test-bucket/test/key.pdf');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw error if S3 upload fails', async () => {
      const buffer = Buffer.from('test content');
      const key = 'test/key.pdf';

      const mockSend = jest.fn().mockRejectedValue(new Error('S3 error'));
      (service as any).s3Client.send = mockSend;

      await expect(
        service.uploadFile(key, buffer, 'application/pdf'),
      ).rejects.toThrow('Failed to upload file to S3: S3 error');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate a signed URL successfully', async () => {
      const expectedUrl = 'https://test-bucket.s3.amazonaws.com/test/key.pdf?X-Amz-Signature=abc';
      mockGetSignedUrl.mockResolvedValue(expectedUrl);

      const result = await service.getSignedUrl('test/key.pdf', 3600);

      expect(result).toBe(expectedUrl);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });

    it('should use default expiration of 3600s', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url');

      await service.getSignedUrl('test/key.pdf');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { expiresIn: 3600 },
      );
    });

    it('should throw error when signed URL generation fails', async () => {
      mockGetSignedUrl.mockRejectedValue(new Error('AWS error'));

      await expect(
        service.getSignedUrl('test/key.pdf', 3600),
      ).rejects.toThrow('Failed to generate signed URL: AWS error');
    });

    it('should log success message', async () => {
      mockGetSignedUrl.mockResolvedValue('https://signed-url');
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.getSignedUrl('test/key.pdf', 7200);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated signed URL for test/key.pdf'),
      );
    });
  });
});

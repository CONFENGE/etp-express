import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import { User } from '../../entities/user.entity';

describe('EmailService', () => {
  let service: EmailService;
  let jwtService: JwtService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        SMTP_HOST: undefined, // Test with no SMTP config
        SMTP_PORT: undefined,
        SMTP_USER: undefined,
        SMTP_PASSWORD: undefined,
        FRONTEND_URL: 'http://localhost:5173',
        SUPPORT_EMAIL: 'suporte@etpexpress.com',
        SMTP_FROM: '"ETP Express" <noreply@etpexpress.com>',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token-123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with stream transporter when SMTP not configured', () => {
    expect(service['transporter']).toBeDefined();
  });

  it('should throw error if user is not marked for deletion', async () => {
    const userNotDeleted: User = {
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test',
      deletedAt: null, // Not deleted
    } as User;

    await expect(
      service.sendDeletionConfirmation(userNotDeleted),
    ).rejects.toThrow('User is not marked for deletion');
  });

  it('should generate JWT token with correct payload', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Call private method indirectly through sign mock verification
    service['generateCancelToken'](userId);

    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: userId, type: 'CANCEL_DELETION' },
      { expiresIn: '30d' },
    );
  });
});

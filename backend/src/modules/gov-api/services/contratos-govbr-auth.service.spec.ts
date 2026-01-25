import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { ContratosGovBrAuthService } from './contratos-govbr-auth.service';

describe('ContratosGovBrAuthService', () => {
  let service: ContratosGovBrAuthService;
  let configService: jest.Mocked<ConfigService>;
  let httpService: jest.Mocked<HttpService>;

  const mockTokenResponse = {
    access_token: 'mock-access-token-xyz',
    expires_in: 3600,
    token_type: 'Bearer',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContratosGovBrAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                CONTRATOS_GOVBR_TOKEN_URL:
                  'https://contratos.comprasnet.gov.br/api/oauth2/token',
                CONTRATOS_GOVBR_CLIENT_ID: 'test-client-id',
                CONTRATOS_GOVBR_CLIENT_SECRET: 'test-client-secret',
              };
              return config[key];
            }),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContratosGovBrAuthService>(ContratosGovBrAuthService);
    configService = module.get(ConfigService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset token cache entre testes
    service.invalidateToken();
  });

  describe('getAccessToken', () => {
    it('should request new token on first call', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse));

      const token = await service.getAccessToken();

      expect(token).toBe('mock-access-token-xyz');
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://contratos.comprasnet.gov.br/api/oauth2/token',
        {
          grant_type: 'client_credentials',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
        },
      );
    });

    it('should return cached token on subsequent calls', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse));

      // Primeira chamada - solicita token
      const token1 = await service.getAccessToken();
      expect(token1).toBe('mock-access-token-xyz');

      // Segunda chamada - retorna token em cache
      const token2 = await service.getAccessToken();
      expect(token2).toBe('mock-access-token-xyz');

      // Deve ter chamado API apenas uma vez
      expect(httpService.post).toHaveBeenCalledTimes(1);
    });

    it('should request new token if cached token expired', async () => {
      const axiosResponse: AxiosResponse = {
        data: { ...mockTokenResponse, expires_in: -1 }, // Token já expirado
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse));

      // Primeira chamada
      await service.getAccessToken();

      // Segunda chamada deve solicitar novo token
      await service.getAccessToken();

      expect(httpService.post).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException on 401 response', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: 'invalid_client' },
        },
      } as AxiosError;

      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getAccessToken()).rejects.toThrow(
        'Invalid OAuth credentials for Contratos.gov.br',
      );
    });

    it('should throw UnauthorizedException on 403 response', async () => {
      const error = {
        response: {
          status: 403,
          data: { error: 'access_denied' },
        },
      } as AxiosError;

      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw Error on network failure', async () => {
      const error = new Error('Network error');
      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.getAccessToken()).rejects.toThrow(
        'Failed to authenticate with Contratos.gov.br',
      );
    });

    it('should throw Error if missing environment variables', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.getAccessToken()).rejects.toThrow(
        /Missing OAuth configuration/,
      );
    });

    it('should throw Error if API returns empty access token', async () => {
      const axiosResponse: AxiosResponse = {
        data: { access_token: '', expires_in: 3600 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse));

      await expect(service.getAccessToken()).rejects.toThrow(
        'API returned empty access token',
      );
    });
  });

  describe('getAuthHeaders', () => {
    it('should return headers with Bearer token', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse));

      const headers = await service.getAuthHeaders();

      expect(headers).toEqual({
        Authorization: 'Bearer mock-access-token-xyz',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('invalidateToken', () => {
    it('should clear cached token', async () => {
      const axiosResponse: AxiosResponse = {
        data: mockTokenResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse));

      // Obter token
      await service.getAccessToken();
      expect(httpService.post).toHaveBeenCalledTimes(1);

      // Invalidar token
      service.invalidateToken();

      // Obter token novamente deve solicitar novo
      await service.getAccessToken();
      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('token expiration buffer', () => {
    it('should request new token before actual expiration (5min buffer)', async () => {
      const axiosResponse: AxiosResponse = {
        data: { ...mockTokenResponse, expires_in: 250 }, // 4min 10s - dentro do buffer
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(axiosResponse));

      // Primeira chamada
      await service.getAccessToken();

      // Segunda chamada deve solicitar novo token (buffer de 5min)
      await service.getAccessToken();

      expect(httpService.post).toHaveBeenCalledTimes(2);
    });
  });
});

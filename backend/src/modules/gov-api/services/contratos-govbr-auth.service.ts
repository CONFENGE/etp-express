import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Serviço de autenticação OAuth 2.0 com API Contratos.gov.br
 *
 * Implementa fluxo client credentials para obtenção de access tokens
 * necessários para integração com sistema federal de gestão de contratos.
 *
 * @see docs/integrations/contratos-gov-br-api.md
 */
@Injectable()
export class ContratosGovBrAuthService {
  private readonly logger = new Logger(ContratosGovBrAuthService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Obtém access token OAuth válido
   *
   * Implementa cache de token em memória com validação de expiração.
   * Se token expirado ou não existente, solicita novo token via OAuth flow.
   *
   * @returns Access token válido para uso em requisições à API
   * @throws UnauthorizedException se credenciais inválidas ou API indisponível
   */
  async getAccessToken(): Promise<string> {
    // Retorna token em cache se ainda válido
    if (this.accessToken && this.isTokenValid()) {
      this.logger.debug('Using cached access token');
      return this.accessToken;
    }

    // Solicita novo token
    this.logger.log('Requesting new access token from Contratos.gov.br OAuth');
    await this.requestNewToken();
    return this.accessToken!;
  }

  /**
   * Retorna headers HTTP com autenticação OAuth
   *
   * Inclui Bearer token e Content-Type para requisições à API.
   * X-CSRF-TOKEN deve ser adicionado pelo serviço consumidor quando necessário.
   *
   * @returns Headers HTTP com Authorization
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Invalida token em cache
   *
   * Útil para forçar renovação de token em caso de erro 401/403
   * ou ao detectar token inválido em resposta da API.
   */
  invalidateToken(): void {
    this.logger.warn('Invalidating cached access token');
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  /**
   * Verifica se token em cache ainda é válido
   *
   * Token considerado válido se existe e não expirou.
   * Margem de segurança de 5 minutos antes da expiração real.
   *
   * @returns true se token válido, false caso contrário
   */
  private isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false;
    }

    const now = new Date();
    const expirationBuffer = 5 * 60 * 1000; // 5 minutos em ms
    const effectiveExpiration = new Date(
      this.tokenExpiresAt.getTime() - expirationBuffer,
    );

    return now < effectiveExpiration;
  }

  /**
   * Solicita novo access token via OAuth 2.0 client credentials flow
   *
   * @throws UnauthorizedException se credenciais inválidas
   * @throws Error se API indisponível ou erro de rede
   */
  private async requestNewToken(): Promise<void> {
    const tokenUrl = this.configService.get<string>(
      'CONTRATOS_GOVBR_TOKEN_URL',
    );
    const clientId = this.configService.get<string>(
      'CONTRATOS_GOVBR_CLIENT_ID',
    );
    const clientSecret = this.configService.get<string>(
      'CONTRATOS_GOVBR_CLIENT_SECRET',
    );

    if (!tokenUrl || !clientId || !clientSecret) {
      const missingVars = [];
      if (!tokenUrl) missingVars.push('CONTRATOS_GOVBR_TOKEN_URL');
      if (!clientId) missingVars.push('CONTRATOS_GOVBR_CLIENT_ID');
      if (!clientSecret) missingVars.push('CONTRATOS_GOVBR_CLIENT_SECRET');

      throw new Error(
        `Missing OAuth configuration for Contratos.gov.br: ${missingVars.join(', ')}`,
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          access_token: string;
          expires_in: number;
          token_type: string;
        }>(tokenUrl, {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      );

      const { access_token, expires_in } = response.data;

      if (!access_token) {
        throw new Error('API returned empty access token');
      }

      this.accessToken = access_token;
      this.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      this.logger.log(
        `Access token obtained successfully. Expires at ${this.tokenExpiresAt.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to obtain access token from Contratos.gov.br',
        error instanceof Error ? error.stack : String(error),
      );

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new UnauthorizedException(
          'Invalid OAuth credentials for Contratos.gov.br',
        );
      }

      throw new Error(
        `Failed to authenticate with Contratos.gov.br: ${error.message}`,
      );
    }
  }
}

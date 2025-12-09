import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  Ip,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DISCLAIMER } from '../../common/constants/messages';
import { UserWithoutPassword } from './types/user.types';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

/**
 * Cookie name for JWT authentication token.
 * @security httpOnly cookie eliminates XSS token theft vulnerability
 */
export const AUTH_COOKIE_NAME = 'jwt';

/**
 * Controller handling authentication HTTP endpoints.
 *
 * @remarks
 * Provides public endpoints for user registration and login, and protected
 * endpoints for token validation and user profile retrieval.
 *
 * Authentication:
 * - /register and /login are public (no JWT required)
 * - /me and /validate require JWT authentication via JwtAuthGuard
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created (registration)
 * - 401: Unauthorized (invalid credentials or token)
 * - 409: Conflict (email already registered)
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sets JWT token in httpOnly cookie.
   *
   * @security
   * - httpOnly: true - prevents JavaScript access (XSS protection)
   * - secure: true in production - HTTPS only
   * - sameSite: 'lax' - CSRF protection for cross-site requests
   * - maxAge: 24 hours - matches JWT expiration
   */
  private setAuthCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true, // Prevents XSS access
      secure: isProduction, // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      path: '/', // Available for all routes
    });
  }

  /**
   * Clears JWT authentication cookie.
   */
  private clearAuthCookie(res: Response): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }

  /**
   * Registers a new user account.
   *
   * @param registerDto - User registration data (name, email, password)
   * @param res - Express response to set httpOnly cookie
   * @returns Authentication response with user data (token in httpOnly cookie)
   * @throws {ConflictException} 409 - If email is already registered
   * @throws {BadRequestException} 400 - If validation fails
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);

    // Set JWT in httpOnly cookie instead of returning in response
    this.setAuthCookie(res, result.accessToken);

    // Return user data without exposing token in response body
    const { accessToken: _token, ...responseWithoutToken } = result;
    return responseWithoutToken;
  }

  /**
   * Authenticates user credentials and issues JWT token.
   *
   * @remarks
   * Rate limited to 5 attempts per minute per IP to prevent brute force attacks.
   * JWT token is set in httpOnly cookie for XSS protection.
   *
   * @param loginDto - User credentials (email and password)
   * @param res - Express response to set httpOnly cookie
   * @returns Authentication response with user data (token in httpOnly cookie)
   * @throws {UnauthorizedException} 401 - If credentials are invalid
   * @throws {ThrottlerException} 429 - Too many login attempts
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per 60 seconds (brute force protection)
  @Post('login')
  @ApiOperation({ summary: 'Login de usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas de login. Tente novamente em 1 minuto.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(loginDto, { ip, userAgent });

    // Set JWT in httpOnly cookie instead of returning in response
    this.setAuthCookie(res, result.accessToken);

    // Return user data without exposing token in response body
    const { accessToken: _token, ...responseWithoutToken } = result;
    return responseWithoutToken;
  }

  /**
   * Retrieves authenticated user profile data.
   *
   * @param user - Current authenticated user (extracted from JWT token)
   * @returns User profile data with disclaimer message
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getMe(@CurrentUser() user: UserWithoutPassword) {
    return {
      user,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Validates JWT token and returns user data.
   *
   * @remarks
   * This endpoint can be used by frontend to verify if a stored JWT token
   * is still valid before making authenticated requests.
   *
   * @param user - Current authenticated user (extracted from JWT token)
   * @returns Validation result with user data
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or expired
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validar token JWT' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  async validateToken(@CurrentUser() user: UserWithoutPassword) {
    return {
      valid: true,
      user,
    };
  }

  /**
   * Logs out user by clearing the httpOnly JWT cookie.
   *
   * @remarks
   * This endpoint clears the authentication cookie, effectively logging out the user.
   * No server-side session invalidation needed since JWT is stateless.
   *
   * @param res - Express response to clear cookie
   * @returns Success message
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout do usuário',
    description: 'Limpa o cookie de autenticação httpOnly.',
  })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookie(res);
    return { message: 'Logout realizado com sucesso' };
  }

  /**
   * Changes authenticated user's password.
   *
   * @remarks
   * Used for both voluntary password changes and mandatory first-login password changes.
   * After successful change, sets a new JWT token in httpOnly cookie with updated claims.
   *
   * Rate limited to 3 attempts per minute per IP to prevent brute force attacks.
   *
   * @param user - Current authenticated user (extracted from JWT token)
   * @param changePasswordDto - Old and new password
   * @param ip - Client IP address for audit logging
   * @param req - Request object for user agent extraction
   * @param res - Express response to update httpOnly cookie
   * @returns Success message with updated user data (token in httpOnly cookie)
   * @throws {UnauthorizedException} 401 - If old password is incorrect
   * @throws {BadRequestException} 400 - If new password doesn't meet requirements
   * @throws {ThrottlerException} 429 - Too many password change attempts
   */
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per 60 seconds
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Alterar senha do usuário',
    description:
      'Permite que o usuário autenticado altere sua senha. Obrigatório para usuários com mustChangePassword=true.',
  })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso. Novo token definido em cookie.',
  })
  @ApiResponse({ status: 400, description: 'Nova senha não atende requisitos' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas. Tente novamente em 1 minuto.',
  })
  async changePassword(
    @CurrentUser() user: UserWithoutPassword,
    @Body() changePasswordDto: ChangePasswordDto,
    @Ip() ip: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.changePassword(
      user.id,
      changePasswordDto,
      {
        ip,
        userAgent,
      },
    );

    // Set new JWT in httpOnly cookie
    this.setAuthCookie(res, result.accessToken);

    // Return user data without exposing token in response body
    const { accessToken: _token, ...responseWithoutToken } = result;
    return responseWithoutToken;
  }
}

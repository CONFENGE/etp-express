import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  Req,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DISCLAIMER } from '../../common/constants/messages';
import { UserWithoutPassword } from './types/user.types';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';

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
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user account.
   *
   * @param registerDto - User registration data (name, email, password)
   * @returns Authentication response with JWT token and user data
   * @throws {ConflictException} 409 - If email is already registered
   * @throws {BadRequestException} 400 - If validation fails
   */
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Authenticates user credentials and issues JWT token.
   *
   * @param loginDto - User credentials (email and password)
   * @returns Authentication response with JWT token and user data
   * @throws {UnauthorizedException} 401 - If credentials are invalid
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login de usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, { ip, userAgent });
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
}

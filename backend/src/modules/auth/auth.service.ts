import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DISCLAIMER } from '../../common/constants/messages';
import { UserWithoutPassword } from './types/user.types';

/**
 * Service responsible for user authentication and authorization.
 *
 * @remarks
 * This service uses JWT tokens for stateless authentication and bcrypt for
 * password hashing. It coordinates with UsersService for user data operations
 * and implements standard login/register flows with security best practices.
 *
 * Security features:
 * - Password hashing with bcrypt (cost factor 10)
 * - JWT-based stateless authentication
 * - Active account validation
 * - Last login tracking
 *
 * @see UsersService
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Validates user credentials and returns user data without password.
   *
   * @remarks
   * Used by Passport local strategy for authentication. Updates user's
   * lastLogin timestamp on successful validation.
   *
   * @param email - User email address
   * @param password - Plain text password to validate
   * @returns User object without password field, or null if validation fails
   * @throws {UnauthorizedException} If user account is inactive
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    const { password: _password, ...result } = user;
    return result;
  }

  /**
   * Authenticates user and returns JWT access token.
   *
   * @remarks
   * Validates credentials, generates JWT token with user claims,
   * and returns authentication response. Logs successful login events.
   *
   * JWT payload includes: sub (user ID), email, name, role.
   *
   * @param loginDto - User login credentials (email and password)
   * @returns Authentication response with JWT token, user data, and disclaimer
   * @throws {UnauthorizedException} If credentials are invalid or user is inactive
   *
   * @example
   * ```ts
   * const response = await authService.login({
   *   email: 'user@example.com',
   *   password: 'securePassword123'
   * });
   * console.log(response.accessToken); // JWT token
   * ```
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgao: user.orgao,
        cargo: user.cargo,
      },
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Registers a new user account with hashed password.
   *
   * @remarks
   * Creates new user with bcrypt-hashed password (cost factor 10),
   * automatically generates JWT token, and returns authentication response.
   * Validates email uniqueness before creation.
   *
   * @param registerDto - New user registration data (email, password, name, etc.)
   * @returns Authentication response with JWT token for immediate login
   * @throws {ConflictException} If email is already registered
   *
   * @example
   * ```ts
   * const response = await authService.register({
   *   email: 'newuser@example.com',
   *   password: 'securePassword123',
   *   name: 'João Silva',
   *   orgao: 'CONFENGE',
   *   cargo: 'Analista'
   * });
   * // User is created and authenticated in one step
   * ```
   */
  async register(registerDto: RegisterDto) {
    // Validate LGPD consent is explicitly true
    if (registerDto.lgpdConsent !== true) {
      throw new BadRequestException(
        'É obrigatório aceitar os termos de uso e política de privacidade (LGPD)',
      );
    }

    // Validate international transfer consent is explicitly true (LGPD Art. 33)
    if (registerDto.internationalTransferConsent !== true) {
      throw new BadRequestException(
        'É obrigatório aceitar a transferência internacional de dados (LGPD Art. 33)',
      );
    }

    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Current LGPD terms version
    const LGPD_TERMS_VERSION = '1.0.0';

    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      orgao: registerDto.orgao,
      cargo: registerDto.cargo,
      lgpdConsentAt: new Date(),
      lgpdConsentVersion: LGPD_TERMS_VERSION,
      internationalTransferConsentAt: new Date(),
    });

    this.logger.log(
      `User registered with LGPD consent v${LGPD_TERMS_VERSION} and international transfer consent: ${user.email}`,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgao: user.orgao,
        cargo: user.cargo,
      },
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Validates JWT token and returns user data if valid.
   *
   * @remarks
   * Verifies token signature, expiration, and validates that user exists
   * and is active. Used by JwtAuthGuard for protected routes.
   *
   * Supports dual-key validation during secret rotation: tries JWT_SECRET first,
   * then falls back to JWT_SECRET_OLD if configured.
   *
   * @param token - JWT access token to validate
   * @returns Validation result with user data
   * @throws {UnauthorizedException} If token is invalid, expired, or user is inactive
   */
  async validateToken(token: string) {
    try {
      // Try primary secret first
      let payload: any;
      try {
        payload = this.jwtService.verify(token);
      } catch {
        // If primary fails, try old secret (dual-key rotation)
        const oldSecret = this.configService.get<string>('JWT_SECRET_OLD');
        if (oldSecret) {
          payload = this.jwtService.verify(token, { secret: oldSecret });
        } else {
          throw new UnauthorizedException('Token inválido ou expirado');
        }
      }

      const user = await this.usersService.findOne(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Token inválido');
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordReset } from '../../entities/password-reset.entity';
import { DISCLAIMER } from '../../common/constants/messages';
import { UserWithoutPassword, JwtPayload } from './types/user.types';

/**
 * Error codes for authentication failures.
 * These codes are sent to the frontend for contextual error handling.
 *
 * @security Some codes should NOT reveal sensitive information in production.
 * The frontend maps these to user-friendly messages while maintaining security.
 */
export enum AuthErrorCode {
  /** Generic invalid credentials (used for USER_NOT_FOUND and INVALID_PASSWORD in production) */
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  /** User account is deactivated */
  USER_INACTIVE = 'USER_INACTIVE',
  /** User has no organization assigned */
  NO_ORGANIZATION = 'NO_ORGANIZATION',
  /** User's organization is suspended */
  ORG_INACTIVE = 'ORG_INACTIVE',
  /** User's organization does not exist */
  ORG_NOT_FOUND = 'ORG_NOT_FOUND',
  /** Too many login attempts */
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
}

/**
 * Structured error response for authentication failures.
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

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
    private auditService: AuditService,
    private organizationsService: OrganizationsService,
    private emailService: EmailService,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
  ) {}

  /**
   * Creates a structured UnauthorizedException with error code.
   *
   * @param code - Authentication error code
   * @param message - Human-readable error message
   * @returns UnauthorizedException with structured response
   */
  private createAuthError(
    code: AuthErrorCode,
    message: string,
  ): UnauthorizedException {
    const error: AuthError = { code, message };
    return new UnauthorizedException(error);
  }

  /**
   * Validates user credentials and returns user data without password.
   *
   * @remarks
   * Used by Passport local strategy for authentication. Updates user's
   * lastLogin timestamp on successful validation.
   *
   * Security validations performed:
   * - Password verification with bcrypt
   * - User active status check
   * - Organization assignment verification
   * - Organization active status check
   *
   * @param email - User email address
   * @param password - Plain text password to validate
   * @returns User object without password field, or null if validation fails
   * @throws {UnauthorizedException} If user account is inactive (USER_INACTIVE)
   * @throws {UnauthorizedException} If user has no organization assigned (NO_ORGANIZATION)
   * @throws {UnauthorizedException} If user's organization is suspended (ORG_INACTIVE)
   * @throws {UnauthorizedException} If user's organization does not exist (ORG_NOT_FOUND)
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
      this.logger.warn(`Inactive user attempted login: ${user.email}`);
      throw this.createAuthError(
        AuthErrorCode.USER_INACTIVE,
        'Sua conta está desativada. Entre em contato com o administrador.',
      );
    }

    // Validate user has an organization assigned
    if (!user.organizationId) {
      this.logger.warn(
        `User ${user.email} attempted login without organization assigned`,
      );
      throw this.createAuthError(
        AuthErrorCode.NO_ORGANIZATION,
        'Usuário sem organização associada. Entre em contato com o administrador.',
      );
    }

    // Validate organization exists and is active
    try {
      const organization = await this.organizationsService.findOne(
        user.organizationId,
      );

      if (!organization.isActive) {
        this.logger.warn(
          `User ${user.email} attempted login with suspended organization: ${organization.name}`,
        );
        throw this.createAuthError(
          AuthErrorCode.ORG_INACTIVE,
          'Sua organização está suspensa. Entre em contato com o suporte.',
        );
      }
    } catch (error) {
      // Re-throw our structured errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `User ${user.email} has invalid organizationId: ${user.organizationId}`,
      );
      throw this.createAuthError(
        AuthErrorCode.ORG_NOT_FOUND,
        'Organização não encontrada. Entre em contato com o administrador.',
      );
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
  async login(
    loginDto: LoginDto,
    metadata?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      // Log failed login attempt for LGPD compliance
      await this.auditService.logLoginFailed(loginDto.email, {
        ip: metadata?.ip,
        userAgent: metadata?.userAgent,
        reason: 'Invalid credentials',
      });
      throw this.createAuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Email ou senha incorretos. Verifique suas credenciais e tente novamente.',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      mustChangePassword: user.mustChangePassword,
    };

    const accessToken = this.jwtService.sign(payload);

    // Log successful login for LGPD compliance (Art. 37)
    await this.auditService.logLogin(user.id, {
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      email: user.email,
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        cargo: user.cargo,
        organizationId: user.organizationId,
        mustChangePassword: user.mustChangePassword,
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
   * Validates email uniqueness and email domain authorization (Multi-Tenancy B2G - MT-03).
   *
   * Domain validation flow:
   * 1. Extract domain from email (e.g., "lages.sc.gov.br" from "joao@lages.sc.gov.br")
   * 2. Search for Organization where domain is in domainWhitelist
   * 3. Reject if domain not authorized or organization is suspended
   * 4. Create user with organizationId if valid
   *
   * @param registerDto - New user registration data (email, password, name, etc.)
   * @returns Authentication response with JWT token for immediate login
   * @throws {ConflictException} If email is already registered
   * @throws {BadRequestException} If email domain is not authorized or organization is suspended
   *
   * @example
   * ```ts
   * const response = await authService.register({
   *   email: 'newuser@lages.sc.gov.br',
   *   password: 'securePassword123',
   *   name: 'João Silva',
   *   cargo: 'Analista'
   * });
   * // User is created with organizationId from 'lages.sc.gov.br' domain
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

    // MT-03: Extract domain from email (case-insensitive)
    const emailDomain = registerDto.email.split('@')[1]?.toLowerCase();

    if (!emailDomain) {
      throw new BadRequestException('Email inválido');
    }

    // MT-03: Find organization by domain whitelist
    const organization =
      await this.organizationsService.findByDomain(emailDomain);

    if (!organization) {
      throw new BadRequestException(
        `Domínio de email "${emailDomain}" não autorizado. Contate comercial@etpexpress.com.br para cadastrar sua organização.`,
      );
    }

    // MT-03: Validate organization is active
    if (!organization.isActive) {
      throw new BadRequestException(
        `Organização "${organization.name}" está suspensa. Contate o suporte.`,
      );
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Current LGPD terms version
    const LGPD_TERMS_VERSION = '1.0.0';

    // MT-03: Create user with organizationId
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      cargo: registerDto.cargo,
      organizationId: organization.id,
      lgpdConsentAt: new Date(),
      lgpdConsentVersion: LGPD_TERMS_VERSION,
      internationalTransferConsentAt: new Date(),
    });

    this.logger.log(
      `User registered with LGPD consent v${LGPD_TERMS_VERSION}, international transfer consent, and organizationId ${organization.id}: ${user.email}`,
    );

    // MT-03: Include organizationId in JWT payload
    // M8: Include mustChangePassword for domain management
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      mustChangePassword: user.mustChangePassword,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        cargo: user.cargo,
        organizationId: user.organizationId,
        mustChangePassword: user.mustChangePassword,
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
      let payload: JwtPayload;
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
          organizationId: user.organizationId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  /**
   * Changes user password with validation.
   *
   * @remarks
   * Used for both voluntary password changes and mandatory first-login password changes.
   * Validates old password before setting new one.
   * Updates mustChangePassword flag to false after successful change.
   * Logs the password change for LGPD compliance.
   *
   * @param userId - ID of the user changing password
   * @param changePasswordDto - Old and new password
   * @param metadata - Request metadata for audit logging
   * @returns Success message and new JWT token with updated claims
   * @throws {UnauthorizedException} If old password is incorrect
   * @throws {BadRequestException} If new password doesn't meet requirements
   *
   * @example
   * ```ts
   * const result = await authService.changePassword(
   *   'user-uuid',
   *   { oldPassword: 'OldPass123!', newPassword: 'NewPass456!' },
   *   { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
   * );
   * ```
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    metadata?: { ip?: string; userAgent?: string },
  ) {
    // Find user with password field
    const user = await this.usersService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Validate old password
    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      this.logger.warn(
        `Failed password change attempt for user: ${user.email}`,
      );
      throw new UnauthorizedException('Senha atual incorreta');
    }

    // Ensure new password is different from old
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'Nova senha não pode ser igual à senha atual',
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    // Update password and set mustChangePassword to false
    await this.usersService.updatePassword(userId, hashedNewPassword);
    await this.usersService.setMustChangePassword(userId, false);

    // Log password change for LGPD compliance
    await this.auditService.logPasswordChange(userId, {
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      wasMandatory: user.mustChangePassword,
    });

    this.logger.log(
      `Password changed successfully for user: ${user.email}${user.mustChangePassword ? ' (mandatory first login)' : ''}`,
    );

    // Generate new JWT token with updated mustChangePassword claim
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      mustChangePassword: false, // Now false after password change
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Senha alterada com sucesso',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        mustChangePassword: false,
      },
    };
  }

  /**
   * Initiates password reset flow by sending reset email.
   *
   * @remarks
   * For security reasons, this method always returns success even if the email
   * does not exist in the system. This prevents email enumeration attacks.
   *
   * The reset token:
   * - Is cryptographically secure (32 bytes hex)
   * - Expires after 1 hour
   * - Invalidates any previous tokens for the same user
   *
   * @param forgotPasswordDto - Contains email address
   * @param metadata - Request metadata for audit logging
   * @returns Success message (same whether email exists or not)
   *
   * @example
   * ```ts
   * await authService.forgotPassword(
   *   { email: 'user@example.com' },
   *   { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
   * );
   * ```
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    metadata?: { ip?: string; userAgent?: string },
  ) {
    const email = forgotPasswordDto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    // Always return success message for security (prevent email enumeration)
    const successMessage = {
      message:
        'Se o email existir em nossa base, você receberá instruções para redefinir sua senha.',
    };

    if (!user) {
      this.logger.debug(
        `Password reset requested for non-existent email: ${email}`,
      );
      return successMessage;
    }

    if (!user.isActive) {
      this.logger.debug(`Password reset requested for inactive user: ${email}`);
      return successMessage;
    }

    // Invalidate any existing tokens for this user
    await this.passwordResetRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token
    const passwordReset = this.passwordResetRepository.create({
      userId: user.id,
      token,
      expiresAt,
    });
    await this.passwordResetRepository.save(passwordReset);

    // Send email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        token,
      );
      this.logger.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error.stack,
      );
      // Don't throw - still return success message for security
    }

    // Log for audit (LGPD compliance)
    await this.auditService.logPasswordResetRequest(user.id, {
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      email: user.email,
    });

    return successMessage;
  }

  /**
   * Resets user password using a valid reset token.
   *
   * @remarks
   * The token must be:
   * - Valid (exists in database)
   * - Not expired (within 1 hour of creation)
   * - Not already used
   *
   * After successful reset:
   * - Token is marked as used
   * - Password is hashed and updated
   * - mustChangePassword is set to false
   * - User can login with new password immediately
   *
   * @param resetPasswordDto - Contains token and new password
   * @param metadata - Request metadata for audit logging
   * @returns Success message
   * @throws {BadRequestException} If token is invalid or expired
   *
   * @example
   * ```ts
   * await authService.resetPassword(
   *   { token: 'abc123...', newPassword: 'NewSecure123!' },
   *   { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' }
   * );
   * ```
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    metadata?: { ip?: string; userAgent?: string },
  ) {
    const { token, newPassword } = resetPasswordDto;

    // Find valid, non-expired, unused token
    const passwordReset = await this.passwordResetRepository.findOne({
      where: {
        token,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!passwordReset) {
      this.logger.warn(`Invalid or expired password reset token attempted`);
      throw new BadRequestException(
        'Token inválido ou expirado. Solicite uma nova redefinição de senha.',
      );
    }

    // Get user
    const user = await this.usersService.findOne(passwordReset.userId);

    if (!user) {
      this.logger.error(
        `Password reset token for non-existent user: ${passwordReset.userId}`,
      );
      throw new BadRequestException('Token inválido.');
    }

    if (!user.isActive) {
      this.logger.warn(
        `Password reset attempted for inactive user: ${user.email}`,
      );
      throw new BadRequestException(
        'Conta desativada. Entre em contato com o suporte.',
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear mustChangePassword flag
    await this.usersService.updatePassword(user.id, hashedPassword);
    await this.usersService.setMustChangePassword(user.id, false);

    // Mark token as used
    passwordReset.used = true;
    await this.passwordResetRepository.save(passwordReset);

    // Log for audit (LGPD compliance)
    await this.auditService.logPasswordChange(user.id, {
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      wasReset: true,
    });

    this.logger.log(`Password reset completed for user: ${user.email}`);

    return {
      message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
    };
  }
}

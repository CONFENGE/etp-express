import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ClassSerializerInterceptor,
  UseInterceptors,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { CancelDeletionDto } from './dto/cancel-deletion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Controller handling user management HTTP endpoints.
 *
 * @remarks
 * All endpoints require JWT authentication via JwtAuthGuard.
 * ClassSerializerInterceptor automatically excludes password field from responses.
 *
 * Authorization:
 * - POST /users, DELETE /users/:id, and POST /users/admin/purge-deleted require SYSTEM_ADMIN role
 * - Other endpoints accessible to authenticated users
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created
 * - 400: Validation error
 * - 401: Unauthorized (missing or invalid JWT)
 * - 403: Forbidden (insufficient role permissions)
 * - 404: User not found
 */
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Creates a new user (SYSTEM_ADMIN only).
   *
   * @remarks
   * This endpoint is protected by RolesGuard and requires SYSTEM_ADMIN role.
   * Unauthorized access attempts are logged for security audit.
   *
   * @param createUserDto - User creation data (name, email, password)
   * @param currentUser - Current authenticated user (for audit logging)
   * @returns Created user entity (password excluded) with disclaimer message
   * @throws {ConflictException} 409 - If email already exists
   * @throws {BadRequestException} 400 - If validation fails
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   * @throws {ForbiddenException} 403 - If user does not have SYSTEM_ADMIN role
   */
  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Criar novo usuário (SYSTEM_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiForbiddenResponse({
    description: 'Acesso negado - requer role SYSTEM_ADMIN',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: { id: string; email: string; role: UserRole },
  ) {
    this.logger.log(
      `[ADMIN] User ${currentUser.email} (${currentUser.id}) creating new user with email: ${createUserDto.email}`,
    );
    const user = await this.usersService.create(createUserDto);
    return {
      data: user,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Retrieves users filtered by organization (Multi-Tenancy B2G - MT-02).
   *
   * @remarks
   * Security: Users can only see users from their own organization.
   * SYSTEM_ADMIN can see all users across all organizations.
   * Unauthorized cross-organization access attempts are logged.
   *
   * @param currentUser - Current authenticated user (from JWT token)
   * @returns Array of user entities (passwords excluded) with disclaimer message
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Get()
  @ApiOperation({
    summary: 'Listar usuários da organização (SYSTEM_ADMIN: todos)',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuários' })
  async findAll(
    @CurrentUser()
    currentUser: {
      id: string;
      email: string;
      role: UserRole;
      organizationId: string;
    },
  ) {
    // MT-02: SYSTEM_ADMIN can see all users, others see only their organization
    const isSystemAdmin = currentUser.role === UserRole.SYSTEM_ADMIN;
    const organizationId = isSystemAdmin
      ? undefined
      : currentUser.organizationId;

    if (isSystemAdmin) {
      this.logger.log(
        `[ADMIN] User ${currentUser.email} listing all users (SYSTEM_ADMIN)`,
      );
    } else {
      this.logger.log(
        `User ${currentUser.email} listing users for organization ${currentUser.organizationId}`,
      );
    }

    const users = await this.usersService.findAll(organizationId);
    return {
      data: users,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Retrieves the authenticated user's profile.
   *
   * @param userId - Current user ID (extracted from JWT token)
   * @returns User entity (password excluded) with disclaimer message
   * @throws {NotFoundException} 404 - If user not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Get('me')
  @ApiOperation({ summary: 'Obter perfil do usuário atual' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findOne(userId);
    return {
      data: user,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Exports all user data for LGPD compliance (Art. 18, II and V).
   *
   * @remarks
   * Exports complete user data including profile, ETPs, sections, versions,
   * analytics events, and audit logs. Password is excluded via @Exclude decorator.
   * This endpoint fulfills LGPD data portability requirements.
   *
   * @param userId - Current user ID (extracted from JWT token)
   * @returns Complete user data export with metadata
   * @throws {NotFoundException} 404 - If user not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Get('me/export')
  @ApiOperation({
    summary: 'Exportar todos os dados do usuário (LGPD Art. 18, II e V)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados exportados com sucesso',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            etps: { type: 'array' },
            analytics: { type: 'array' },
            auditLogs: { type: 'array' },
            exportMetadata: { type: 'object' },
          },
        },
        disclaimer: { type: 'string' },
      },
    },
  })
  async exportUserData(@CurrentUser('id') userId: string) {
    const data = await this.usersService.exportUserData(userId);
    return {
      data,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Soft deletes the authenticated user's account for LGPD compliance (Art. 18, VI - direito de exclusão).
   *
   * @remarks
   * Performs soft delete by marking account for deletion with 30-day grace period.
   * Requires explicit confirmation phrase "DELETE MY ACCOUNT".
   * Account will be hard deleted after 30 days by scheduled job.
   * This endpoint fulfills LGPD right to deletion requirements.
   *
   * @param userId - Current user ID (extracted from JWT token)
   * @param deleteDto - Deletion confirmation and optional reason
   * @returns Success message with scheduled deletion date
   * @throws {BadRequestException} 400 - If confirmation phrase is invalid
   * @throws {NotFoundException} 404 - If user not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Delete('me')
  @ApiOperation({
    summary: 'Deletar minha própria conta (soft delete) - LGPD Art. 18, VI',
  })
  @ApiResponse({
    status: 200,
    description: 'Conta marcada para deleção com período de 30 dias',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletionScheduledFor: { type: 'string', format: 'date-time' },
        disclaimer: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Confirmação inválida - deve ser exatamente "DELETE MY ACCOUNT"',
  })
  async deleteMyAccount(
    @CurrentUser('id') userId: string,
    @Body() deleteDto: DeleteAccountDto,
  ) {
    // Validate confirmation phrase
    if (deleteDto.confirmation !== 'DELETE MY ACCOUNT') {
      throw new BadRequestException(
        'Confirmação inválida. Digite exatamente "DELETE MY ACCOUNT" para confirmar.',
      );
    }

    const { scheduledDeletionDate } = await this.usersService.softDeleteAccount(
      userId,
      deleteDto.reason,
    );

    return {
      message:
        'Sua conta foi marcada para deleção e será removida permanentemente em 30 dias.',
      deletionScheduledFor: scheduledDeletionDate.toISOString(),
      disclaimer:
        'Para cancelar a deleção, entre em contato com o suporte dentro de 30 dias. ' +
        'Após este período, todos os dados serão permanentemente removidos e não poderão ser recuperados. ' +
        DISCLAIMER,
    };
  }

  /**
   * Cancels account deletion using token from confirmation email.
   *
   * @remarks
   * Verifies JWT token from deletion confirmation email and reactivates account.
   * Token must be valid (not expired, correct type) and account must be marked for deletion.
   * This endpoint does NOT require authentication (public endpoint for token-based cancellation).
   *
   * @param cancelDto - Contains JWT token from email
   * @returns Success message confirming cancellation
   * @throws {BadRequestException} 400 - If token is invalid or account not marked for deletion
   * @throws {UnauthorizedException} 401 - If token is expired or signature invalid
   */
  @Post('cancel-deletion')
  @UseGuards() // Remove JwtAuthGuard for this endpoint (public)
  @ApiOperation({ summary: 'Cancelar exclusão de conta usando token do email' })
  @ApiResponse({
    status: 200,
    description: 'Deleção cancelada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        accountReactivated: { type: 'boolean' },
        disclaimer: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido ou conta não marcada para deleção',
  })
  @ApiResponse({
    status: 401,
    description: 'Token expirado ou assinatura inválida',
  })
  async cancelDeletion(@Body() cancelDto: CancelDeletionDto) {
    try {
      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(cancelDto.token);

      // Validate token type
      if (payload.type !== 'CANCEL_DELETION') {
        throw new BadRequestException(
          'Token inválido. Este token não é para cancelamento de deleção.',
        );
      }

      // Cancel deletion
      await this.usersService.cancelDeletion(payload.sub);

      return {
        message: 'Exclusão de conta cancelada com sucesso',
        accountReactivated: true,
        disclaimer:
          'Sua conta foi reativada. Você pode fazer login normalmente. ' +
          DISCLAIMER,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Token expirado. O período de 30 dias para cancelamento expirou.',
        );
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          'Token inválido ou assinatura inválida.',
        );
      }
      // Re-throw BadRequestException from service
      throw error;
    }
  }

  /**
   * Retrieves a user by ID with ownership validation.
   *
   * @remarks
   * Security: Validates that user can only view:
   * - Their own profile (id === currentUserId)
   * - OR any user if SYSTEM_ADMIN
   * - OR users from same organization if ORG_ADMIN
   * Unauthorized cross-user/cross-organization access attempts are logged.
   *
   * @param id - User unique identifier (UUID)
   * @param currentUser - Current authenticated user (from JWT token)
   * @returns User entity (password excluded) with disclaimer message
   * @throws {NotFoundException} 404 - If user not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   * @throws {ForbiddenException} 403 - If user lacks permission to view target user
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter usuário por ID' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiForbiddenResponse({
    description: 'Acesso negado - sem permissão para visualizar este usuário',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser()
    currentUser: {
      id: string;
      email: string;
      role: UserRole;
      organizationId: string;
    },
  ) {
    // Security: Validate ownership before returning user data
    const isOwnProfile = id === currentUser.id;
    const isSystemAdmin = currentUser.role === UserRole.SYSTEM_ADMIN;
    const isOrgAdmin = currentUser.role === UserRole.ADMIN;

    // Fetch user first (needed for org validation and response)
    const user = await this.usersService.findOne(id);

    // Case 1: User viewing their own profile - always allowed
    if (isOwnProfile) {
      this.logger.log(`User ${currentUser.email} viewing own profile`);
    }
    // Case 2: SYSTEM_ADMIN can view any user
    else if (isSystemAdmin) {
      this.logger.log(
        `[ADMIN] User ${currentUser.email} (SYSTEM_ADMIN) viewing user ${id}`,
      );
    }
    // Case 3: ADMIN can view users from same organization
    else if (isOrgAdmin) {
      if (user.organizationId !== currentUser.organizationId) {
        this.logger.warn(
          `[IDOR ATTEMPT] User ${currentUser.email} (ADMIN) attempted to view user ${id} from different organization`,
        );
        throw new ForbiddenException(
          'Você não tem permissão para visualizar usuários de outra organização',
        );
      }
      this.logger.log(
        `[ADMIN] User ${currentUser.email} viewing user ${id} from same organization`,
      );
    }
    // Case 4: Regular users cannot view other users
    else {
      this.logger.warn(
        `[IDOR ATTEMPT] User ${currentUser.email} attempted to view user ${id} without permission`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para visualizar este usuário',
      );
    }

    return {
      data: user,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Updates a user with ownership validation.
   *
   * @remarks
   * Security: Validates that user can only update:
   * - Their own profile (id === currentUserId)
   * - OR any user if SYSTEM_ADMIN
   * - OR users from same organization if ORG_ADMIN
   * Unauthorized cross-user/cross-organization update attempts are logged.
   *
   * @param id - User unique identifier (UUID)
   * @param updateUserDto - Partial user update data (name, email, password)
   * @param currentUser - Current authenticated user (from JWT token)
   * @returns Updated user entity (password excluded) with disclaimer message
   * @throws {NotFoundException} 404 - If user not found
   * @throws {BadRequestException} 400 - If validation fails
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   * @throws {ForbiddenException} 403 - If user lacks permission to update target user
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiForbiddenResponse({
    description: 'Acesso negado - sem permissão para editar este usuário',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser()
    currentUser: {
      id: string;
      email: string;
      role: UserRole;
      organizationId: string;
    },
  ) {
    // Security: Validate ownership before update
    const isOwnProfile = id === currentUser.id;
    const isSystemAdmin = currentUser.role === UserRole.SYSTEM_ADMIN;
    const isOrgAdmin = currentUser.role === UserRole.ADMIN;

    // Case 1: User editing their own profile - always allowed
    if (isOwnProfile) {
      this.logger.log(`User ${currentUser.email} updating own profile`);
    }
    // Case 2: SYSTEM_ADMIN can edit any user
    else if (isSystemAdmin) {
      this.logger.log(
        `[ADMIN] User ${currentUser.email} (SYSTEM_ADMIN) updating user ${id}`,
      );
    }
    // Case 3: ADMIN can edit users from same organization
    else if (isOrgAdmin) {
      // Fetch target user to verify organization
      const targetUser = await this.usersService.findOne(id);
      if (targetUser.organizationId !== currentUser.organizationId) {
        this.logger.warn(
          `[IDOR ATTEMPT] User ${currentUser.email} (ADMIN) attempted to update user ${id} from different organization`,
        );
        throw new ForbiddenException(
          'Você não tem permissão para editar usuários de outra organização',
        );
      }
      this.logger.log(
        `[ADMIN] User ${currentUser.email} updating user ${id} from same organization`,
      );
    }
    // Case 4: Regular users cannot edit other users
    else {
      this.logger.warn(
        `[IDOR ATTEMPT] User ${currentUser.email} attempted to update user ${id} without permission`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para editar este usuário',
      );
    }

    const user = await this.usersService.update(id, updateUserDto);
    return {
      data: user,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Deletes a user (SYSTEM_ADMIN only).
   *
   * @remarks
   * This endpoint is protected by RolesGuard and requires SYSTEM_ADMIN role.
   * Unauthorized access attempts are logged for security audit.
   *
   * @param id - User unique identifier (UUID)
   * @param currentUser - Current authenticated user (for audit logging)
   * @returns Success message with disclaimer
   * @throws {NotFoundException} 404 - If user not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   * @throws {ForbiddenException} 403 - If user does not have SYSTEM_ADMIN role
   */
  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Deletar usuário (SYSTEM_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  @ApiForbiddenResponse({
    description: 'Acesso negado - requer role SYSTEM_ADMIN',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; email: string; role: UserRole },
  ) {
    this.logger.warn(
      `[ADMIN] User ${currentUser.email} (${currentUser.id}) deleting user with ID: ${id}`,
    );
    await this.usersService.remove(id);
    return {
      message: 'Usuário deletado com sucesso',
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Manually triggers hard delete purge of accounts soft-deleted for >30 days (SYSTEM_ADMIN only).
   *
   * @remarks
   * This endpoint is protected by RolesGuard and requires SYSTEM_ADMIN role.
   * Unauthorized access attempts are logged for security audit.
   *
   * This endpoint allows manual triggering of the automated daily purge job.
   * Useful for testing or immediate cleanup without waiting for scheduled cron.
   *
   * @param currentUser - Current authenticated user (for audit logging)
   * @returns Purge statistics (count, timestamp, purged user IDs)
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   * @throws {ForbiddenException} 403 - If user does not have SYSTEM_ADMIN role
   */
  @Post('admin/purge-deleted')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Purge manual de contas deletadas há >30 dias (SYSTEM_ADMIN only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Purge executado com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        purgedCount: { type: 'number' },
        purgedAt: { type: 'string', format: 'date-time' },
        purgedUserIds: { type: 'array', items: { type: 'string' } },
        disclaimer: { type: 'string' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Acesso negado - requer role SYSTEM_ADMIN',
  })
  async adminPurgeDeleted(
    @CurrentUser() currentUser: { id: string; email: string; role: UserRole },
  ) {
    this.logger.warn(
      `[ADMIN] User ${currentUser.email} (${currentUser.id}) executing manual purge of deleted accounts`,
    );
    const result = await this.usersService.purgeDeletedAccounts();
    return {
      message: 'Purge de contas deletadas executado com sucesso',
      ...result,
      disclaimer:
        'ATENÇÃO: Esta operação remove permanentemente todos os dados de usuários soft-deleted há mais de 30 dias. ' +
        'A remoção é irreversível. ' +
        DISCLAIMER,
    };
  }
}

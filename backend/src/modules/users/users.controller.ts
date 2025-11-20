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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DISCLAIMER } from '../../common/constants/messages';

/**
 * Controller handling user management HTTP endpoints.
 *
 * @remarks
 * All endpoints require JWT authentication via JwtAuthGuard.
 * ClassSerializerInterceptor automatically excludes password field from responses.
 *
 * Authorization:
 * - POST /users and DELETE /users/:id are admin-only (not enforced yet)
 * - Other endpoints accessible to authenticated users
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created
 * - 400: Validation error
 * - 401: Unauthorized (missing or invalid JWT)
 * - 404: User not found
 */
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Creates a new user (admin only).
   *
   * @remarks
   * Admin authorization is not yet enforced. This endpoint should be
   * protected with an admin guard in the future.
   *
   * @param createUserDto - User creation data (name, email, password)
   * @returns Created user entity (password excluded) with disclaimer message
   * @throws {ConflictException} 409 - If email already exists
   * @throws {BadRequestException} 400 - If validation fails
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Post()
  @ApiOperation({ summary: 'Criar novo usuário (admin only)' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return {
      data: user,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Retrieves all users.
   *
   * @returns Array of user entities (passwords excluded) with disclaimer message
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários' })
  @ApiResponse({ status: 200, description: 'Lista de usuários' })
  async findAll() {
    const users = await this.usersService.findAll();
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
   * Deletes the authenticated user's account (soft delete).
   *
   * @remarks
   * Implements soft delete for LGPD Art. 18, VI compliance (right to deletion).
   * Requires explicit confirmation via 'DELETE MY ACCOUNT' string.
   * Account is marked for deletion and will be permanently removed after 30 days.
   * Users can cancel the deletion request within this grace period by contacting support.
   *
   * The soft delete process:
   * 1. Sets deletedAt timestamp
   * 2. Deactivates account (isActive = false)
   * 3. Logs deletion request to audit trail
   * 4. Schedules hard delete after 30 days (#236)
   *
   * @param userId - Current user ID (extracted from JWT token)
   * @param deleteDto - Deletion confirmation data
   * @returns Deletion confirmation with scheduled date
   * @throws {BadRequestException} 400 - If confirmation string is invalid
   * @throws {NotFoundException} 404 - If user not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Delete('me')
  @ApiOperation({
    summary: 'Deletar minha própria conta (soft delete - LGPD Art. 18, VI)',
  })
  @ApiResponse({
    status: 200,
    description: 'Conta marcada para deleção',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletionScheduledFor: { type: 'string', format: 'date-time' },
        cancellationInfo: { type: 'string' },
        disclaimer: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Confirmação inválida',
  })
  async deleteMyAccount(
    @CurrentUser('id') userId: string,
    @Body() deleteDto: DeleteAccountDto,
  ) {
    // Validate confirmation string
    if (deleteDto.confirmation !== 'DELETE MY ACCOUNT') {
      throw new BadRequestException(
        'Confirmação inválida. Digite exatamente "DELETE MY ACCOUNT" para confirmar.',
      );
    }

    // Perform soft delete
    await this.usersService.softDeleteAccount(userId);

    // Calculate scheduled hard delete date
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    return {
      message:
        'Sua conta foi marcada para deleção e será removida permanentemente em 30 dias',
      deletionScheduledFor: deletionDate.toISOString(),
      cancellationInfo:
        'Para cancelar a deleção, entre em contato com o suporte dentro de 30 dias',
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Retrieves a user by ID.
   *
   * @param id - User unique identifier (UUID)
   * @returns User entity (password excluded) with disclaimer message
   * @throws {NotFoundException} 404 - If user not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter usuário por ID' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return {
      data: user,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Updates a user.
   *
   * @param id - User unique identifier (UUID)
   * @param updateUserDto - Partial user update data (name, email, password)
   * @returns Updated user entity (password excluded) with disclaimer message
   * @throws {NotFoundException} 404 - If user not found
   * @throws {BadRequestException} 400 - If validation fails
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return {
      data: user,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Deletes a user (admin only).
   *
   * @remarks
   * Admin authorization is not yet enforced. This endpoint should be
   * protected with an admin guard in the future.
   *
   * @param id - User unique identifier (UUID)
   * @returns Success message with disclaimer
   * @throws {NotFoundException} 404 - If user not found
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Deletar usuário (admin only)' })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return {
      message: 'Usuário deletado com sucesso',
      disclaimer: DISCLAIMER,
    };
  }
}

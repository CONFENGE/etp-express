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
      disclaimer:
        DISCLAIMER,
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
      disclaimer:
        DISCLAIMER,
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
      disclaimer:
        DISCLAIMER,
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
      disclaimer:
        DISCLAIMER,
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
      disclaimer:
        DISCLAIMER,
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
      disclaimer:
        DISCLAIMER,
    };
  }
}

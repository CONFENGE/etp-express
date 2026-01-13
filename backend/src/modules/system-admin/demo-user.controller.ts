import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  DemoUserService,
  DemoUserWithEtpCount,
  CreateDemoUserResponse,
} from './demo-user.service';
import { CreateDemoUserDto } from './dto/create-demo-user.dto';
import { ResetDemoUserDto } from './dto/reset-demo-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SystemAdminGuard } from './guards/system-admin.guard';
import { UserRole } from '../../entities/user.entity';

/**
 * Response DTO for demo user list and details.
 * Excludes sensitive data like password.
 */
class DemoUserResponseDto implements DemoUserWithEtpCount {
  id: string;
  email: string;
  name: string;
  cargo: string | null;
  role: UserRole;
  isActive: boolean;
  etpLimitCount: number | null;
  etpCount: number;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/**
 * Response DTO for demo user creation.
 * Includes generated password (one-time display).
 */
class CreateDemoUserResponseDto {
  user: DemoUserResponseDto;
  generatedPassword: string;
}

/**
 * Response DTO for demo user reset.
 * Optionally includes regenerated password.
 */
class ResetDemoUserResponseDto {
  user: DemoUserResponseDto;
  generatedPassword?: string;
}

/**
 * Controller for Demo User Management (Issue #1441).
 *
 * Features:
 * - Create demo user accounts with auto-generated passwords
 * - List all demo users with ETP counts and blocked status
 * - Get demo user details
 * - Delete demo users (cascades to ETPs)
 * - Reset demo users (clear ETPs, optionally regenerate password)
 *
 * @remarks
 * All endpoints require SYSTEM_ADMIN role (enforced by SystemAdminGuard).
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created
 * - 400: Validation error
 * - 401: Unauthorized (missing or invalid JWT)
 * - 403: Forbidden (not a SYSTEM_ADMIN)
 * - 404: Demo user not found
 * - 409: Conflict (email already exists)
 */
@ApiTags('system-admin')
@Controller('system-admin/demo-users')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
@ApiBearerAuth()
export class DemoUserController {
  constructor(private readonly demoUserService: DemoUserService) {}

  /**
   * Creates a new demo user account.
   *
   * Generates a random password that is returned ONLY in this response.
   * The System Admin must communicate this password to the demo user.
   *
   * @param createDemoUserDto - Email, name, and optional cargo
   * @returns Created user with generated password (one-time display)
   * @throws ConflictException 409 - If email already exists
   * @throws NotFoundException 404 - If demo organization not found (seed issue)
   */
  @Post()
  @ApiOperation({
    summary: 'Create demo user',
    description:
      'Creates a new demo user account with auto-generated password. ' +
      'The password is returned ONLY in this response - save it immediately. ' +
      'Demo users are limited to 3 ETPs by default.',
  })
  @ApiResponse({
    status: 201,
    description: 'Demo user created successfully',
    type: CreateDemoUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Demo organization not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @Body() createDemoUserDto: CreateDemoUserDto,
  ): Promise<CreateDemoUserResponse> {
    return this.demoUserService.createDemoUser(createDemoUserDto);
  }

  /**
   * Lists all demo users with their ETP counts and blocked status.
   *
   * @returns Array of demo users sorted by creation date (newest first)
   */
  @Get()
  @ApiOperation({
    summary: 'List all demo users',
    description:
      'Returns all demo users with their ETP counts and blocked status. ' +
      'A user is blocked when they have reached their ETP limit.',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo users retrieved successfully',
    type: [DemoUserResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  async findAll(): Promise<DemoUserWithEtpCount[]> {
    return this.demoUserService.findAllDemoUsers();
  }

  /**
   * Gets a single demo user by ID with ETP count.
   *
   * @param id - Demo user UUID
   * @returns Demo user with ETP count and blocked status
   * @throws NotFoundException 404 - If demo user not found
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get demo user by ID',
    description: 'Returns a single demo user with their ETP count and status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Demo user UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo user retrieved successfully',
    type: DemoUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Demo user not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DemoUserWithEtpCount> {
    return this.demoUserService.findOneDemoUser(id);
  }

  /**
   * Deletes a demo user and their ETPs.
   *
   * This operation cascades: all ETPs created by this user are also deleted.
   *
   * @param id - Demo user UUID
   * @throws NotFoundException 404 - If demo user not found
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete demo user',
    description:
      'Permanently removes a demo user and all their ETPs. ' +
      'This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Demo user UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 204,
    description: 'Demo user deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Demo user not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.demoUserService.removeDemoUser(id);
  }

  /**
   * Resets a demo user account.
   *
   * Clears all ETPs and optionally regenerates the password.
   * Reactivates the user if they were blocked.
   *
   * @param id - Demo user UUID
   * @param resetDemoUserDto - Optional flag to regenerate password
   * @returns Reset user with optional new password
   * @throws NotFoundException 404 - If demo user not found
   */
  @Patch(':id/reset')
  @ApiOperation({
    summary: 'Reset demo user',
    description:
      'Resets a demo user account: clears all ETPs, reactivates if blocked. ' +
      'Optionally regenerates password (new password returned ONLY in response).',
  })
  @ApiParam({
    name: 'id',
    description: 'Demo user UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo user reset successfully',
    type: ResetDemoUserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Demo user not found' })
  async reset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() resetDemoUserDto: ResetDemoUserDto,
  ): Promise<{ user: DemoUserWithEtpCount; generatedPassword?: string }> {
    return this.demoUserService.resetDemoUser(
      id,
      resetDemoUserDto.regeneratePassword ?? false,
    );
  }
}

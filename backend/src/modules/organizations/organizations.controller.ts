import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

/**
 * Controller for managing organizations in Multi-Tenancy B2G architecture.
 *
 * @remarks
 * All endpoints require JWT authentication via JwtAuthGuard.
 * IMPORTANT: These endpoints should be restricted to ADMIN role only.
 * Admin authorization guard not yet implemented - see issue #357 (MT-04).
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created
 * - 400: Validation error or business rule violation
 * - 401: Unauthorized (missing or invalid JWT)
 * - 404: Organization not found
 * - 409: Conflict (CNPJ already exists)
 */
@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Creates a new organization (ADMIN only).
   *
   * @param createOrganizationDto - Organization data (name, cnpj, domainWhitelist)
   * @returns Created organization entity
   * @throws {ConflictException} 409 - If CNPJ already exists
   * @throws {BadRequestException} 400 - If validation fails (CNPJ format, etc.)
   * @throws {UnauthorizedException} 401 - If JWT token is invalid or missing
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new organization (ADMIN only)' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 409, description: 'CNPJ already exists' })
  async create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  /**
   * Retrieves all organizations (ADMIN only).
   *
   * @returns Array of organizations ordered by creation date (newest first)
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retrieve all organizations (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async findAll() {
    return this.organizationsService.findAll();
  }

  /**
   * Retrieves a single organization by ID (ADMIN only).
   *
   * @param id - Organization UUID
   * @returns Organization entity
   * @throws {NotFoundException} 404 - If organization not found
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retrieve organization by ID (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  /**
   * Updates an organization (ADMIN only).
   *
   * @param id - Organization UUID
   * @param updateOrganizationDto - Fields to update
   * @returns Updated organization entity
   * @throws {NotFoundException} 404 - If organization not found
   * @throws {ConflictException} 409 - If updating CNPJ to an existing one
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update organization (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'CNPJ already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  /**
   * Deletes an organization (ADMIN only).
   *
   * @param id - Organization UUID
   * @throws {NotFoundException} 404 - If organization not found
   * @throws {BadRequestException} 400 - If organization has associated users or ETPs
   *
   * @remarks
   * This operation will fail if there are users or ETPs associated with the organization
   * due to foreign key constraints (ON DELETE RESTRICT).
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete organization (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Organization has associated users or ETPs',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async remove(@Param('id') id: string) {
    await this.organizationsService.remove(id);
    return { message: 'Organization deleted successfully' };
  }

  /**
   * Suspends an organization (Kill Switch) (ADMIN only).
   * Blocks all users from this organization via TenantGuard middleware (MT-04).
   *
   * @param id - Organization UUID
   * @returns Updated organization with isActive = false
   * @throws {NotFoundException} 404 - If organization not found
   * @throws {BadRequestException} 400 - If organization is already suspended
   */
  @Patch(':id/suspend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Suspend organization (Kill Switch) (ADMIN only)',
    description:
      'Blocks all users from this organization. Users will receive 403 Forbidden when accessing the platform.',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization suspended successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Organization is already suspended',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async suspend(@Param('id') id: string) {
    return this.organizationsService.suspend(id);
  }

  /**
   * Reactivates a suspended organization (ADMIN only).
   *
   * @param id - Organization UUID
   * @returns Updated organization with isActive = true
   * @throws {NotFoundException} 404 - If organization not found
   * @throws {BadRequestException} 400 - If organization is already active
   */
  @Patch(':id/reactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reactivate suspended organization (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization reactivated successfully',
  })
  @ApiResponse({ status: 400, description: 'Organization is already active' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async reactivate(@Param('id') id: string) {
    return this.organizationsService.reactivate(id);
  }
}

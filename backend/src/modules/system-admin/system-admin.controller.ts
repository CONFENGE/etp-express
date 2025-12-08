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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SystemAdminService, GlobalStatistics } from './system-admin.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { AssignManagerDto } from './dto/assign-manager.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SystemAdminGuard } from './guards/system-admin.guard';
import { AuthorizedDomain } from '../../entities/authorized-domain.entity';

/**
 * Controller for System Administrator operations (M8: Gestão de Domínios Institucionais).
 *
 * Features:
 * - CRUD operations for authorized domains
 * - Domain manager assignment
 * - Global statistics
 * - Domain suspend/reactivate
 *
 * @remarks
 * All endpoints require SYSTEM_ADMIN role (enforced by SystemAdminGuard).
 * Only the master administrator (tiago@confenge.com.br) can access these endpoints.
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created
 * - 400: Validation error or business rule violation
 * - 401: Unauthorized (missing or invalid JWT)
 * - 403: Forbidden (not a SYSTEM_ADMIN)
 * - 404: Resource not found
 * - 409: Conflict (domain already exists)
 */
@ApiTags('system-admin')
@Controller('system-admin')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
@ApiBearerAuth()
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  // ============================================
  // DOMAIN CRUD OPERATIONS
  // ============================================

  /**
   * Creates a new authorized domain.
   *
   * @param createDomainDto - Domain data (domain, institutionName, maxUsers, organizationId)
   * @returns Created domain entity
   * @throws ConflictException 409 - If domain already exists
   * @throws BadRequestException 400 - If validation fails
   */
  @Post('domains')
  @ApiOperation({
    summary: 'Create a new authorized domain',
    description:
      'Registers a new institutional email domain for user access control. ' +
      'Users with emails from this domain can register and be assigned to it.',
  })
  @ApiResponse({
    status: 201,
    description: 'Domain created successfully',
    type: AuthorizedDomain,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 409, description: 'Domain already exists' })
  async createDomain(
    @Body() createDomainDto: CreateDomainDto,
  ): Promise<AuthorizedDomain> {
    return this.systemAdminService.createDomain(createDomainDto);
  }

  /**
   * Retrieves all authorized domains.
   *
   * @returns Array of domains with manager and user count
   */
  @Get('domains')
  @ApiOperation({
    summary: 'List all authorized domains',
    description:
      'Returns all registered domains with their managers, organizations, and user counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Domains retrieved successfully',
    type: [AuthorizedDomain],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  async findAllDomains(): Promise<AuthorizedDomain[]> {
    return this.systemAdminService.findAllDomains();
  }

  /**
   * Retrieves a single domain by ID.
   *
   * @param id - Domain UUID
   * @returns Domain entity with relations
   * @throws NotFoundException 404 - If domain not found
   */
  @Get('domains/:id')
  @ApiOperation({
    summary: 'Get domain by ID',
    description:
      'Returns a single domain with its manager, organization, and users.',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain retrieved successfully',
    type: AuthorizedDomain,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async findOneDomain(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuthorizedDomain> {
    return this.systemAdminService.findOneDomain(id);
  }

  /**
   * Updates an authorized domain.
   *
   * @param id - Domain UUID
   * @param updateDomainDto - Fields to update
   * @returns Updated domain entity
   * @throws NotFoundException 404 - If domain not found
   * @throws ConflictException 409 - If updating to an existing domain
   */
  @Patch('domains/:id')
  @ApiOperation({
    summary: 'Update domain',
    description:
      'Updates domain properties like institutionName, maxUsers, or isActive.',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain updated successfully',
    type: AuthorizedDomain,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  @ApiResponse({ status: 409, description: 'Domain already exists' })
  async updateDomain(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDomainDto: UpdateDomainDto,
  ): Promise<AuthorizedDomain> {
    return this.systemAdminService.updateDomain(id, updateDomainDto);
  }

  /**
   * Deletes an authorized domain.
   *
   * @param id - Domain UUID
   * @returns Success message
   * @throws NotFoundException 404 - If domain not found
   * @throws BadRequestException 400 - If domain has associated users
   */
  @Delete('domains/:id')
  @ApiOperation({
    summary: 'Delete domain',
    description:
      'Removes an authorized domain. Fails if users are associated with it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Domain has associated users and cannot be deleted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async removeDomain(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.systemAdminService.removeDomain(id);
    return { message: 'Domain deleted successfully' };
  }

  // ============================================
  // DOMAIN MANAGER ASSIGNMENT
  // ============================================

  /**
   * Assigns a domain manager to an authorized domain.
   *
   * @param id - Domain UUID
   * @param assignManagerDto - User ID to assign as manager
   * @returns Updated domain with new manager
   * @throws NotFoundException 404 - If domain or user not found
   * @throws BadRequestException 400 - If user email doesn't match domain
   */
  @Post('domains/:id/managers')
  @ApiOperation({
    summary: 'Assign domain manager',
    description:
      'Assigns a user as the local administrator for a domain. ' +
      'The user must have an email from the same domain. ' +
      'Their role will be updated to DOMAIN_MANAGER.',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Manager assigned successfully',
    type: AuthorizedDomain,
  })
  @ApiResponse({
    status: 400,
    description: "User email doesn't match domain",
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Domain or user not found' })
  async assignManager(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignManagerDto: AssignManagerDto,
  ): Promise<AuthorizedDomain> {
    return this.systemAdminService.assignManager(id, assignManagerDto);
  }

  // ============================================
  // DOMAIN SUSPEND/REACTIVATE
  // ============================================

  /**
   * Suspends an authorized domain.
   *
   * @param id - Domain UUID
   * @returns Updated domain with isActive = false
   */
  @Patch('domains/:id/suspend')
  @ApiOperation({
    summary: 'Suspend domain',
    description:
      'Blocks user registration and login for this domain. ' +
      'Existing users from this domain will be denied access.',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain suspended successfully',
    type: AuthorizedDomain,
  })
  @ApiResponse({
    status: 400,
    description: 'Domain is already suspended',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async suspendDomain(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuthorizedDomain> {
    return this.systemAdminService.suspendDomain(id);
  }

  /**
   * Reactivates a suspended domain.
   *
   * @param id - Domain UUID
   * @returns Updated domain with isActive = true
   */
  @Patch('domains/:id/reactivate')
  @ApiOperation({
    summary: 'Reactivate domain',
    description:
      'Re-enables user registration and login for a suspended domain.',
  })
  @ApiParam({
    name: 'id',
    description: 'Domain UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Domain reactivated successfully',
    type: AuthorizedDomain,
  })
  @ApiResponse({
    status: 400,
    description: 'Domain is already active',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  @ApiResponse({ status: 404, description: 'Domain not found' })
  async reactivateDomain(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuthorizedDomain> {
    return this.systemAdminService.reactivateDomain(id);
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Retrieves global statistics for system administrators.
   *
   * @returns Statistics object with counts and breakdowns
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get global statistics',
    description:
      'Returns system-wide metrics including domain counts, user counts, ' +
      'organization counts, and ETP counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalDomains: { type: 'number', example: 15 },
        activeDomains: { type: 'number', example: 12 },
        inactiveDomains: { type: 'number', example: 3 },
        totalUsers: { type: 'number', example: 150 },
        totalOrganizations: { type: 'number', example: 10 },
        totalEtps: { type: 'number', example: 500 },
        domainsByOrganization: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              organizationName: {
                type: 'string',
                example: 'Prefeitura de Lages',
              },
              domainCount: { type: 'number', example: 3 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - SYSTEM_ADMIN role required',
  })
  async getStatistics(): Promise<GlobalStatistics> {
    return this.systemAdminService.getStatistics();
  }
}

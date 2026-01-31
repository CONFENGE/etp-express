import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TenantBrandingService } from './tenant-branding.service';
import { CreateTenantBrandingDto } from './dto/create-tenant-branding.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';
import { TenantBranding } from '../../entities/tenant-branding.entity';

/**
 * Controller for managing tenant branding configurations.
 * Restricted to admin users only (except public domain lookup).
 */
@Controller('tenant-branding')
export class TenantBrandingController {
  constructor(private readonly tenantBrandingService: TenantBrandingService) {}

  /**
   * Create a new branding configuration.
   * Requires admin role.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateTenantBrandingDto,
  ): Promise<TenantBranding> {
    return this.tenantBrandingService.create(createDto);
  }

  /**
   * Get all branding configurations.
   * Requires admin role.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(): Promise<TenantBranding[]> {
    return this.tenantBrandingService.findAll();
  }

  /**
   * Get branding by domain (public endpoint for frontend).
   * Used when users access via custom domain.
   */
  @Get('by-domain')
  async findByDomain(
    @Query('domain') domain: string,
  ): Promise<TenantBranding | null> {
    if (!domain) {
      return null;
    }
    return this.tenantBrandingService.findByDomain(domain);
  }

  /**
   * Get branding by organization ID.
   * Requires authentication.
   */
  @Get('by-organization/:organizationId')
  @UseGuards(JwtAuthGuard)
  async findByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<TenantBranding | null> {
    return this.tenantBrandingService.findByOrganizationId(organizationId);
  }

  /**
   * Get branding by ID.
   * Requires admin role.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findOne(@Param('id') id: string): Promise<TenantBranding> {
    return this.tenantBrandingService.findOne(id);
  }

  /**
   * Update branding configuration.
   * Requires admin role.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTenantBrandingDto,
  ): Promise<TenantBranding> {
    return this.tenantBrandingService.update(id, updateDto);
  }

  /**
   * Delete branding configuration.
   * Requires admin role.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.tenantBrandingService.remove(id);
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantBranding } from '../../entities/tenant-branding.entity';
import { CreateTenantBrandingDto } from './dto/create-tenant-branding.dto';
import { UpdateTenantBrandingDto } from './dto/update-tenant-branding.dto';

/**
 * Service for managing tenant branding configurations.
 * Provides CRUD operations and domain-based branding lookup.
 */
@Injectable()
export class TenantBrandingService {
  private readonly logger = new Logger(TenantBrandingService.name);

  constructor(
    @InjectRepository(TenantBranding)
    private tenantBrandingRepository: Repository<TenantBranding>,
  ) {}

  /**
   * Creates a new branding configuration.
   *
   * @param createDto - Branding data
   * @returns Created branding configuration
   * @throws ConflictException if organization already has branding or customDomain exists
   */
  async create(
    createDto: CreateTenantBrandingDto,
  ): Promise<TenantBranding> {
    // Check if organization already has branding
    const existingBranding = await this.tenantBrandingRepository.findOne({
      where: { organizationId: createDto.organizationId },
    });

    if (existingBranding) {
      throw new ConflictException(
        `Organization ${createDto.organizationId} already has branding configuration`,
      );
    }

    // Check if custom domain is already in use
    if (createDto.customDomain) {
      const domainExists = await this.tenantBrandingRepository.findOne({
        where: { customDomain: createDto.customDomain },
      });

      if (domainExists) {
        throw new ConflictException(
          `Custom domain ${createDto.customDomain} is already in use`,
        );
      }
    }

    const branding = this.tenantBrandingRepository.create(createDto);
    const savedBranding = await this.tenantBrandingRepository.save(branding);

    this.logger.log(
      `Branding created for organization ${createDto.organizationId}`,
    );

    return savedBranding;
  }

  /**
   * Retrieves all branding configurations.
   *
   * @returns Array of branding configurations
   */
  async findAll(): Promise<TenantBranding[]> {
    return this.tenantBrandingRepository.find({
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves branding by ID.
   *
   * @param id - Branding UUID
   * @returns Branding configuration
   * @throws NotFoundException if branding not found
   */
  async findOne(id: string): Promise<TenantBranding> {
    const branding = await this.tenantBrandingRepository.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!branding) {
      throw new NotFoundException(`Branding with ID ${id} not found`);
    }

    return branding;
  }

  /**
   * Retrieves branding by organization ID.
   *
   * @param organizationId - Organization UUID
   * @returns Branding configuration or null
   */
  async findByOrganizationId(
    organizationId: string,
  ): Promise<TenantBranding | null> {
    return this.tenantBrandingRepository.findOne({
      where: { organizationId, isActive: true },
      relations: ['organization'],
    });
  }

  /**
   * Retrieves branding by custom domain.
   * Used to load branding when users access via custom domain.
   *
   * @param domain - Custom domain (e.g., "lages.etp-express.com.br")
   * @returns Branding configuration or null
   */
  async findByDomain(domain: string): Promise<TenantBranding | null> {
    return this.tenantBrandingRepository.findOne({
      where: { customDomain: domain, isActive: true },
      relations: ['organization'],
    });
  }

  /**
   * Updates a branding configuration.
   *
   * @param id - Branding UUID
   * @param updateDto - Fields to update
   * @returns Updated branding configuration
   * @throws NotFoundException if branding not found
   * @throws ConflictException if customDomain already exists
   */
  async update(
    id: string,
    updateDto: UpdateTenantBrandingDto,
  ): Promise<TenantBranding> {
    const branding = await this.findOne(id);

    // Check if custom domain is already in use (by another branding)
    if (updateDto.customDomain && updateDto.customDomain !== branding.customDomain) {
      const domainExists = await this.tenantBrandingRepository.findOne({
        where: { customDomain: updateDto.customDomain },
      });

      if (domainExists && domainExists.id !== id) {
        throw new ConflictException(
          `Custom domain ${updateDto.customDomain} is already in use`,
        );
      }
    }

    Object.assign(branding, updateDto);

    const updatedBranding = await this.tenantBrandingRepository.save(branding);
    this.logger.log(
      `Branding updated for organization ${branding.organizationId}`,
    );

    return updatedBranding;
  }

  /**
   * Deletes a branding configuration.
   *
   * @param id - Branding UUID
   * @throws NotFoundException if branding not found
   */
  async remove(id: string): Promise<void> {
    const branding = await this.findOne(id);
    await this.tenantBrandingRepository.remove(branding);
    this.logger.log(
      `Branding deleted for organization ${branding.organizationId}`,
    );
  }
}

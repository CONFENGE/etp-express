import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

/**
 * Service for managing organizations in Multi-Tenancy B2G architecture.
 * Handles CRUD operations, domain-based organization lookup, and suspend/reactivate.
 *
 * Key methods:
 * - findByDomain(): Used by AuthService.register to auto-assign organizations
 * - suspend()/reactivate(): Kill Switch for blocking organization access
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) {}

  /**
   * Creates a new organization.
   *
   * @param createOrganizationDto - Organization data
   * @returns Created organization
   * @throws ConflictException if CNPJ already exists
   * @throws BadRequestException if CNPJ format is invalid
   */
  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    // Validate CNPJ uniqueness
    const existingOrg = await this.organizationsRepository.findOne({
      where: { cnpj: createOrganizationDto.cnpj },
    });

    if (existingOrg) {
      throw new ConflictException(
        `Organization with CNPJ ${createOrganizationDto.cnpj} already exists`,
      );
    }

    // Normalize domain whitelist to lowercase for case-insensitive matching
    const normalizedDomains = createOrganizationDto.domainWhitelist.map((d) =>
      d.toLowerCase(),
    );

    const organization = this.organizationsRepository.create({
      ...createOrganizationDto,
      domainWhitelist: normalizedDomains,
    });

    const savedOrganization =
      await this.organizationsRepository.save(organization);
    this.logger.log(
      `Organization created: ${savedOrganization.name} (${savedOrganization.cnpj})`,
    );

    return savedOrganization;
  }

  /**
   * Retrieves all organizations.
   *
   * @returns Array of organizations ordered by creation date (newest first)
   */
  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single organization by ID.
   *
   * @param id - Organization UUID
   * @returns Organization entity
   * @throws NotFoundException if organization not found
   */
  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  /**
   * Finds an organization by email domain.
   * Used by AuthService.register to automatically assign users to organizations.
   *
   * @param domain - Email domain (e.g., "lages.sc.gov.br")
   * @returns Organization if domain is whitelisted, null otherwise
   *
   * @example
   * const org = await findByDomain('lages.sc.gov.br');
   * // Returns Prefeitura de Lages if 'lages.sc.gov.br' is in domainWhitelist
   */
  async findByDomain(domain: string): Promise<Organization | null> {
    const normalizedDomain = domain.toLowerCase();

    // PostgreSQL array contains operator (@>)
    const organization = await this.organizationsRepository
      .createQueryBuilder('organization')
      .where(':domain = ANY(organization.domainWhitelist)', {
        domain: normalizedDomain,
      })
      .andWhere('organization.isActive = :isActive', { isActive: true })
      .getOne();

    return organization;
  }

  /**
   * Updates an organization.
   *
   * @param id - Organization UUID
   * @param updateOrganizationDto - Fields to update
   * @returns Updated organization
   * @throws NotFoundException if organization not found
   * @throws ConflictException if updating CNPJ to an existing one
   */
  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.findOne(id);

    // If updating CNPJ, check uniqueness
    if (
      updateOrganizationDto.cnpj &&
      updateOrganizationDto.cnpj !== organization.cnpj
    ) {
      const existingOrg = await this.organizationsRepository.findOne({
        where: { cnpj: updateOrganizationDto.cnpj },
      });

      if (existingOrg) {
        throw new ConflictException(
          `Organization with CNPJ ${updateOrganizationDto.cnpj} already exists`,
        );
      }
    }

    // Normalize domain whitelist if provided
    if (updateOrganizationDto.domainWhitelist) {
      updateOrganizationDto.domainWhitelist =
        updateOrganizationDto.domainWhitelist.map((d) => d.toLowerCase());
    }

    Object.assign(organization, updateOrganizationDto);

    const updatedOrganization =
      await this.organizationsRepository.save(organization);
    this.logger.log(
      `Organization updated: ${updatedOrganization.name} (${updatedOrganization.cnpj})`,
    );

    return updatedOrganization;
  }

  /**
   * Deletes an organization.
   *
   * @param id - Organization UUID
   * @throws NotFoundException if organization not found
   *
   * @remarks
   * This operation will fail if there are users or ETPs associated with the organization
   * due to foreign key constraints (ON DELETE RESTRICT).
   */
  async remove(id: string): Promise<void> {
    const organization = await this.findOne(id);
    await this.organizationsRepository.remove(organization);
    this.logger.log(
      `Organization deleted: ${organization.name} (${organization.cnpj})`,
    );
  }

  /**
   * Suspends an organization (Kill Switch).
   * Blocks all users from this organization via TenantGuard middleware (MT-04).
   *
   * @param id - Organization UUID
   * @returns Updated organization with isActive = false
   * @throws NotFoundException if organization not found
   */
  async suspend(id: string): Promise<Organization> {
    const organization = await this.findOne(id);

    if (!organization.isActive) {
      throw new BadRequestException(
        `Organization ${organization.name} is already suspended`,
      );
    }

    organization.isActive = false;
    const suspendedOrganization =
      await this.organizationsRepository.save(organization);

    this.logger.warn(
      `Organization SUSPENDED: ${organization.name} (${organization.cnpj})`,
    );

    return suspendedOrganization;
  }

  /**
   * Reactivates a suspended organization.
   *
   * @param id - Organization UUID
   * @returns Updated organization with isActive = true
   * @throws NotFoundException if organization not found
   */
  async reactivate(id: string): Promise<Organization> {
    const organization = await this.findOne(id);

    if (organization.isActive) {
      throw new BadRequestException(
        `Organization ${organization.name} is already active`,
      );
    }

    organization.isActive = true;
    const reactivatedOrganization =
      await this.organizationsRepository.save(organization);

    this.logger.log(
      `Organization REACTIVATED: ${organization.name} (${organization.cnpj})`,
    );

    return reactivatedOrganization;
  }
}

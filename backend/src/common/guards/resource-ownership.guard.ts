import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate as isUUID } from 'uuid';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OWNERSHIP_KEY,
  OwnershipConfig,
  ResourceType,
} from '../decorators/require-ownership.decorator';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { EtpVersion } from '../../entities/etp-version.entity';

/**
 * Guard that enforces resource ownership validation for protected endpoints.
 *
 * @remarks
 * This guard centralizes the tenancy (organizationId) and ownership (createdById)
 * validation that was previously duplicated across service methods. It:
 *
 * 1. Extracts resource configuration from @RequireOwnership() decorator metadata
 * 2. Extracts resourceId from request params using configured idParam
 * 3. Fetches the resource from the appropriate repository
 * 4. Validates organizationId matches user's organization (multi-tenancy isolation)
 * 5. Optionally validates createdById matches user (ownership)
 * 6. Injects the validated resource into request.resource for downstream use
 *
 * Execution order (configured in app.module.ts):
 * 1. JwtAuthGuard - Authenticates user and populates request.user
 * 2. TenantGuard - Checks if user's organization is active (kill switch)
 * 3. RolesGuard - Checks if user has required role(s)
 * 4. ResourceOwnershipGuard - Validates resource ownership (per-endpoint)
 *
 * Security benefits:
 * - Prevents IDOR (Insecure Direct Object References) vulnerabilities
 * - Ensures multi-tenancy isolation at the infrastructure level
 * - Consistent error handling and audit logging
 * - Single point of enforcement (no forgotten validation in services)
 *
 * Performance benefits:
 * - Resource is fetched once and injected into request
 * - Services don't need to re-fetch for validation
 * - Minimal relations loaded (only what's needed for validation)
 *
 * @example
 * When @RequireOwnership({ resourceType: ResourceType.ETP }) is applied:
 * - Guard extracts 'id' from request.params (default idParam)
 * - Fetches ETP from database with createdBy relation
 * - Validates etp.organizationId === user.organizationId
 * - Validates etp.createdById === user.id (if validateOwnership: true)
 * - Sets request.resource = etp for controller to use
 */
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(ResourceOwnershipGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(Etp)
    private etpRepository: Repository<Etp>,
    @InjectRepository(EtpSection)
    private sectionRepository: Repository<EtpSection>,
    @InjectRepository(EtpVersion)
    private versionRepository: Repository<EtpVersion>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get ownership configuration from decorator metadata
    const config = this.reflector.getAllAndOverride<OwnershipConfig>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @RequireOwnership decorator, skip validation
    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, allow (JwtAuthGuard will handle authentication)
    if (!user) {
      return true;
    }

    // Extract resource ID from params
    const idParam = config.idParam ?? 'id';
    const resourceId = request.params[idParam];

    if (!resourceId) {
      this.logger.error(
        `Resource ID not found in params.${idParam} for ${config.resourceType}`,
      );
      throw new NotFoundException(
        `Resource ID not provided in parameter '${idParam}'`,
      );
    }

    // Validate UUID format before database query to prevent
    // "invalid input syntax for type uuid" errors (#1103)
    if (!isUUID(resourceId)) {
      this.logger.warn(
        `Invalid UUID format for ${config.resourceType}: "${resourceId}"`,
      );
      throw new BadRequestException(
        `ID inválido: "${resourceId}" não é um UUID válido`,
      );
    }

    // Fetch and validate resource based on type
    const validateOwnership = config.validateOwnership ?? true;
    const resource = await this.fetchAndValidateResource(
      config.resourceType,
      resourceId,
      user.organizationId,
      validateOwnership ? user.id : undefined,
    );

    // Inject validated resource into request for downstream use
    request.resource = resource;

    return true;
  }

  /**
   * Fetches resource from database and validates ownership.
   *
   * @param resourceType - Type of resource to fetch
   * @param resourceId - Resource unique identifier
   * @param organizationId - User's organization ID for tenancy validation
   * @param userId - User ID for ownership validation (optional)
   * @returns Validated resource entity
   * @throws {NotFoundException} If resource not found
   * @throws {ForbiddenException} If organization or ownership validation fails
   */
  private async fetchAndValidateResource(
    resourceType: ResourceType,
    resourceId: string,
    organizationId: string,
    userId?: string,
  ): Promise<Etp | EtpSection | EtpVersion> {
    switch (resourceType) {
      case ResourceType.ETP:
        return this.validateEtp(resourceId, organizationId, userId);
      case ResourceType.SECTION:
        return this.validateSection(resourceId, organizationId, userId);
      case ResourceType.VERSION:
        return this.validateVersion(resourceId, organizationId, userId);
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  /**
   * Validates ETP ownership and tenancy.
   */
  private async validateEtp(
    etpId: string,
    organizationId: string,
    userId?: string,
  ): Promise<Etp> {
    const etp = await this.etpRepository.findOne({
      where: { id: etpId },
      relations: ['createdBy'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${etpId} não encontrado`);
    }

    // Multi-Tenancy: Validate organizationId (MT-05)
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `IDOR attempt: Organization ${organizationId} attempted to access ETP ${etpId} from organization ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    // Ownership validation (if required)
    if (userId && etp.createdById !== userId) {
      this.logger.warn(
        `Ownership violation: User ${userId} attempted to access ETP ${etpId} owned by ${etp.createdById}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    return etp;
  }

  /**
   * Validates Section ownership and tenancy via parent ETP.
   */
  private async validateSection(
    sectionId: string,
    organizationId: string,
    userId?: string,
  ): Promise<EtpSection> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['etp', 'etp.createdBy'],
    });

    if (!section) {
      throw new NotFoundException(`Seção com ID ${sectionId} não encontrada`);
    }

    // Multi-Tenancy: Validate via parent ETP's organizationId
    if (section.etp.organizationId !== organizationId) {
      this.logger.warn(
        `IDOR attempt: Organization ${organizationId} attempted to access Section ${sectionId} from organization ${section.etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta seção',
      );
    }

    // Ownership validation via parent ETP (if required)
    if (userId && section.etp.createdById !== userId) {
      this.logger.warn(
        `Ownership violation: User ${userId} attempted to access Section ${sectionId} owned by ${section.etp.createdById}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta seção',
      );
    }

    return section;
  }

  /**
   * Validates Version ownership and tenancy via parent ETP.
   */
  private async validateVersion(
    versionId: string,
    organizationId: string,
    userId?: string,
  ): Promise<EtpVersion> {
    const version = await this.versionRepository.findOne({
      where: { id: versionId },
      relations: ['etp', 'etp.createdBy'],
    });

    if (!version) {
      throw new NotFoundException(`Versão com ID ${versionId} não encontrada`);
    }

    // Multi-Tenancy: Validate via parent ETP's organizationId
    if (version.etp.organizationId !== organizationId) {
      this.logger.warn(
        `IDOR attempt: Organization ${organizationId} attempted to access Version ${versionId} from organization ${version.etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta versão',
      );
    }

    // Ownership validation via parent ETP (if required)
    if (userId && version.etp.createdById !== userId) {
      this.logger.warn(
        `Ownership violation: User ${userId} attempted to access Version ${versionId} owned by ${version.etp.createdById}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta versão',
      );
    }

    return version;
  }
}

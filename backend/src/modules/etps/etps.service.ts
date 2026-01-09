import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { CreateEtpDto } from './dto/create-etp.dto';
import { UpdateEtpDto } from './dto/update-etp.dto';
import {
  PaginationDto,
  createPaginatedResult,
} from '../../common/dto/pagination.dto';

/**
 * Service responsible for ETP (Estudos Técnicos Preliminares) lifecycle management.
 *
 * @remarks
 * This service handles all CRUD operations for ETP documents and provides
 * business logic for:
 * - ETP creation with automatic status initialization (DRAFT)
 * - Paginated ETP listing with optional user filtering
 * - Individual ETP retrieval with relations (sections, versions, creator)
 * - ETP updates with ownership verification
 * - Status transitions (DRAFT -> IN_PROGRESS -> COMPLETED, etc.)
 * - Automatic completion percentage calculation based on section status
 * - ETP deletion with authorization checks
 * - Statistics aggregation by status and completion metrics
 *
 * Architecture notes:
 * - Uses TypeORM repositories for database operations
 * - Implements ownership-based authorization for write operations
 * - Integrates with SectionsService for completion percentage updates
 * - Supports versioning through the 'versions' relationship (not yet implemented)
 *
 * All write operations (create, update, delete, status change) require user
 * ownership verification to prevent unauthorized modifications.
 *
 * @see SectionsService - Manages ETP sections and triggers completion updates
 * @see Etp - ETP entity model
 * @see EtpStatus - Status enumeration (DRAFT, IN_PROGRESS, COMPLETED, etc.)
 */
@Injectable()
export class EtpsService {
  private readonly logger = new Logger(EtpsService.name);

  constructor(
    @InjectRepository(Etp)
    private etpsRepository: Repository<Etp>,
  ) {}

  /**
   * Creates a new ETP document with default initialization values.
   *
   * @remarks
   * Initializes the ETP with:
   * - Status: DRAFT (ready for section generation)
   * - Current version: 1
   * - Completion percentage: 0%
   * - Created by: current user ID
   * - Organization ID: auto-injected from user (Multi-Tenancy B2G - MT-05)
   *
   * The new ETP has no sections initially. Sections must be generated
   * separately via SectionsService.
   *
   * Multi-Tenancy: The organizationId is automatically extracted from the
   * user entity and injected into the ETP. This ensures column-based isolation
   * where each ETP belongs to exactly one organization.
   *
   * @param createEtpDto - ETP creation data (objeto, metadata, etc.)
   * @param userId - Current user ID (becomes ETP owner)
   * @param organizationId - User's organization ID (for multi-tenancy isolation)
   * @returns Created ETP entity with generated UUID
   *
   * @example
   * ```ts
   * const etp = await etpsService.create(
   * {
   * objeto: 'Aquisição de 50 Notebooks Dell Latitude 5420',
   * metadata: {
   * unidadeRequisitante: 'Secretaria de Tecnologia',
   * fiscalYear: 2025
   * }
   * },
   * 'user-uuid-123',
   * 'org-uuid-456'
   * );
   *
   * console.log(etp.status); // 'draft'
   * console.log(etp.completionPercentage); // 0
   * console.log(etp.organizationId); // 'org-uuid-456'
   * ```
   */
  async create(
    createEtpDto: CreateEtpDto,
    userId: string,
    organizationId: string,
  ): Promise<Etp> {
    const etp = this.etpsRepository.create({
      ...createEtpDto,
      createdById: userId,
      organizationId,
      status: EtpStatus.DRAFT,
      currentVersion: 1,
      completionPercentage: 0,
    });

    const savedEtp = await this.etpsRepository.save(etp);
    this.logger.log(
      `ETP created: ${savedEtp.id} by user ${userId} for organization ${organizationId}`,
    );

    return savedEtp;
  }

  /**
   * Retrieves paginated list of ETPs for a specific user.
   *
   * @remarks
   * Returns ETPs ordered by most recently updated first. Supports pagination
   * to handle large datasets efficiently.
   *
   * SECURITY (Issue #1326): ALWAYS filters by BOTH organizationId AND userId to
   * prevent cross-user data access. This is a critical security requirement.
   *
   * Multi-Tenancy (MT-05): Filters by organizationId to ensure column-based
   * isolation. Users can only see ETPs from their own organization.
   *
   * User Isolation: ALWAYS filters by userId to ensure users only see their own ETPs.
   * This prevents data leakage between users of the same organization.
   *
   * Eagerly loads the 'createdBy' user relationship for each ETP.
   *
   * @param paginationDto - Pagination parameters (page number and limit)
   * @param organizationId - Organization ID (required for multi-tenancy isolation)
   * @param userId - User ID (required for user-level data isolation)
   * @returns Paginated result with ETPs, total count, and pagination metadata
   *
   * @example
   * ```ts
   * const result = await etpsService.findAll(
   * { page: 1, limit: 10 },
   * 'org-uuid-456',
   * 'user-uuid-123'
   * );
   *
   * console.log(result.data.length); // Up to 10 ETPs
   * console.log(result.meta.total); // Total ETPs for this user in their organization
   * console.log(result.meta.totalPages); // Total pages available
   * ```
   */
  async findAll(
    paginationDto: PaginationDto,
    organizationId: string,
    userId: string,
  ) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    // SECURITY (Issue #1326): Always filter by both organizationId AND userId
    // to prevent cross-user data leakage within the same organization
    const queryBuilder = this.etpsRepository
      .createQueryBuilder('etp')
      .leftJoinAndSelect('etp.createdBy', 'user')
      .where('etp.organizationId = :organizationId', { organizationId })
      .andWhere('etp.createdById = :userId', { userId });

    const [etps, total] = await queryBuilder
      .orderBy('etp.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResult(etps, total, page, limit);
  }

  /**
   * Retrieves a single ETP by ID with minimal data (only user relation).
   *
   * @remarks
   * Optimized for scenarios where only ETP metadata is needed (e.g., section generation).
   * Loads only the 'createdBy' relation, avoiding expensive eager loading of sections
   * and versions.
   *
   * Multi-Tenancy (MT-05): Validates organizationId to prevent cross-tenant access.
   * Returns 403 Forbidden if ETP belongs to a different organization.
   *
   * Use this method when:
   * - Validating ETP existence and ownership
   * - Generating new sections (doesn't need existing sections)
   * - Checking ETP metadata without full document tree
   *
   * Performance impact: ~75% query reduction vs findOne()
   * - findOne(): 1 ETP + 1 User + N Sections + M Versions queries
   * - findOneMinimal(): 1 ETP + 1 User queries only
   *
   * @param id - ETP unique identifier (UUID)
   * @param organizationId - Organization ID (for multi-tenancy validation)
   * @param userId - Optional user ID for authorization check
   * @returns ETP entity with only user relation loaded
   * @throws {NotFoundException} If ETP not found
   * @throws {ForbiddenException} If ETP belongs to different organization or user doesn't own it
   *
   * @example
   * ```ts
   * // Section generation - only needs ETP metadata
   * const etp = await etpsService.findOneMinimal(etpId, orgId, userId);
   * await sectionsService.generate(etp.id, { type: 'introduction' });
   * ```
   */
  async findOneMinimal(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Etp> {
    const etp = await this.etpsRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${id} não encontrado`);
    }

    // Multi-Tenancy: Validate organizationId (MT-05)
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `Organization ${organizationId} attempted to access ETP ${id} from organization ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    // Check ownership - users can only access their own ETPs
    if (userId && etp.createdById !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access ETP ${id} owned by ${etp.createdById}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    return etp;
  }

  /**
   * Retrieves a single ETP by ID with sections but not versions.
   *
   * @remarks
   * Optimized for dashboard and editor views where sections are needed but
   * version history is not. Loads:
   * - createdBy: User who created the ETP
   * - sections: All sections ordered by sequence (ASC)
   *
   * Use this method when:
   * - Displaying ETP in dashboard with section list
   * - Opening ETP editor (needs sections to show progress)
   * - Showing ETP overview without version history
   *
   * Performance impact: ~50% query reduction vs findOne() if ETP has versions
   * - findOne(): 1 ETP + 1 User + N Sections + M Versions queries
   * - findOneWithSections(): 1 ETP + 1 User + N Sections queries
   *
   * @param id - ETP unique identifier (UUID)
   * @param userId - Optional user ID for authorization check
   * @returns ETP entity with user and sections relations loaded
   * @throws {NotFoundException} If ETP not found
   * @throws {ForbiddenException} If user doesn't own the ETP
   *
   * @example
   * ```ts
   * // Dashboard view - needs sections but not versions
   * const etp = await etpsService.findOneWithSections(id, userId);
   * console.log(etp.sections.length); // Available
   * console.log(etp.versions); // undefined (not loaded)
   * ```
   */
  async findOneWithSections(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Etp> {
    const etp = await this.etpsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'sections'],
      order: {
        sections: { order: 'ASC' },
      },
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${id} não encontrado`);
    }

    // Multi-Tenancy: Validate organizationId (MT-05)
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `Organization ${organizationId} attempted to access ETP ${id} from organization ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    // Check ownership - users can only access their own ETPs
    if (userId && etp.createdById !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access ETP ${id} owned by ${etp.createdById}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    return etp;
  }

  /**
   * Retrieves a single ETP by ID with versions but not sections.
   *
   * @remarks
   * Optimized for version history views where sections are not needed.
   * Loads:
   * - createdBy: User who created the ETP
   * - versions: All versions ordered by creation date (DESC)
   *
   * Use this method when:
   * - Displaying version history timeline
   * - Comparing ETP versions
   * - Showing change audit trail
   *
   * Performance impact: ~50% query reduction vs findOne() if ETP has many sections
   * - findOne(): 1 ETP + 1 User + N Sections + M Versions queries
   * - findOneWithVersions(): 1 ETP + 1 User + M Versions queries
   *
   * @param id - ETP unique identifier (UUID)
   * @param userId - Optional user ID for authorization check
   * @returns ETP entity with user and versions relations loaded
   * @throws {NotFoundException} If ETP not found
   * @throws {ForbiddenException} If user doesn't own the ETP
   *
   * @example
   * ```ts
   * // Version history view - needs versions but not sections
   * const etp = await etpsService.findOneWithVersions(id, userId);
   * console.log(etp.versions.length); // Available
   * console.log(etp.sections); // undefined (not loaded)
   * ```
   */
  async findOneWithVersions(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Etp> {
    const etp = await this.etpsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'versions'],
      order: {
        versions: { createdAt: 'DESC' },
      },
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${id} não encontrado`);
    }

    // Multi-Tenancy: Validate organizationId (MT-05)
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `Organization ${organizationId} attempted to access ETP ${id} from organization ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    // Check ownership - users can only access their own ETPs
    if (userId && etp.createdById !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access ETP ${id} owned by ${etp.createdById}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    return etp;
  }

  /**
   * Retrieves a single ETP by ID with all related data.
   *
   * @remarks
   * Eagerly loads three relationships:
   * - createdBy: User who created the ETP
   * - sections: All sections ordered by sequence (ASC)
   * - versions: All versions ordered by creation date (DESC)
   *
   * Authorization is optional. If userId is provided and doesn't match the
   * ETP owner, access is allowed but logged for audit purposes. This enables
   * future role-based access control implementation.
   *
   * @deprecated Use specialized methods instead for better performance:
   * - findOneMinimal() for metadata-only access
   * - findOneWithSections() for dashboard/editor views
   * - findOneWithVersions() for version history views
   *
   * @param id - ETP unique identifier (UUID)
   * @param userId - Optional user ID for authorization logging
   * @returns ETP entity with all relations loaded
   * @throws {NotFoundException} If ETP not found
   */
  async findOne(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Etp> {
    const etp = await this.etpsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'sections', 'versions'],
      order: {
        sections: { order: 'ASC' },
        versions: { createdAt: 'DESC' },
      },
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${id} não encontrado`);
    }

    // Multi-Tenancy: Validate organizationId (MT-05)
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `Organization ${organizationId} attempted to access ETP ${id} from organization ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    // Check ownership - users can only access their own ETPs
    if (userId && etp.createdById !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access ETP ${id} owned by ${etp.createdById}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para acessar este ETP',
      );
    }

    return etp;
  }

  /**
   * Updates an existing ETP with new data.
   *
   * @remarks
   * Verifies user ownership before allowing updates. Only the ETP creator
   * can modify the document. All fields in updateEtpDto are merged into
   * the existing entity.
   *
   * @param id - ETP unique identifier
   * @param updateEtpDto - Fields to update (objeto, metadata, status, etc.)
   * @param userId - Current user ID for authorization check
   * @returns Updated ETP entity
   * @throws {NotFoundException} If ETP not found
   * @throws {ForbiddenException} If user doesn't own the ETP
   */
  async update(
    id: string,
    updateEtpDto: UpdateEtpDto,
    userId: string,
    organizationId: string,
  ): Promise<Etp> {
    const etp = await this.findOneMinimal(id, organizationId, userId);

    Object.assign(etp, updateEtpDto);

    const updatedEtp = await this.etpsRepository.save(etp);
    this.logger.log(`ETP updated: ${id} by user ${userId}`);

    return updatedEtp;
  }

  /**
   * Updates the status of an ETP (e.g., DRAFT -> IN_PROGRESS -> COMPLETED).
   *
   * @remarks
   * Manages ETP workflow state transitions. Verifies user ownership before
   * allowing status changes. Common status transitions:
   * - DRAFT: Initial state, sections being created
   * - IN_PROGRESS: Active work on sections
   * - COMPLETED: All required sections finished
   * - ARCHIVED: No longer active
   *
   * @param id - ETP unique identifier
   * @param status - New status value
   * @param userId - Current user ID for authorization check
   * @returns Updated ETP entity with new status
   * @throws {NotFoundException} If ETP not found
   * @throws {ForbiddenException} If user doesn't own the ETP
   */
  async updateStatus(
    id: string,
    status: EtpStatus,
    userId: string,
    organizationId: string,
  ): Promise<Etp> {
    const etp = await this.findOneMinimal(id, organizationId, userId);

    etp.status = status;

    const updatedEtp = await this.etpsRepository.save(etp);
    this.logger.log(`ETP status updated: ${id} to ${status} by user ${userId}`);

    return updatedEtp;
  }

  /**
   * Automatically calculates and updates ETP completion percentage based on section status.
   * Also auto-syncs the ETP status based on completion (Issue #1331).
   *
   * @remarks
   * Called by SectionsService whenever sections are created, updated, or deleted.
   * Completion is calculated as:
   * (sections with status 'generated', 'reviewed', or 'approved') / (total sections) * 100
   *
   * If ETP has no sections, completion is set to 0%. This method is idempotent
   * and safe to call repeatedly.
   *
   * **Status Auto-Sync (Issue #1331):**
   * - If completionPercentage > 0 and status is DRAFT, auto-transition to IN_PROGRESS
   * - Status COMPLETED is only set manually by the user (requires human validation)
   * - This ensures dashboard counters are consistent with actual ETP progress
   *
   * **Security (Issue #758):**
   * Validates organizationId to prevent cross-tenant data access. Only ETPs
   * belonging to the specified organization can have their completion updated.
   *
   * @param id - ETP unique identifier
   * @param organizationId - Organization ID for tenancy validation
   * @returns Promise that resolves when update is complete (or silently if ETP not found)
   */
  async updateCompletionPercentage(
    id: string,
    organizationId: string,
  ): Promise<void> {
    const etp = await this.etpsRepository.findOne({
      where: { id, organizationId },
      relations: ['sections'],
    });

    if (!etp) {
      return;
    }

    const totalSections = etp.sections.length;
    if (totalSections === 0) {
      etp.completionPercentage = 0;
    } else {
      const completedSections = etp.sections.filter(
        (s) =>
          s.status === 'generated' ||
          s.status === 'reviewed' ||
          s.status === 'approved',
      ).length;
      etp.completionPercentage = (completedSections / totalSections) * 100;
    }

    // Issue #1331: Auto-sync status based on completion percentage
    // If any progress has been made and ETP is still in DRAFT, move to IN_PROGRESS
    // This ensures dashboard counters are consistent with actual progress
    const previousStatus = etp.status;
    if (etp.completionPercentage > 0 && etp.status === EtpStatus.DRAFT) {
      etp.status = EtpStatus.IN_PROGRESS;
      this.logger.log(
        `ETP ${id} auto-transitioned from DRAFT to IN_PROGRESS (completion: ${etp.completionPercentage}%)`,
      );
    }

    await this.etpsRepository.save(etp);

    // Log status change for debugging
    if (previousStatus !== etp.status) {
      this.logger.log(
        `ETP ${id} status sync: ${previousStatus} -> ${etp.status}`,
      );
    }
  }

  /**
   * Permanently deletes an ETP and all related data.
   *
   * @remarks
   * Verifies user ownership before deletion. Cascading deletes will remove:
   * - All sections associated with the ETP
   * - All versions (if configured in entity relations)
   *
   * This operation is irreversible. Consider implementing soft deletes for
   * production environments.
   *
   * @param id - ETP unique identifier
   * @param userId - Current user ID for authorization check
   * @returns Promise that resolves when deletion is complete
   * @throws {NotFoundException} If ETP not found
   * @throws {ForbiddenException} If user doesn't own the ETP
   */
  async remove(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const etp = await this.findOneMinimal(id, organizationId, userId);

    await this.etpsRepository.remove(etp);
    this.logger.log(`ETP deleted: ${id} by user ${userId}`);
  }

  // ============================================================================
  // Direct methods (pre-authorized by ResourceOwnershipGuard) - Issue #757
  // ============================================================================

  /**
   * Retrieves ETP with sections without authorization check.
   *
   * @remarks
   * Use ONLY when authorization has been pre-validated by ResourceOwnershipGuard.
   * This method skips tenancy and ownership checks for performance.
   *
   * @param id - ETP unique identifier (already validated)
   * @returns ETP entity with sections loaded
   * @throws {NotFoundException} If ETP not found
   */
  async findOneWithSectionsNoAuth(id: string): Promise<Etp> {
    const etp = await this.etpsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'sections'],
      order: {
        sections: { order: 'ASC' },
      },
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${id} não encontrado`);
    }

    return etp;
  }

  /**
   * Updates a pre-authorized ETP directly.
   *
   * @remarks
   * Use ONLY when ETP has been pre-validated by ResourceOwnershipGuard.
   * This method skips tenancy and ownership checks.
   *
   * @param etp - Pre-validated ETP entity
   * @param updateEtpDto - Fields to update
   * @param userId - User ID for audit logging
   * @returns Updated ETP entity
   */
  async updateDirect(
    etp: Etp,
    updateEtpDto: UpdateEtpDto,
    userId: string,
  ): Promise<Etp> {
    Object.assign(etp, updateEtpDto);

    const updatedEtp = await this.etpsRepository.save(etp);
    this.logger.log(`ETP updated: ${etp.id} by user ${userId}`);

    return updatedEtp;
  }

  /**
   * Updates a pre-authorized ETP status directly.
   *
   * @remarks
   * Use ONLY when ETP has been pre-validated by ResourceOwnershipGuard.
   * This method skips tenancy and ownership checks.
   *
   * @param etp - Pre-validated ETP entity
   * @param status - New status value
   * @param userId - User ID for audit logging
   * @returns Updated ETP entity with new status
   */
  async updateStatusDirect(
    etp: Etp,
    status: EtpStatus,
    userId: string,
  ): Promise<Etp> {
    etp.status = status;

    const updatedEtp = await this.etpsRepository.save(etp);
    this.logger.log(
      `ETP status updated: ${etp.id} to ${status} by user ${userId}`,
    );

    return updatedEtp;
  }

  /**
   * Removes a pre-authorized ETP directly.
   *
   * @remarks
   * Use ONLY when ETP has been pre-validated by ResourceOwnershipGuard.
   * This method skips tenancy and ownership checks.
   *
   * @param etp - Pre-validated ETP entity
   * @param userId - User ID for audit logging
   */
  async removeDirect(etp: Etp, userId: string): Promise<void> {
    await this.etpsRepository.remove(etp);
    this.logger.log(`ETP deleted: ${etp.id} by user ${userId}`);
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Retrieves aggregated statistics about ETPs for a specific user.
   *
   * @remarks
   * SECURITY (Issue #1326): ALWAYS filters by BOTH organizationId AND userId to
   * prevent cross-user data access. This is a critical security requirement.
   *
   * Provides dashboard-style metrics including:
   * - Total ETP count
   * - Count by status (DRAFT, IN_PROGRESS, COMPLETED, etc.)
   * - Average completion percentage across all ETPs
   *
   * Statistics are ALWAYS filtered to the specific user's ETPs only.
   * Useful for user dashboards.
   *
   * @param organizationId - Organization ID (required for multi-tenancy isolation)
   * @param userId - User ID (required for user-level data isolation)
   * @returns Statistics object with total, byStatus breakdown, and averageCompletion
   *
   * @example
   * ```ts
   * const stats = await etpsService.getStatistics('org-uuid-456', 'user-uuid-123');
   *
   * console.log(stats.total); // 15
   * console.log(stats.byStatus); // { draft: 5, in_progress: 8, completed: 2 }
   * console.log(stats.averageCompletion); // "67.50"
   * ```
   */
  async getStatistics(organizationId: string, userId: string) {
    // SECURITY (Issue #1326): Always filter by both organizationId AND userId
    // to prevent cross-user data leakage within the same organization
    const queryBuilder = this.etpsRepository
      .createQueryBuilder('etp')
      .where('etp.organizationId = :organizationId', { organizationId })
      .andWhere('etp.createdById = :userId', { userId });

    const total = await queryBuilder.getCount();

    const byStatus = await queryBuilder
      .select('etp.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('etp.status')
      .getRawMany();

    const avgCompletion = await queryBuilder
      .select('AVG(etp.completionPercentage)', 'avgCompletion')
      .getRawOne();

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      averageCompletion: parseFloat(
        avgCompletion?.avgCompletion || '0',
      ).toFixed(2),
    };
  }

  /**
   * Retrieves the success rate metric for ETPs.
   *
   * @remarks
   * Success rate is calculated as: (completed ETPs / total ETPs) * 100
   * Also includes trend comparison with previous period.
   *
   * SECURITY (Issue #1326): ALWAYS filters by BOTH organizationId AND userId to
   * prevent cross-user data access.
   *
   * @param organizationId - Organization ID (required for multi-tenancy isolation)
   * @param userId - User ID (required for user-level data isolation)
   * @param periodDays - Number of days to consider for current period (default: 30)
   * @returns Success rate object with rate percentage and trend
   *
   * @example
   * ```ts
   * const result = await etpsService.getSuccessRate('org-uuid', 'user-uuid', 30);
   * console.log(result.rate); // 75.5
   * console.log(result.trend); // 'up' | 'down' | 'stable'
   * console.log(result.completedCount); // 15
   * console.log(result.totalCount); // 20
   * ```
   */
  async getSuccessRate(
    organizationId: string,
    userId: string,
    periodDays: number = 30,
  ): Promise<{
    rate: number;
    trend: 'up' | 'down' | 'stable';
    completedCount: number;
    totalCount: number;
    previousRate: number;
  }> {
    const now = new Date();
    const periodStart = new Date(
      now.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );
    const previousPeriodStart = new Date(
      periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );

    // Current period stats
    const currentQueryBuilder = this.etpsRepository
      .createQueryBuilder('etp')
      .where('etp.organizationId = :organizationId', { organizationId })
      .andWhere('etp.createdById = :userId', { userId })
      .andWhere('etp.createdAt >= :periodStart', { periodStart });

    const currentTotal = await currentQueryBuilder.getCount();
    const currentCompleted = await currentQueryBuilder
      .clone()
      .andWhere('etp.status = :status', { status: EtpStatus.COMPLETED })
      .getCount();

    // Previous period stats for trend calculation
    const previousQueryBuilder = this.etpsRepository
      .createQueryBuilder('etp')
      .where('etp.organizationId = :organizationId', { organizationId })
      .andWhere('etp.createdById = :userId', { userId })
      .andWhere('etp.createdAt >= :previousPeriodStart', {
        previousPeriodStart,
      })
      .andWhere('etp.createdAt < :periodStart', { periodStart });

    const previousTotal = await previousQueryBuilder.getCount();
    const previousCompleted = await previousQueryBuilder
      .clone()
      .andWhere('etp.status = :status', { status: EtpStatus.COMPLETED })
      .getCount();

    // Calculate rates
    const currentRate =
      currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0;
    const previousRate =
      previousTotal > 0 ? (previousCompleted / previousTotal) * 100 : 0;

    // Determine trend
    let trend: 'up' | 'down' | 'stable';
    const rateDiff = currentRate - previousRate;
    if (Math.abs(rateDiff) < 1) {
      trend = 'stable';
    } else if (rateDiff > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      rate: parseFloat(currentRate.toFixed(1)),
      trend,
      completedCount: currentCompleted,
      totalCount: currentTotal,
      previousRate: parseFloat(previousRate.toFixed(1)),
    };
  }
}

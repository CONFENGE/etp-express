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
   *
   * The new ETP has no sections initially. Sections must be generated
   * separately via SectionsService.
   *
   * @param createEtpDto - ETP creation data (objeto, metadata, etc.)
   * @param userId - Current user ID (becomes ETP owner)
   * @returns Created ETP entity with generated UUID
   *
   * @example
   * ```ts
   * const etp = await etpsService.create(
   *   {
   *     objeto: 'Aquisição de 50 Notebooks Dell Latitude 5420',
   *     metadata: {
   *       orgao: 'Secretaria de Tecnologia',
   *       fiscalYear: 2025
   *     }
   *   },
   *   'user-uuid-123'
   * );
   *
   * console.log(etp.status); // 'draft'
   * console.log(etp.completionPercentage); // 0
   * ```
   */
  async create(createEtpDto: CreateEtpDto, userId: string): Promise<Etp> {
    const etp = this.etpsRepository.create({
      ...createEtpDto,
      createdById: userId,
      status: EtpStatus.DRAFT,
      currentVersion: 1,
      completionPercentage: 0,
    });

    const savedEtp = await this.etpsRepository.save(etp);
    this.logger.log(`ETP created: ${savedEtp.id} by user ${userId}`);

    return savedEtp;
  }

  /**
   * Retrieves paginated list of ETPs with optional user filtering.
   *
   * @remarks
   * Returns ETPs ordered by most recently updated first. Supports pagination
   * to handle large datasets efficiently. When userId is provided, filters
   * to show only ETPs owned by that user.
   *
   * Eagerly loads the 'createdBy' user relationship for each ETP.
   *
   * @param paginationDto - Pagination parameters (page number and limit)
   * @param userId - Optional user ID to filter ETPs by owner
   * @returns Paginated result with ETPs, total count, and pagination metadata
   *
   * @example
   * ```ts
   * const result = await etpsService.findAll(
   *   { page: 1, limit: 10 },
   *   'user-uuid-123'
   * );
   *
   * console.log(result.data.length); // Up to 10 ETPs
   * console.log(result.meta.total); // Total ETPs for this user
   * console.log(result.meta.totalPages); // Total pages available
   * ```
   */
  async findAll(paginationDto: PaginationDto, userId?: string) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.etpsRepository
      .createQueryBuilder('etp')
      .leftJoinAndSelect('etp.createdBy', 'user');

    if (userId) {
      queryBuilder.where('etp.createdById = :userId', { userId });
    }

    const [etps, total] = await queryBuilder
      .orderBy('etp.updatedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResult(etps, total, page, limit);
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
   * @param id - ETP unique identifier (UUID)
   * @param userId - Optional user ID for authorization logging
   * @returns ETP entity with all relations loaded
   * @throws {NotFoundException} If ETP not found
   */
  async findOne(id: string, userId?: string): Promise<Etp> {
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

    // Optional: Check ownership
    if (userId && etp.createdById !== userId) {
      // You might want to implement role-based access here
      // For now, we'll allow viewing but log it
      this.logger.warn(
        `User ${userId} accessed ETP ${id} owned by ${etp.createdById}`,
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
  ): Promise<Etp> {
    const etp = await this.findOne(id);

    // Check ownership
    if (etp.createdById !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este ETP',
      );
    }

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
  ): Promise<Etp> {
    const etp = await this.findOne(id);

    if (etp.createdById !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para alterar o status deste ETP',
      );
    }

    etp.status = status;

    const updatedEtp = await this.etpsRepository.save(etp);
    this.logger.log(`ETP status updated: ${id} to ${status} by user ${userId}`);

    return updatedEtp;
  }

  /**
   * Automatically calculates and updates ETP completion percentage based on section status.
   *
   * @remarks
   * Called by SectionsService whenever sections are created, updated, or deleted.
   * Completion is calculated as:
   * (sections with status 'generated', 'reviewed', or 'approved') / (total sections) * 100
   *
   * If ETP has no sections, completion is set to 0%. This method is idempotent
   * and safe to call repeatedly.
   *
   * @param id - ETP unique identifier
   * @returns Promise that resolves when update is complete (or silently if ETP not found)
   */
  async updateCompletionPercentage(id: string): Promise<void> {
    const etp = await this.etpsRepository.findOne({
      where: { id },
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

    await this.etpsRepository.save(etp);
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
  async remove(id: string, userId: string): Promise<void> {
    const etp = await this.findOne(id);

    if (etp.createdById !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este ETP',
      );
    }

    await this.etpsRepository.remove(etp);
    this.logger.log(`ETP deleted: ${id} by user ${userId}`);
  }

  /**
   * Retrieves aggregated statistics about ETPs.
   *
   * @remarks
   * Provides dashboard-style metrics including:
   * - Total ETP count
   * - Count by status (DRAFT, IN_PROGRESS, COMPLETED, etc.)
   * - Average completion percentage across all ETPs
   *
   * When userId is provided, statistics are filtered to that user's ETPs only.
   * Useful for user dashboards and admin analytics.
   *
   * @param userId - Optional user ID to filter statistics to specific user
   * @returns Statistics object with total, byStatus breakdown, and averageCompletion
   *
   * @example
   * ```ts
   * const stats = await etpsService.getStatistics('user-uuid-123');
   *
   * console.log(stats.total); // 15
   * console.log(stats.byStatus); // { draft: 5, in_progress: 8, completed: 2 }
   * console.log(stats.averageCompletion); // "67.50"
   * ```
   */
  async getStatistics(userId?: string) {
    const queryBuilder = this.etpsRepository.createQueryBuilder('etp');

    if (userId) {
      queryBuilder.where('etp.createdById = :userId', { userId });
    }

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
}

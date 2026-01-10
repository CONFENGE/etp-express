import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizedDomain } from '../../entities/authorized-domain.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { AssignManagerDto } from './dto/assign-manager.dto';

/**
 * Response interface for global statistics.
 */
export interface GlobalStatistics {
  totalDomains: number;
  activeDomains: number;
  inactiveDomains: number;
  totalUsers: number;
  totalOrganizations: number;
  totalEtps: number;
  domainsByOrganization: { organizationName: string; domainCount: number }[];
}

/**
 * Single user entry in the productivity ranking.
 * Part of advanced metrics feature (Issue #1367).
 */
export interface ProductivityRankingItem {
  /** Ranking position (1-based) */
  position: number;
  /** User ID */
  userId: string;
  /** User name */
  userName: string;
  /** User email */
  userEmail: string;
  /** Total ETPs created by user in the period */
  etpsCreated: number;
  /** Total ETPs completed by user in the period */
  etpsCompleted: number;
  /** Completion rate (completed/created * 100) */
  completionRate: number;
}

/**
 * Response interface for productivity ranking.
 * Part of advanced metrics feature (Issue #1367).
 */
export interface ProductivityRankingResponse {
  /** List of users ranked by productivity */
  ranking: ProductivityRankingItem[];
  /** Total number of users with ETPs */
  totalUsers: number;
  /** Current page (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages available */
  totalPages: number;
}

/**
 * Service for System Administrator operations (M8: Gestão de Domínios Institucionais).
 *
 * Provides:
 * - CRUD operations for authorized domains
 * - Domain manager assignment
 * - Global statistics for system administrators
 *
 * @remarks
 * All operations require SYSTEM_ADMIN role, enforced at controller level.
 */
@Injectable()
export class SystemAdminService {
  private readonly logger = new Logger(SystemAdminService.name);

  constructor(
    @InjectRepository(AuthorizedDomain)
    private readonly authorizedDomainRepository: Repository<AuthorizedDomain>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
  ) {}

  /**
   * Creates a new authorized domain.
   *
   * @param createDomainDto - Domain data
   * @returns Created domain entity
   * @throws ConflictException if domain already exists
   */
  async createDomain(
    createDomainDto: CreateDomainDto,
  ): Promise<AuthorizedDomain> {
    // Normalize domain to lowercase
    const normalizedDomain = createDomainDto.domain.toLowerCase();

    // Check if domain already exists
    const existingDomain = await this.authorizedDomainRepository.findOne({
      where: { domain: normalizedDomain },
    });

    if (existingDomain) {
      throw new ConflictException(
        `Domain '${normalizedDomain}' is already registered`,
      );
    }

    // Validate organization if provided
    if (createDomainDto.organizationId) {
      const organization = await this.organizationRepository.findOne({
        where: { id: createDomainDto.organizationId },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${createDomainDto.organizationId} not found`,
        );
      }
    }

    const domain = this.authorizedDomainRepository.create({
      domain: normalizedDomain,
      institutionName: createDomainDto.institutionName,
      maxUsers: createDomainDto.maxUsers ?? 10,
      organizationId: createDomainDto.organizationId ?? null,
      isActive: true,
    });

    const savedDomain = await this.authorizedDomainRepository.save(domain);
    this.logger.log(
      `Domain created: ${savedDomain.domain} (${savedDomain.institutionName})`,
    );

    return savedDomain;
  }

  /**
   * Retrieves all authorized domains.
   *
   * @returns Array of domains with manager and user count
   */
  async findAllDomains(): Promise<AuthorizedDomain[]> {
    return this.authorizedDomainRepository.find({
      relations: ['domainManager', 'organization', 'users'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a single domain by ID.
   *
   * @param id - Domain UUID
   * @returns Domain entity with relations
   * @throws NotFoundException if domain not found
   */
  async findOneDomain(id: string): Promise<AuthorizedDomain> {
    const domain = await this.authorizedDomainRepository.findOne({
      where: { id },
      relations: ['domainManager', 'organization', 'users'],
    });

    if (!domain) {
      throw new NotFoundException(`Domain with ID ${id} not found`);
    }

    return domain;
  }

  /**
   * Updates an authorized domain.
   *
   * @param id - Domain UUID
   * @param updateDomainDto - Fields to update
   * @returns Updated domain entity
   * @throws NotFoundException if domain not found
   * @throws ConflictException if updating to an existing domain
   */
  async updateDomain(
    id: string,
    updateDomainDto: UpdateDomainDto,
  ): Promise<AuthorizedDomain> {
    const domain = await this.findOneDomain(id);

    // If updating domain name, check uniqueness
    if (updateDomainDto.domain) {
      const normalizedDomain = updateDomainDto.domain.toLowerCase();

      if (normalizedDomain !== domain.domain) {
        const existingDomain = await this.authorizedDomainRepository.findOne({
          where: { domain: normalizedDomain },
        });

        if (existingDomain) {
          throw new ConflictException(
            `Domain '${normalizedDomain}' is already registered`,
          );
        }

        updateDomainDto.domain = normalizedDomain;
      }
    }

    // Validate organization if provided
    if (updateDomainDto.organizationId) {
      const organization = await this.organizationRepository.findOne({
        where: { id: updateDomainDto.organizationId },
      });

      if (!organization) {
        throw new NotFoundException(
          `Organization with ID ${updateDomainDto.organizationId} not found`,
        );
      }
    }

    Object.assign(domain, updateDomainDto);

    const updatedDomain = await this.authorizedDomainRepository.save(domain);
    this.logger.log(
      `Domain updated: ${updatedDomain.domain} (${updatedDomain.institutionName})`,
    );

    return updatedDomain;
  }

  /**
   * Deletes an authorized domain.
   *
   * @param id - Domain UUID
   * @throws NotFoundException if domain not found
   * @throws BadRequestException if domain has associated users
   */
  async removeDomain(id: string): Promise<void> {
    const domain = await this.findOneDomain(id);

    // Check if domain has users
    if (domain.users && domain.users.length > 0) {
      throw new BadRequestException(
        `Cannot delete domain '${domain.domain}': ${domain.users.length} user(s) are associated with this domain`,
      );
    }

    await this.authorizedDomainRepository.remove(domain);
    this.logger.log(
      `Domain deleted: ${domain.domain} (${domain.institutionName})`,
    );
  }

  /**
   * Assigns a domain manager to an authorized domain.
   *
   * @param domainId - Domain UUID
   * @param assignManagerDto - User ID to assign as manager
   * @returns Updated domain with new manager
   * @throws NotFoundException if domain or user not found
   * @throws BadRequestException if user doesn't belong to the domain or wrong role
   */
  async assignManager(
    domainId: string,
    assignManagerDto: AssignManagerDto,
  ): Promise<AuthorizedDomain> {
    const domain = await this.findOneDomain(domainId);

    const user = await this.userRepository.findOne({
      where: { id: assignManagerDto.userId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${assignManagerDto.userId} not found`,
      );
    }

    // Check if user email matches domain
    const userEmailDomain = user.email.split('@')[1]?.toLowerCase();
    if (userEmailDomain !== domain.domain) {
      throw new BadRequestException(
        `User email domain '${userEmailDomain}' does not match authorized domain '${domain.domain}'`,
      );
    }

    // Update user role to DOMAIN_MANAGER
    if (user.role !== UserRole.DOMAIN_MANAGER) {
      user.role = UserRole.DOMAIN_MANAGER;
      await this.userRepository.save(user);
      this.logger.log(
        `User ${user.email} promoted to DOMAIN_MANAGER for domain ${domain.domain}`,
      );
    }

    // Assign manager to domain
    domain.domainManagerId = user.id;
    domain.domainManager = user;

    // Also assign user to this authorized domain if not already
    if (user.authorizedDomainId !== domain.id) {
      user.authorizedDomainId = domain.id;
      await this.userRepository.save(user);
    }

    const updatedDomain = await this.authorizedDomainRepository.save(domain);
    this.logger.log(
      `Manager assigned: ${user.email} -> ${domain.domain} (${domain.institutionName})`,
    );

    return updatedDomain;
  }

  /**
   * Retrieves global statistics for system administrators.
   *
   * @returns Statistics object with counts and breakdowns
   */
  async getStatistics(): Promise<GlobalStatistics> {
    // Get domain counts
    const totalDomains = await this.authorizedDomainRepository.count();
    const activeDomains = await this.authorizedDomainRepository.count({
      where: { isActive: true },
    });
    const inactiveDomains = totalDomains - activeDomains;

    // Get user count
    const totalUsers = await this.userRepository.count({
      where: { isActive: true },
    });

    // Get organization count
    const totalOrganizations = await this.organizationRepository.count();

    // Get ETP count (using raw query since we don't have Etp repository here)
    // Using try/catch for robustness in case table doesn't exist or query fails
    let totalEtps = 0;
    try {
      const etpCountResult =
        await this.authorizedDomainRepository.manager.query(
          'SELECT COUNT(*) as count FROM etps',
        );
      totalEtps = parseInt(etpCountResult[0]?.count ?? '0', 10);
    } catch (error) {
      this.logger.warn(
        `Failed to count ETPs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Continue with 0 ETPs rather than failing the entire statistics request
    }

    // Get domains by organization
    const domainsByOrganization = await this.authorizedDomainRepository
      .createQueryBuilder('domain')
      .leftJoin('domain.organization', 'organization')
      .select('organization.name', 'organizationName')
      .addSelect('COUNT(domain.id)', 'domainCount')
      .where('organization.id IS NOT NULL')
      .groupBy('organization.id')
      .orderBy('domainCount', 'DESC')
      .getRawMany();

    return {
      totalDomains,
      activeDomains,
      inactiveDomains,
      totalUsers,
      totalOrganizations,
      totalEtps,
      domainsByOrganization: domainsByOrganization.map((item) => ({
        organizationName: item.organizationName || 'Unassigned',
        domainCount: parseInt(item.domainCount, 10),
      })),
    };
  }

  /**
   * Suspends an authorized domain.
   * Blocks user registration and login for this domain.
   *
   * @param id - Domain UUID
   * @returns Updated domain with isActive = false
   * @throws NotFoundException if domain not found
   * @throws BadRequestException if domain is already suspended
   */
  async suspendDomain(id: string): Promise<AuthorizedDomain> {
    const domain = await this.findOneDomain(id);

    if (!domain.isActive) {
      throw new BadRequestException(
        `Domain '${domain.domain}' is already suspended`,
      );
    }

    domain.isActive = false;
    const suspendedDomain = await this.authorizedDomainRepository.save(domain);

    this.logger.warn(
      `Domain SUSPENDED: ${domain.domain} (${domain.institutionName})`,
    );

    return suspendedDomain;
  }

  /**
   * Reactivates a suspended domain.
   *
   * @param id - Domain UUID
   * @returns Updated domain with isActive = true
   * @throws NotFoundException if domain not found
   * @throws BadRequestException if domain is already active
   */
  async reactivateDomain(id: string): Promise<AuthorizedDomain> {
    const domain = await this.findOneDomain(id);

    if (domain.isActive) {
      throw new BadRequestException(
        `Domain '${domain.domain}' is already active`,
      );
    }

    domain.isActive = true;
    const reactivatedDomain =
      await this.authorizedDomainRepository.save(domain);

    this.logger.log(
      `Domain REACTIVATED: ${domain.domain} (${domain.institutionName})`,
    );

    return reactivatedDomain;
  }

  /**
   * Cleans up E2E test domains from the database.
   *
   * Removes all domains matching the pattern `test-e2e-*.example.com`.
   * These domains are created by E2E tests and should not persist in production.
   *
   * @returns Object with count of deleted domains
   */
  async cleanupTestDomains(): Promise<{ deleted: number }> {
    // Find all test domains matching pattern test-e2e-*.example.com
    const testDomains = await this.authorizedDomainRepository
      .createQueryBuilder('domain')
      .where('domain.domain LIKE :pattern', {
        pattern: 'test-e2e-%.example.com',
      })
      .getMany();

    if (testDomains.length === 0) {
      this.logger.log('No E2E test domains found to cleanup');
      return { deleted: 0 };
    }

    // Collect domain names for logging
    const domainNames = testDomains.map((d) => d.domain);

    // Delete all test domains
    await this.authorizedDomainRepository.remove(testDomains);

    this.logger.warn(
      `E2E TEST DOMAINS CLEANUP: Deleted ${testDomains.length} domain(s): ${domainNames.join(', ')}`,
    );

    return { deleted: testDomains.length };
  }

  /**
   * Retrieves productivity ranking of users based on ETP creation and completion.
   *
   * Part of the advanced metrics feature (Issue #1367).
   * Returns a paginated list of users ranked by their productivity metrics.
   *
   * @param periodDays - Number of days to consider (0 = all time)
   * @param page - Page number (1-based)
   * @param limit - Items per page (max 100)
   * @returns Paginated productivity ranking
   *
   * @example
   * ```ts
   * const result = await systemAdminService.getProductivityRanking(30, 1, 10);
   * // Returns top 10 users by productivity in the last 30 days
   * ```
   */
  async getProductivityRanking(
    periodDays: number = 0,
    page: number = 1,
    limit: number = 10,
  ): Promise<ProductivityRankingResponse> {
    // Ensure valid pagination
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const offset = (validPage - 1) * validLimit;

    // Build base query for ETPs grouped by creator
    const queryBuilder = this.etpRepository
      .createQueryBuilder('etp')
      .select('etp.createdById', 'userId')
      .addSelect('COUNT(etp.id)', 'etpsCreated')
      .addSelect(
        `SUM(CASE WHEN etp.status = '${EtpStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
        'etpsCompleted',
      )
      .innerJoin('etp.createdBy', 'user')
      .addSelect('user.name', 'userName')
      .addSelect('user.email', 'userEmail')
      .where('user.isActive = :isActive', { isActive: true })
      .groupBy('etp.createdById')
      .addGroupBy('user.name')
      .addGroupBy('user.email');

    // Apply period filter if periodDays > 0
    if (periodDays > 0) {
      const periodStart = new Date(
        Date.now() - periodDays * 24 * 60 * 60 * 1000,
      );
      queryBuilder.andWhere('etp.createdAt >= :periodStart', { periodStart });
    }

    // Get total count for pagination
    const countQuery = queryBuilder.clone();
    const totalUsersRaw = await countQuery.getRawMany();
    const totalUsers = totalUsersRaw.length;
    const totalPages = Math.ceil(totalUsers / validLimit);

    // Apply ordering and pagination
    queryBuilder
      .orderBy('etpsCompleted', 'DESC')
      .addOrderBy('etpsCreated', 'DESC')
      .offset(offset)
      .limit(validLimit);

    const rawResults = await queryBuilder.getRawMany();

    // Transform results with ranking positions
    const ranking: ProductivityRankingItem[] = rawResults.map((row, index) => {
      const created = parseInt(row.etpsCreated, 10);
      const completed = parseInt(row.etpsCompleted, 10);
      const rate = created > 0 ? (completed / created) * 100 : 0;

      return {
        position: offset + index + 1,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        etpsCreated: created,
        etpsCompleted: completed,
        completionRate: parseFloat(rate.toFixed(1)),
      };
    });

    return {
      ranking,
      totalUsers,
      page: validPage,
      limit: validLimit,
      totalPages,
    };
  }
}

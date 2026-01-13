import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Etp } from '../../entities/etp.entity';
import { CreateDemoUserDto } from './dto/create-demo-user.dto';

/**
 * Demo Organization CNPJ - matches the seeded demo organization.
 * Defined in seed-admin.ts as '00.000.000/0002-00'
 */
const DEMO_ORGANIZATION_CNPJ = '00.000.000/0002-00';

/**
 * Default ETP limit for demo users.
 */
const DEFAULT_ETP_LIMIT = 3;

/**
 * Bcrypt hash cost factor.
 */
const BCRYPT_COST = 10;

/**
 * Response interface for demo user with ETP count.
 */
export interface DemoUserWithEtpCount {
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
 * Response interface for creating a demo user.
 * Includes the generated password (one-time display).
 */
export interface CreateDemoUserResponse {
  user: DemoUserWithEtpCount;
  generatedPassword: string;
}

/**
 * Service for managing demo user accounts.
 * Part of Demo User Management System (Issue #1440).
 *
 * Features:
 * - Create demo users with auto-generated passwords
 * - List all demo users with ETP counts
 * - Reset demo users (clear ETPs, optionally regenerate password)
 * - Remove demo users with cascade delete
 * - Track ETP usage per user for limit enforcement
 *
 * @remarks
 * All operations require SYSTEM_ADMIN role, enforced at controller level.
 */
@Injectable()
export class DemoUserService {
  private readonly logger = new Logger(DemoUserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
  ) {}

  /**
   * Generates a random 12-character password.
   *
   * @returns Random password string
   */
  private generateRandomPassword(): string {
    return crypto.randomBytes(8).toString('base64').slice(0, 12);
  }

  /**
   * Finds the demo organization by its CNPJ.
   *
   * @returns Demo organization or null if not found
   */
  private async findDemoOrganization(): Promise<Organization | null> {
    return this.organizationRepository.findOne({
      where: { cnpj: DEMO_ORGANIZATION_CNPJ },
    });
  }

  /**
   * Counts the number of ETPs created by a user.
   *
   * @param userId - User ID
   * @returns Number of ETPs created by the user
   */
  async countUserEtps(userId: string): Promise<number> {
    return this.etpRepository.count({
      where: { createdById: userId },
    });
  }

  /**
   * Checks if a demo user is blocked (has reached ETP limit).
   *
   * @param user - User entity with etpLimitCount
   * @param etpCount - Current number of ETPs
   * @returns True if user is blocked
   */
  private isUserBlocked(user: User, etpCount: number): boolean {
    if (user.role !== UserRole.DEMO) {
      return false;
    }
    if (user.etpLimitCount === null) {
      return false;
    }
    return etpCount >= user.etpLimitCount;
  }

  /**
   * Creates a new demo user account.
   *
   * @param dto - Demo user creation data
   * @returns Created user with generated password (one-time display)
   * @throws ConflictException if email already exists
   * @throws NotFoundException if demo organization not found
   */
  async createDemoUser(
    dto: CreateDemoUserDto,
  ): Promise<CreateDemoUserResponse> {
    // Check if demo organization exists
    const demoOrg = await this.findDemoOrganization();
    if (!demoOrg) {
      throw new NotFoundException(
        `Demo organization not found (CNPJ: ${DEMO_ORGANIZATION_CNPJ}). Please run seed-admin script.`,
      );
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(
        `Email '${dto.email}' já está cadastrado no sistema`,
      );
    }

    // Generate random password
    const generatedPassword = this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, BCRYPT_COST);

    // Create demo user
    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      name: dto.name,
      cargo: dto.cargo || null,
      organizationId: demoOrg.id,
      role: UserRole.DEMO,
      isActive: true,
      mustChangePassword: true,
      etpLimitCount: DEFAULT_ETP_LIMIT,
    });

    const savedUser = await this.userRepository.save(user);

    this.logger.log(
      `Demo user created: ${savedUser.email} (ID: ${savedUser.id}, Limit: ${DEFAULT_ETP_LIMIT} ETPs)`,
    );

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        cargo: savedUser.cargo,
        role: savedUser.role,
        isActive: savedUser.isActive,
        etpLimitCount: savedUser.etpLimitCount,
        etpCount: 0,
        isBlocked: false,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
        lastLoginAt: savedUser.lastLoginAt,
      },
      generatedPassword,
    };
  }

  /**
   * Retrieves all demo users with their ETP counts.
   *
   * @returns Array of demo users with ETP counts and blocked status
   */
  async findAllDemoUsers(): Promise<DemoUserWithEtpCount[]> {
    const demoOrg = await this.findDemoOrganization();
    if (!demoOrg) {
      return [];
    }

    // Get all demo users
    const users = await this.userRepository.find({
      where: {
        organizationId: demoOrg.id,
        role: UserRole.DEMO,
      },
      order: { createdAt: 'DESC' },
    });

    // Get ETP counts for all users in one query
    const etpCounts = await this.etpRepository
      .createQueryBuilder('etp')
      .select('etp.createdById', 'userId')
      .addSelect('COUNT(etp.id)', 'count')
      .where('etp.createdById IN (:...userIds)', {
        userIds: users.length > 0 ? users.map((u) => u.id) : [''],
      })
      .groupBy('etp.createdById')
      .getRawMany();

    // Create a map for quick lookup
    const countMap = new Map<string, number>();
    for (const row of etpCounts) {
      countMap.set(row.userId, parseInt(row.count, 10));
    }

    // Map users with their ETP counts
    return users.map((user) => {
      const etpCount = countMap.get(user.id) || 0;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        cargo: user.cargo,
        role: user.role,
        isActive: user.isActive,
        etpLimitCount: user.etpLimitCount,
        etpCount,
        isBlocked: this.isUserBlocked(user, etpCount),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      };
    });
  }

  /**
   * Retrieves a single demo user by ID with ETP count.
   *
   * @param id - User ID
   * @returns Demo user with ETP count and blocked status
   * @throws NotFoundException if user not found or not a demo user
   */
  async findOneDemoUser(id: string): Promise<DemoUserWithEtpCount> {
    const user = await this.userRepository.findOne({
      where: { id, role: UserRole.DEMO },
    });

    if (!user) {
      throw new NotFoundException(`Demo user with ID ${id} not found`);
    }

    const etpCount = await this.countUserEtps(user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      cargo: user.cargo,
      role: user.role,
      isActive: user.isActive,
      etpLimitCount: user.etpLimitCount,
      etpCount,
      isBlocked: this.isUserBlocked(user, etpCount),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /**
   * Removes a demo user and cascades deletion to their ETPs.
   *
   * @param id - User ID
   * @throws NotFoundException if user not found or not a demo user
   */
  async removeDemoUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id, role: UserRole.DEMO },
    });

    if (!user) {
      throw new NotFoundException(`Demo user with ID ${id} not found`);
    }

    // Delete user's ETPs first (cascade)
    const deletedEtps = await this.etpRepository.delete({
      createdById: user.id,
    });

    // Delete user
    await this.userRepository.remove(user);

    this.logger.log(
      `Demo user removed: ${user.email} (ID: ${id}, ${deletedEtps.affected || 0} ETPs deleted)`,
    );
  }

  /**
   * Resets a demo user account.
   * Clears all ETPs and optionally regenerates password.
   *
   * @param id - User ID
   * @param regeneratePassword - If true, generates new password
   * @returns Reset user with optional new password
   * @throws NotFoundException if user not found or not a demo user
   */
  async resetDemoUser(
    id: string,
    regeneratePassword: boolean = false,
  ): Promise<{ user: DemoUserWithEtpCount; generatedPassword?: string }> {
    const user = await this.userRepository.findOne({
      where: { id, role: UserRole.DEMO },
    });

    if (!user) {
      throw new NotFoundException(`Demo user with ID ${id} not found`);
    }

    // Delete user's ETPs
    const deletedEtps = await this.etpRepository.delete({
      createdById: user.id,
    });

    let generatedPassword: string | undefined;

    // Optionally regenerate password
    if (regeneratePassword) {
      generatedPassword = this.generateRandomPassword();
      const hashedPassword = await bcrypt.hash(generatedPassword, BCRYPT_COST);
      user.password = hashedPassword;
      user.mustChangePassword = true;
    }

    // Reactivate user if it was blocked/inactive
    user.isActive = true;

    await this.userRepository.save(user);

    this.logger.log(
      `Demo user reset: ${user.email} (ID: ${id}, ${deletedEtps.affected || 0} ETPs deleted, password ${regeneratePassword ? 'regenerated' : 'kept'})`,
    );

    const result: { user: DemoUserWithEtpCount; generatedPassword?: string } = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        cargo: user.cargo,
        role: user.role,
        isActive: user.isActive,
        etpLimitCount: user.etpLimitCount,
        etpCount: 0,
        isBlocked: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      },
    };

    if (generatedPassword) {
      result.generatedPassword = generatedPassword;
    }

    return result;
  }
}

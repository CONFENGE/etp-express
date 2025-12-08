import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { AuthorizedDomain } from '../../entities/authorized-domain.entity';
import { CreateDomainUserDto } from './dto/create-domain-user.dto';
import { UpdateDomainUserDto } from './dto/update-domain-user.dto';

/**
 * Default password for new users created by Domain Managers.
 * Users must change this on first login (mustChangePassword=true).
 */
const DEFAULT_PASSWORD = 'mudar123';

/**
 * Bcrypt cost factor for password hashing.
 */
const BCRYPT_ROUNDS = 10;

/**
 * Response interface for quota information.
 */
export interface QuotaInfo {
  currentUsers: number;
  maxUsers: number;
  available: number;
  percentUsed: number;
}

/**
 * Response interface for domain user listing.
 */
export interface DomainUserResponse {
  id: string;
  email: string;
  name: string;
  cargo: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/**
 * Service for Domain Manager operations (M8: Gestao de Dominios Institucionais).
 *
 * Provides:
 * - CRUD operations for users within a domain
 * - User quota management (max 10 per domain)
 * - Email domain validation
 *
 * @remarks
 * All operations are scoped to the Domain Manager's assigned domain.
 * Users are created with default password 'mudar123' and mustChangePassword=true.
 */
@Injectable()
export class DomainManagerService {
  private readonly logger = new Logger(DomainManagerService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthorizedDomain)
    private readonly authorizedDomainRepository: Repository<AuthorizedDomain>,
  ) {}

  /**
   * Retrieves all users in the Domain Manager's domain.
   *
   * @param managerId - ID of the Domain Manager
   * @returns Array of users in the domain
   * @throws NotFoundException if manager's domain not found
   */
  async findAllUsers(managerId: string): Promise<DomainUserResponse[]> {
    const domain = await this.getManagerDomain(managerId);

    const users = await this.userRepository.find({
      where: { authorizedDomainId: domain.id },
      order: { createdAt: 'DESC' },
    });

    return users.map(this.mapUserToResponse);
  }

  /**
   * Creates a new user within the Domain Manager's domain.
   *
   * @param managerId - ID of the Domain Manager
   * @param createUserDto - User creation data
   * @returns Created user
   * @throws NotFoundException if manager's domain not found
   * @throws BadRequestException if quota exceeded or email domain mismatch
   * @throws ConflictException if email already exists
   */
  async createUser(
    managerId: string,
    createUserDto: CreateDomainUserDto,
  ): Promise<DomainUserResponse> {
    const domain = await this.getManagerDomain(managerId);

    // Validate quota
    const currentUserCount = await this.userRepository.count({
      where: { authorizedDomainId: domain.id },
    });

    if (currentUserCount >= domain.maxUsers) {
      throw new BadRequestException(
        `User quota exceeded: ${currentUserCount}/${domain.maxUsers} users in domain '${domain.domain}'`,
      );
    }

    // Validate email domain matches
    const emailDomain = createUserDto.email.split('@')[1]?.toLowerCase();
    if (emailDomain !== domain.domain) {
      throw new BadRequestException(
        `Email domain '${emailDomain}' does not match authorized domain '${domain.domain}'`,
      );
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(
        `User with email '${createUserDto.email}' already exists`,
      );
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

    // Get manager's organization (users inherit org from domain manager)
    const manager = await this.userRepository.findOne({
      where: { id: managerId },
      relations: ['organization'],
    });

    if (!manager) {
      throw new NotFoundException(`Manager with ID ${managerId} not found`);
    }

    // Create user
    const user = this.userRepository.create({
      email: createUserDto.email.toLowerCase(),
      name: createUserDto.name,
      password: hashedPassword,
      cargo: createUserDto.cargo ?? null,
      role: UserRole.USER,
      isActive: true,
      mustChangePassword: true,
      organizationId: manager.organizationId,
      authorizedDomainId: domain.id,
    });

    const savedUser = await this.userRepository.save(user);

    this.logger.log(
      `User created by Domain Manager: ${savedUser.email} in domain ${domain.domain}`,
    );

    return this.mapUserToResponse(savedUser);
  }

  /**
   * Updates a user within the Domain Manager's domain.
   *
   * @param managerId - ID of the Domain Manager
   * @param userId - ID of the user to update
   * @param updateUserDto - Fields to update
   * @returns Updated user
   * @throws NotFoundException if user not found or not in manager's domain
   * @throws BadRequestException if trying to update user outside domain
   */
  async updateUser(
    managerId: string,
    userId: string,
    updateUserDto: UpdateDomainUserDto,
  ): Promise<DomainUserResponse> {
    const domain = await this.getManagerDomain(managerId);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate user belongs to manager's domain
    if (user.authorizedDomainId !== domain.id) {
      throw new BadRequestException(
        'Cannot update user: User does not belong to your domain',
      );
    }

    // Prevent updating domain managers or system admins
    if (
      user.role === UserRole.DOMAIN_MANAGER ||
      user.role === UserRole.SYSTEM_ADMIN
    ) {
      throw new BadRequestException(
        'Cannot update user: Cannot modify administrators',
      );
    }

    // Apply updates
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.cargo !== undefined) {
      user.cargo = updateUserDto.cargo;
    }
    if (updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    const updatedUser = await this.userRepository.save(user);

    this.logger.log(
      `User updated by Domain Manager: ${updatedUser.email} in domain ${domain.domain}`,
    );

    return this.mapUserToResponse(updatedUser);
  }

  /**
   * Deactivates a user within the Domain Manager's domain.
   *
   * @param managerId - ID of the Domain Manager
   * @param userId - ID of the user to deactivate
   * @throws NotFoundException if user not found
   * @throws BadRequestException if user not in domain or is admin
   */
  async deactivateUser(managerId: string, userId: string): Promise<void> {
    const domain = await this.getManagerDomain(managerId);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate user belongs to manager's domain
    if (user.authorizedDomainId !== domain.id) {
      throw new BadRequestException(
        'Cannot deactivate user: User does not belong to your domain',
      );
    }

    // Prevent deactivating domain managers or system admins
    if (
      user.role === UserRole.DOMAIN_MANAGER ||
      user.role === UserRole.SYSTEM_ADMIN
    ) {
      throw new BadRequestException(
        'Cannot deactivate user: Cannot deactivate administrators',
      );
    }

    // Soft delete (deactivate)
    user.isActive = false;
    await this.userRepository.save(user);

    this.logger.log(
      `User deactivated by Domain Manager: ${user.email} in domain ${domain.domain}`,
    );
  }

  /**
   * Retrieves quota information for the Domain Manager's domain.
   *
   * @param managerId - ID of the Domain Manager
   * @returns Quota information
   * @throws NotFoundException if manager's domain not found
   */
  async getQuota(managerId: string): Promise<QuotaInfo> {
    const domain = await this.getManagerDomain(managerId);

    const currentUsers = await this.userRepository.count({
      where: { authorizedDomainId: domain.id },
    });

    return {
      currentUsers,
      maxUsers: domain.maxUsers,
      available: Math.max(0, domain.maxUsers - currentUsers),
      percentUsed: Math.round((currentUsers / domain.maxUsers) * 100),
    };
  }

  /**
   * Resets a user's password to the default and sets mustChangePassword=true.
   *
   * @param managerId - ID of the Domain Manager
   * @param userId - ID of the user
   * @throws NotFoundException if user not found
   * @throws BadRequestException if user not in domain or is admin
   */
  async resetUserPassword(managerId: string, userId: string): Promise<void> {
    const domain = await this.getManagerDomain(managerId);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate user belongs to manager's domain
    if (user.authorizedDomainId !== domain.id) {
      throw new BadRequestException(
        'Cannot reset password: User does not belong to your domain',
      );
    }

    // Prevent resetting password for domain managers or system admins
    if (
      user.role === UserRole.DOMAIN_MANAGER ||
      user.role === UserRole.SYSTEM_ADMIN
    ) {
      throw new BadRequestException(
        'Cannot reset password: Cannot modify administrators',
      );
    }

    // Reset to default password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    user.password = hashedPassword;
    user.mustChangePassword = true;

    await this.userRepository.save(user);

    this.logger.log(
      `Password reset by Domain Manager: ${user.email} in domain ${domain.domain}`,
    );
  }

  /**
   * Helper: Gets the Domain Manager's authorized domain.
   *
   * @param managerId - ID of the Domain Manager
   * @returns The authorized domain
   * @throws NotFoundException if domain not found
   */
  private async getManagerDomain(managerId: string): Promise<AuthorizedDomain> {
    const manager = await this.userRepository.findOne({
      where: { id: managerId },
    });

    if (!manager || !manager.authorizedDomainId) {
      throw new NotFoundException(
        'Domain Manager does not have an assigned domain',
      );
    }

    const domain = await this.authorizedDomainRepository.findOne({
      where: { id: manager.authorizedDomainId },
    });

    if (!domain) {
      throw new NotFoundException(
        `Authorized domain with ID ${manager.authorizedDomainId} not found`,
      );
    }

    if (!domain.isActive) {
      throw new BadRequestException(
        `Domain '${domain.domain}' is currently suspended`,
      );
    }

    return domain;
  }

  /**
   * Helper: Maps User entity to response DTO.
   */
  private mapUserToResponse(user: User): DomainUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      cargo: user.cargo,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}

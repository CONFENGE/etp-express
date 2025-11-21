import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Etp)
    private etpsRepository: Repository<Etp>,
    @InjectRepository(AnalyticsEvent)
    private analyticsRepository: Repository<AnalyticsEvent>,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`User created: ${savedUser.email}`);
    return savedUser;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`User updated: ${updatedUser.email}`);

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    this.logger.log(`User deleted: ${user.email}`);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Exports all user data for LGPD compliance (Art. 18, II and V).
   *
   * @remarks
   * Exports complete user data including:
   * - User profile (password excluded via @Exclude decorator)
   * - All ETPs with sections and versions
   * - Analytics events
   * - Audit logs (last 1000 entries)
   *
   * This method fulfills LGPD data portability requirements and logs
   * the export action to audit trail.
   *
   * @param userId - User unique identifier (UUID)
   * @returns Object containing all user data and export metadata
   * @throws {NotFoundException} If user not found
   */
  async exportUserData(userId: string) {
    // 1. Verify user exists
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'name',
        'email',
        'orgao',
        'cargo',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
        'lgpdConsentAt',
        'lgpdConsentVersion',
        'internationalTransferConsentAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado`);
    }

    // 2. Export all ETPs with related data
    const etps = await this.etpsRepository.find({
      where: { createdById: userId },
      relations: ['sections', 'versions'],
      order: { createdAt: 'DESC' },
    });

    // 3. Export analytics events
    const analytics = await this.analyticsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 4. Export audit logs (last 1000 entries)
    const auditLogs = await this.auditLogsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 1000,
    });

    // 5. Create audit log for this export
    const exportLog = this.auditLogsRepository.create({
      action: AuditAction.EXPORT,
      entityType: 'user',
      entityId: userId,
      userId,
      description: 'User data exported for LGPD compliance',
      changes: {
        metadata: {
          etpsCount: etps.length,
          analyticsCount: analytics.length,
          auditLogsCount: auditLogs.length,
        },
      },
    });
    await this.auditLogsRepository.save(exportLog);

    this.logger.log(
      `User data exported: ${user.email} (${etps.length} ETPs, ${analytics.length} analytics, ${auditLogs.length} audit logs)`,
    );

    // 6. Return complete export
    return {
      user,
      etps,
      analytics,
      auditLogs,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        dataRetentionPolicy:
          'Os dados serão mantidos por 90 dias após deleção da conta. ' +
          'Consulte docs/DATA_RETENTION_POLICY.md para mais informações.',
        lgpdRights:
          'Seus direitos LGPD incluem acesso, correção, anonimização, portabilidade e exclusão. ' +
          'Consulte docs/PRIVACY_POLICY.md para exercer seus direitos.',
        recordCounts: {
          etps: etps.length,
          analytics: analytics.length,
          auditLogs: auditLogs.length,
        },
      },
    };
  }

  /**
   * Soft deletes a user account for LGPD compliance (Art. 18, VI - direito de exclusão).
   *
   * @remarks
   * Performs soft delete by:
   * - Setting deletedAt timestamp
   * - Deactivating account (isActive = false)
   * - Creating audit log entry
   * - Account will be hard deleted after 30 days by scheduled job
   *
   * This method fulfills LGPD right to deletion with grace period for reversal.
   *
   * @param userId - User unique identifier (UUID)
   * @param reason - Optional reason for account deletion
   * @returns Deletion scheduled date (30 days from now)
   * @throws {NotFoundException} If user not found
   */
  async softDeleteAccount(
    userId: string,
    reason?: string,
  ): Promise<{ scheduledDeletionDate: Date }> {
    const user = await this.findOne(userId);

    // Soft delete: mark for deletion without removing data
    user.deletedAt = new Date();
    user.isActive = false;

    await this.usersRepository.save(user);

    // Calculate scheduled hard deletion date (30 days from now)
    const scheduledDeletionDate = new Date();
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + 30);

    // Create audit log
    const auditLog = this.auditLogsRepository.create({
      action: AuditAction.DELETE,
      entityType: 'user',
      entityId: userId,
      userId,
      description: 'User account soft deleted (LGPD Art. 18, VI)',
      changes: {
        metadata: {
          deletedAt: user.deletedAt.toISOString(),
          scheduledHardDeletionAt: scheduledDeletionDate.toISOString(),
          reason: reason || 'Não informado',
        },
      },
    });
    await this.auditLogsRepository.save(auditLog);

    this.logger.log(
      `User soft deleted: ${user.email} (scheduled hard deletion: ${scheduledDeletionDate.toISOString()})`,
    );

    return { scheduledDeletionDate };
  }
}

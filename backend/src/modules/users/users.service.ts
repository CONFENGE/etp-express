import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { subDays } from 'date-fns';

/**
 * Default LGPD retention period in days before hard deletion.
 * Can be overridden via LGPD_RETENTION_DAYS environment variable.
 */
const DEFAULT_LGPD_RETENTION_DAYS = 30;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly retentionDays: number;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Etp)
    private etpsRepository: Repository<Etp>,
    @InjectRepository(AnalyticsEvent)
    private analyticsRepository: Repository<AnalyticsEvent>,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
    private emailService: EmailService,
    private auditService: AuditService,
    private configService: ConfigService,
  ) {
    this.retentionDays = this.configService.get<number>(
      'LGPD_RETENTION_DAYS',
      DEFAULT_LGPD_RETENTION_DAYS,
    );
    this.logger.log(
      `LGPD retention period configured: ${this.retentionDays} days`,
    );
  }

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
        'organizationId',
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

    // 5. Create audit log for this export using AuditService
    const totalSections = etps.reduce(
      (sum, etp) => sum + (etp.sections?.length || 0),
      0,
    );
    const totalVersions = etps.reduce(
      (sum, etp) => sum + (etp.versions?.length || 0),
      0,
    );

    await this.auditService.logDataExport(userId, {
      format: 'JSON',
      etpsCount: etps.length,
      sectionsCount: totalSections,
      versionsCount: totalVersions,
      analyticsCount: analytics.length,
      auditLogsCount: auditLogs.length,
    });

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
   * - Account will be hard deleted after retention period (configurable via LGPD_RETENTION_DAYS)
   *
   * This method fulfills LGPD right to deletion with grace period for reversal.
   *
   * @param userId - User unique identifier (UUID)
   * @param reason - Optional reason for account deletion
   * @returns Deletion scheduled date (retention period from now)
   * @throws {NotFoundException} If user not found
   */
  async softDeleteAccount(
    userId: string,
    reason?: string,
  ): Promise<{ scheduledDeletionDate: Date; retentionDays: number }> {
    const user = await this.findOne(userId);

    // Soft delete: mark for deletion without removing data
    user.deletedAt = new Date();
    user.isActive = false;

    await this.usersRepository.save(user);

    // Calculate scheduled hard deletion date (retention period from now)
    const scheduledDeletionDate = new Date();
    scheduledDeletionDate.setDate(
      scheduledDeletionDate.getDate() + this.retentionDays,
    );

    // Count ETPs and related data for audit log
    const etpsCount = await this.etpsRepository.count({
      where: { createdById: userId },
    });

    const etps = await this.etpsRepository.find({
      where: { createdById: userId },
      relations: ['sections', 'versions'],
    });

    const sectionsCount = etps.reduce(
      (sum, etp) => sum + (etp.sections?.length || 0),
      0,
    );
    const versionsCount = etps.reduce(
      (sum, etp) => sum + (etp.versions?.length || 0),
      0,
    );

    // Create audit log using AuditService
    await this.auditService.logAccountDeletion(userId, 'SOFT', {
      reason: reason || 'Não informado',
      etpsCount,
      sectionsCount,
      versionsCount,
    });

    // Send deletion confirmation email with cancellation link
    try {
      await this.emailService.sendDeletionConfirmation(user);
      this.logger.log(`Deletion confirmation email sent to ${user.email}`);
    } catch (error) {
      // Log error but don't fail the deletion request
      // User can still contact support to cancel deletion
      this.logger.error(
        `Failed to send deletion confirmation email to ${user.email}`,
        error.stack,
      );
    }

    this.logger.log(
      `User soft deleted: ${user.email} (scheduled hard deletion: ${scheduledDeletionDate.toISOString()}, retention: ${this.retentionDays} days)`,
    );

    return { scheduledDeletionDate, retentionDays: this.retentionDays };
  }

  /**
   * Cancels account deletion and reactivates user account.
   *
   * @remarks
   * Reverses soft delete by:
   * - Clearing deletedAt timestamp
   * - Reactivating account (isActive = true)
   * - Creating audit log entry
   *
   * This allows users to cancel deletion within the configured grace period (LGPD_RETENTION_DAYS).
   *
   * @param userId - User unique identifier (UUID)
   * @throws {NotFoundException} If user not found
   * @throws {BadRequestException} If account is not marked for deletion
   */
  async cancelDeletion(userId: string): Promise<void> {
    const user = await this.findOne(userId);

    if (!user.deletedAt) {
      throw new BadRequestException('Conta não está marcada para deleção');
    }

    const originalDeletionDate = user.deletedAt.toISOString();

    // Reactivate account
    user.deletedAt = null;
    user.isActive = true;
    await this.usersRepository.save(user);

    // Create audit log using AuditService
    await this.auditService.logDeletionCancelled(userId, {
      originalDeletionDate,
      reason: 'Usuário cancelou a deleção dentro do prazo de 30 dias',
    });

    this.logger.log(
      `User deletion cancelled: ${user.email} (account reactivated)`,
    );
  }

  /**
   * Purges (hard deletes) user accounts that have been soft-deleted for more than
   * the configured retention period (LGPD_RETENTION_DAYS, default 30 days).
   * Runs daily at 2 AM via cron job.
   *
   * @remarks
   * This method fulfills LGPD data retention policy by:
   * - Permanently deleting user data after configured grace period
   * - Cascading deletion to related ETPs, sections, analytics, and audit logs
   * - Creating audit trail for each purge
   * - Logging purge operations for compliance reporting
   *
   * Scheduled to run: Every day at 2:00 AM
   *
   * @returns Object with purge statistics (count, timestamp, and retention days)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeDeletedAccounts(): Promise<{
    purgedCount: number;
    purgedAt: Date;
    purgedUserIds: string[];
    retentionDays: number;
  }> {
    // Calculate cutoff date based on configured retention period
    const cutoffDate = subDays(new Date(), this.retentionDays);

    this.logger.log(
      `Starting LGPD purge job (retention: ${this.retentionDays} days, cutoff: ${cutoffDate.toISOString()})`,
    );

    // Find all users soft-deleted more than retention period ago
    const deletedUsers = await this.usersRepository.find({
      where: {
        deletedAt: LessThan(cutoffDate),
        isActive: false,
      },
    });

    const purgedUserIds: string[] = [];

    for (const user of deletedUsers) {
      try {
        // Count related data for audit log
        const etpsCount = await this.etpsRepository.count({
          where: { createdById: user.id },
        });

        const etps = await this.etpsRepository.find({
          where: { createdById: user.id },
          relations: ['sections', 'versions'],
        });

        const sectionsCount = etps.reduce(
          (sum, etp) => sum + (etp.sections?.length || 0),
          0,
        );
        const versionsCount = etps.reduce(
          (sum, etp) => sum + (etp.versions?.length || 0),
          0,
        );

        // Create audit log BEFORE deletion (using AuditService)
        await this.auditService.logAccountDeletion(user.id, 'HARD', {
          reason: `Hard delete after ${this.retentionDays}-day retention period (originally deleted: ${user.deletedAt?.toISOString() || 'N/A'})`,
          etpsCount,
          sectionsCount,
          versionsCount,
          retentionDays: this.retentionDays,
        });

        // Hard delete user (cascade will remove ETPs, sections, versions due to onDelete: 'CASCADE')
        await this.usersRepository.remove(user);

        purgedUserIds.push(user.id);

        this.logger.log(
          `Hard deleted user ${user.id} (${user.email}) after ${this.retentionDays}-day retention period. ` +
            `Related data: ${etpsCount} ETPs, ${sectionsCount} sections, ${versionsCount} versions`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to purge user ${user.id} (${user.email}): ${error.message}`,
          error.stack,
        );
        // Continue purging other users even if one fails
      }
    }

    const result = {
      purgedCount: purgedUserIds.length,
      purgedAt: new Date(),
      purgedUserIds,
      retentionDays: this.retentionDays,
    };

    if (purgedUserIds.length > 0) {
      this.logger.log(
        `Purge job completed: ${purgedUserIds.length} user(s) permanently deleted (retention: ${this.retentionDays} days)`,
      );
    } else {
      this.logger.log(
        `Purge job completed: No users to purge (retention: ${this.retentionDays} days)`,
      );
    }

    return result;
  }
}

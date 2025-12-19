import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
 SecretAccessLog,
 SecretAccessStatus,
} from '../../entities/secret-access-log.entity';
import { AuditLog, AuditAction } from '../../entities/audit-log.entity';

@Injectable()
export class AuditService {
 private readonly logger = new Logger(AuditService.name);

 constructor(
 @InjectRepository(SecretAccessLog)
 private logsRepository: Repository<SecretAccessLog>,
 @InjectRepository(AuditLog)
 private auditLogRepository: Repository<AuditLog>,
 ) {}

 /**
 * Log access to a secret
 * @param secretName Name of the secret being accessed
 * @param accessedBy Service/context that accessed the secret
 * @param status Result of the access attempt
 * @param ipAddress Optional IP address of the requester
 * @param errorMessage Optional error message if access failed
 */
 async logSecretAccess(
 secretName: string,
 accessedBy: string,
 status: SecretAccessStatus,
 ipAddress?: string,
 errorMessage?: string,
 ): Promise<SecretAccessLog> {
 const log = this.logsRepository.create({
 secretName,
 accessedBy,
 status,
 ipAddress,
 errorMessage,
 });

 const savedLog = await this.logsRepository.save(log);

 // Log critical events for failed or unauthorized access
 if (status === SecretAccessStatus.FAILED) {
 this.logger.error(
 `Secret access failed: ${secretName} by ${accessedBy} - ${errorMessage || 'Unknown error'}`,
 );
 } else if (status === SecretAccessStatus.UNAUTHORIZED) {
 this.logger.warn(
 `Unauthorized secret access attempt: ${secretName} by ${accessedBy}`,
 );
 }

 return savedLog;
 }

 /**
 * Get recent access logs for a specific secret
 * @param secretName Name of the secret
 * @param limit Maximum number of logs to return
 */
 async getRecentAccess(
 secretName: string,
 limit = 100,
 ): Promise<SecretAccessLog[]> {
 return this.logsRepository.find({
 where: { secretName },
 order: { accessedAt: 'DESC' },
 take: limit,
 });
 }

 /**
 * Get all access logs with optional filtering
 * @param options Filter options
 */
 async getAccessLogs(options?: {
 secretName?: string;
 status?: SecretAccessStatus;
 limit?: number;
 offset?: number;
 }): Promise<{ logs: SecretAccessLog[]; total: number }> {
 const { secretName, status, limit = 100, offset = 0 } = options || {};

 const queryBuilder = this.logsRepository.createQueryBuilder('log');

 if (secretName) {
 queryBuilder.andWhere('log.secretName = :secretName', { secretName });
 }

 if (status) {
 queryBuilder.andWhere('log.status = :status', { status });
 }

 queryBuilder.orderBy('log.accessedAt', 'DESC').skip(offset).take(limit);

 const [logs, total] = await queryBuilder.getManyAndCount();

 return { logs, total };
 }

 /**
 * Detect anomalous access patterns
 * Returns true if more than threshold accesses occurred in the time window
 * @param secretName Name of the secret to check
 * @param thresholdCount Number of accesses that triggers anomaly (default: 100)
 * @param windowMs Time window in milliseconds (default: 60000 = 1 minute)
 */
 async detectAnomalies(
 secretName: string,
 thresholdCount = 100,
 windowMs = 60000,
 ): Promise<boolean> {
 const windowStart = new Date(Date.now() - windowMs);

 const count = await this.logsRepository.count({
 where: {
 secretName,
 accessedAt: MoreThan(windowStart),
 },
 });

 if (count > thresholdCount) {
 this.logger.warn(
 `Anomaly detected: ${count} accesses to ${secretName} in last ${windowMs / 1000} seconds (threshold: ${thresholdCount})`,
 );
 return true;
 }

 return false;
 }

 /**
 * Get anomaly status for a secret
 */
 async getAnomalyStatus(
 secretName: string,
 thresholdCount = 100,
 windowMs = 60000,
 ): Promise<{
 secretName: string;
 anomalous: boolean;
 accessCount: number;
 threshold: number;
 windowSeconds: number;
 }> {
 const windowStart = new Date(Date.now() - windowMs);

 const accessCount = await this.logsRepository.count({
 where: {
 secretName,
 accessedAt: MoreThan(windowStart),
 },
 });

 return {
 secretName,
 anomalous: accessCount > thresholdCount,
 accessCount,
 threshold: thresholdCount,
 windowSeconds: windowMs / 1000,
 };
 }

 /**
 * Get statistics for secret access
 */
 async getAccessStats(secretName?: string): Promise<{
 totalAccesses: number;
 successCount: number;
 failedCount: number;
 unauthorizedCount: number;
 uniqueSecrets?: number;
 }> {
 const queryBuilder = this.logsRepository.createQueryBuilder('log');

 if (secretName) {
 queryBuilder.where('log.secretName = :secretName', { secretName });
 }

 const totalAccesses = await queryBuilder.getCount();

 const successCount = await queryBuilder
 .clone()
 .andWhere('log.status = :status', { status: SecretAccessStatus.SUCCESS })
 .getCount();

 const failedCount = await queryBuilder
 .clone()
 .andWhere('log.status = :status', { status: SecretAccessStatus.FAILED })
 .getCount();

 const unauthorizedCount = await queryBuilder
 .clone()
 .andWhere('log.status = :status', {
 status: SecretAccessStatus.UNAUTHORIZED,
 })
 .getCount();

 const stats: {
 totalAccesses: number;
 successCount: number;
 failedCount: number;
 unauthorizedCount: number;
 uniqueSecrets?: number;
 } = {
 totalAccesses,
 successCount,
 failedCount,
 unauthorizedCount,
 };

 if (!secretName) {
 const uniqueSecrets = await this.logsRepository
 .createQueryBuilder('log')
 .select('COUNT(DISTINCT log.secretName)', 'count')
 .getRawOne();
 stats.uniqueSecrets = parseInt(uniqueSecrets.count, 10);
 }

 return stats;
 }

 /**
 * Cleanup old logs (retention policy)
 * @param retentionDays Number of days to keep logs (default: 90)
 */
 async cleanupOldLogs(retentionDays = 90): Promise<number> {
 const cutoffDate = new Date();
 cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

 const result = await this.logsRepository
 .createQueryBuilder()
 .delete()
 .where('accessedAt < :cutoffDate', { cutoffDate })
 .execute();

 const deletedCount = result.affected || 0;

 if (deletedCount > 0) {
 this.logger.log(
 `Cleaned up ${deletedCount} old secret access logs (older than ${retentionDays} days)`,
 );
 }

 return deletedCount;
 }

 /**
 * Log user data export (LGPD compliance)
 * @param userId User ID who requested the export
 * @param metadata Export metadata (IP, userAgent, counts, etc.)
 */
 async logDataExport(
 userId: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 format?: string;
 etpsCount?: number;
 sectionsCount?: number;
 versionsCount?: number;
 analyticsCount?: number;
 auditLogsCount?: number;
 },
 ): Promise<AuditLog> {
 const log = this.auditLogRepository.create({
 action: AuditAction.USER_DATA_EXPORT,
 entityType: 'User',
 entityId: userId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: 'User requested data export (LGPD Art. 18, II and V)',
 changes: {
 metadata: {
 format: metadata.format || 'JSON',
 recordCount: {
 user: 1,
 etps: metadata.etpsCount || 0,
 sections: metadata.sectionsCount || 0,
 versions: metadata.versionsCount || 0,
 analytics: metadata.analyticsCount || 0,
 auditLogs: metadata.auditLogsCount || 0,
 },
 exportedAt: new Date().toISOString(),
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 this.logger.log(
 `User data export logged: User ${userId} exported data (${metadata.format || 'JSON'})`,
 );

 return savedLog;
 }

 /**
 * Log account deletion (LGPD compliance)
 * @param userId User ID being deleted
 * @param type Deletion type (SOFT or HARD)
 * @param metadata Deletion metadata (IP, userAgent, confirmation, etc.)
 */
 async logAccountDeletion(
 userId: string,
 type: 'SOFT' | 'HARD',
 metadata: {
 ip?: string;
 userAgent?: string;
 confirmation?: string;
 reason?: string;
 etpsCount?: number;
 sectionsCount?: number;
 versionsCount?: number;
 retentionDays?: number;
 },
 ): Promise<AuditLog> {
 const retentionDays = metadata.retentionDays || 30;
 const scheduledFor =
 type === 'SOFT'
 ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000)
 : null;

 const log = this.auditLogRepository.create({
 action:
 type === 'SOFT'
 ? AuditAction.ACCOUNT_DELETION_SOFT
 : AuditAction.ACCOUNT_DELETION_HARD,
 entityType: 'User',
 entityId: userId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: `Account ${type.toLowerCase()} deletion (LGPD Art. 18, VI)`,
 changes: {
 metadata: {
 deletionType: type,
 confirmation: metadata.confirmation || null,
 reason: metadata.reason || null,
 scheduledFor: scheduledFor ? scheduledFor.toISOString() : null,
 retentionDays,
 cascadeDeleted: {
 etps: metadata.etpsCount || 0,
 sections: metadata.sectionsCount || 0,
 versions: metadata.versionsCount || 0,
 },
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 if (type === 'SOFT') {
 this.logger.warn(
 `Account soft deletion logged: User ${userId} scheduled for deletion on ${scheduledFor}`,
 );
 } else {
 this.logger.warn(
 `Account hard deletion logged: User ${userId} permanently deleted`,
 );
 }

 return savedLog;
 }

 /**
 * Log account deletion cancellation (LGPD compliance)
 * @param userId User ID who cancelled deletion
 * @param metadata Cancellation metadata
 */
 async logDeletionCancelled(
 userId: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 originalDeletionDate?: string;
 reason?: string;
 },
 ): Promise<AuditLog> {
 const log = this.auditLogRepository.create({
 action: AuditAction.ACCOUNT_DELETION_CANCELLED,
 entityType: 'User',
 entityId: userId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: 'Account deletion cancelled by user',
 changes: {
 metadata: {
 originalDeletionDate: metadata.originalDeletionDate || null,
 cancelledAt: new Date().toISOString(),
 reason: metadata.reason || 'User requested cancellation',
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 this.logger.log(
 `Account deletion cancelled: User ${userId} cancelled scheduled deletion`,
 );

 return savedLog;
 }

 /**
 * Log user login (LGPD Art. 37 compliance)
 * @param userId User ID who logged in
 * @param metadata Login metadata (IP, userAgent)
 */
 async logLogin(
 userId: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 email?: string;
 },
 ): Promise<AuditLog> {
 const log = this.auditLogRepository.create({
 action: AuditAction.LOGIN,
 entityType: 'User',
 entityId: userId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: 'User login (LGPD Art. 37 - registro das operações)',
 changes: {
 metadata: {
 email: metadata.email,
 loginAt: new Date().toISOString(),
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 this.logger.log(
 `Login logged: User ${userId} (${metadata.email || 'N/A'})`,
 );

 return savedLog;
 }

 /**
 * Log user logout (LGPD Art. 37 compliance)
 * @param userId User ID who logged out
 * @param metadata Logout metadata (IP, userAgent)
 */
 async logLogout(
 userId: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 },
 ): Promise<AuditLog> {
 const log = this.auditLogRepository.create({
 action: AuditAction.LOGOUT,
 entityType: 'User',
 entityId: userId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: 'User logout (LGPD Art. 37 - registro das operações)',
 changes: {
 metadata: {
 logoutAt: new Date().toISOString(),
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 this.logger.log(`Logout logged: User ${userId}`);

 return savedLog;
 }

 /**
 * Log failed login attempt (LGPD Art. 37 compliance - security monitoring)
 * @param email Email that attempted to login
 * @param metadata Login attempt metadata
 */
 async logLoginFailed(
 email: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 reason?: string;
 },
 ): Promise<void> {
 // For failed logins, we don't have a userId, so we log differently
 this.logger.warn(
 `Failed login attempt: ${email} from IP ${metadata.ip || 'unknown'} - ${metadata.reason || 'Invalid credentials'}`,
 );

 // We can't save to audit_logs without userId, but we log the security event
 // This could be extended to a separate security_events table in the future
 }

 /**
 * Log access to personal data (LGPD Art. 50 - boas práticas)
 * @param userId User who accessed the data
 * @param targetUserId User whose data was accessed
 * @param metadata Access metadata
 */
 async logProfileAccess(
 userId: string,
 targetUserId: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 action?: 'view' | 'update';
 fields?: string[];
 },
 ): Promise<AuditLog> {
 const action =
 metadata.action === 'update'
 ? AuditAction.PROFILE_UPDATE
 : AuditAction.PROFILE_VIEW;

 const log = this.auditLogRepository.create({
 action,
 entityType: 'User',
 entityId: targetUserId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: `Profile ${metadata.action || 'view'} (LGPD Art. 50 - boas práticas)`,
 changes: {
 metadata: {
 targetUserId,
 accessedAt: new Date().toISOString(),
 fields: metadata.fields || [],
 selfAccess: userId === targetUserId,
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 this.logger.log(
 `Profile ${metadata.action || 'view'} logged: User ${userId} accessed profile of ${targetUserId}`,
 );

 return savedLog;
 }

 /**
 * Log generic data access for LGPD compliance
 * @param userId User who accessed the data
 * @param resource Resource type being accessed
 * @param resourceId Resource ID being accessed
 * @param metadata Access metadata
 */
 async logDataAccess(
 userId: string,
 resource: string,
 resourceId: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 operation?: string;
 },
 ): Promise<AuditLog> {
 const log = this.auditLogRepository.create({
 action: AuditAction.DATA_ACCESS,
 entityType: resource,
 entityId: resourceId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: `Data access: ${resource} (LGPD Art. 37)`,
 changes: {
 metadata: {
 resource,
 resourceId,
 operation: metadata.operation || 'read',
 accessedAt: new Date().toISOString(),
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 return savedLog;
 }

 /**
 * Get authentication logs for a user (login/logout history)
 * @param userId User ID to get logs for
 * @param options Filter options
 */
 async getAuthLogs(
 userId: string,
 options?: {
 startDate?: Date;
 endDate?: Date;
 limit?: number;
 },
 ): Promise<AuditLog[]> {
 const { startDate, endDate, limit = 100 } = options || {};

 const queryBuilder = this.auditLogRepository
 .createQueryBuilder('log')
 .where('log.userId = :userId', { userId })
 .andWhere('log.action IN (:...actions)', {
 actions: [AuditAction.LOGIN, AuditAction.LOGOUT],
 });

 if (startDate) {
 queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
 }

 if (endDate) {
 queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
 }

 queryBuilder.orderBy('log.createdAt', 'DESC').take(limit);

 return queryBuilder.getMany();
 }

 /**
 * Get LGPD operation logs with filtering
 * @param options Filter options
 */
 async getLGPDOperations(options?: {
 startDate?: Date;
 endDate?: Date;
 action?: AuditAction;
 limit?: number;
 }): Promise<{
 logs: AuditLog[];
 summary: {
 totalExports: number;
 totalDeletions: number;
 totalCancellations: number;
 };
 }> {
 const { startDate, endDate, action, limit = 1000 } = options || {};

 const threeMonthsAgo = new Date();
 threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

 const queryBuilder = this.auditLogRepository
 .createQueryBuilder('log')
 .leftJoinAndSelect('log.user', 'user')
 .where('log.action IN (:...actions)', {
 actions: [
 AuditAction.USER_DATA_EXPORT,
 AuditAction.ACCOUNT_DELETION_SOFT,
 AuditAction.ACCOUNT_DELETION_HARD,
 AuditAction.ACCOUNT_DELETION_CANCELLED,
 ],
 });

 if (startDate || endDate) {
 queryBuilder.andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
 startDate: startDate || threeMonthsAgo,
 endDate: endDate || new Date(),
 });
 }

 if (action) {
 queryBuilder.andWhere('log.action = :action', { action });
 }

 queryBuilder.orderBy('log.createdAt', 'DESC').take(limit);

 const logs = await queryBuilder.getMany();

 const summary = {
 totalExports: logs.filter(
 (l) => l.action === AuditAction.USER_DATA_EXPORT,
 ).length,
 totalDeletions: logs.filter((l) =>
 [
 AuditAction.ACCOUNT_DELETION_SOFT,
 AuditAction.ACCOUNT_DELETION_HARD,
 ].includes(l.action),
 ).length,
 totalCancellations: logs.filter(
 (l) => l.action === AuditAction.ACCOUNT_DELETION_CANCELLED,
 ).length,
 };

 return { logs, summary };
 }

 /**
 * Log tenant access blocked (Multi-Tenancy B2G Kill Switch - MT-04)
 * @param userId User ID who was blocked
 * @param metadata Block metadata (organizationId, route, IP, etc.)
 */
 async logTenantBlocked(
 userId: string,
 metadata: {
 organizationId: string;
 organizationName: string;
 ip?: string;
 userAgent?: string;
 route?: string;
 method?: string;
 },
 ): Promise<AuditLog> {
 const log = this.auditLogRepository.create({
 action: AuditAction.TENANT_BLOCKED,
 entityType: 'Organization',
 entityId: metadata.organizationId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: `Tenant access blocked: Organization ${metadata.organizationName} is suspended (MT-04 Kill Switch)`,
 changes: {
 metadata: {
 organizationId: metadata.organizationId,
 organizationName: metadata.organizationName,
 route: metadata.route,
 method: metadata.method,
 blockedAt: new Date().toISOString(),
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 this.logger.warn(
 `Tenant access BLOCKED: User ${userId} from suspended organization ${metadata.organizationName} attempted ${metadata.method || 'REQUEST'} ${metadata.route || 'UNKNOWN'}`,
 );

 return savedLog;
 }

 /**
 * Log password change (LGPD Art. 37 compliance + M8: Domain Management)
 * @param userId User ID who changed password
 * @param metadata Password change metadata (IP, userAgent, wasMandatory, wasReset)
 */
 async logPasswordChange(
 userId: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 wasMandatory?: boolean;
 wasReset?: boolean;
 },
 ): Promise<AuditLog> {
 let description: string;
 if (metadata.wasReset) {
 description = 'Password reset via email link';
 } else if (metadata.wasMandatory) {
 description =
 'Mandatory password change on first login (M8: Domain Management)';
 } else {
 description =
 'User password change (LGPD Art. 37 - registro das operações)';
 }

 const log = this.auditLogRepository.create({
 action: AuditAction.PASSWORD_CHANGE,
 entityType: 'User',
 entityId: userId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description,
 changes: {
 metadata: {
 changedAt: new Date().toISOString(),
 wasMandatory: metadata.wasMandatory || false,
 wasReset: metadata.wasReset || false,
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 let logMessage = `Password change logged: User ${userId}`;
 if (metadata.wasReset) {
 logMessage += ' (via reset link)';
 } else if (metadata.wasMandatory) {
 logMessage += ' (mandatory first login)';
 }
 this.logger.log(logMessage);

 return savedLog;
 }

 /**
 * Log password reset request (LGPD Art. 37 compliance)
 * @param userId User ID who requested password reset
 * @param metadata Request metadata (IP, userAgent, email)
 */
 async logPasswordResetRequest(
 userId: string,
 metadata: {
 ip?: string;
 userAgent?: string;
 email?: string;
 },
 ): Promise<AuditLog> {
 const log = this.auditLogRepository.create({
 action: AuditAction.PASSWORD_RESET_REQUEST,
 entityType: 'User',
 entityId: userId,
 userId,
 ipAddress: metadata.ip,
 userAgent: metadata.userAgent,
 description: 'Password reset requested via email',
 changes: {
 metadata: {
 email: metadata.email,
 requestedAt: new Date().toISOString(),
 },
 },
 });

 const savedLog = await this.auditLogRepository.save(log);

 this.logger.log(
 `Password reset request logged: User ${userId} (${metadata.email || 'N/A'})`,
 );

 return savedLog;
 }
}

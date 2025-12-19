import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { User, UserRole } from '../../entities/user.entity';
import {
 SecretAccessLog,
 SecretAccessStatus,
} from '../../entities/secret-access-log.entity';

describe('AuditController', () => {
 let controller: AuditController;
 let auditService: jest.Mocked<AuditService>;

 const mockAuditService = {
 getRecentAccess: jest.fn(),
 getAnomalyStatus: jest.fn(),
 getAccessLogs: jest.fn(),
 getAccessStats: jest.fn(),
 };

 const adminUser = {
 id: 'admin-uuid',
 email: 'admin@test.com',
 name: 'Admin User',
 role: UserRole.ADMIN,
 } as User;

 const regularUser = {
 id: 'user-uuid',
 email: 'user@test.com',
 name: 'Regular User',
 role: UserRole.USER,
 } as User;

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 controllers: [AuditController],
 providers: [
 {
 provide: AuditService,
 useValue: mockAuditService,
 },
 ],
 }).compile();

 controller = module.get<AuditController>(AuditController);
 auditService = module.get(AuditService);

 jest.clearAllMocks();
 });

 describe('getSecretAccessLogs', () => {
 it('should return logs for admin user', async () => {
 const logs = [
 {
 id: 1,
 secretName: 'JWT_SECRET',
 accessedBy: 'AuthService',
 status: SecretAccessStatus.SUCCESS,
 accessedAt: new Date(),
 },
 ] as SecretAccessLog[];

 mockAuditService.getRecentAccess.mockResolvedValue(logs);

 const result = await controller.getSecretAccessLogs(
 adminUser,
 'JWT_SECRET',
 50,
 );

 expect(mockAuditService.getRecentAccess).toHaveBeenCalledWith(
 'JWT_SECRET',
 50,
 );
 expect(result).toEqual(logs);
 });

 it('should throw ForbiddenException for non-admin user', async () => {
 await expect(
 controller.getSecretAccessLogs(regularUser, 'JWT_SECRET', 50),
 ).rejects.toThrow(ForbiddenException);

 expect(mockAuditService.getRecentAccess).not.toHaveBeenCalled();
 });
 });

 describe('checkAnomalies', () => {
 it('should return anomaly status for admin user', async () => {
 const anomalyStatus = {
 secretName: 'JWT_SECRET',
 anomalous: false,
 accessCount: 50,
 threshold: 100,
 windowSeconds: 60,
 };

 mockAuditService.getAnomalyStatus.mockResolvedValue(anomalyStatus);

 const result = await controller.checkAnomalies(
 adminUser,
 'JWT_SECRET',
 100,
 60,
 );

 expect(mockAuditService.getAnomalyStatus).toHaveBeenCalledWith(
 'JWT_SECRET',
 100,
 60000, // seconds converted to ms
 );
 expect(result).toEqual(anomalyStatus);
 });

 it('should throw ForbiddenException for non-admin user', async () => {
 await expect(
 controller.checkAnomalies(regularUser, 'JWT_SECRET', 100, 60),
 ).rejects.toThrow(ForbiddenException);
 });
 });

 describe('getAllAccessLogs', () => {
 it('should return all logs with filters for admin user', async () => {
 const result = {
 logs: [
 {
 id: 1,
 secretName: 'JWT_SECRET',
 accessedBy: 'AuthService',
 status: SecretAccessStatus.SUCCESS,
 accessedAt: new Date(),
 },
 ] as SecretAccessLog[],
 total: 1,
 };

 mockAuditService.getAccessLogs.mockResolvedValue(result);

 const response = await controller.getAllAccessLogs(
 adminUser,
 'JWT_SECRET',
 SecretAccessStatus.SUCCESS,
 50,
 0,
 );

 expect(mockAuditService.getAccessLogs).toHaveBeenCalledWith({
 secretName: 'JWT_SECRET',
 status: SecretAccessStatus.SUCCESS,
 limit: 50,
 offset: 0,
 });
 expect(response).toEqual(result);
 });

 it('should throw ForbiddenException for non-admin user', async () => {
 await expect(controller.getAllAccessLogs(regularUser)).rejects.toThrow(
 ForbiddenException,
 );
 });
 });

 describe('getAccessStats', () => {
 it('should return stats for admin user', async () => {
 const stats = {
 totalAccesses: 100,
 successCount: 95,
 failedCount: 5,
 unauthorizedCount: 0,
 uniqueSecrets: 5,
 };

 mockAuditService.getAccessStats.mockResolvedValue(stats);

 const result = await controller.getAccessStats(adminUser);

 expect(mockAuditService.getAccessStats).toHaveBeenCalledWith(undefined);
 expect(result).toEqual(stats);
 });

 it('should filter stats by secret name', async () => {
 const stats = {
 totalAccesses: 50,
 successCount: 48,
 failedCount: 2,
 unauthorizedCount: 0,
 };

 mockAuditService.getAccessStats.mockResolvedValue(stats);

 const result = await controller.getAccessStats(adminUser, 'JWT_SECRET');

 expect(mockAuditService.getAccessStats).toHaveBeenCalledWith(
 'JWT_SECRET',
 );
 expect(result).toEqual(stats);
 });

 it('should throw ForbiddenException for non-admin user', async () => {
 await expect(controller.getAccessStats(regularUser)).rejects.toThrow(
 ForbiddenException,
 );
 });
 });
});

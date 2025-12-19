import {
 ExecutionContext,
 ForbiddenException,
 NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourceOwnershipGuard } from './resource-ownership.guard';
import { ResourceType } from '../decorators/require-ownership.decorator';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';

describe('ResourceOwnershipGuard', () => {
 let guard: ResourceOwnershipGuard;
 let reflector: Reflector;

 const mockEtpRepository = {
 findOne: jest.fn(),
 };

 const mockSectionRepository = {
 findOne: jest.fn(),
 };

 const mockReflector = {
 getAllAndOverride: jest.fn(),
 };

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 providers: [
 ResourceOwnershipGuard,
 {
 provide: Reflector,
 useValue: mockReflector,
 },
 {
 provide: getRepositoryToken(Etp),
 useValue: mockEtpRepository,
 },
 {
 provide: getRepositoryToken(EtpSection),
 useValue: mockSectionRepository,
 },
 ],
 }).compile();

 guard = module.get<ResourceOwnershipGuard>(ResourceOwnershipGuard);
 reflector = module.get<Reflector>(Reflector);

 jest.clearAllMocks();
 });

 const createMockExecutionContext = (
 params: Record<string, string>,
 user: { id: string; organizationId: string } | null,
 ): ExecutionContext => {
 const request: {
 params: Record<string, string>;
 user: { id: string; organizationId: string } | null;
 resource?: Etp | EtpSection;
 } = {
 params,
 user,
 };

 return {
 switchToHttp: () => ({
 getRequest: () => request,
 }),
 getHandler: jest.fn(),
 getClass: jest.fn(),
 } as unknown as ExecutionContext;
 };

 const createMockEtp = (
 id: string,
 organizationId: string,
 createdById: string,
 ): Etp =>
 ({
 id,
 organizationId,
 createdById,
 objeto: 'Test ETP',
 status: EtpStatus.DRAFT,
 createdBy: { id: createdById },
 }) as Etp;

 const createMockSection = (
 id: string,
 etpOrganizationId: string,
 etpCreatedById: string,
 ): EtpSection =>
 ({
 id,
 etp: {
 id: 'etp-id',
 organizationId: etpOrganizationId,
 createdById: etpCreatedById,
 createdBy: { id: etpCreatedById },
 },
 }) as EtpSection;

 describe('No @RequireOwnership decorator', () => {
 it('should allow access when no decorator is present', async () => {
 mockReflector.getAllAndOverride.mockReturnValue(null);
 const context = createMockExecutionContext({ id: 'etp-1' }, null);

 const result = await guard.canActivate(context);

 expect(result).toBe(true);
 });
 });

 describe('No User (Unauthenticated)', () => {
 it('should allow access when no user (let JwtAuthGuard handle)', async () => {
 mockReflector.getAllAndOverride.mockReturnValue({
 resourceType: ResourceType.ETP,
 idParam: 'id',
 validateOwnership: true,
 });
 const context = createMockExecutionContext({ id: 'etp-1' }, null);

 const result = await guard.canActivate(context);

 expect(result).toBe(true);
 });
 });

 describe('ETP Resource', () => {
 beforeEach(() => {
 mockReflector.getAllAndOverride.mockReturnValue({
 resourceType: ResourceType.ETP,
 idParam: 'id',
 validateOwnership: true,
 });
 });

 it('should allow access when user owns ETP in same organization', async () => {
 const etp = createMockEtp('etp-1', 'org-1', 'user-1');
 mockEtpRepository.findOne.mockResolvedValue(etp);

 const context = createMockExecutionContext(
 { id: 'etp-1' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 const result = await guard.canActivate(context);

 expect(result).toBe(true);
 expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
 where: { id: 'etp-1' },
 relations: ['createdBy'],
 });

 // Verify resource is injected into request
 const request = context.switchToHttp().getRequest();
 expect(request.resource).toEqual(etp);
 });

 it('should throw NotFoundException when ETP does not exist', async () => {
 mockEtpRepository.findOne.mockResolvedValue(null);

 const context = createMockExecutionContext(
 { id: 'non-existent' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 await expect(guard.canActivate(context)).rejects.toThrow(
 NotFoundException,
 );
 await expect(guard.canActivate(context)).rejects.toThrow(
 'ETP com ID non-existent não encontrado',
 );
 });

 it('should throw ForbiddenException when ETP belongs to different organization (IDOR)', async () => {
 const etp = createMockEtp('etp-1', 'other-org', 'user-1');
 mockEtpRepository.findOne.mockResolvedValue(etp);

 const context = createMockExecutionContext(
 { id: 'etp-1' },
 { id: 'user-1', organizationId: 'my-org' },
 );

 await expect(guard.canActivate(context)).rejects.toThrow(
 ForbiddenException,
 );
 await expect(guard.canActivate(context)).rejects.toThrow(
 'Você não tem permissão para acessar este ETP',
 );
 });

 it('should throw ForbiddenException when user does not own ETP', async () => {
 const etp = createMockEtp('etp-1', 'org-1', 'other-user');
 mockEtpRepository.findOne.mockResolvedValue(etp);

 const context = createMockExecutionContext(
 { id: 'etp-1' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 await expect(guard.canActivate(context)).rejects.toThrow(
 ForbiddenException,
 );
 await expect(guard.canActivate(context)).rejects.toThrow(
 'Você não tem permissão para acessar este ETP',
 );
 });

 it('should allow access without ownership check when validateOwnership is false', async () => {
 mockReflector.getAllAndOverride.mockReturnValue({
 resourceType: ResourceType.ETP,
 idParam: 'id',
 validateOwnership: false, // Only check organization
 });

 const etp = createMockEtp('etp-1', 'org-1', 'other-user');
 mockEtpRepository.findOne.mockResolvedValue(etp);

 const context = createMockExecutionContext(
 { id: 'etp-1' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 const result = await guard.canActivate(context);

 expect(result).toBe(true);
 });
 });

 describe('Section Resource', () => {
 beforeEach(() => {
 mockReflector.getAllAndOverride.mockReturnValue({
 resourceType: ResourceType.SECTION,
 idParam: 'id',
 validateOwnership: true,
 });
 });

 it('should allow access when user owns parent ETP', async () => {
 const section = createMockSection('section-1', 'org-1', 'user-1');
 mockSectionRepository.findOne.mockResolvedValue(section);

 const context = createMockExecutionContext(
 { id: 'section-1' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 const result = await guard.canActivate(context);

 expect(result).toBe(true);
 expect(mockSectionRepository.findOne).toHaveBeenCalledWith({
 where: { id: 'section-1' },
 relations: ['etp', 'etp.createdBy'],
 });
 });

 it('should throw NotFoundException when Section does not exist', async () => {
 mockSectionRepository.findOne.mockResolvedValue(null);

 const context = createMockExecutionContext(
 { id: 'non-existent' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 await expect(guard.canActivate(context)).rejects.toThrow(
 NotFoundException,
 );
 await expect(guard.canActivate(context)).rejects.toThrow(
 'Seção com ID non-existent não encontrada',
 );
 });

 it('should throw ForbiddenException when Section parent ETP belongs to different organization', async () => {
 const section = createMockSection('section-1', 'other-org', 'user-1');
 mockSectionRepository.findOne.mockResolvedValue(section);

 const context = createMockExecutionContext(
 { id: 'section-1' },
 { id: 'user-1', organizationId: 'my-org' },
 );

 await expect(guard.canActivate(context)).rejects.toThrow(
 ForbiddenException,
 );
 await expect(guard.canActivate(context)).rejects.toThrow(
 'Você não tem permissão para acessar esta seção',
 );
 });

 it('should throw ForbiddenException when user does not own parent ETP', async () => {
 const section = createMockSection('section-1', 'org-1', 'other-user');
 mockSectionRepository.findOne.mockResolvedValue(section);

 const context = createMockExecutionContext(
 { id: 'section-1' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 await expect(guard.canActivate(context)).rejects.toThrow(
 ForbiddenException,
 );
 await expect(guard.canActivate(context)).rejects.toThrow(
 'Você não tem permissão para acessar esta seção',
 );
 });
 });

 describe('Custom ID Parameter', () => {
 it('should use custom idParam from config', async () => {
 mockReflector.getAllAndOverride.mockReturnValue({
 resourceType: ResourceType.ETP,
 idParam: 'etpId', // Custom parameter name
 validateOwnership: true,
 });

 const etp = createMockEtp('etp-1', 'org-1', 'user-1');
 mockEtpRepository.findOne.mockResolvedValue(etp);

 const context = createMockExecutionContext(
 { etpId: 'etp-1' }, // Using custom param name
 { id: 'user-1', organizationId: 'org-1' },
 );

 const result = await guard.canActivate(context);

 expect(result).toBe(true);
 expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
 where: { id: 'etp-1' },
 relations: ['createdBy'],
 });
 });

 it('should throw NotFoundException when custom idParam is missing', async () => {
 mockReflector.getAllAndOverride.mockReturnValue({
 resourceType: ResourceType.ETP,
 idParam: 'etpId',
 validateOwnership: true,
 });

 const context = createMockExecutionContext(
 { id: 'etp-1' }, // Wrong param name
 { id: 'user-1', organizationId: 'org-1' },
 );

 await expect(guard.canActivate(context)).rejects.toThrow(
 NotFoundException,
 );
 await expect(guard.canActivate(context)).rejects.toThrow(
 "Resource ID not provided in parameter 'etpId'",
 );
 });
 });

 describe('Default Values', () => {
 it('should use default idParam when not specified', async () => {
 mockReflector.getAllAndOverride.mockReturnValue({
 resourceType: ResourceType.ETP,
 // idParam not specified, should default to 'id'
 validateOwnership: true,
 });

 const etp = createMockEtp('etp-1', 'org-1', 'user-1');
 mockEtpRepository.findOne.mockResolvedValue(etp);

 const context = createMockExecutionContext(
 { id: 'etp-1' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 const result = await guard.canActivate(context);

 expect(result).toBe(true);
 });

 it('should validate ownership by default when not specified', async () => {
 mockReflector.getAllAndOverride.mockReturnValue({
 resourceType: ResourceType.ETP,
 idParam: 'id',
 // validateOwnership not specified, should default to true
 });

 const etp = createMockEtp('etp-1', 'org-1', 'other-user');
 mockEtpRepository.findOne.mockResolvedValue(etp);

 const context = createMockExecutionContext(
 { id: 'etp-1' },
 { id: 'user-1', organizationId: 'org-1' },
 );

 // Should fail because ownership is validated by default
 await expect(guard.canActivate(context)).rejects.toThrow(
 ForbiddenException,
 );
 });
 });
});

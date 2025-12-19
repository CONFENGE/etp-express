import { Test, TestingModule } from '@nestjs/testing';
import { DomainManagerController } from '../domain-manager.controller';
import { DomainManagerService, QuotaInfo } from '../domain-manager.service';
import { User, UserRole } from '../../../entities/user.entity';
import { CreateDomainUserDto } from '../dto/create-domain-user.dto';
import { UpdateDomainUserDto } from '../dto/update-domain-user.dto';

describe('DomainManagerController', () => {
 let controller: DomainManagerController;
 let service: DomainManagerService;

 const mockUser: Partial<User> = {
 id: 'manager-uuid-001',
 email: 'gestor@lages.sc.gov.br',
 name: 'Gestor Local',
 role: UserRole.DOMAIN_MANAGER,
 authorizedDomainId: 'domain-uuid-001',
 };

 const mockDomainUser = {
 id: 'user-uuid-001',
 email: 'joao@lages.sc.gov.br',
 name: 'Joao Silva',
 cargo: 'Tecnico',
 isActive: true,
 mustChangePassword: true,
 createdAt: new Date('2024-01-01'),
 lastLoginAt: null,
 };

 const mockQuotaInfo: QuotaInfo = {
 currentUsers: 7,
 maxUsers: 10,
 available: 3,
 percentUsed: 70,
 };

 const mockService = {
 findAllUsers: jest.fn(),
 createUser: jest.fn(),
 updateUser: jest.fn(),
 deactivateUser: jest.fn(),
 getQuota: jest.fn(),
 resetUserPassword: jest.fn(),
 };

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 controllers: [DomainManagerController],
 providers: [
 {
 provide: DomainManagerService,
 useValue: mockService,
 },
 ],
 }).compile();

 controller = module.get<DomainManagerController>(DomainManagerController);
 service = module.get<DomainManagerService>(DomainManagerService);

 jest.clearAllMocks();
 });

 it('should be defined', () => {
 expect(controller).toBeDefined();
 });

 describe('findAllUsers', () => {
 it('should return all users in domain', async () => {
 mockService.findAllUsers.mockResolvedValue([mockDomainUser]);

 const result = await controller.findAllUsers(mockUser as User);

 expect(mockService.findAllUsers).toHaveBeenCalledWith(mockUser.id);
 expect(result).toHaveLength(1);
 expect(result[0].email).toBe('joao@lages.sc.gov.br');
 });
 });

 describe('createUser', () => {
 const createUserDto: CreateDomainUserDto = {
 email: 'maria@lages.sc.gov.br',
 name: 'Maria Santos',
 cargo: 'Analista',
 };

 it('should create a new user', async () => {
 mockService.createUser.mockResolvedValue({
 ...mockDomainUser,
 email: 'maria@lages.sc.gov.br',
 name: 'Maria Santos',
 });

 const result = await controller.createUser(
 mockUser as User,
 createUserDto,
 );

 expect(mockService.createUser).toHaveBeenCalledWith(
 mockUser.id,
 createUserDto,
 );
 expect(result.email).toBe('maria@lages.sc.gov.br');
 });
 });

 describe('updateUser', () => {
 const updateUserDto: UpdateDomainUserDto = {
 name: 'Joao Silva Junior',
 };

 it('should update a user', async () => {
 mockService.updateUser.mockResolvedValue({
 ...mockDomainUser,
 name: 'Joao Silva Junior',
 });

 const result = await controller.updateUser(
 mockUser as User,
 'user-uuid-001',
 updateUserDto,
 );

 expect(mockService.updateUser).toHaveBeenCalledWith(
 mockUser.id,
 'user-uuid-001',
 updateUserDto,
 );
 expect(result.name).toBe('Joao Silva Junior');
 });
 });

 describe('deactivateUser', () => {
 it('should deactivate a user', async () => {
 mockService.deactivateUser.mockResolvedValue(undefined);

 const result = await controller.deactivateUser(
 mockUser as User,
 'user-uuid-001',
 );

 expect(mockService.deactivateUser).toHaveBeenCalledWith(
 mockUser.id,
 'user-uuid-001',
 );
 expect(result.message).toBe('User deactivated successfully');
 });
 });

 describe('getQuota', () => {
 it('should return quota information', async () => {
 mockService.getQuota.mockResolvedValue(mockQuotaInfo);

 const result = await controller.getQuota(mockUser as User);

 expect(mockService.getQuota).toHaveBeenCalledWith(mockUser.id);
 expect(result.currentUsers).toBe(7);
 expect(result.maxUsers).toBe(10);
 expect(result.available).toBe(3);
 });
 });

 describe('resetUserPassword', () => {
 it('should reset user password', async () => {
 mockService.resetUserPassword.mockResolvedValue(undefined);

 const result = await controller.resetUserPassword(
 mockUser as User,
 'user-uuid-001',
 );

 expect(mockService.resetUserPassword).toHaveBeenCalledWith(
 mockUser.id,
 'user-uuid-001',
 );
 expect(result.message).toContain('Password reset successfully');
 });
 });
});

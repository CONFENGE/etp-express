import { Test, TestingModule } from '@nestjs/testing';
import {
 NotFoundException,
 ConflictException,
 BadRequestException,
} from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

describe('OrganizationsController', () => {
 let controller: OrganizationsController;
 let service: OrganizationsService;

 const mockOrganizationId = 'org-123';

 const mockOrganization = {
 id: mockOrganizationId,
 name: 'Prefeitura de Lages',
 cnpj: '12.345.678/0001-90',
 domainWhitelist: ['lages.sc.gov.br', 'camaralages.sc.gov.br'],
 isActive: true,
 stripeCustomerId: 'cus_test123',
 createdAt: new Date(),
 updatedAt: new Date(),
 // users and etps relations will be added in MT-02 (#355) and MT-05 (#358)
 };

 const mockOrganizationsService = {
 create: jest.fn(),
 findAll: jest.fn(),
 findOne: jest.fn(),
 update: jest.fn(),
 remove: jest.fn(),
 suspend: jest.fn(),
 reactivate: jest.fn(),
 };

 beforeEach(async () => {
 const module: TestingModule = await Test.createTestingModule({
 controllers: [OrganizationsController],
 providers: [
 {
 provide: OrganizationsService,
 useValue: mockOrganizationsService,
 },
 ],
 })
 .overrideGuard(JwtAuthGuard)
 .useValue({ canActivate: jest.fn(() => true) })
 .compile();

 controller = module.get<OrganizationsController>(OrganizationsController);
 service = module.get<OrganizationsService>(OrganizationsService);

 // Reset mocks before each test
 jest.clearAllMocks();
 });

 it('should be defined', () => {
 expect(controller).toBeDefined();
 });

 describe('create', () => {
 const createOrganizationDto: CreateOrganizationDto = {
 name: 'Prefeitura de Lages',
 cnpj: '12.345.678/0001-90',
 domainWhitelist: ['lages.sc.gov.br', 'camaralages.sc.gov.br'],
 stripeCustomerId: 'cus_test123',
 };

 it('should create a new organization', async () => {
 // Arrange
 mockOrganizationsService.create.mockResolvedValue(mockOrganization);

 // Act
 const result = await controller.create(createOrganizationDto);

 // Assert
 expect(service.create).toHaveBeenCalledWith(createOrganizationDto);
 expect(service.create).toHaveBeenCalledTimes(1);
 expect(result).toEqual(mockOrganization);
 expect(result.cnpj).toBe(createOrganizationDto.cnpj);
 });

 it('should throw ConflictException when CNPJ already exists', async () => {
 // Arrange
 mockOrganizationsService.create.mockRejectedValue(
 new ConflictException(
 'Organization with CNPJ 12.345.678/0001-90 already exists',
 ),
 );

 // Act & Assert
 await expect(controller.create(createOrganizationDto)).rejects.toThrow(
 ConflictException,
 );
 await expect(controller.create(createOrganizationDto)).rejects.toThrow(
 'Organization with CNPJ 12.345.678/0001-90 already exists',
 );
 });

 it('should throw BadRequestException when CNPJ format is invalid', async () => {
 // Arrange
 const invalidDto = { ...createOrganizationDto, cnpj: 'invalid-cnpj' };
 mockOrganizationsService.create.mockRejectedValue(
 new BadRequestException('CNPJ must be in format XX.XXX.XXX/XXXX-XX'),
 );

 // Act & Assert
 await expect(controller.create(invalidDto)).rejects.toThrow(
 BadRequestException,
 );
 });
 });

 describe('findAll', () => {
 it('should return an array of organizations', async () => {
 // Arrange
 const organizations = [mockOrganization];
 mockOrganizationsService.findAll.mockResolvedValue(organizations);

 // Act
 const result = await controller.findAll();

 // Assert
 expect(service.findAll).toHaveBeenCalled();
 expect(result).toEqual(organizations);
 expect(result).toHaveLength(1);
 });

 it('should return empty array when no organizations exist', async () => {
 // Arrange
 mockOrganizationsService.findAll.mockResolvedValue([]);

 // Act
 const result = await controller.findAll();

 // Assert
 expect(result).toEqual([]);
 expect(result).toHaveLength(0);
 });
 });

 describe('findOne', () => {
 it('should return a single organization by ID', async () => {
 // Arrange
 mockOrganizationsService.findOne.mockResolvedValue(mockOrganization);

 // Act
 const result = await controller.findOne(mockOrganizationId);

 // Assert
 expect(service.findOne).toHaveBeenCalledWith(mockOrganizationId);
 expect(result).toEqual(mockOrganization);
 });

 it('should throw NotFoundException when organization not found', async () => {
 // Arrange
 mockOrganizationsService.findOne.mockRejectedValue(
 new NotFoundException('Organization with ID non-existent-id not found'),
 );

 // Act & Assert
 await expect(controller.findOne('non-existent-id')).rejects.toThrow(
 NotFoundException,
 );
 await expect(controller.findOne('non-existent-id')).rejects.toThrow(
 'Organization with ID non-existent-id not found',
 );
 });
 });

 describe('update', () => {
 const updateOrganizationDto: UpdateOrganizationDto = {
 name: 'Prefeitura de Lages - Atualizada',
 };

 it('should update an organization', async () => {
 // Arrange
 const updatedOrganization = {
 ...mockOrganization,
 ...updateOrganizationDto,
 };
 mockOrganizationsService.update.mockResolvedValue(updatedOrganization);

 // Act
 const result = await controller.update(
 mockOrganizationId,
 updateOrganizationDto,
 );

 // Assert
 expect(service.update).toHaveBeenCalledWith(
 mockOrganizationId,
 updateOrganizationDto,
 );
 expect(result).toEqual(updatedOrganization);
 expect(result.name).toBe(updateOrganizationDto.name);
 });

 it('should throw NotFoundException when organization not found', async () => {
 // Arrange
 mockOrganizationsService.update.mockRejectedValue(
 new NotFoundException('Organization with ID non-existent-id not found'),
 );

 // Act & Assert
 await expect(
 controller.update('non-existent-id', updateOrganizationDto),
 ).rejects.toThrow(NotFoundException);
 });

 it('should throw ConflictException when updating to existing CNPJ', async () => {
 // Arrange
 const updateDto = { cnpj: '98.765.432/0001-10' };
 mockOrganizationsService.update.mockRejectedValue(
 new ConflictException(
 'Organization with CNPJ 98.765.432/0001-10 already exists',
 ),
 );

 // Act & Assert
 await expect(
 controller.update(mockOrganizationId, updateDto),
 ).rejects.toThrow(ConflictException);
 });
 });

 describe('remove', () => {
 it('should delete an organization', async () => {
 // Arrange
 mockOrganizationsService.remove.mockResolvedValue(undefined);

 // Act
 const result = await controller.remove(mockOrganizationId);

 // Assert
 expect(service.remove).toHaveBeenCalledWith(mockOrganizationId);
 expect(result).toEqual({ message: 'Organization deleted successfully' });
 });

 it('should throw NotFoundException when organization not found', async () => {
 // Arrange
 mockOrganizationsService.remove.mockRejectedValue(
 new NotFoundException('Organization with ID non-existent-id not found'),
 );

 // Act & Assert
 await expect(controller.remove('non-existent-id')).rejects.toThrow(
 NotFoundException,
 );
 });

 it('should throw BadRequestException when organization has associated users', async () => {
 // Arrange
 mockOrganizationsService.remove.mockRejectedValue(
 new BadRequestException(
 'Cannot delete organization with associated users',
 ),
 );

 // Act & Assert
 await expect(controller.remove(mockOrganizationId)).rejects.toThrow(
 BadRequestException,
 );
 });
 });

 describe('suspend', () => {
 it('should suspend an organization', async () => {
 // Arrange
 const suspendedOrganization = { ...mockOrganization, isActive: false };
 mockOrganizationsService.suspend.mockResolvedValue(suspendedOrganization);

 // Act
 const result = await controller.suspend(mockOrganizationId);

 // Assert
 expect(service.suspend).toHaveBeenCalledWith(mockOrganizationId);
 expect(result).toEqual(suspendedOrganization);
 expect(result.isActive).toBe(false);
 });

 it('should throw NotFoundException when organization not found', async () => {
 // Arrange
 mockOrganizationsService.suspend.mockRejectedValue(
 new NotFoundException('Organization with ID non-existent-id not found'),
 );

 // Act & Assert
 await expect(controller.suspend('non-existent-id')).rejects.toThrow(
 NotFoundException,
 );
 });

 it('should throw BadRequestException when organization is already suspended', async () => {
 // Arrange
 mockOrganizationsService.suspend.mockRejectedValue(
 new BadRequestException(
 'Organization Prefeitura de Lages is already suspended',
 ),
 );

 // Act & Assert
 await expect(controller.suspend(mockOrganizationId)).rejects.toThrow(
 BadRequestException,
 );
 });
 });

 describe('reactivate', () => {
 it('should reactivate a suspended organization', async () => {
 // Arrange
 const reactivatedOrganization = { ...mockOrganization, isActive: true };
 mockOrganizationsService.reactivate.mockResolvedValue(
 reactivatedOrganization,
 );

 // Act
 const result = await controller.reactivate(mockOrganizationId);

 // Assert
 expect(service.reactivate).toHaveBeenCalledWith(mockOrganizationId);
 expect(result).toEqual(reactivatedOrganization);
 expect(result.isActive).toBe(true);
 });

 it('should throw NotFoundException when organization not found', async () => {
 // Arrange
 mockOrganizationsService.reactivate.mockRejectedValue(
 new NotFoundException('Organization with ID non-existent-id not found'),
 );

 // Act & Assert
 await expect(controller.reactivate('non-existent-id')).rejects.toThrow(
 NotFoundException,
 );
 });

 it('should throw BadRequestException when organization is already active', async () => {
 // Arrange
 mockOrganizationsService.reactivate.mockRejectedValue(
 new BadRequestException(
 'Organization Prefeitura de Lages is already active',
 ),
 );

 // Act & Assert
 await expect(controller.reactivate(mockOrganizationId)).rejects.toThrow(
 BadRequestException,
 );
 });
 });
});

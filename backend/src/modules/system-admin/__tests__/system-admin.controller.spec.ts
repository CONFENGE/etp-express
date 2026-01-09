import { Test, TestingModule } from '@nestjs/testing';
import { SystemAdminController } from '../system-admin.controller';
import { SystemAdminService, GlobalStatistics } from '../system-admin.service';
import { AuthorizedDomain } from '../../../entities/authorized-domain.entity';
import { CreateDomainDto } from '../dto/create-domain.dto';
import { UpdateDomainDto } from '../dto/update-domain.dto';
import { AssignManagerDto } from '../dto/assign-manager.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../guards/system-admin.guard';

describe('SystemAdminController', () => {
  let controller: SystemAdminController;
  let service: SystemAdminService;

  const mockDomain: AuthorizedDomain = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    domain: 'lages.sc.gov.br',
    institutionName: 'Prefeitura de Lages',
    isActive: true,
    maxUsers: 10,
    domainManagerId: null,
    domainManager: null,
    organizationId: null,
    organization: null,
    users: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockStatistics: GlobalStatistics = {
    totalDomains: 10,
    activeDomains: 8,
    inactiveDomains: 2,
    totalUsers: 150,
    totalOrganizations: 5,
    totalEtps: 500,
    domainsByOrganization: [
      { organizationName: 'Prefeitura de Lages', domainCount: 3 },
    ],
  };

  const mockSystemAdminService = {
    createDomain: jest.fn(),
    findAllDomains: jest.fn(),
    findOneDomain: jest.fn(),
    updateDomain: jest.fn(),
    removeDomain: jest.fn(),
    assignManager: jest.fn(),
    suspendDomain: jest.fn(),
    reactivateDomain: jest.fn(),
    getStatistics: jest.fn(),
    cleanupTestDomains: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemAdminController],
      providers: [
        {
          provide: SystemAdminService,
          useValue: mockSystemAdminService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SystemAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SystemAdminController>(SystemAdminController);
    service = module.get<SystemAdminService>(SystemAdminService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createDomain', () => {
    it('should create a new domain', async () => {
      const createDomainDto: CreateDomainDto = {
        domain: 'lages.sc.gov.br',
        institutionName: 'Prefeitura de Lages',
        maxUsers: 10,
      };

      mockSystemAdminService.createDomain.mockResolvedValue(mockDomain);

      const result = await controller.createDomain(createDomainDto);

      expect(service.createDomain).toHaveBeenCalledWith(createDomainDto);
      expect(result).toEqual(mockDomain);
    });
  });

  describe('findAllDomains', () => {
    it('should return all domains', async () => {
      const domains = [mockDomain];
      mockSystemAdminService.findAllDomains.mockResolvedValue(domains);

      const result = await controller.findAllDomains();

      expect(service.findAllDomains).toHaveBeenCalled();
      expect(result).toEqual(domains);
    });
  });

  describe('findOneDomain', () => {
    it('should return a domain by ID', async () => {
      mockSystemAdminService.findOneDomain.mockResolvedValue(mockDomain);

      const result = await controller.findOneDomain(mockDomain.id);

      expect(service.findOneDomain).toHaveBeenCalledWith(mockDomain.id);
      expect(result).toEqual(mockDomain);
    });
  });

  describe('updateDomain', () => {
    it('should update a domain', async () => {
      const updateDomainDto: UpdateDomainDto = {
        institutionName: 'Prefeitura Municipal de Lages',
      };

      const updatedDomain = {
        ...mockDomain,
        institutionName: 'Prefeitura Municipal de Lages',
      };

      mockSystemAdminService.updateDomain.mockResolvedValue(updatedDomain);

      const result = await controller.updateDomain(
        mockDomain.id,
        updateDomainDto,
      );

      expect(service.updateDomain).toHaveBeenCalledWith(
        mockDomain.id,
        updateDomainDto,
      );
      expect(result.institutionName).toBe('Prefeitura Municipal de Lages');
    });
  });

  describe('removeDomain', () => {
    it('should delete a domain and return success message', async () => {
      mockSystemAdminService.removeDomain.mockResolvedValue(undefined);

      const result = await controller.removeDomain(mockDomain.id);

      expect(service.removeDomain).toHaveBeenCalledWith(mockDomain.id);
      expect(result).toEqual({ message: 'Domain deleted successfully' });
    });
  });

  describe('assignManager', () => {
    it('should assign a manager to a domain', async () => {
      const assignManagerDto: AssignManagerDto = {
        userId: 'user-uuid-001',
      };

      const domainWithManager = {
        ...mockDomain,
        domainManagerId: 'user-uuid-001',
      };

      mockSystemAdminService.assignManager.mockResolvedValue(domainWithManager);

      const result = await controller.assignManager(
        mockDomain.id,
        assignManagerDto,
      );

      expect(service.assignManager).toHaveBeenCalledWith(
        mockDomain.id,
        assignManagerDto,
      );
      expect(result.domainManagerId).toBe('user-uuid-001');
    });
  });

  describe('suspendDomain', () => {
    it('should suspend a domain', async () => {
      const suspendedDomain = { ...mockDomain, isActive: false };
      mockSystemAdminService.suspendDomain.mockResolvedValue(suspendedDomain);

      const result = await controller.suspendDomain(mockDomain.id);

      expect(service.suspendDomain).toHaveBeenCalledWith(mockDomain.id);
      expect(result.isActive).toBe(false);
    });
  });

  describe('reactivateDomain', () => {
    it('should reactivate a domain', async () => {
      const reactivatedDomain = { ...mockDomain, isActive: true };
      mockSystemAdminService.reactivateDomain.mockResolvedValue(
        reactivatedDomain,
      );

      const result = await controller.reactivateDomain(mockDomain.id);

      expect(service.reactivateDomain).toHaveBeenCalledWith(mockDomain.id);
      expect(result.isActive).toBe(true);
    });
  });

  describe('getStatistics', () => {
    it('should return global statistics', async () => {
      mockSystemAdminService.getStatistics.mockResolvedValue(mockStatistics);

      const result = await controller.getStatistics();

      expect(service.getStatistics).toHaveBeenCalled();
      expect(result).toEqual(mockStatistics);
      expect(result.totalDomains).toBe(10);
      expect(result.activeDomains).toBe(8);
      expect(result.inactiveDomains).toBe(2);
    });
  });

  describe('cleanupTestDomains', () => {
    it('should cleanup E2E test domains and return count', async () => {
      mockSystemAdminService.cleanupTestDomains.mockResolvedValue({
        deleted: 15,
      });

      const result = await controller.cleanupTestDomains();

      expect(service.cleanupTestDomains).toHaveBeenCalled();
      expect(result).toEqual({ deleted: 15 });
    });

    it('should return 0 deleted when no test domains exist', async () => {
      mockSystemAdminService.cleanupTestDomains.mockResolvedValue({
        deleted: 0,
      });

      const result = await controller.cleanupTestDomains();

      expect(service.cleanupTestDomains).toHaveBeenCalled();
      expect(result).toEqual({ deleted: 0 });
    });
  });
});

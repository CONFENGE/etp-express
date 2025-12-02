import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization } from '../../entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let repository: Repository<Organization>;

  const mockOrganization: Organization = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Prefeitura de Lages',
    cnpj: '12.345.678/0001-90',
    domainWhitelist: ['lages.sc.gov.br', 'camaralages.sc.gov.br'],
    isActive: true,
    stripeCustomerId: 'cus_test123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    users: [], // MT-02 (#355)
    // etps relation will be added in MT-05 (#358)
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    repository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a new organization', async () => {
      const createOrganizationDto: CreateOrganizationDto = {
        name: 'Prefeitura de Lages',
        cnpj: '12.345.678/0001-90',
        domainWhitelist: ['lages.sc.gov.br', 'camaralages.sc.gov.br'],
        stripeCustomerId: 'cus_test123',
      };

      mockRepository.findOne.mockResolvedValue(null); // No existing org with this CNPJ
      mockRepository.create.mockReturnValue(mockOrganization);
      mockRepository.save.mockResolvedValue(mockOrganization);

      const result = await service.create(createOrganizationDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { cnpj: createOrganizationDto.cnpj },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createOrganizationDto,
        domainWhitelist: ['lages.sc.gov.br', 'camaralages.sc.gov.br'],
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockOrganization);
    });

    it('should normalize domain whitelist to lowercase', async () => {
      const createOrganizationDto: CreateOrganizationDto = {
        name: 'Prefeitura de Lages',
        cnpj: '12.345.678/0001-90',
        domainWhitelist: ['Lages.SC.GOV.BR', 'CamaraLages.SC.GOV.BR'],
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockOrganization);
      mockRepository.save.mockResolvedValue(mockOrganization);

      await service.create(createOrganizationDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createOrganizationDto,
        domainWhitelist: ['lages.sc.gov.br', 'camaralages.sc.gov.br'],
      });
    });

    it('should throw ConflictException if CNPJ already exists', async () => {
      const createOrganizationDto: CreateOrganizationDto = {
        name: 'Prefeitura de Lages',
        cnpj: '12.345.678/0001-90',
        domainWhitelist: ['lages.sc.gov.br'],
      };

      mockRepository.findOne.mockResolvedValue(mockOrganization); // Existing org with this CNPJ

      await expect(service.create(createOrganizationDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createOrganizationDto)).rejects.toThrow(
        `Organization with CNPJ ${createOrganizationDto.cnpj} already exists`,
      );
    });
  });

  describe('findAll', () => {
    it('should return all organizations ordered by creation date', async () => {
      const organizations = [mockOrganization];
      mockRepository.find.mockResolvedValue(organizations);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(organizations);
    });
  });

  describe('findOne', () => {
    it('should return an organization by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.findOne(mockOrganization.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Organization with ID non-existent-id not found',
      );
    });
  });

  describe('findByDomain', () => {
    it('should find organization by whitelisted domain', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockOrganization);

      const result = await service.findByDomain('lages.sc.gov.br');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
        'organization',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        ':domain = ANY(organization.domainWhitelist)',
        { domain: 'lages.sc.gov.br' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'organization.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toEqual(mockOrganization);
    });

    it('should normalize domain to lowercase before searching', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(mockOrganization);

      await service.findByDomain('LAGES.SC.GOV.BR');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        ':domain = ANY(organization.domainWhitelist)',
        { domain: 'lages.sc.gov.br' },
      );
    });

    it('should return null if domain not found', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.findByDomain('unknown.gov.br');

      expect(result).toBeNull();
    });

    it('should only return active organizations', async () => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await service.findByDomain('lages.sc.gov.br');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'organization.isActive = :isActive',
        { isActive: true },
      );
    });
  });

  describe('update', () => {
    it('should successfully update an organization', async () => {
      const updateOrganizationDto: UpdateOrganizationDto = {
        name: 'Prefeitura de Lages - Atualizada',
      };

      const updatedOrganization = {
        ...mockOrganization,
        ...updateOrganizationDto,
      };

      mockRepository.findOne.mockResolvedValue(mockOrganization);
      mockRepository.save.mockResolvedValue(updatedOrganization);

      const result = await service.update(
        mockOrganization.id,
        updateOrganizationDto,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateOrganizationDto),
      );
      expect(result).toEqual(updatedOrganization);
    });

    it('should normalize domain whitelist when updating', async () => {
      const updateOrganizationDto: UpdateOrganizationDto = {
        domainWhitelist: ['LAGES.SC.GOV.BR'],
      };

      mockRepository.findOne.mockResolvedValue(mockOrganization);
      mockRepository.save.mockResolvedValue(mockOrganization);

      await service.update(mockOrganization.id, updateOrganizationDto);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          domainWhitelist: ['lages.sc.gov.br'],
        }),
      );
    });

    it('should throw ConflictException if updating to existing CNPJ', async () => {
      const updateOrganizationDto: UpdateOrganizationDto = {
        cnpj: '98.765.432/0001-10',
      };

      const anotherOrganization = { ...mockOrganization, id: 'another-id' };

      // First findOne for finding the organization to update
      // Second findOne for checking CNPJ uniqueness
      mockRepository.findOne
        .mockResolvedValueOnce(mockOrganization)
        .mockResolvedValueOnce(anotherOrganization);

      await expect(
        service.update(mockOrganization.id, updateOrganizationDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.update(mockOrganization.id, updateOrganizationDto),
      ).rejects.toThrow(
        `Organization with CNPJ ${updateOrganizationDto.cnpj} already exists`,
      );
    });
  });

  describe('remove', () => {
    it('should successfully remove an organization', async () => {
      mockRepository.findOne.mockResolvedValue(mockOrganization);
      mockRepository.remove.mockResolvedValue(mockOrganization);

      await service.remove(mockOrganization.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockOrganization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('suspend', () => {
    it('should successfully suspend an active organization', async () => {
      const suspendedOrganization = {
        ...mockOrganization,
        isActive: false,
      };

      mockRepository.findOne.mockResolvedValue(mockOrganization);
      mockRepository.save.mockResolvedValue(suspendedOrganization);

      const result = await service.suspend(mockOrganization.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(result.isActive).toBe(false);
    });

    it('should throw BadRequestException if organization is already suspended', async () => {
      const suspendedOrganization = {
        ...mockOrganization,
        isActive: false,
      };

      mockRepository.findOne.mockResolvedValue(suspendedOrganization);

      await expect(service.suspend(mockOrganization.id)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.suspend(mockOrganization.id)).rejects.toThrow(
        `Organization ${mockOrganization.name} is already suspended`,
      );
    });
  });

  describe('reactivate', () => {
    it('should successfully reactivate a suspended organization', async () => {
      const suspendedOrganization = {
        ...mockOrganization,
        isActive: false,
      };

      const reactivatedOrganization = {
        ...mockOrganization,
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(suspendedOrganization);
      mockRepository.save.mockResolvedValue(reactivatedOrganization);

      const result = await service.reactivate(mockOrganization.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException if organization is already active', async () => {
      const activeOrganization = {
        ...mockOrganization,
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(activeOrganization);

      await expect(service.reactivate(mockOrganization.id)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrganization.id },
      });
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});

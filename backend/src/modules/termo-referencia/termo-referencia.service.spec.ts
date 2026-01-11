import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermoReferenciaService } from './termo-referencia.service';
import {
  TermoReferencia,
  TermoReferenciaStatus,
} from '../../entities/termo-referencia.entity';
import { Etp } from '../../entities/etp.entity';
import { CreateTermoReferenciaDto } from './dto/create-termo-referencia.dto';
import { UpdateTermoReferenciaDto } from './dto/update-termo-referencia.dto';

describe('TermoReferenciaService', () => {
  let service: TermoReferenciaService;
  let termoReferenciaRepository: Repository<TermoReferencia>;
  let etpRepository: Repository<Etp>;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockEtpId = 'etp-789';

  const mockEtp: Partial<Etp> = {
    id: mockEtpId,
    organizationId: mockOrganizationId,
    title: 'ETP de Teste',
    objeto: 'Objeto do ETP',
  };

  const mockTermoReferencia: Partial<TermoReferencia> = {
    id: 'tr-001',
    etpId: mockEtpId,
    organizationId: mockOrganizationId,
    objeto: 'Contratacao de servicos de TI',
    status: TermoReferenciaStatus.DRAFT,
    versao: 1,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTermoReferenciaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockEtpRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TermoReferenciaService,
        {
          provide: getRepositoryToken(TermoReferencia),
          useValue: mockTermoReferenciaRepository,
        },
        {
          provide: getRepositoryToken(Etp),
          useValue: mockEtpRepository,
        },
      ],
    }).compile();

    service = module.get<TermoReferenciaService>(TermoReferenciaService);
    termoReferenciaRepository = module.get<Repository<TermoReferencia>>(
      getRepositoryToken(TermoReferencia),
    );
    etpRepository = module.get<Repository<Etp>>(getRepositoryToken(Etp));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTermoReferenciaDto = {
      etpId: mockEtpId,
      objeto: 'Contratacao de servicos de TI',
      fundamentacaoLegal: 'Lei 14.133/2021',
    };

    it('should create a termo de referencia successfully', async () => {
      mockEtpRepository.findOne.mockResolvedValue(mockEtp);
      mockTermoReferenciaRepository.create.mockReturnValue(mockTermoReferencia);
      mockTermoReferenciaRepository.save.mockResolvedValue(mockTermoReferencia);

      const result = await service.create(
        createDto,
        mockUserId,
        mockOrganizationId,
      );

      expect(result).toEqual(mockTermoReferencia);
      expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEtpId },
      });
      expect(mockTermoReferenciaRepository.create).toHaveBeenCalledWith({
        ...createDto,
        organizationId: mockOrganizationId,
        createdById: mockUserId,
        status: TermoReferenciaStatus.DRAFT,
        versao: 1,
      });
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      mockEtpRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when ETP belongs to different organization', async () => {
      mockEtpRepository.findOne.mockResolvedValue({
        ...mockEtp,
        organizationId: 'other-org',
      });

      await expect(
        service.create(createDto, mockUserId, mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllByOrganization', () => {
    it('should return all TRs for an organization', async () => {
      const trs = [
        mockTermoReferencia,
        { ...mockTermoReferencia, id: 'tr-002' },
      ];
      mockTermoReferenciaRepository.find.mockResolvedValue(trs);

      const result = await service.findAllByOrganization(mockOrganizationId);

      expect(result).toEqual(trs);
      expect(mockTermoReferenciaRepository.find).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
        relations: ['etp', 'createdBy'],
        order: { updatedAt: 'DESC' },
      });
    });

    it('should return empty array when no TRs exist', async () => {
      mockTermoReferenciaRepository.find.mockResolvedValue([]);

      const result = await service.findAllByOrganization(mockOrganizationId);

      expect(result).toEqual([]);
    });
  });

  describe('findByEtp', () => {
    it('should return all TRs for a specific ETP', async () => {
      const trs = [mockTermoReferencia];
      mockTermoReferenciaRepository.find.mockResolvedValue(trs);

      const result = await service.findByEtp(mockEtpId, mockOrganizationId);

      expect(result).toEqual(trs);
      expect(mockTermoReferenciaRepository.find).toHaveBeenCalledWith({
        where: { etpId: mockEtpId, organizationId: mockOrganizationId },
        relations: ['createdBy'],
        order: { versao: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a TR by id', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(
        mockTermoReferencia,
      );

      const result = await service.findOne('tr-001', mockOrganizationId);

      expect(result).toEqual(mockTermoReferencia);
      expect(mockTermoReferenciaRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'tr-001' },
        relations: ['etp', 'createdBy', 'organization'],
      });
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when TR belongs to different organization', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue({
        ...mockTermoReferencia,
        organizationId: 'other-org',
      });

      await expect(
        service.findOne('tr-001', mockOrganizationId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTermoReferenciaDto = {
      objeto: 'Objeto atualizado',
      status: TermoReferenciaStatus.REVIEW,
    };

    it('should update a TR successfully', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(
        mockTermoReferencia,
      );
      mockTermoReferenciaRepository.save.mockResolvedValue({
        ...mockTermoReferencia,
        ...updateDto,
      });

      const result = await service.update(
        'tr-001',
        updateDto,
        mockOrganizationId,
      );

      expect(result.objeto).toBe(updateDto.objeto);
      expect(result.status).toBe(updateDto.status);
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', updateDto, mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a TR successfully', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(
        mockTermoReferencia,
      );
      mockTermoReferenciaRepository.remove.mockResolvedValue(undefined);

      await expect(
        service.remove('tr-001', mockOrganizationId),
      ).resolves.not.toThrow();

      expect(mockTermoReferenciaRepository.remove).toHaveBeenCalledWith(
        mockTermoReferencia,
      );
    });

    it('should throw NotFoundException when TR does not exist', async () => {
      mockTermoReferenciaRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

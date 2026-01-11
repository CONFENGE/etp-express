import { Test, TestingModule } from '@nestjs/testing';
import { TermoReferenciaController } from './termo-referencia.controller';
import { TermoReferenciaService } from './termo-referencia.service';
import {
  TermoReferencia,
  TermoReferenciaStatus,
} from '../../entities/termo-referencia.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateTermoReferenciaDto } from './dto/create-termo-referencia.dto';
import { UpdateTermoReferenciaDto } from './dto/update-termo-referencia.dto';
import { GenerateTrResponseDto } from './dto/generate-tr.dto';

describe('TermoReferenciaController', () => {
  let controller: TermoReferenciaController;
  let service: TermoReferenciaService;

  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';
  const mockEtpId = 'etp-789';

  const mockUser: Partial<User> = {
    id: mockUserId,
    organizationId: mockOrganizationId,
    email: 'user@test.com',
    role: UserRole.USER,
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

  const mockService = {
    create: jest.fn(),
    findAllByOrganization: jest.fn(),
    findByEtp: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    generateFromEtp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TermoReferenciaController],
      providers: [
        {
          provide: TermoReferenciaService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TermoReferenciaController>(
      TermoReferenciaController,
    );
    service = module.get<TermoReferenciaService>(TermoReferenciaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateTermoReferenciaDto = {
      etpId: mockEtpId,
      objeto: 'Contratacao de servicos de TI',
    };

    it('should create a termo de referencia', async () => {
      mockService.create.mockResolvedValue(mockTermoReferencia);

      const result = await controller.create(createDto, mockUser as User);

      expect(result).toEqual(mockTermoReferencia);
      expect(mockService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
        mockOrganizationId,
      );
    });
  });

  describe('findAll', () => {
    it('should return all TRs for the organization', async () => {
      const trs = [mockTermoReferencia];
      mockService.findAllByOrganization.mockResolvedValue(trs);

      const result = await controller.findAll(mockUser as User);

      expect(result).toEqual(trs);
      expect(mockService.findAllByOrganization).toHaveBeenCalledWith(
        mockOrganizationId,
      );
    });
  });

  describe('findByEtp', () => {
    it('should return TRs for a specific ETP', async () => {
      const trs = [mockTermoReferencia];
      mockService.findByEtp.mockResolvedValue(trs);

      const result = await controller.findByEtp(mockEtpId, mockUser as User);

      expect(result).toEqual(trs);
      expect(mockService.findByEtp).toHaveBeenCalledWith(
        mockEtpId,
        mockOrganizationId,
      );
    });
  });

  describe('findOne', () => {
    it('should return a TR by id', async () => {
      mockService.findOne.mockResolvedValue(mockTermoReferencia);

      const result = await controller.findOne('tr-001', mockUser as User);

      expect(result).toEqual(mockTermoReferencia);
      expect(mockService.findOne).toHaveBeenCalledWith(
        'tr-001',
        mockOrganizationId,
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateTermoReferenciaDto = {
      objeto: 'Objeto atualizado',
    };

    it('should update a TR', async () => {
      const updatedTr = { ...mockTermoReferencia, ...updateDto };
      mockService.update.mockResolvedValue(updatedTr);

      const result = await controller.update(
        'tr-001',
        updateDto,
        mockUser as User,
      );

      expect(result).toEqual(updatedTr);
      expect(mockService.update).toHaveBeenCalledWith(
        'tr-001',
        updateDto,
        mockOrganizationId,
      );
    });
  });

  describe('remove', () => {
    it('should remove a TR', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await expect(
        controller.remove('tr-001', mockUser as User),
      ).resolves.not.toThrow();

      expect(mockService.remove).toHaveBeenCalledWith(
        'tr-001',
        mockOrganizationId,
      );
    });
  });

  /**
   * Tests for generateFromEtp endpoint
   * Issue #1249 - [TR-b] Implementar geracao automatica TR a partir do ETP
   */
  describe('generateFromEtp', () => {
    const mockGeneratedTr: GenerateTrResponseDto = {
      id: 'tr-generated-001',
      etpId: mockEtpId,
      objeto: 'Objeto do ETP',
      fundamentacaoLegal: 'Lei 14.133/2021',
      status: TermoReferenciaStatus.DRAFT,
      versao: 1,
      createdAt: new Date(),
      metadata: {
        tokens: 500,
        model: 'gpt-4.1-nano',
        latencyMs: 1500,
        aiEnhanced: true,
      },
    };

    it('should generate TR from an ETP', async () => {
      mockService.generateFromEtp.mockResolvedValue(mockGeneratedTr);

      const result = await controller.generateFromEtp(
        mockEtpId,
        mockUser as User,
      );

      expect(result).toEqual(mockGeneratedTr);
      expect(mockService.generateFromEtp).toHaveBeenCalledWith(
        mockEtpId,
        mockUserId,
        mockOrganizationId,
      );
    });

    it('should pass correct parameters to service', async () => {
      mockService.generateFromEtp.mockResolvedValue(mockGeneratedTr);

      await controller.generateFromEtp(mockEtpId, mockUser as User);

      expect(mockService.generateFromEtp).toHaveBeenCalledWith(
        mockEtpId,
        mockUser.id,
        mockUser.organizationId,
      );
    });

    it('should return TR with metadata including AI enhancement info', async () => {
      mockService.generateFromEtp.mockResolvedValue(mockGeneratedTr);

      const result = await controller.generateFromEtp(
        mockEtpId,
        mockUser as User,
      );

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.aiEnhanced).toBe(true);
      expect(result.metadata?.tokens).toBe(500);
      expect(result.metadata?.latencyMs).toBe(1500);
    });
  });
});

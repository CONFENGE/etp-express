import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResourceOwnershipGuard } from './resource-ownership.guard';
import { ResourceType } from '../decorators/require-ownership.decorator';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { EtpVersion } from '../../entities/etp-version.entity';

describe('ResourceOwnershipGuard', () => {
  let guard: ResourceOwnershipGuard;
  let reflector: Reflector;

  const mockEtpRepository = {
    findOne: jest.fn(),
  };

  const mockSectionRepository = {
    findOne: jest.fn(),
  };

  const mockVersionRepository = {
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
        {
          provide: getRepositoryToken(EtpVersion),
          useValue: mockVersionRepository,
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
      resource?: Etp | EtpSection | EtpVersion;
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

  // Valid UUID v4 fixtures for tests (#1103)
  // These are properly formatted UUIDs that pass uuid.validate()
  const MOCK_ETP_ID = '550e8400-e29b-41d4-a716-446655440001';
  const MOCK_SECTION_ID = '550e8400-e29b-41d4-a716-446655440002';
  const MOCK_VERSION_ID = '550e8400-e29b-41d4-a716-446655440003';
  const MOCK_USER_1 = '550e8400-e29b-41d4-a716-446655440004';
  const MOCK_USER_2 = '550e8400-e29b-41d4-a716-446655440005';
  const MOCK_ORG_1 = '550e8400-e29b-41d4-a716-446655440006';
  const MOCK_ORG_2 = '550e8400-e29b-41d4-a716-446655440007';

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
        id: MOCK_ETP_ID,
        organizationId: etpOrganizationId,
        createdById: etpCreatedById,
        createdBy: { id: etpCreatedById },
      },
    }) as EtpSection;

  const createMockVersion = (
    id: string,
    etpOrganizationId: string,
    etpCreatedById: string,
  ): EtpVersion =>
    ({
      id,
      versionNumber: 1,
      etp: {
        id: MOCK_ETP_ID,
        organizationId: etpOrganizationId,
        createdById: etpCreatedById,
        createdBy: { id: etpCreatedById },
      },
    }) as EtpVersion;

  describe('No @RequireOwnership decorator', () => {
    it('should allow access when no decorator is present', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext({ id: MOCK_ETP_ID }, null);

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
      const context = createMockExecutionContext({ id: MOCK_ETP_ID }, null);

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
      const etp = createMockEtp(MOCK_ETP_ID, MOCK_ORG_1, MOCK_USER_1);
      mockEtpRepository.findOne.mockResolvedValue(etp);

      const context = createMockExecutionContext(
        { id: MOCK_ETP_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
        where: { id: MOCK_ETP_ID },
        relations: ['createdBy'],
      });

      // Verify resource is injected into request
      const request = context.switchToHttp().getRequest();
      expect(request.resource).toEqual(etp);
    });

    it('should throw NotFoundException when ETP does not exist', async () => {
      const nonExistentUUID = '550e8400-e29b-41d4-a716-446655440099';
      mockEtpRepository.findOne.mockResolvedValue(null);

      const context = createMockExecutionContext(
        { id: nonExistentUUID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        `ETP com ID ${nonExistentUUID} não encontrado`,
      );
    });

    it('should throw ForbiddenException when ETP belongs to different organization (IDOR)', async () => {
      const etp = createMockEtp(MOCK_ETP_ID, MOCK_ORG_2, MOCK_USER_1);
      mockEtpRepository.findOne.mockResolvedValue(etp);

      const context = createMockExecutionContext(
        { id: MOCK_ETP_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Você não tem permissão para acessar este ETP',
      );
    });

    it('should throw ForbiddenException when user does not own ETP', async () => {
      const etp = createMockEtp(MOCK_ETP_ID, MOCK_ORG_1, MOCK_USER_2);
      mockEtpRepository.findOne.mockResolvedValue(etp);

      const context = createMockExecutionContext(
        { id: MOCK_ETP_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
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

      const etp = createMockEtp(MOCK_ETP_ID, MOCK_ORG_1, MOCK_USER_2);
      mockEtpRepository.findOne.mockResolvedValue(etp);

      const context = createMockExecutionContext(
        { id: MOCK_ETP_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
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
      const section = createMockSection(
        MOCK_SECTION_ID,
        MOCK_ORG_1,
        MOCK_USER_1,
      );
      mockSectionRepository.findOne.mockResolvedValue(section);

      const context = createMockExecutionContext(
        { id: MOCK_SECTION_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockSectionRepository.findOne).toHaveBeenCalledWith({
        where: { id: MOCK_SECTION_ID },
        relations: ['etp', 'etp.createdBy'],
      });
    });

    it('should throw NotFoundException when Section does not exist', async () => {
      const nonExistentUUID = '550e8400-e29b-41d4-a716-446655440098';
      mockSectionRepository.findOne.mockResolvedValue(null);

      const context = createMockExecutionContext(
        { id: nonExistentUUID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        `Seção com ID ${nonExistentUUID} não encontrada`,
      );
    });

    it('should throw ForbiddenException when Section parent ETP belongs to different organization', async () => {
      const section = createMockSection(
        MOCK_SECTION_ID,
        MOCK_ORG_2,
        MOCK_USER_1,
      );
      mockSectionRepository.findOne.mockResolvedValue(section);

      const context = createMockExecutionContext(
        { id: MOCK_SECTION_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Você não tem permissão para acessar esta seção',
      );
    });

    it('should throw ForbiddenException when user does not own parent ETP', async () => {
      const section = createMockSection(
        MOCK_SECTION_ID,
        MOCK_ORG_1,
        MOCK_USER_2,
      );
      mockSectionRepository.findOne.mockResolvedValue(section);

      const context = createMockExecutionContext(
        { id: MOCK_SECTION_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Você não tem permissão para acessar esta seção',
      );
    });
  });

  describe('Version Resource', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockReturnValue({
        resourceType: ResourceType.VERSION,
        idParam: 'id',
        validateOwnership: true,
      });
    });

    it('should allow access when user owns parent ETP', async () => {
      const version = createMockVersion(
        MOCK_VERSION_ID,
        MOCK_ORG_1,
        MOCK_USER_1,
      );
      mockVersionRepository.findOne.mockResolvedValue(version);

      const context = createMockExecutionContext(
        { id: MOCK_VERSION_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockVersionRepository.findOne).toHaveBeenCalledWith({
        where: { id: MOCK_VERSION_ID },
        relations: ['etp', 'etp.createdBy'],
      });
    });

    it('should throw NotFoundException when Version does not exist', async () => {
      const nonExistentUUID = '550e8400-e29b-41d4-a716-446655440097';
      mockVersionRepository.findOne.mockResolvedValue(null);

      const context = createMockExecutionContext(
        { id: nonExistentUUID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        `Versão com ID ${nonExistentUUID} não encontrada`,
      );
    });

    it('should throw ForbiddenException when Version parent ETP belongs to different organization (IDOR)', async () => {
      const version = createMockVersion(
        MOCK_VERSION_ID,
        MOCK_ORG_2,
        MOCK_USER_1,
      );
      mockVersionRepository.findOne.mockResolvedValue(version);

      const context = createMockExecutionContext(
        { id: MOCK_VERSION_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Você não tem permissão para acessar esta versão',
      );
    });

    it('should throw ForbiddenException when user does not own parent ETP', async () => {
      const version = createMockVersion(
        MOCK_VERSION_ID,
        MOCK_ORG_1,
        MOCK_USER_2,
      );
      mockVersionRepository.findOne.mockResolvedValue(version);

      const context = createMockExecutionContext(
        { id: MOCK_VERSION_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Você não tem permissão para acessar esta versão',
      );
    });

    it('should allow access without ownership check when validateOwnership is false', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        resourceType: ResourceType.VERSION,
        idParam: 'id',
        validateOwnership: false, // Only check organization
      });

      const version = createMockVersion(
        MOCK_VERSION_ID,
        MOCK_ORG_1,
        MOCK_USER_2,
      );
      mockVersionRepository.findOne.mockResolvedValue(version);

      const context = createMockExecutionContext(
        { id: MOCK_VERSION_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Custom ID Parameter', () => {
    it('should use custom idParam from config', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({
        resourceType: ResourceType.ETP,
        idParam: 'etpId', // Custom parameter name
        validateOwnership: true,
      });

      const etp = createMockEtp(MOCK_ETP_ID, MOCK_ORG_1, MOCK_USER_1);
      mockEtpRepository.findOne.mockResolvedValue(etp);

      const context = createMockExecutionContext(
        { etpId: MOCK_ETP_ID }, // Using custom param name
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockEtpRepository.findOne).toHaveBeenCalledWith({
        where: { id: MOCK_ETP_ID },
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
        { id: MOCK_ETP_ID }, // Wrong param name
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
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

      const etp = createMockEtp(MOCK_ETP_ID, MOCK_ORG_1, MOCK_USER_1);
      mockEtpRepository.findOne.mockResolvedValue(etp);

      const context = createMockExecutionContext(
        { id: MOCK_ETP_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
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

      const etp = createMockEtp(MOCK_ETP_ID, MOCK_ORG_1, MOCK_USER_2);
      mockEtpRepository.findOne.mockResolvedValue(etp);

      const context = createMockExecutionContext(
        { id: MOCK_ETP_ID },
        { id: MOCK_USER_1, organizationId: MOCK_ORG_1 },
      );

      // Should fail because ownership is validated by default
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('UUID Validation (#1103)', () => {
    beforeEach(() => {
      mockReflector.getAllAndOverride.mockReturnValue({
        resourceType: ResourceType.ETP,
        idParam: 'id',
        validateOwnership: true,
      });
    });

    it('should throw BadRequestException for invalid UUID format "undefined"', async () => {
      const context = createMockExecutionContext(
        { id: 'undefined' }, // Literal string "undefined"
        { id: 'user-1', organizationId: 'org-1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        BadRequestException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'ID inválido: "undefined" não é um UUID válido',
      );

      // Should NOT call repository (validation happens before DB query)
      expect(mockEtpRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for other invalid UUID formats', async () => {
      const context = createMockExecutionContext(
        { id: 'not-a-valid-uuid' },
        { id: 'user-1', organizationId: 'org-1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockEtpRepository.findOne).not.toHaveBeenCalled();
    });

    it('should accept valid UUID v4 format', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const etp = createMockEtp(validUUID, 'org-1', 'user-1');
      mockEtpRepository.findOne.mockResolvedValue(etp);

      const context = createMockExecutionContext(
        { id: validUUID },
        { id: 'user-1', organizationId: 'org-1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockEtpRepository.findOne).toHaveBeenCalled();
    });
  });
});

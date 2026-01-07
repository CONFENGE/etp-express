import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplatesService } from './templates.service';
import {
  EtpTemplate,
  EtpTemplateType,
} from '../../entities/etp-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let repository: Repository<EtpTemplate>;

  const mockTemplate: Partial<EtpTemplate> = {
    id: 'template-123',
    name: 'Template para Obras de Engenharia',
    type: EtpTemplateType.OBRAS,
    description: 'Template otimizado para contratações de obras de engenharia.',
    requiredFields: ['objeto', 'justificativa', 'memorial_descritivo'],
    optionalFields: ['art_rrt', 'planilha_orcamentaria'],
    defaultSections: ['IDENTIFICACAO', 'OBJETO', 'JUSTIFICATIVA'],
    prompts: [
      {
        sectionType: 'JUSTIFICATIVA',
        systemPrompt: 'Você é especialista em obras...',
        userPromptTemplate: 'Gere justificativa para {objeto}',
      },
    ],
    legalReferences: ['Lei 14.133/2021', 'SINAPI'],
    priceSourcesPreferred: ['SINAPI', 'SICRO'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getRepositoryToken(EtpTemplate),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    repository = module.get<Repository<EtpTemplate>>(
      getRepositoryToken(EtpTemplate),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all active templates ordered by name', async () => {
      const templates = [mockTemplate, { ...mockTemplate, id: 'template-456' }];
      mockRepository.find.mockResolvedValue(templates);

      const result = await service.findAll();

      expect(result).toEqual(templates);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no templates exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const result = await service.findOne('template-123');

      expect(result).toEqual(mockTemplate);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-123' },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Template com ID non-existent não encontrado',
      );
    });
  });

  describe('findByType', () => {
    it('should return templates filtered by type', async () => {
      const templates = [mockTemplate];
      mockRepository.find.mockResolvedValue(templates);

      const result = await service.findByType(EtpTemplateType.OBRAS);

      expect(result).toEqual(templates);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { type: EtpTemplateType.OBRAS, isActive: true },
        order: { name: 'ASC' },
      });
    });

    it('should return empty array when no templates of type exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findByType(EtpTemplateType.TI);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new template with all fields', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Template para TI',
        type: EtpTemplateType.TI,
        description: 'Template para contratações de TI',
        requiredFields: ['objeto', 'especificacoes_tecnicas'],
        optionalFields: ['sla'],
        defaultSections: ['IDENTIFICACAO', 'OBJETO'],
        prompts: [
          {
            sectionType: 'OBJETO',
            systemPrompt: 'Você é especialista em TI...',
            userPromptTemplate: 'Descreva {objeto}',
          },
        ],
        legalReferences: ['IN SEGES/ME nº 65/2021'],
        priceSourcesPreferred: ['PNCP'],
        isActive: true,
      };

      const createdTemplate = { id: 'new-template-id', ...createDto };
      mockRepository.create.mockReturnValue(createdTemplate);
      mockRepository.save.mockResolvedValue(createdTemplate);

      const result = await service.create(createDto);

      expect(result).toEqual(createdTemplate);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        optionalFields: createDto.optionalFields,
        prompts: createDto.prompts,
        legalReferences: createDto.legalReferences,
        priceSourcesPreferred: createDto.priceSourcesPreferred,
        isActive: true,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(createdTemplate);
    });

    it('should create template with default empty arrays when optional fields not provided', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Template Básico',
        type: EtpTemplateType.MATERIAIS,
        description: 'Template básico para materiais',
        requiredFields: ['objeto'],
        defaultSections: ['IDENTIFICACAO'],
      };

      const createdTemplate = { id: 'new-template-id', ...createDto };
      mockRepository.create.mockReturnValue(createdTemplate);
      mockRepository.save.mockResolvedValue(createdTemplate);

      await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        optionalFields: [],
        prompts: [],
        legalReferences: [],
        priceSourcesPreferred: [],
        isActive: true,
      });
    });
  });

  describe('update', () => {
    it('should update an existing template', async () => {
      const updateDto: UpdateTemplateDto = {
        name: 'Template Atualizado',
        description: 'Descrição atualizada',
      };

      mockRepository.findOne.mockResolvedValue({ ...mockTemplate });
      mockRepository.save.mockResolvedValue({
        ...mockTemplate,
        ...updateDto,
      });

      const result = await service.update('template-123', updateDto);

      expect(result.name).toBe('Template Atualizado');
      expect(result.description).toBe('Descrição atualizada');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent template', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a template by setting isActive to false', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockTemplate });
      mockRepository.save.mockResolvedValue({
        ...mockTemplate,
        isActive: false,
      });

      await service.remove('template-123');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw NotFoundException when removing non-existent template', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

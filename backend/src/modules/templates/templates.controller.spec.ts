import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import {
  EtpTemplate,
  EtpTemplateType,
} from '../../entities/etp-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

describe('TemplatesController', () => {
  let controller: TemplatesController;
  let service: TemplatesService;

  const mockTemplate: Partial<EtpTemplate> = {
    id: 'template-123',
    name: 'Template para Obras de Engenharia',
    type: EtpTemplateType.OBRAS,
    description: 'Template otimizado para contratações de obras de engenharia.',
    requiredFields: ['objeto', 'justificativa', 'memorial_descritivo'],
    optionalFields: ['art_rrt', 'planilha_orcamentaria'],
    defaultSections: ['IDENTIFICACAO', 'OBJETO', 'JUSTIFICATIVA'],
    prompts: [],
    legalReferences: ['Lei 14.133/2021'],
    priceSourcesPreferred: ['SINAPI', 'SICRO'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByType: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
    service = module.get<TemplatesService>(TemplatesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all active templates', async () => {
      const templates = [mockTemplate, { ...mockTemplate, id: 'template-456' }];
      mockService.findAll.mockResolvedValue(templates);

      const result = await controller.findAll();

      expect(result).toEqual(templates);
      expect(mockService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      mockService.findOne.mockResolvedValue(mockTemplate);

      const result = await controller.findOne('template-123');

      expect(result).toEqual(mockTemplate);
      expect(mockService.findOne).toHaveBeenCalledWith('template-123');
    });

    it('should throw NotFoundException for non-existent template', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException('Template com ID non-existent não encontrado'),
      );

      await expect(controller.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByType', () => {
    it('should return templates filtered by type', async () => {
      const templates = [mockTemplate];
      mockService.findByType.mockResolvedValue(templates);

      const result = await controller.findByType(EtpTemplateType.OBRAS);

      expect(result).toEqual(templates);
      expect(mockService.findByType).toHaveBeenCalledWith(
        EtpTemplateType.OBRAS,
      );
    });
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Template para TI',
        type: EtpTemplateType.TI,
        description: 'Template para contratações de TI',
        requiredFields: ['objeto', 'especificacoes_tecnicas'],
        defaultSections: ['IDENTIFICACAO', 'OBJETO'],
      };

      const createdTemplate = { id: 'new-template-id', ...createDto };
      mockService.create.mockResolvedValue(createdTemplate);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdTemplate);
      expect(mockService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update an existing template', async () => {
      const updateDto: UpdateTemplateDto = {
        name: 'Template Atualizado',
      };

      const updatedTemplate = { ...mockTemplate, ...updateDto };
      mockService.update.mockResolvedValue(updatedTemplate);

      const result = await controller.update('template-123', updateDto);

      expect(result).toEqual(updatedTemplate);
      expect(mockService.update).toHaveBeenCalledWith(
        'template-123',
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should remove a template', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('template-123');

      expect(mockService.remove).toHaveBeenCalledWith('template-123');
    });

    it('should throw NotFoundException for non-existent template', async () => {
      mockService.remove.mockRejectedValue(
        new NotFoundException('Template com ID non-existent não encontrado'),
      );

      await expect(controller.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

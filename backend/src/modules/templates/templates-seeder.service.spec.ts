import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplatesSeederService } from './templates-seeder.service';
import {
  EtpTemplate,
  EtpTemplateType,
} from '../../entities/etp-template.entity';

describe('TemplatesSeederService', () => {
  let service: TemplatesSeederService;
  let repository: jest.Mocked<Repository<EtpTemplate>>;

  const mockRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesSeederService,
        {
          provide: getRepositoryToken(EtpTemplate),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TemplatesSeederService>(TemplatesSeederService);
    repository = module.get(getRepositoryToken(EtpTemplate));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should call seedTemplatesIfNeeded on bootstrap', async () => {
      mockRepository.count.mockResolvedValue(4);

      await service.onApplicationBootstrap();

      expect(mockRepository.count).toHaveBeenCalled();
    });
  });

  describe('seedTemplatesIfNeeded', () => {
    it('should skip seeding if templates already exist', async () => {
      mockRepository.count.mockResolvedValue(4);

      await service.seedTemplatesIfNeeded();

      expect(mockRepository.count).toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should seed templates if none exist', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as EtpTemplate);
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve(data as EtpTemplate),
      );

      await service.seedTemplatesIfNeeded();

      expect(mockRepository.count).toHaveBeenCalled();
      // Should create 4 templates (OBRAS, TI, SERVICOS, MATERIAIS)
      expect(mockRepository.save).toHaveBeenCalledTimes(4);
    });

    it('should not throw if seeding fails', async () => {
      mockRepository.count.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.seedTemplatesIfNeeded()).resolves.not.toThrow();
    });

    it('should skip individual template if already exists', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockImplementation((options) => {
        if (options.where.type === EtpTemplateType.OBRAS) {
          return Promise.resolve({ id: 'existing-id' } as EtpTemplate);
        }
        return Promise.resolve(null);
      });
      mockRepository.create.mockImplementation((data) => data as EtpTemplate);
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve(data as EtpTemplate),
      );

      await service.seedTemplatesIfNeeded();

      // Should save 3 templates (TI, SERVICOS, MATERIAIS), skip OBRAS
      expect(mockRepository.save).toHaveBeenCalledTimes(3);
    });
  });

  describe('template data', () => {
    it('should have correct template types', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);

      const createdTemplates: unknown[] = [];
      mockRepository.create.mockImplementation((data) => {
        createdTemplates.push(data);
        return data as EtpTemplate;
      });
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve(data as EtpTemplate),
      );

      await service.seedTemplatesIfNeeded();

      const types = createdTemplates.map((t: { type: string }) => t.type);
      expect(types).toContain(EtpTemplateType.OBRAS);
      expect(types).toContain(EtpTemplateType.TI);
      expect(types).toContain(EtpTemplateType.SERVICOS);
      expect(types).toContain(EtpTemplateType.MATERIAIS);
    });

    it('should set isActive to true for all templates', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);

      const createdTemplates: unknown[] = [];
      mockRepository.create.mockImplementation((data) => {
        createdTemplates.push(data);
        return data as EtpTemplate;
      });
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve(data as EtpTemplate),
      );

      await service.seedTemplatesIfNeeded();

      createdTemplates.forEach((t: { isActive: boolean }) => {
        expect(t.isActive).toBe(true);
      });
    });

    it('should include required fields for each template', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);

      const createdTemplates: unknown[] = [];
      mockRepository.create.mockImplementation((data) => {
        createdTemplates.push(data);
        return data as EtpTemplate;
      });
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve(data as EtpTemplate),
      );

      await service.seedTemplatesIfNeeded();

      createdTemplates.forEach((t: { requiredFields: string[] }) => {
        expect(t.requiredFields).toBeDefined();
        expect(t.requiredFields.length).toBeGreaterThan(0);
        // All templates should require objeto, justificativa, estimativaCusto
        expect(t.requiredFields).toContain('objeto');
        expect(t.requiredFields).toContain('justificativa');
        expect(t.requiredFields).toContain('estimativaCusto');
      });
    });

    it('should include legal references for each template', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);

      const createdTemplates: unknown[] = [];
      mockRepository.create.mockImplementation((data) => {
        createdTemplates.push(data);
        return data as EtpTemplate;
      });
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve(data as EtpTemplate),
      );

      await service.seedTemplatesIfNeeded();

      createdTemplates.forEach((t: { legalReferences: string[] }) => {
        expect(t.legalReferences).toBeDefined();
        expect(t.legalReferences.length).toBeGreaterThan(0);
        // All templates should reference Lei 14.133/2021
        expect(
          t.legalReferences.some((ref: string) => ref.includes('14.133')),
        ).toBe(true);
      });
    });
  });
});

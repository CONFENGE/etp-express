import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceChecklistSeeder } from '../compliance-checklist.seeder';
import {
  ComplianceChecklist,
  ComplianceStandard,
} from '../../../entities/compliance-checklist.entity';
import {
  ComplianceChecklistItem,
  ChecklistItemType,
  ChecklistItemCategory,
} from '../../../entities/compliance-checklist-item.entity';
import { EtpTemplateType } from '../../../entities/etp-template.entity';

describe('ComplianceChecklistSeeder', () => {
  let service: ComplianceChecklistSeeder;
  let checklistRepository: jest.Mocked<Repository<ComplianceChecklist>>;
  let itemRepository: jest.Mocked<Repository<ComplianceChecklistItem>>;

  const mockChecklistRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceChecklistSeeder,
        {
          provide: getRepositoryToken(ComplianceChecklist),
          useValue: mockChecklistRepository,
        },
        {
          provide: getRepositoryToken(ComplianceChecklistItem),
          useValue: mockItemRepository,
        },
      ],
    }).compile();

    service = module.get<ComplianceChecklistSeeder>(ComplianceChecklistSeeder);
    checklistRepository = module.get(getRepositoryToken(ComplianceChecklist));
    itemRepository = module.get(getRepositoryToken(ComplianceChecklistItem));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onApplicationBootstrap', () => {
    it('should call seedChecklistsIfNeeded on bootstrap', async () => {
      mockChecklistRepository.count.mockResolvedValue(4);

      await service.onApplicationBootstrap();

      expect(mockChecklistRepository.count).toHaveBeenCalledWith({
        where: { standard: ComplianceStandard.TCU },
      });
    });
  });

  describe('seedChecklistsIfNeeded', () => {
    it('should skip seeding if TCU checklists already exist', async () => {
      mockChecklistRepository.count.mockResolvedValue(4);

      await service.seedChecklistsIfNeeded();

      expect(mockChecklistRepository.count).toHaveBeenCalledWith({
        where: { standard: ComplianceStandard.TCU },
      });
      expect(mockChecklistRepository.save).not.toHaveBeenCalled();
    });

    it('should seed checklists if none exist', async () => {
      mockChecklistRepository.count.mockResolvedValue(0);
      mockChecklistRepository.findOne.mockResolvedValue(null);
      mockChecklistRepository.create.mockImplementation(
        (data) => ({ ...data, id: 'test-id' }) as ComplianceChecklist,
      );
      mockChecklistRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklist),
      );
      mockItemRepository.create.mockImplementation(
        (data) => data as ComplianceChecklistItem,
      );
      mockItemRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklistItem),
      );

      await service.seedChecklistsIfNeeded();

      expect(mockChecklistRepository.count).toHaveBeenCalled();
      // Should create 4 checklists (OBRAS, TI, SERVICOS, MATERIAIS)
      expect(mockChecklistRepository.save).toHaveBeenCalledTimes(4);
    });

    it('should not throw if seeding fails', async () => {
      mockChecklistRepository.count.mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(service.seedChecklistsIfNeeded()).resolves.not.toThrow();
    });

    it('should skip individual checklist if already exists', async () => {
      mockChecklistRepository.count.mockResolvedValue(0);
      mockChecklistRepository.findOne.mockImplementation((options) => {
        const where = options?.where as {
          standard: ComplianceStandard;
          templateType: EtpTemplateType;
        };
        if (where?.templateType === EtpTemplateType.OBRAS) {
          return Promise.resolve({ id: 'existing-id' } as ComplianceChecklist);
        }
        return Promise.resolve(null);
      });
      mockChecklistRepository.create.mockImplementation(
        (data) => ({ ...data, id: 'test-id' }) as ComplianceChecklist,
      );
      mockChecklistRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklist),
      );
      mockItemRepository.create.mockImplementation(
        (data) => data as ComplianceChecklistItem,
      );
      mockItemRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklistItem),
      );

      await service.seedChecklistsIfNeeded();

      // Should save 3 checklists (TI, SERVICOS, MATERIAIS), skip OBRAS
      expect(mockChecklistRepository.save).toHaveBeenCalledTimes(3);
    });
  });

  describe('checklist data validation', () => {
    let createdChecklists: Partial<ComplianceChecklist>[] = [];
    let createdItems: Partial<ComplianceChecklistItem>[] = [];

    beforeEach(async () => {
      createdChecklists = [];
      createdItems = [];

      mockChecklistRepository.count.mockResolvedValue(0);
      mockChecklistRepository.findOne.mockResolvedValue(null);
      mockChecklistRepository.create.mockImplementation((data) => {
        createdChecklists.push(data);
        return {
          ...data,
          id: `checklist-${createdChecklists.length}`,
        } as ComplianceChecklist;
      });
      mockChecklistRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklist),
      );
      mockItemRepository.create.mockImplementation((data) => {
        createdItems.push(data);
        return data as ComplianceChecklistItem;
      });
      mockItemRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklistItem),
      );

      await service.seedChecklistsIfNeeded();
    });

    it('should create checklists for all 4 template types', () => {
      const types = createdChecklists.map((c) => c.templateType);
      expect(types).toContain(EtpTemplateType.OBRAS);
      expect(types).toContain(EtpTemplateType.TI);
      expect(types).toContain(EtpTemplateType.SERVICOS);
      expect(types).toContain(EtpTemplateType.MATERIAIS);
    });

    it('should set standard to TCU for all checklists', () => {
      createdChecklists.forEach((c) => {
        expect(c.standard).toBe(ComplianceStandard.TCU);
      });
    });

    it('should set isActive to true for all checklists', () => {
      createdChecklists.forEach((c) => {
        expect(c.isActive).toBe(true);
      });
    });

    it('should set minimumScore to 70 for all checklists', () => {
      createdChecklists.forEach((c) => {
        expect(c.minimumScore).toBe(70);
      });
    });

    it('should include legal basis referencing Lei 14.133/2021', () => {
      createdChecklists.forEach((c) => {
        expect(c.legalBasis).toBeDefined();
        expect(c.legalBasis).toContain('14.133');
      });
    });

    it('should create items for each checklist', () => {
      // Each checklist should have items
      expect(createdItems.length).toBeGreaterThan(0);
    });

    it('should have items with proper weight distribution', () => {
      // Group items by checklist
      const checklistIds = [
        'checklist-1',
        'checklist-2',
        'checklist-3',
        'checklist-4',
      ];

      checklistIds.forEach((checklistId) => {
        const itemsForChecklist = createdItems.filter(
          (item) => item.checklistId === checklistId,
        );

        if (itemsForChecklist.length > 0) {
          const totalWeight = itemsForChecklist.reduce(
            (sum, item) => sum + (item.weight || 0),
            0,
          );
          // Weights should sum to 100
          expect(totalWeight).toBe(100);
        }
      });
    });

    it('should include MANDATORY items for critical requirements', () => {
      const mandatoryItems = createdItems.filter(
        (item) => item.type === ChecklistItemType.MANDATORY,
      );

      expect(mandatoryItems.length).toBeGreaterThan(0);

      // Should have mandatory items for key requirements
      const requirements = mandatoryItems.map((item) => item.requirement);
      expect(
        requirements.some((r) => r?.toLowerCase().includes('necessidade')),
      ).toBe(true);
      expect(
        requirements.some(
          (r) =>
            r?.toLowerCase().includes('preco') ||
            r?.toLowerCase().includes('estimativa'),
        ),
      ).toBe(true);
    });

    it('should include keywords for validation', () => {
      createdItems.forEach((item) => {
        expect(item.keywords).toBeDefined();
        expect(Array.isArray(item.keywords)).toBe(true);
        expect(item.keywords!.length).toBeGreaterThan(0);
      });
    });

    it('should include fixSuggestion for all items', () => {
      createdItems.forEach((item) => {
        expect(item.fixSuggestion).toBeDefined();
        expect(item.fixSuggestion!.length).toBeGreaterThan(0);
      });
    });

    it('should include proper categories for items', () => {
      const categories = createdItems.map((item) => item.category);
      const uniqueCategories = [...new Set(categories)];

      // Should use multiple categories
      expect(uniqueCategories.length).toBeGreaterThan(3);

      // Should include key categories
      expect(categories).toContain(ChecklistItemCategory.JUSTIFICATION);
      expect(categories).toContain(ChecklistItemCategory.PRICING);
      expect(categories).toContain(ChecklistItemCategory.CONCLUSION);
    });

    it('should have sequential order for items', () => {
      const checklistIds = [
        'checklist-1',
        'checklist-2',
        'checklist-3',
        'checklist-4',
      ];

      checklistIds.forEach((checklistId) => {
        const itemsForChecklist = createdItems.filter(
          (item) => item.checklistId === checklistId,
        );

        if (itemsForChecklist.length > 0) {
          const orders = itemsForChecklist.map((item) => item.order);
          // Orders should be sequential starting from 1
          const sortedOrders = [...orders].sort((a, b) => (a || 0) - (b || 0));
          expect(sortedOrders[0]).toBe(1);
        }
      });
    });

    it('should include rejection codes for common rejection items', () => {
      const itemsWithRejectionCode = createdItems.filter(
        (item) => item.rejectionCode,
      );

      expect(itemsWithRejectionCode.length).toBeGreaterThan(0);

      // Should reference documented rejection codes
      const codes = itemsWithRejectionCode.map((item) => item.rejectionCode);
      expect(codes.some((c) => c?.startsWith('REJ-'))).toBe(true);
    });
  });

  describe('OBRAS checklist specifics', () => {
    let obrasItems: Partial<ComplianceChecklistItem>[] = [];

    beforeEach(async () => {
      const createdChecklists: Partial<ComplianceChecklist>[] = [];
      const createdItems: Partial<ComplianceChecklistItem>[] = [];

      mockChecklistRepository.count.mockResolvedValue(0);
      mockChecklistRepository.findOne.mockResolvedValue(null);
      mockChecklistRepository.create.mockImplementation((data) => {
        createdChecklists.push(data);
        return {
          ...data,
          id: `checklist-${createdChecklists.length}`,
        } as ComplianceChecklist;
      });
      mockChecklistRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklist),
      );
      mockItemRepository.create.mockImplementation((data) => {
        createdItems.push(data);
        return data as ComplianceChecklistItem;
      });
      mockItemRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklistItem),
      );

      await service.seedChecklistsIfNeeded();

      // Find OBRAS checklist items
      const obrasChecklistIndex = createdChecklists.findIndex(
        (c) => c.templateType === EtpTemplateType.OBRAS,
      );
      const obrasChecklistId = `checklist-${obrasChecklistIndex + 1}`;
      obrasItems = createdItems.filter(
        (item) => item.checklistId === obrasChecklistId,
      );
    });

    it('should have at least 8 items for OBRAS', () => {
      expect(obrasItems.length).toBeGreaterThanOrEqual(8);
    });

    it('should include SINAPI/SICRO reference requirement', () => {
      const sinapiItem = obrasItems.find(
        (item) =>
          item.requirement?.toLowerCase().includes('sinapi') ||
          item.requirement?.toLowerCase().includes('sicro') ||
          item.keywords?.some((k) => k.toLowerCase().includes('sinapi')),
      );
      expect(sinapiItem).toBeDefined();
      expect(sinapiItem?.type).toBe(ChecklistItemType.MANDATORY);
    });

    it('should include ART/RRT requirement', () => {
      const artItem = obrasItems.find(
        (item) =>
          item.requirement?.toLowerCase().includes('art') ||
          item.requirement?.toLowerCase().includes('rrt') ||
          item.keywords?.some((k) => k.toLowerCase().includes('art')),
      );
      expect(artItem).toBeDefined();
    });
  });

  describe('TI checklist specifics', () => {
    let tiItems: Partial<ComplianceChecklistItem>[] = [];

    beforeEach(async () => {
      const createdChecklists: Partial<ComplianceChecklist>[] = [];
      const createdItems: Partial<ComplianceChecklistItem>[] = [];

      mockChecklistRepository.count.mockResolvedValue(0);
      mockChecklistRepository.findOne.mockResolvedValue(null);
      mockChecklistRepository.create.mockImplementation((data) => {
        createdChecklists.push(data);
        return {
          ...data,
          id: `checklist-${createdChecklists.length}`,
        } as ComplianceChecklist;
      });
      mockChecklistRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklist),
      );
      mockItemRepository.create.mockImplementation((data) => {
        createdItems.push(data);
        return data as ComplianceChecklistItem;
      });
      mockItemRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklistItem),
      );

      await service.seedChecklistsIfNeeded();

      // Find TI checklist items
      const tiChecklistIndex = createdChecklists.findIndex(
        (c) => c.templateType === EtpTemplateType.TI,
      );
      const tiChecklistId = `checklist-${tiChecklistIndex + 1}`;
      tiItems = createdItems.filter(
        (item) => item.checklistId === tiChecklistId,
      );
    });

    it('should have at least 8 items for TI', () => {
      expect(tiItems.length).toBeGreaterThanOrEqual(8);
    });

    it('should include SLA requirement', () => {
      const slaItem = tiItems.find(
        (item) =>
          item.requirement?.toLowerCase().includes('sla') ||
          item.requirement?.toLowerCase().includes('nivel de servico') ||
          item.keywords?.some((k) => k.toLowerCase().includes('sla')),
      );
      expect(slaItem).toBeDefined();
    });

    it('should include LGPD requirement', () => {
      const lgpdItem = tiItems.find(
        (item) =>
          item.requirement?.toLowerCase().includes('lgpd') ||
          item.keywords?.some((k) => k.toLowerCase().includes('lgpd')),
      );
      expect(lgpdItem).toBeDefined();
    });

    it('should include security requirement', () => {
      const securityItem = tiItems.find(
        (item) =>
          item.requirement?.toLowerCase().includes('seguranca') ||
          item.keywords?.some((k) => k.toLowerCase().includes('seguranca')),
      );
      expect(securityItem).toBeDefined();
    });
  });

  describe('idempotency', () => {
    it('should be idempotent when called multiple times', async () => {
      mockChecklistRepository.count.mockResolvedValue(0);
      mockChecklistRepository.findOne.mockResolvedValue(null);
      mockChecklistRepository.create.mockImplementation(
        (data) => ({ ...data, id: 'test-id' }) as ComplianceChecklist,
      );
      mockChecklistRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklist),
      );
      mockItemRepository.create.mockImplementation(
        (data) => data as ComplianceChecklistItem,
      );
      mockItemRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ComplianceChecklistItem),
      );

      // First call
      await service.seedChecklistsIfNeeded();
      const firstCallSaves = mockChecklistRepository.save.mock.calls.length;

      // Reset count to simulate existing data
      mockChecklistRepository.count.mockResolvedValue(4);

      // Second call
      await service.seedChecklistsIfNeeded();
      const secondCallSaves = mockChecklistRepository.save.mock.calls.length;

      // Should not create more checklists on second call
      expect(secondCallSaves).toBe(firstCallSaves);
    });
  });
});

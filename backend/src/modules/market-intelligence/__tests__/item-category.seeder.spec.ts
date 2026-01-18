import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemCategorySeeder } from '../seeders/item-category.seeder';
import { ItemCategory, ItemCategoryType } from '../../../entities/item-category.entity';

describe('ItemCategorySeeder', () => {
  let seeder: ItemCategorySeeder;
  let repository: jest.Mocked<Repository<ItemCategory>>;

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
        ItemCategorySeeder,
        {
          provide: getRepositoryToken(ItemCategory),
          useValue: mockRepository,
        },
      ],
    }).compile();

    seeder = module.get<ItemCategorySeeder>(ItemCategorySeeder);
    repository = module.get(getRepositoryToken(ItemCategory));
  });

  describe('onApplicationBootstrap', () => {
    it('should seed categories when none exist', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ItemCategory),
      );

      // Act
      await seeder.onApplicationBootstrap();

      // Assert
      expect(mockRepository.count).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should not seed categories when they already exist', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(50);

      // Act
      await seeder.onApplicationBootstrap();

      // Assert
      expect(mockRepository.count).toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      // Arrange
      mockRepository.count.mockRejectedValue(new Error('Database error'));

      // Act & Assert - should not throw
      await expect(seeder.onApplicationBootstrap()).resolves.not.toThrow();
    });
  });

  describe('seedCategoriesIfNeeded', () => {
    it('should skip existing categories during seeding', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      // First call returns existing category, subsequent calls return null
      mockRepository.findOne
        .mockResolvedValueOnce({ code: 'CATMAT-ROOT' } as ItemCategory)
        .mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);
      mockRepository.save.mockImplementation((data) =>
        Promise.resolve(data as ItemCategory),
      );

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalled();
    });

    it('should create root categories first', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert - root categories should be created first
      expect(savedCategories.length).toBeGreaterThan(0);
      expect(savedCategories[0].code).toBe('CATMAT-ROOT');
      expect(savedCategories[1].code).toBe('CATSER-ROOT');
    });

    it('should create hierarchical categories with correct levels', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      const rootCategories = savedCategories.filter((c) => c.level === 0);
      const level1Categories = savedCategories.filter((c) => c.level === 1);
      const level2Categories = savedCategories.filter((c) => c.level === 2);

      expect(rootCategories.length).toBe(2); // CATMAT-ROOT, CATSER-ROOT
      expect(level1Categories.length).toBeGreaterThan(0);
      expect(level2Categories.length).toBeGreaterThan(0);
    });

    it('should seed at least 50 categories (AC requirement)', async () => {
      // Arrange
      mockRepository.count
        .mockResolvedValueOnce(0) // Initial check
        .mockResolvedValue(50); // Final count
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      let saveCount = 0;
      mockRepository.save.mockImplementation((data) => {
        saveCount++;
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert - should seed at least 50 categories
      expect(saveCount).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Category Data Validation', () => {
    it('should create CATMAT categories with correct type', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      const catmatCategories = savedCategories.filter(
        (c) => c.type === ItemCategoryType.CATMAT,
      );
      expect(catmatCategories.length).toBeGreaterThan(0);
      expect(catmatCategories.every((c) => c.code.startsWith('CATMAT'))).toBe(
        true,
      );
    });

    it('should create CATSER categories with correct type', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      const catserCategories = savedCategories.filter(
        (c) => c.type === ItemCategoryType.CATSER,
      );
      expect(catserCategories.length).toBeGreaterThan(0);
      expect(catserCategories.every((c) => c.code.startsWith('CATSER'))).toBe(
        true,
      );
    });

    it('should include keywords for AI classification', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert - most categories should have keywords
      const categoriesWithKeywords = savedCategories.filter(
        (c) => c.keywords && c.keywords.length > 0,
      );
      expect(categoriesWithKeywords.length / savedCategories.length).toBeGreaterThan(
        0.9,
      );
    });

    it('should include common units for categories', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert - level 1 and 2 categories should have common units
      const nonRootCategories = savedCategories.filter((c) => c.level > 0);
      const categoriesWithUnits = nonRootCategories.filter(
        (c) => c.commonUnits && c.commonUnits.length > 0,
      );
      expect(categoriesWithUnits.length).toBeGreaterThan(0);
    });

    it('should set parent codes correctly for hierarchical categories', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      // Root categories should have no parent
      const rootCategories = savedCategories.filter((c) => c.level === 0);
      expect(rootCategories.every((c) => c.parentCode === null)).toBe(true);

      // Level 1 categories should have ROOT as parent
      const level1Categories = savedCategories.filter((c) => c.level === 1);
      expect(
        level1Categories.every(
          (c) =>
            c.parentCode === 'CATMAT-ROOT' || c.parentCode === 'CATSER-ROOT',
        ),
      ).toBe(true);

      // Level 2 categories should have Level 1 category as parent
      const level2Categories = savedCategories.filter((c) => c.level === 2);
      expect(
        level2Categories.every(
          (c) =>
            c.parentCode !== null &&
            c.parentCode !== 'CATMAT-ROOT' &&
            c.parentCode !== 'CATSER-ROOT',
        ),
      ).toBe(true);
    });
  });

  describe('Specific Category Verification', () => {
    it('should include TI Equipment category (CATMAT-44000)', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      const tiCategory = savedCategories.find((c) => c.code === 'CATMAT-44000');
      expect(tiCategory).toBeDefined();
      expect(tiCategory?.name).toContain('Equipamentos de TI');
      expect(tiCategory?.keywords).toContain('informática');
    });

    it('should include Notebooks subcategory (CATMAT-44122)', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      const notebooksCategory = savedCategories.find(
        (c) => c.code === 'CATMAT-44122',
      );
      expect(notebooksCategory).toBeDefined();
      expect(notebooksCategory?.parentCode).toBe('CATMAT-44000');
      expect(notebooksCategory?.level).toBe(2);
      expect(notebooksCategory?.keywords).toContain('notebook');
    });

    it('should include IT Services category (CATSER-10000)', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      const itServiceCategory = savedCategories.find(
        (c) => c.code === 'CATSER-10000',
      );
      expect(itServiceCategory).toBeDefined();
      expect(itServiceCategory?.type).toBe(ItemCategoryType.CATSER);
      expect(itServiceCategory?.name).toContain('Serviços de TI');
    });

    it('should include Office Supplies category (CATMAT-75000)', async () => {
      // Arrange
      mockRepository.count.mockResolvedValue(0);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data as ItemCategory);

      const savedCategories: ItemCategory[] = [];
      mockRepository.save.mockImplementation((data) => {
        savedCategories.push(data as ItemCategory);
        return Promise.resolve(data as ItemCategory);
      });

      // Act
      await seeder.seedCategoriesIfNeeded();

      // Assert
      const officeCategory = savedCategories.find(
        (c) => c.code === 'CATMAT-75000',
      );
      expect(officeCategory).toBeDefined();
      expect(officeCategory?.name).toContain('Material de Expediente');
      expect(officeCategory?.commonUnits).toContain('UN');
    });
  });
});

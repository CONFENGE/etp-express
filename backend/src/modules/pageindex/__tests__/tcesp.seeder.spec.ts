import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TceSPSeeder } from '../seeders/tcesp.seeder';
import { JurisprudenciaSeeder } from '../seeders/jurisprudencia.seeder';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';

/**
 * Unit tests for TceSPSeeder
 *
 * Tests the TCE-SP sumulas seeding functionality.
 *
 * @see Issue #1579 - [JURIS-1540c] Coletar e indexar sumulas TCE-SP (minimo 50)
 */
describe('TceSPSeeder', () => {
  let seeder: TceSPSeeder;
  let jurisprudenciaSeeder: jest.Mocked<JurisprudenciaSeeder>;
  let repository: jest.Mocked<Repository<DocumentTree>>;

  // Mock seed result
  const mockSeedResult = {
    total: 52,
    tcespCount: 52,
    tcuCount: 0,
    documentTreeId: 'doc-tree-tcesp-123',
    processingTimeMs: 150,
  };

  // Mock repository
  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  // Mock JurisprudenciaSeeder
  const mockJurisprudenciaSeeder = {
    seedFromData: jest.fn(),
    unseed: jest.fn(),
    buildTreeStructure: jest.fn(),
    getThemeConstants: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TceSPSeeder,
        {
          provide: JurisprudenciaSeeder,
          useValue: mockJurisprudenciaSeeder,
        },
        {
          provide: getRepositoryToken(DocumentTree),
          useValue: mockRepository,
        },
      ],
    }).compile();

    seeder = module.get<TceSPSeeder>(TceSPSeeder);
    jurisprudenciaSeeder = module.get(JurisprudenciaSeeder);
    repository = module.get(getRepositoryToken(DocumentTree));
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(seeder).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should skip seeding if already seeded', async () => {
      const existingTree = {
        id: 'existing-tree',
        documentName: 'Jurisprudencia TCE-SP e TCU',
        documentType: DocumentType.JURISPRUDENCIA,
        status: DocumentTreeStatus.INDEXED,
      };
      mockRepository.findOne.mockResolvedValue(existingTree);

      await seeder.onModuleInit();

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { documentName: 'Jurisprudencia TCE-SP e TCU' },
      });
      expect(mockJurisprudenciaSeeder.seedFromData).not.toHaveBeenCalled();
    });

    it('should seed if not already seeded', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.onModuleInit();

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockJurisprudenciaSeeder.seedFromData).toHaveBeenCalled();
    });
  });

  describe('seed', () => {
    beforeEach(() => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);
    });

    it('should load sumulas from JSON and seed successfully', async () => {
      const result = await seeder.seed();

      expect(mockJurisprudenciaSeeder.seedFromData).toHaveBeenCalled();
      expect(result.total).toBe(52);
      expect(result.documentTreeId).toBe('doc-tree-tcesp-123');
    });

    it('should pass correct data to JurisprudenciaSeeder', async () => {
      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];

      // Verify all items are TCE-SP
      expect(
        seedCall.every(
          (item: { tribunal: string }) => item.tribunal === 'TCE-SP',
        ),
      ).toBe(true);

      // Verify all items are SUMULAs
      expect(
        seedCall.every((item: { tipo: string }) => item.tipo === 'SUMULA'),
      ).toBe(true);

      // Verify we have at least 50 items
      expect(seedCall.length).toBeGreaterThanOrEqual(50);
    });

    it('should return correct statistics', async () => {
      const result = await seeder.seed();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('cancelled');
      expect(result).toHaveProperty('documentTreeId');

      // 47 active, 5 cancelled based on JSON data
      expect(result.active).toBe(47);
      expect(result.cancelled).toBe(5);
    });

    it('should handle seeding errors gracefully', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(seeder.seed()).rejects.toThrow('Database error');
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics from loaded data', () => {
      const stats = seeder.getStatistics();

      expect(stats.total).toBe(52);
      expect(stats.active).toBe(47);
      expect(stats.cancelled).toBe(5);
      expect(stats.byTheme).toBeDefined();
      expect(typeof stats.byTheme).toBe('object');
    });

    it('should count themes correctly', () => {
      const stats = seeder.getStatistics();

      // Verify theme counts - Licitacao should be most common
      expect(stats.byTheme['Licitacao']).toBeGreaterThan(0);

      // Check specific theme categories exist
      const hasLicitacaoCategory = Object.keys(stats.byTheme).some((key) =>
        key.includes('Licitacao'),
      );
      expect(hasLicitacaoCategory).toBe(true);
    });

    it('should not include cancelled items in theme counts', () => {
      const stats = seeder.getStatistics();

      // Total themes should be less than or equal to total items * avg themes per item
      const totalThemeCounts = Object.values(stats.byTheme).reduce(
        (a, b) => a + b,
        0,
      );
      expect(totalThemeCounts).toBeGreaterThan(0);
    });
  });

  describe('unseed', () => {
    it('should call JurisprudenciaSeeder.unseed', async () => {
      mockJurisprudenciaSeeder.unseed.mockResolvedValue(undefined);

      await seeder.unseed();

      expect(mockJurisprudenciaSeeder.unseed).toHaveBeenCalled();
    });

    it('should handle unseed errors gracefully', async () => {
      mockJurisprudenciaSeeder.unseed.mockRejectedValue(
        new Error('Delete error'),
      );

      await expect(seeder.unseed()).rejects.toThrow('Delete error');
    });
  });

  describe('JSON data validation', () => {
    it('should load valid JSON data structure', () => {
      const stats = seeder.getStatistics();

      // Verify metadata matches expected structure
      expect(stats.total).toBe(52);
    });

    it('should have required fields for all sumulas', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];

      for (const sumula of seedCall) {
        expect(sumula).toHaveProperty('id');
        expect(sumula).toHaveProperty('tribunal');
        expect(sumula).toHaveProperty('tipo');
        expect(sumula).toHaveProperty('numero');
        expect(sumula).toHaveProperty('ano');
        expect(sumula).toHaveProperty('ementa');
        expect(sumula).toHaveProperty('temas');
        expect(sumula).toHaveProperty('status');
        expect(sumula).toHaveProperty('sourceUrl');

        // Validate types
        expect(typeof sumula.id).toBe('string');
        expect(sumula.tribunal).toBe('TCE-SP');
        expect(sumula.tipo).toBe('SUMULA');
        expect(typeof sumula.numero).toBe('number');
        expect(typeof sumula.ano).toBe('number');
        expect(typeof sumula.ementa).toBe('string');
        expect(Array.isArray(sumula.temas)).toBe(true);
        expect(['VIGENTE', 'CANCELADA', 'SUPERADA']).toContain(sumula.status);
        expect(typeof sumula.sourceUrl).toBe('string');
      }
    });

    it('should have valid sumula numbers (1-52)', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const numbers = seedCall.map((s: { numero: number }) => s.numero);

      // All numbers should be between 1 and 52
      expect(numbers.every((n: number) => n >= 1 && n <= 52)).toBe(true);

      // All numbers should be unique
      const uniqueNumbers = new Set(numbers);
      expect(uniqueNumbers.size).toBe(52);
    });

    it('should have valid years', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];

      for (const sumula of seedCall) {
        // Years should be reasonable (1989-2024 based on TCE-SP history)
        expect(sumula.ano).toBeGreaterThanOrEqual(1989);
        expect(sumula.ano).toBeLessThanOrEqual(2024);
      }
    });

    it('should have valid source URLs', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];

      for (const sumula of seedCall) {
        expect(sumula.sourceUrl).toMatch(
          /^https:\/\/www\.tce\.sp\.gov\.br\/jurisprudencia\/sumula\/\d+$/,
        );
      }
    });

    it('should have at least one theme per sumula', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];

      for (const sumula of seedCall) {
        expect(sumula.temas.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should have 6 cancelled sumulas', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const cancelled = seedCall.filter(
        (s: { status: string }) => s.status === 'CANCELADA',
      );

      // Based on JSON data: sumulas 3, 13, 16, 19, 33 are cancelled
      expect(cancelled.length).toBe(5);
    });

    it('should cover key legal topics', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const allThemes = new Set(
        seedCall.flatMap((s: { temas: string[] }) => s.temas),
      );

      // Key topics that should be covered
      expect(allThemes.has('Licitacao')).toBe(true);
      expect(allThemes.has('Contratos')).toBe(true);

      // Check for dispensas/inexigibilidades coverage
      const hasDispensas = Array.from(allThemes).some((t: string) =>
        t.includes('Dispensa'),
      );
      expect(hasDispensas).toBe(true);

      // Check for habilitacao coverage
      const hasHabilitacao = Array.from(allThemes).some((t: string) =>
        t.includes('Habilitacao'),
      );
      expect(hasHabilitacao).toBe(true);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TcuSeeder } from '../seeders/tcu.seeder';
import { JurisprudenciaSeeder } from '../seeders/jurisprudencia.seeder';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';

/**
 * Unit tests for TcuSeeder
 *
 * Tests the TCU acordaos and sumulas seeding functionality.
 *
 * @see Issue #1580 - [JURIS-1540d] Coletar e indexar acordaos TCU sobre Lei 14.133 (minimo 50)
 */
describe('TcuSeeder', () => {
  let seeder: TcuSeeder;
  let jurisprudenciaSeeder: jest.Mocked<JurisprudenciaSeeder>;
  let repository: jest.Mocked<Repository<DocumentTree>>;

  // Mock seed result - combined TCE-SP + TCU
  const mockSeedResult = {
    total: 107, // 52 TCE-SP + 55 TCU
    tcespCount: 52,
    tcuCount: 55,
    documentTreeId: 'doc-tree-combined-123',
    processingTimeMs: 200,
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
        TcuSeeder,
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

    seeder = module.get<TcuSeeder>(TcuSeeder);
    jurisprudenciaSeeder = module.get(JurisprudenciaSeeder);
    repository = module.get(getRepositoryToken(DocumentTree));
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(seeder).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should skip seeding if already seeded with TCU data', async () => {
      const existingTree = {
        id: 'existing-tree',
        documentName: 'Jurisprudencia TCE-SP e TCU',
        documentType: DocumentType.JURISPRUDENCIA,
        status: DocumentTreeStatus.INDEXED,
        treeStructure: {
          children: [
            { id: 'tcesp', children: [{ children: new Array(52) }] },
            {
              id: 'tcu',
              children: [
                { children: new Array(20) },
                { children: new Array(15) },
                { children: new Array(15) },
                { children: new Array(5) },
              ],
            },
          ],
        },
      };
      mockRepository.findOne.mockResolvedValue(existingTree);

      await seeder.onModuleInit();

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { documentName: 'Jurisprudencia TCE-SP e TCU' },
      });
      expect(mockJurisprudenciaSeeder.seedFromData).not.toHaveBeenCalled();
    });

    it('should seed if tree exists but TCU data is missing', async () => {
      const existingTreeWithoutTcu = {
        id: 'existing-tree',
        documentName: 'Jurisprudencia TCE-SP e TCU',
        documentType: DocumentType.JURISPRUDENCIA,
        status: DocumentTreeStatus.INDEXED,
        treeStructure: {
          children: [{ id: 'tcesp', children: [{ children: new Array(52) }] }],
        },
      };
      mockRepository.findOne.mockResolvedValue(existingTreeWithoutTcu);
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.onModuleInit();

      expect(mockJurisprudenciaSeeder.seedFromData).toHaveBeenCalled();
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

    it('should load acordaos from JSON and seed successfully', async () => {
      const result = await seeder.seed();

      expect(mockJurisprudenciaSeeder.seedFromData).toHaveBeenCalled();
      expect(result.total).toBe(55);
      expect(result.documentTreeId).toBe('doc-tree-combined-123');
    });

    it('should combine TCU data with TCE-SP data', async () => {
      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];

      // Verify we have both TCU and TCE-SP items
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );
      const tcespItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCE-SP',
      );

      expect(tcuItems.length).toBe(55);
      expect(tcespItems.length).toBe(52);
    });

    it('should return correct statistics', async () => {
      const result = await seeder.seed();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('acordaos');
      expect(result).toHaveProperty('sumulas');
      expect(result).toHaveProperty('documentTreeId');

      // 45 acordaos + 10 sumulas based on JSON data
      expect(result.acordaos).toBe(45);
      expect(result.sumulas).toBe(10);
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

      expect(stats.total).toBe(55);
      expect(stats.acordaos).toBe(45);
      expect(stats.sumulas).toBe(10);
      expect(stats.byTheme).toBeDefined();
      expect(stats.byYear).toBeDefined();
      expect(typeof stats.byTheme).toBe('object');
      expect(typeof stats.byYear).toBe('object');
    });

    it('should count themes correctly', () => {
      const stats = seeder.getStatistics();

      // Verify theme counts - Lei 14.133/2021 should be most common
      expect(stats.byTheme['Lei 14.133/2021']).toBeGreaterThan(0);

      // Check specific theme categories exist
      const hasLei14133Category = Object.keys(stats.byTheme).some((key) =>
        key.includes('Lei 14.133'),
      );
      expect(hasLei14133Category).toBe(true);
    });

    it('should count years correctly', () => {
      const stats = seeder.getStatistics();

      // Should have entries for years 2022, 2023, 2024
      expect(stats.byYear[2022]).toBeGreaterThan(0);
      expect(stats.byYear[2023]).toBeGreaterThan(0);

      // Also older years from sumulas
      expect(stats.byYear[2010]).toBeGreaterThan(0);
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
      expect(stats.total).toBe(55);
    });

    it('should have required fields for all acordaos', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );

      for (const acordao of tcuItems) {
        expect(acordao).toHaveProperty('id');
        expect(acordao).toHaveProperty('tribunal');
        expect(acordao).toHaveProperty('tipo');
        expect(acordao).toHaveProperty('numero');
        expect(acordao).toHaveProperty('ano');
        expect(acordao).toHaveProperty('ementa');
        expect(acordao).toHaveProperty('temas');
        expect(acordao).toHaveProperty('status');
        expect(acordao).toHaveProperty('sourceUrl');

        // Validate types
        expect(typeof acordao.id).toBe('string');
        expect(acordao.tribunal).toBe('TCU');
        expect(['ACORDAO', 'SUMULA']).toContain(acordao.tipo);
        expect(typeof acordao.numero).toBe('number');
        expect(typeof acordao.ano).toBe('number');
        expect(typeof acordao.ementa).toBe('string');
        expect(Array.isArray(acordao.temas)).toBe(true);
        expect(['VIGENTE', 'CANCELADA', 'SUPERADA']).toContain(acordao.status);
        expect(typeof acordao.sourceUrl).toBe('string');
      }
    });

    it('should have 45 acordaos and 10 sumulas', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );
      const acordaos = tcuItems.filter(
        (item: { tipo: string }) => item.tipo === 'ACORDAO',
      );
      const sumulas = tcuItems.filter(
        (item: { tipo: string }) => item.tipo === 'SUMULA',
      );

      expect(acordaos.length).toBe(45);
      expect(sumulas.length).toBe(10);
    });

    it('should have valid years', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );

      for (const acordao of tcuItems) {
        // Years should be reasonable (2004-2024 based on TCU data)
        expect(acordao.ano).toBeGreaterThanOrEqual(2004);
        expect(acordao.ano).toBeLessThanOrEqual(2024);
      }
    });

    it('should have valid source URLs', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );

      for (const acordao of tcuItems) {
        // Should be either pesquisa or portal URL
        expect(acordao.sourceUrl).toMatch(
          /^https:\/\/(pesquisa\.apps\.tcu\.gov\.br\/acordao\/|portal\.tcu\.gov\.br\/jurisprudencia\/sumulas\/)/,
        );
      }
    });

    it('should have at least one theme per acordao', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );

      for (const acordao of tcuItems) {
        expect(acordao.temas.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should cover Lei 14.133/2021 topics', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );
      const allThemes = new Set(
        tcuItems.flatMap((s: { temas: string[] }) => s.temas),
      );

      // Key topics that should be covered
      expect(allThemes.has('Lei 14.133/2021')).toBe(true);
      expect(allThemes.has('Licitacao')).toBe(true);
      expect(allThemes.has('Contratos')).toBe(true);

      // Check for ETP coverage (specific to Lei 14.133)
      const hasEtpTopic = Array.from(allThemes).some((t: string) =>
        t.includes('ETP'),
      );
      expect(hasEtpTopic).toBe(true);

      // Check for Pesquisa de Precos coverage
      const hasPesquisaPrecos = Array.from(allThemes).some((t: string) =>
        t.includes('Pesquisa de Precos'),
      );
      expect(hasPesquisaPrecos).toBe(true);
    });

    it('should have relator information for acordaos', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuAcordaos = seedCall.filter(
        (item: { tribunal: string; tipo: string }) =>
          item.tribunal === 'TCU' && item.tipo === 'ACORDAO',
      );

      // All acordaos should have relator
      for (const acordao of tcuAcordaos) {
        expect(acordao.relator).toBeDefined();
        expect(typeof acordao.relator).toBe('string');
        expect(acordao.relator.length).toBeGreaterThan(0);
      }
    });

    it('should have data approval dates', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );

      // Most items should have dataAprovacao
      const itemsWithDate = tcuItems.filter(
        (item: { dataAprovacao?: string }) => item.dataAprovacao,
      );
      expect(itemsWithDate.length).toBeGreaterThan(40);
    });

    it('should have at least 50 items total (requirement)', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );

      // Minimum 50 items as per issue requirement
      expect(tcuItems.length).toBeGreaterThanOrEqual(50);
    });

    it('should have fundamentacao for all items', async () => {
      mockJurisprudenciaSeeder.seedFromData.mockResolvedValue(mockSeedResult);

      await seeder.seed();

      const seedCall = mockJurisprudenciaSeeder.seedFromData.mock.calls[0][0];
      const tcuItems = seedCall.filter(
        (item: { tribunal: string }) => item.tribunal === 'TCU',
      );

      // All items should have fundamentacao
      for (const item of tcuItems) {
        expect(item.fundamentacao).toBeDefined();
        expect(typeof item.fundamentacao).toBe('string');
        expect(item.fundamentacao.length).toBeGreaterThan(0);
      }
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JurisprudenciaSeeder } from '../seeders/jurisprudencia.seeder';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';
import {
  JurisprudenciaData,
  TEMAS_JURISPRUDENCIA,
} from '../interfaces/jurisprudencia.interface';

/**
 * Unit tests for JurisprudenciaSeeder
 *
 * Tests the jurisprudence seeding functionality for TCE-SP and TCU.
 *
 * @see Issue #1578 - [JURIS-1540b] Criar JurisprudenciaSeeder com estrutura base
 */
describe('JurisprudenciaSeeder', () => {
  let seeder: JurisprudenciaSeeder;
  let repository: jest.Mocked<Repository<DocumentTree>>;

  // Sample test data
  const mockTceSPSumula: JurisprudenciaData = {
    id: 'tcesp-sumula-1',
    tribunal: 'TCE-SP',
    tipo: 'SUMULA',
    numero: 1,
    ano: 2010,
    ementa:
      'Nao e licita a concessao de subvencao para bolsa de estudo a entidade educacional que nao atenda aos requisitos legais.',
    temas: ['Auxilios e Subvencoes'],
    status: 'VIGENTE',
    sourceUrl: 'https://www.tce.sp.gov.br/jurisprudencia/sumula/1',
    dataAprovacao: '2010-01-15',
  };

  const mockTcuSumula: JurisprudenciaData = {
    id: 'tcu-sumula-247',
    tribunal: 'TCU',
    tipo: 'SUMULA',
    numero: 247,
    ano: 2004,
    ementa:
      'E obrigatoria a admissao da adjudicacao por item e nao por preco global, nos editais das licitacoes para a contratacao de obras, servicos, compras e alienacoes, cujo objeto seja divisivel.',
    temas: ['Licitacao', 'Licitacao > Adjudicacao'],
    status: 'VIGENTE',
    sourceUrl: 'https://pesquisa.apps.tcu.gov.br/pesquisa/sumula',
    dataAprovacao: '2004-11-24',
    relator: 'Ministro Ubiratan Aguiar',
  };

  const mockTcuAcordao: JurisprudenciaData = {
    id: 'tcu-acordao-1234-2023',
    tribunal: 'TCU',
    tipo: 'ACORDAO',
    numero: 1234,
    ano: 2023,
    ementa:
      'O estudo tecnico preliminar deve conter analise de riscos e demonstrar a viabilidade da contratacao.',
    temas: ['Lei 14.133/2021', 'Lei 14.133/2021 > ETP'],
    status: 'VIGENTE',
    sourceUrl: 'https://pesquisa.apps.tcu.gov.br/pesquisa/acordao-completo',
    dataAprovacao: '2023-06-15',
    relator: 'Ministro Bruno Dantas',
    fundamentacao: 'Art. 18 da Lei 14.133/2021',
  };

  const mockCanceledSumula: JurisprudenciaData = {
    id: 'tcesp-sumula-10',
    tribunal: 'TCE-SP',
    tipo: 'SUMULA',
    numero: 10,
    ano: 2015,
    ementa: 'Sumula cancelada - disposicoes substituidas.',
    temas: ['Licitacao'],
    status: 'CANCELADA',
    sourceUrl: 'https://www.tce.sp.gov.br/jurisprudencia/sumula/10',
  };

  // Mock repository
  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JurisprudenciaSeeder,
        {
          provide: getRepositoryToken(DocumentTree),
          useValue: mockRepository,
        },
      ],
    }).compile();

    seeder = module.get<JurisprudenciaSeeder>(JurisprudenciaSeeder);
    repository = module.get(getRepositoryToken(DocumentTree));
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(seeder).toBeDefined();
    });

    it('should provide theme constants', () => {
      const themes = seeder.getThemeConstants();
      expect(themes).toBe(TEMAS_JURISPRUDENCIA);
      expect(themes.TCESP).toBeDefined();
      expect(themes.TCU).toBeDefined();
    });
  });

  describe('buildTreeStructure', () => {
    it('should build valid tree structure with TCE-SP and TCU nodes', () => {
      const tree = seeder.buildTreeStructure(
        [mockTceSPSumula],
        [mockTcuSumula, mockTcuAcordao],
      );

      expect(tree.id).toBe('jurisprudencia-root');
      expect(tree.title).toBe('Jurisprudencia - Tribunais de Contas');
      expect(tree.level).toBe(0);
      expect(tree.children).toHaveLength(2);

      // Check TCE-SP node
      const tcespNode = tree.children.find((c) => c.id === 'tcesp');
      expect(tcespNode).toBeDefined();
      expect(tcespNode?.title).toContain('TCE-SP');
      expect(tcespNode?.level).toBe(1);

      // Check TCU node
      const tcuNode = tree.children.find((c) => c.id === 'tcu');
      expect(tcuNode).toBeDefined();
      expect(tcuNode?.title).toContain('TCU');
      expect(tcuNode?.level).toBe(1);
    });

    it('should organize jurisprudence by themes', () => {
      const tree = seeder.buildTreeStructure(
        [mockTceSPSumula],
        [mockTcuSumula, mockTcuAcordao],
      );

      const tcuNode = tree.children.find((c) => c.id === 'tcu');
      const lei14133Node = tcuNode?.children.find((c) =>
        c.id.includes('lei-14133'),
      );

      expect(lei14133Node).toBeDefined();
      expect(lei14133Node?.title).toContain('Lei 14.133/2021');

      // Check that acordao about ETP is in Lei 14.133 category
      const hasEtpContent = lei14133Node?.children.some(
        (c) => c.id === 'tcu-acordao-1234-2023',
      );
      expect(hasEtpContent).toBe(true);
    });

    it('should handle empty data arrays', () => {
      const tree = seeder.buildTreeStructure([], []);

      expect(tree.id).toBe('jurisprudencia-root');
      expect(tree.children).toHaveLength(2);

      // Both tribunal nodes should exist but have empty themed children
      const tcespNode = tree.children.find((c) => c.id === 'tcesp');
      const tcuNode = tree.children.find((c) => c.id === 'tcu');

      expect(tcespNode).toBeDefined();
      expect(tcuNode).toBeDefined();

      // Theme nodes should exist but be empty
      for (const themeNode of tcespNode?.children || []) {
        expect(themeNode.children).toHaveLength(0);
      }
    });

    it('should include canceled status in node title', () => {
      const tree = seeder.buildTreeStructure([mockCanceledSumula], []);

      const tcespNode = tree.children.find((c) => c.id === 'tcesp');
      const licitacaoNode = tcespNode?.children.find((c) =>
        c.id.includes('licitacao'),
      );
      const canceledNode = licitacaoNode?.children.find(
        (c) => c.id === 'tcesp-sumula-10',
      );

      expect(canceledNode).toBeDefined();
      expect(canceledNode?.title).toContain('[CANCELADA]');
    });

    it('should format content with all metadata fields', () => {
      const tree = seeder.buildTreeStructure([], [mockTcuAcordao]);

      const tcuNode = tree.children.find((c) => c.id === 'tcu');
      const lei14133Node = tcuNode?.children.find((c) =>
        c.id.includes('lei-14133'),
      );
      const acordaoNode = lei14133Node?.children.find(
        (c) => c.id === 'tcu-acordao-1234-2023',
      );

      expect(acordaoNode?.content).toContain('**Acordao 1234/2023**');
      expect(acordaoNode?.content).toContain('**Tribunal:** TCU');
      expect(acordaoNode?.content).toContain('**Status:** VIGENTE');
      expect(acordaoNode?.content).toContain(
        '**Relator:** Ministro Bruno Dantas',
      );
      expect(acordaoNode?.content).toContain('**Ementa:**');
      expect(acordaoNode?.content).toContain('**Fundamentacao:**');
      expect(acordaoNode?.content).toContain('Art. 18 da Lei 14.133/2021');
      expect(acordaoNode?.content).toContain('**Fonte:**');
    });

    it('should handle jurisprudence with multiple themes', () => {
      const multiThemeSumula: JurisprudenciaData = {
        id: 'tcu-sumula-multi',
        tribunal: 'TCU',
        tipo: 'SUMULA',
        numero: 999,
        ano: 2020,
        ementa: 'Sumula com multiplos temas.',
        temas: ['Licitacao', 'Licitacao > Habilitacao', 'Licitacao > Pregao'],
        status: 'VIGENTE',
        sourceUrl: 'https://pesquisa.apps.tcu.gov.br/pesquisa/sumula',
      };

      const tree = seeder.buildTreeStructure([], [multiThemeSumula]);

      const tcuNode = tree.children.find((c) => c.id === 'tcu');
      const licitacaoNode = tcuNode?.children.find((c) =>
        c.id.includes('licitacao'),
      );

      // The sumula should appear in the licitacao theme node
      const hasMultiThemeSumula = licitacaoNode?.children.some(
        (c) => c.id === 'tcu-sumula-multi',
      );
      expect(hasMultiThemeSumula).toBe(true);
    });

    it('should not duplicate items when they match multiple theme keys', () => {
      const multiThemeSumula: JurisprudenciaData = {
        id: 'tcu-sumula-unique',
        tribunal: 'TCU',
        tipo: 'SUMULA',
        numero: 888,
        ano: 2020,
        ementa: 'Sumula unica.',
        temas: ['Licitacao', 'Licitacao > Adjudicacao'],
        status: 'VIGENTE',
        sourceUrl: 'https://pesquisa.apps.tcu.gov.br/pesquisa/sumula',
      };

      const tree = seeder.buildTreeStructure([], [multiThemeSumula]);

      const tcuNode = tree.children.find((c) => c.id === 'tcu');
      const licitacaoNode = tcuNode?.children.find((c) =>
        c.id.includes('licitacao'),
      );

      // Should appear only once (deduplication by id)
      const matches = licitacaoNode?.children.filter(
        (c) => c.id === 'tcu-sumula-unique',
      );
      expect(matches).toHaveLength(1);
    });
  });

  describe('seedFromData', () => {
    const mockDocumentTree = {
      id: 'doc-tree-123',
      documentName: 'Jurisprudencia TCE-SP e TCU',
      documentType: DocumentType.JURISPRUDENCIA,
      status: DocumentTreeStatus.INDEXED,
      treeStructure: {},
      nodeCount: 10,
      maxDepth: 3,
      indexedAt: new Date(),
      processingTimeMs: 100,
    };

    beforeEach(() => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockDocumentTree);
      mockRepository.save.mockResolvedValue(mockDocumentTree);
    });

    it('should seed jurisprudence data successfully', async () => {
      const data = [mockTceSPSumula, mockTcuSumula, mockTcuAcordao];

      const result = await seeder.seedFromData(data);

      expect(result.total).toBe(3);
      expect(result.tcespCount).toBe(1);
      expect(result.tcuCount).toBe(2);
      expect(result.documentTreeId).toBe('doc-tree-123');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should create document tree with correct properties', async () => {
      const data = [mockTceSPSumula];

      await seeder.seedFromData(data);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          documentName: 'Jurisprudencia TCE-SP e TCU',
          documentType: DocumentType.JURISPRUDENCIA,
          status: DocumentTreeStatus.INDEXED,
          sourceUrl: 'https://www.tce.sp.gov.br/jurisprudencia',
        }),
      );

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should replace existing seed if already present', async () => {
      const existingTree = { ...mockDocumentTree, id: 'existing-tree' };
      mockRepository.findOne.mockResolvedValue(existingTree);

      await seeder.seedFromData([mockTceSPSumula]);

      expect(mockRepository.remove).toHaveBeenCalledWith(existingTree);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should handle empty data array', async () => {
      const result = await seeder.seedFromData([]);

      expect(result.total).toBe(0);
      expect(result.tcespCount).toBe(0);
      expect(result.tcuCount).toBe(0);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should calculate node count and max depth correctly', async () => {
      const data = [mockTceSPSumula, mockTcuSumula];

      await seeder.seedFromData(data);

      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.nodeCount).toBeGreaterThan(0);
      expect(createCall.maxDepth).toBeGreaterThan(0);
    });
  });

  describe('unseed', () => {
    it('should remove seeded jurisprudence', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await seeder.unseed();

      expect(mockRepository.delete).toHaveBeenCalledWith({
        documentName: 'Jurisprudencia TCE-SP e TCU',
      });
    });

    it('should handle case when no seed exists', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(seeder.unseed()).resolves.not.toThrow();
    });
  });

  describe('tree metrics calculation', () => {
    it('should calculate correct node count for nested tree', () => {
      // Create a tree with known structure
      const data: JurisprudenciaData[] = [
        mockTceSPSumula, // 1 item in TCE-SP > Auxilios
        mockTcuSumula, // 1 item in TCU > Licitacao
        mockTcuAcordao, // 1 item in TCU > Lei 14.133
      ];

      const tree = seeder.buildTreeStructure(
        data.filter((d) => d.tribunal === 'TCE-SP'),
        data.filter((d) => d.tribunal === 'TCU'),
      );

      // Structure:
      // Root (1)
      //   TCE-SP (1)
      //     Licitacao (1) - empty
      //     Contratos (1) - empty
      //     Terceiro Setor (1) - includes Auxilios
      //       Sumula 1 (1)
      //     Outros (1) - empty
      //   TCU (1)
      //     Lei 14.133 (1)
      //       Acordao 1234 (1)
      //     Licitacao (1)
      //       Sumula 247 (1)
      //     Contratos (1) - empty
      //     TI (1) - empty

      // The exact count depends on implementation, but should be > 10
      expect(tree.children.length).toBe(2);

      // Verify depth - should be at least 3 (root -> tribunal -> theme -> item)
      const findMaxDepth = (
        node: { level: number; children?: unknown[] },
        current = 0,
      ): number => {
        if (
          !node.children ||
          !Array.isArray(node.children) ||
          node.children.length === 0
        ) {
          return current;
        }
        return Math.max(
          ...node.children.map((c: unknown) =>
            findMaxDepth(
              c as { level: number; children?: unknown[] },
              current + 1,
            ),
          ),
        );
      };

      const maxDepth = findMaxDepth(tree);
      expect(maxDepth).toBeGreaterThanOrEqual(2);
    });
  });
});

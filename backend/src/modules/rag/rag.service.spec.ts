import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RAGService } from './rag.service';
import {
  Legislation,
  LegislationType,
} from '../../entities/legislation.entity';

/**
 * Unit tests for RAGService
 *
 * Tests RAG functionality for legislation indexing and search:
 * - createEmbedding() - OpenAI embedding generation
 * - indexLegislation() - Legislation indexing with embeddings
 * - findSimilar() - Vector similarity search
 * - verifyReference() - Legal reference verification
 * - getAllLegislation() - List all legislation
 * - getLegislationById() - Get specific legislation
 * - deleteLegislation() - Soft delete legislation
 * - getStats() - RAG statistics
 *
 * @see Issue #211 - PoC RAG com Lei 14.133/2021
 */
describe('RAGService', () => {
  let service: RAGService;
  let legislationRepository: Repository<Legislation>;

  // Mock data
  const mockLegislation: Legislation = {
    id: 'leg-123',
    type: LegislationType.LEI,
    number: '14.133',
    year: 2021,
    title: 'Lei de Licitações e Contratos Administrativos',
    content: 'Dispõe sobre licitações e contratos administrativos...',
    embedding: '',
    articles: [
      {
        number: '1',
        content: 'Esta Lei estabelece normas gerais de licitação...',
      },
    ],
    sourceUrl: 'https://planalto.gov.br/lei14133',
    isActive: true,
    createdAt: new Date('2025-11-01T10:00:00Z'),
    updatedAt: new Date('2025-11-01T10:00:00Z'),
    getFormattedReference: () => 'Lei 14.133/2021',
  };

  const mockEmbedding = new Array(1536).fill(0.1); // Mock 1536-dim vector
  const mockEmbeddingString = `[${mockEmbedding.join(',')}]`;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RAGService,
        {
          provide: getRepositoryToken(Legislation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RAGService>(RAGService);
    legislationRepository = module.get<Repository<Legislation>>(
      getRepositoryToken(Legislation),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmbedding', () => {
    it('should generate embedding vector from text', async () => {
      // Mock OpenAI embeddings API
      jest
        .spyOn(service as any, 'createEmbedding')
        .mockResolvedValue(mockEmbedding);

      const text = 'Lei 14.133/2021: Nova Lei de Licitações';
      const embedding = await service.createEmbedding(text);

      expect(embedding).toHaveLength(1536);
      expect(embedding[0]).toBe(0.1);
    });

    it('should handle OpenAI API errors', async () => {
      jest
        .spyOn(service as any, 'createEmbedding')
        .mockRejectedValue(new Error('OpenAI API error'));

      await expect(service.createEmbedding('test')).rejects.toThrow(
        'OpenAI API error',
      );
    });
  });

  describe('indexLegislation', () => {
    it('should index legislation with embedding', async () => {
      const mockCreate = jest.fn().mockReturnValue(mockLegislation);
      jest
        .spyOn(legislationRepository, 'create')
        .mockImplementation(mockCreate);
      jest.spyOn(legislationRepository, 'save').mockResolvedValue({
        ...mockLegislation,
        embedding: mockEmbeddingString,
        getFormattedReference: () => 'Lei 14.133/2021',
      } as Legislation);
      jest.spyOn(service, 'createEmbedding').mockResolvedValue(mockEmbedding);

      const result = await service.indexLegislation(mockLegislation);

      expect(service.createEmbedding).toHaveBeenCalledWith(
        'lei 14.133/2021: Lei de Licitações e Contratos Administrativos',
      );
      expect(legislationRepository.save).toHaveBeenCalled();
      expect(result.embedding).toBe(mockEmbeddingString);
    });
  });

  describe('findSimilar', () => {
    it('should find similar legislation by vector similarity', async () => {
      const mockResults = [
        {
          ...mockLegislation,
          similarity: 0.95,
        },
      ];

      jest.spyOn(service, 'createEmbedding').mockResolvedValue(mockEmbedding);
      mockQueryBuilder.getRawMany.mockResolvedValue(mockResults);
      jest
        .spyOn(legislationRepository, 'create')
        .mockReturnValue(mockLegislation);

      const results = await service.findSimilar('licitações', 5, 0.7);

      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.95);
      expect(results[0].legislation).toEqual(mockLegislation);
    });

    it('should respect similarity threshold', async () => {
      jest.spyOn(service, 'createEmbedding').mockResolvedValue(mockEmbedding);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const results = await service.findSimilar('licitações', 5, 0.95);

      expect(results).toHaveLength(0);
    });
  });

  describe('verifyReference', () => {
    it('should verify existing legal reference', async () => {
      jest
        .spyOn(legislationRepository, 'findOne')
        .mockResolvedValue(mockLegislation);

      const result = await service.verifyReference(
        LegislationType.LEI,
        '14.133',
        2021,
      );

      expect(result.exists).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.legislation).toEqual(mockLegislation);
      expect(result.reference).toBe('lei 14.133/2021');
    });

    it('should handle non-existing reference', async () => {
      jest.spyOn(legislationRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(service, 'findSimilar').mockResolvedValue([]);

      const result = await service.verifyReference(
        LegislationType.LEI,
        '99.999',
        2099,
      );

      expect(result.exists).toBe(false);
      expect(result.confidence).toBe(0.0);
      expect(result.legislation).toBeUndefined();
    });

    it('should suggest similar legislation when exact match not found', async () => {
      jest.spyOn(legislationRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(service, 'findSimilar').mockResolvedValue([
        {
          legislation: mockLegislation,
          similarity: 0.85,
        },
      ]);

      const result = await service.verifyReference(
        LegislationType.LEI,
        '14.134',
        2021,
      );

      expect(result.exists).toBe(false);
      expect(result.suggestion).toContain('Lei 14.133/2021');
      expect(result.suggestion).toContain('85%');
    });
  });

  describe('getAllLegislation', () => {
    it('should return all active legislation', async () => {
      jest
        .spyOn(legislationRepository, 'find')
        .mockResolvedValue([mockLegislation]);

      const result = await service.getAllLegislation();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockLegislation);
      expect(legislationRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { year: 'DESC', number: 'ASC' },
      });
    });
  });

  describe('getLegislationById', () => {
    it('should return legislation by ID', async () => {
      jest
        .spyOn(legislationRepository, 'findOne')
        .mockResolvedValue(mockLegislation);

      const result = await service.getLegislationById('leg-123');

      expect(result).toEqual(mockLegislation);
      expect(legislationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'leg-123', isActive: true },
      });
    });

    it('should return null for non-existing ID', async () => {
      jest.spyOn(legislationRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getLegislationById('non-existing');

      expect(result).toBeNull();
    });
  });

  describe('deleteLegislation', () => {
    it('should soft delete legislation', async () => {
      jest.spyOn(legislationRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await service.deleteLegislation('leg-123');

      expect(legislationRepository.update).toHaveBeenCalledWith('leg-123', {
        isActive: false,
      });
    });
  });

  describe('getStats', () => {
    it('should return RAG statistics', async () => {
      jest
        .spyOn(legislationRepository, 'count')
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8); // with embeddings

      mockQueryBuilder.getRawMany.mockResolvedValue([
        { type: 'lei', count: '5' },
        { type: 'decreto', count: '3' },
        { type: 'portaria', count: '2' },
      ]);

      const stats = await service.getStats();

      expect(stats.total).toBe(10);
      expect(stats.withEmbeddings).toBe(8);
      expect(stats.byType).toEqual({
        lei: 5,
        decreto: 3,
        portaria: 2,
      });
    });
  });

  describe('Legislation entity', () => {
    it('should format reference correctly', () => {
      expect(mockLegislation.getFormattedReference()).toBe('Lei 14.133/2021');
    });
  });
});

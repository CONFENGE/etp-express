/**
 * Tests for EditalExtractionService
 *
 * @see Issue #1695 - [INTEL-1545b] Implementar EditalExtractionService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EditalExtractionService } from './edital-extraction.service';
import { TreeSearchService } from './tree-search.service';
import { OpenAIService } from '../../orchestrator/llm/openai.service';
import { EditalTipo } from '../dto/edital-extracted-data.dto';
import { TreeSearchResult } from '../interfaces/tree-node.interface';

describe('EditalExtractionService', () => {
  let service: EditalExtractionService;
  let treeSearchService: jest.Mocked<TreeSearchService>;
  let openAIService: jest.Mocked<OpenAIService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditalExtractionService,
        {
          provide: TreeSearchService,
          useValue: {
            search: jest.fn(),
          },
        },
        {
          provide: OpenAIService,
          useValue: {
            generateCompletion: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EditalExtractionService>(EditalExtractionService);
    treeSearchService = module.get(TreeSearchService);
    openAIService = module.get(OpenAIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('extractStructuredData', () => {
    it('should extract data from a Pregão edital successfully', async () => {
      // Mock tree search result
      const mockSearchResult: TreeSearchResult = {
        relevantNodes: [
          {
            id: 'node-1',
            title: 'Objeto da Licitação',
            content:
              'Aquisição de equipamentos de informática conforme especificações',
            level: 1,
            children: [],
          },
          {
            id: 'node-2',
            title: 'Lote 1 - Computadores',
            content:
              'Lote 1: Computadores Desktop\nItem 1: Computador Desktop Core i5, 8GB RAM, 256GB SSD\nQuantidade: 50 unidades\nPreço unitário estimado: R$ 3.500,00',
            level: 2,
            children: [],
          },
        ],
        path: ['Edital', 'Objeto da Licitação'],
        confidence: 0.95,
        reasoning: 'Found relevant sections with procurement details',
        searchTimeMs: 150,
      };

      treeSearchService.search.mockResolvedValue(mockSearchResult);

      // Mock LLM response
      const mockLLMResponse = {
        tipo: 'PREGAO',
        objeto: 'Aquisição de equipamentos de informática',
        lotes: [
          {
            numero: 1,
            descricao: 'Computadores Desktop',
            itens: [
              {
                codigo: 'ITEM-001',
                descricao: 'Computador Desktop Core i5, 8GB RAM, 256GB SSD',
                quantidade: 50,
                unidade: 'unidade',
                precoUnitario: 3500.0,
                precoTotal: 175000.0,
              },
            ],
          },
        ],
        valorTotal: 175000.0,
        prazoExecucao: 60,
        numeroProcesso: '2024/001',
      };

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
        tokens: 300,
        model: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      // Execute extraction
      const result = await service.extractStructuredData(
        'test-tree-id',
        EditalTipo.PREGAO,
      );

      // Assertions
      expect(result.data.tipo).toBe(EditalTipo.PREGAO);
      expect(result.data.objeto).toBe('Aquisição de equipamentos de informática');
      expect(result.data.lotes).toHaveLength(1);
      expect(result.data.lotes[0].itens).toHaveLength(1);
      expect(result.data.lotes[0].itens[0].quantidade).toBe(50);
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.isValid).toBe(true);
      expect(result.requiresManualReview).toBe(false);
      expect(treeSearchService.search).toHaveBeenCalledWith(
        'test-tree-id',
        expect.stringContaining('objeto da licitação'),
        expect.objectContaining({
          maxDepth: 5,
          maxResults: 10,
        }),
      );
      expect(openAIService.generateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.2,
        }),
      );
    });

    it('should flag for manual review when confidence is low', async () => {
      // Mock tree search result with minimal data
      const mockSearchResult: TreeSearchResult = {
        relevantNodes: [
          {
            id: 'node-1',
            title: 'Edital',
            content: 'Edital de pregão',
            level: 1,
            children: [],
          },
        ],
        path: ['Edital'],
        confidence: 0.4,
        reasoning: 'Limited information found',
        searchTimeMs: 100,
      };

      treeSearchService.search.mockResolvedValue(mockSearchResult);

      // Mock LLM response with incomplete data
      const mockLLMResponse = {
        tipo: 'PREGAO',
        objeto: 'Pregão',
        lotes: [],
      };

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
        tokens: 100,
        model: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      // Execute extraction
      const result = await service.extractStructuredData(
        'test-tree-id',
        EditalTipo.PREGAO,
      );

      // Assertions
      expect(result.confidence).toBeLessThan(80);
      expect(result.requiresManualReview).toBe(true);
      expect(result.errors).toContain('No lotes found');
    });

    it('should handle Concorrência edital type', async () => {
      // Mock tree search result
      const mockSearchResult: TreeSearchResult = {
        relevantNodes: [
          {
            id: 'node-1',
            title: 'Objeto',
            content: 'Construção de obras de infraestrutura',
            level: 1,
            children: [],
          },
        ],
        path: ['Edital', 'Objeto'],
        confidence: 0.9,
        reasoning: 'Found object section',
        searchTimeMs: 120,
      };

      treeSearchService.search.mockResolvedValue(mockSearchResult);

      // Mock LLM response
      const mockLLMResponse = {
        tipo: 'CONCORRENCIA',
        objeto: 'Construção de obras de infraestrutura',
        lotes: [
          {
            numero: 1,
            descricao: 'Pavimentação',
            itens: [
              {
                codigo: 'SINAPI-001',
                descricao: 'Pavimentação asfáltica',
                quantidade: 1000,
                unidade: 'm²',
              },
            ],
          },
        ],
      };

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
        tokens: 250,
        model: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      // Execute extraction
      const result = await service.extractStructuredData(
        'test-tree-id',
        EditalTipo.CONCORRENCIA,
      );

      // Assertions
      expect(result.data.tipo).toBe(EditalTipo.CONCORRENCIA);
      expect(result.data.lotes[0].descricao).toBe('Pavimentação');
      expect(treeSearchService.search).toHaveBeenCalledWith(
        'test-tree-id',
        expect.stringContaining('concorrência pública'),
        expect.any(Object),
      );
    });

    it('should parse LLM response with markdown code blocks', async () => {
      // Mock tree search result
      const mockSearchResult: TreeSearchResult = {
        relevantNodes: [
          {
            id: 'node-1',
            title: 'Licitação',
            content: 'Detalhes da licitação',
            level: 1,
            children: [],
          },
        ],
        path: ['Licitação'],
        confidence: 0.85,
        reasoning: 'Found licitação section',
        searchTimeMs: 110,
      };

      treeSearchService.search.mockResolvedValue(mockSearchResult);

      // Mock LLM response with markdown code block
      const mockLLMResponseWithCodeBlock = `\`\`\`json
{
  "tipo": "PREGAO",
  "objeto": "Aquisição de materiais",
  "lotes": [
    {
      "numero": 1,
      "descricao": "Materiais de escritório",
      "itens": [
        {
          "codigo": "MAT-001",
          "descricao": "Papel A4",
          "quantidade": 100,
          "unidade": "resma"
        }
      ]
    }
  ]
}
\`\`\``;

      openAIService.generateCompletion.mockResolvedValue({
        content: mockLLMResponseWithCodeBlock,
        tokens: 250,
        model: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      // Execute extraction
      const result = await service.extractStructuredData(
        'test-tree-id',
        EditalTipo.PREGAO,
      );

      // Assertions
      expect(result.data.objeto).toBe('Aquisição de materiais');
      expect(result.data.lotes[0].itens[0].descricao).toBe('Papel A4');
    });

    it('should throw error when no relevant sections found', async () => {
      // Mock empty tree search result
      const mockSearchResult: TreeSearchResult = {
        relevantNodes: [],
        path: ['Edital'],
        confidence: 0,
        reasoning: 'No relevant sections',
        searchTimeMs: 50,
      };

      treeSearchService.search.mockResolvedValue(mockSearchResult);

      // Execute extraction and expect error
      await expect(
        service.extractStructuredData('test-tree-id', EditalTipo.PREGAO),
      ).rejects.toThrow('No relevant sections found');
    });

    it('should validate item structure correctly', async () => {
      // Mock tree search result
      const mockSearchResult: TreeSearchResult = {
        relevantNodes: [
          {
            id: 'node-1',
            title: 'Itens',
            content: 'Lista de itens',
            level: 1,
            children: [],
          },
        ],
        path: ['Itens'],
        confidence: 0.9,
        reasoning: 'Found items section',
        searchTimeMs: 100,
      };

      treeSearchService.search.mockResolvedValue(mockSearchResult);

      // Mock LLM response with invalid item (missing required fields)
      const mockLLMResponse = {
        tipo: 'PREGAO',
        objeto: 'Teste',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1',
            itens: [
              {
                codigo: 'ITEM-001',
                descricao: 'Item válido',
                quantidade: 10,
                unidade: 'un',
              },
              {
                // Missing required fields - should be filtered out
                descricao: 'Item inválido',
              },
            ],
          },
        ],
      };

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
        tokens: 250,
        model: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      // Execute extraction
      const result = await service.extractStructuredData(
        'test-tree-id',
        EditalTipo.PREGAO,
      );

      // Assertions - invalid item should be filtered out
      expect(result.data.lotes[0].itens).toHaveLength(1);
      expect(result.data.lotes[0].itens[0].codigo).toBe('ITEM-001');
    });

    it('should compute accurate confidence scores', async () => {
      // Mock tree search result
      const mockSearchResult: TreeSearchResult = {
        relevantNodes: [
          {
            id: 'node-1',
            title: 'Edital',
            content: 'Conteúdo do edital',
            level: 1,
            children: [],
          },
        ],
        path: ['Edital'],
        confidence: 0.95,
        reasoning: 'Found edital',
        searchTimeMs: 100,
      };

      treeSearchService.search.mockResolvedValue(mockSearchResult);

      // Test case 1: Complete data - high confidence
      const completeData = {
        tipo: 'PREGAO',
        objeto: 'Objeto completo e detalhado da licitação',
        lotes: [
          {
            numero: 1,
            descricao: 'Lote 1 com descrição completa',
            itens: [
              {
                codigo: 'ITEM-001',
                descricao: 'Item com descrição detalhada',
                quantidade: 50,
                unidade: 'unidade',
                precoUnitario: 100.0,
                precoTotal: 5000.0,
              },
            ],
          },
        ],
        valorTotal: 5000.0,
        prazoExecucao: 60,
        numeroProcesso: '2024/001',
      };

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify(completeData),
        tokens: 300,
        model: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      const result1 = await service.extractStructuredData(
        'test-tree-id',
        EditalTipo.PREGAO,
      );

      expect(result1.confidence).toBeGreaterThanOrEqual(90);
      expect(result1.requiresManualReview).toBe(false);

      // Test case 2: Minimal data - lower confidence
      const minimalData = {
        tipo: 'PREGAO',
        objeto: 'Obj',
        lotes: [
          {
            numero: 1,
            descricao: 'L1',
            itens: [
              {
                codigo: 'I1',
                descricao: 'It',
                quantidade: 1,
                unidade: 'un',
              },
            ],
          },
        ],
      };

      openAIService.generateCompletion.mockResolvedValue({
        content: JSON.stringify(minimalData),
        tokens: 150,
        model: 'gpt-4o-mini',
        finishReason: 'stop',
      });

      const result2 = await service.extractStructuredData(
        'test-tree-id',
        EditalTipo.PREGAO,
      );

      expect(result2.confidence).toBeLessThan(80);
      expect(result2.requiresManualReview).toBe(true);
      expect(result2.errors.length).toBeGreaterThan(0);
    });
  });
});

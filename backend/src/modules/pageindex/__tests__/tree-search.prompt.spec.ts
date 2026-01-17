import {
  TREE_SEARCH_SYSTEM_PROMPT,
  buildTreeNavigationPrompt,
  buildExtractionPrompt,
  DEFAULT_TREE_SEARCH_OPTIONS,
} from '../prompts/tree-search.prompt';

/**
 * Unit tests for tree search prompts
 *
 * Tests the prompt generation functions for LLM-based tree navigation.
 *
 * @see Issue #1553 - [PI-1538d] Implementar TreeSearchService com LLM reasoning
 */
describe('Tree Search Prompts', () => {
  describe('TREE_SEARCH_SYSTEM_PROMPT', () => {
    it('should be defined and non-empty', () => {
      expect(TREE_SEARCH_SYSTEM_PROMPT).toBeDefined();
      expect(TREE_SEARCH_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('should include navigation rules', () => {
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('Análise Sistemática');
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('Decisão Fundamentada');
    });

    it('should specify JSON response format', () => {
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('JSON');
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('EXPLORE');
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('FOUND');
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('NOT_FOUND');
    });

    it('should include document type knowledge', () => {
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('Legislação');
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('Contratos');
      expect(TREE_SEARCH_SYSTEM_PROMPT).toContain('Editais');
    });
  });

  describe('buildTreeNavigationPrompt', () => {
    const sampleNodes = [
      { id: 'node-1', title: 'Capítulo 1 - Introdução' },
      { id: 'node-2', title: 'Capítulo 2 - Definições', summary: 'Termos e conceitos' },
      { id: 'node-3', title: 'Capítulo 3 - Procedimentos' },
    ];

    it('should include the user query', () => {
      const prompt = buildTreeNavigationPrompt(
        'Qual o prazo de validade?',
        0,
        sampleNodes,
        [],
      );

      expect(prompt).toContain('Qual o prazo de validade?');
    });

    it('should include current level', () => {
      const prompt = buildTreeNavigationPrompt(
        'Test query',
        2,
        sampleNodes,
        ['Root', 'Title'],
      );

      expect(prompt).toContain('Nível Atual: 2');
    });

    it('should include all nodes with IDs', () => {
      const prompt = buildTreeNavigationPrompt(
        'Test query',
        0,
        sampleNodes,
        [],
      );

      expect(prompt).toContain('[node-1]');
      expect(prompt).toContain('[node-2]');
      expect(prompt).toContain('[node-3]');
      expect(prompt).toContain('Capítulo 1 - Introdução');
      expect(prompt).toContain('Capítulo 2 - Definições');
    });

    it('should include node summaries when available', () => {
      const prompt = buildTreeNavigationPrompt(
        'Test query',
        0,
        sampleNodes,
        [],
      );

      expect(prompt).toContain('Termos e conceitos');
    });

    it('should display path when provided', () => {
      const prompt = buildTreeNavigationPrompt(
        'Test query',
        2,
        sampleNodes,
        ['Lei 14.133', 'Título I', 'Capítulo I'],
      );

      expect(prompt).toContain('Caminho atual: Lei 14.133 > Título I > Capítulo I');
    });

    it('should not display path when empty', () => {
      const prompt = buildTreeNavigationPrompt(
        'Test query',
        0,
        sampleNodes,
        [],
      );

      expect(prompt).not.toContain('Caminho atual:');
    });

    it('should include JSON instruction', () => {
      const prompt = buildTreeNavigationPrompt(
        'Test query',
        0,
        sampleNodes,
        [],
      );

      expect(prompt).toContain('Responda em JSON');
    });
  });

  describe('buildExtractionPrompt', () => {
    const sampleNodes = [
      {
        id: 'art-75',
        title: 'Art. 75 - Dispensa de Licitação',
        content: 'É dispensável a licitação: I - para valores inferiores...',
      },
      {
        id: 'art-76',
        title: 'Art. 76 - Inexigibilidade',
        content: 'É inexigível a licitação quando houver inviabilidade...',
      },
    ];

    it('should include the user query', () => {
      const prompt = buildExtractionPrompt(
        'Quando posso dispensar licitação?',
        sampleNodes,
        ['Lei 14.133', 'Título II', 'Capítulo II'],
      );

      expect(prompt).toContain('Quando posso dispensar licitação?');
    });

    it('should include node titles and content', () => {
      const prompt = buildExtractionPrompt(
        'Test query',
        sampleNodes,
        ['Root'],
      );

      expect(prompt).toContain('Art. 75 - Dispensa de Licitação');
      expect(prompt).toContain('É dispensável a licitação');
      expect(prompt).toContain('Art. 76 - Inexigibilidade');
    });

    it('should include the navigation path', () => {
      const prompt = buildExtractionPrompt(
        'Test query',
        sampleNodes,
        ['Lei 14.133', 'Título II'],
      );

      expect(prompt).toContain('via: Lei 14.133 > Título II');
    });

    it('should handle nodes without content', () => {
      const nodesWithoutContent = [
        { id: 'node-1', title: 'Node without content' },
      ];

      const prompt = buildExtractionPrompt(
        'Test query',
        nodesWithoutContent,
        ['Root'],
      );

      expect(prompt).toContain('(sem conteúdo detalhado)');
    });

    it('should request JSON response format', () => {
      const prompt = buildExtractionPrompt(
        'Test query',
        sampleNodes,
        ['Root'],
      );

      expect(prompt).toContain('Responda em JSON');
      expect(prompt).toContain('answer');
      expect(prompt).toContain('citedSections');
      expect(prompt).toContain('confidence');
    });
  });

  describe('DEFAULT_TREE_SEARCH_OPTIONS', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_TREE_SEARCH_OPTIONS.maxDepth).toBe(6);
      expect(DEFAULT_TREE_SEARCH_OPTIONS.maxResults).toBe(5);
      expect(DEFAULT_TREE_SEARCH_OPTIONS.minConfidence).toBe(0.5);
      expect(DEFAULT_TREE_SEARCH_OPTIONS.includeContent).toBe(false);
    });

    it('should have iteration limit', () => {
      expect(DEFAULT_TREE_SEARCH_OPTIONS.maxIterations).toBe(10);
    });

    it('should have temperature settings', () => {
      expect(DEFAULT_TREE_SEARCH_OPTIONS.temperatureLow).toBeLessThan(0.5);
      expect(DEFAULT_TREE_SEARCH_OPTIONS.temperatureHigh).toBeLessThan(1);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadSectionTemplates,
  getSectionTemplates,
  clearTemplatesCache,
} from './section-templates';
import type { SectionTemplate } from '../types/etp';

// Mock logger to prevent actual Sentry calls
vi.mock('./logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('section-templates', () => {
  const mockTemplates: SectionTemplate[] = [
    {
      number: 1,
      title: 'Introdução',
      description: 'Descrição da seção 1',
      requiredWords: 100,
      aiPrompt: 'Gere a introdução',
    },
    {
      number: 2,
      title: 'Desenvolvimento',
      description: 'Descrição da seção 2',
      requiredWords: 200,
      aiPrompt: 'Gere o desenvolvimento',
    },
  ];

  const mockFetch = vi.fn();

  beforeEach(() => {
    // Clear cache before each test
    clearTemplatesCache();

    // Reset fetch mock
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  describe('loadSectionTemplates', () => {
    it('should load templates from JSON file', async () => {
      // Mock successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const templates = await loadSectionTemplates();

      expect(templates).toEqual(mockTemplates);
      expect(global.fetch).toHaveBeenCalledWith('/data/section-templates.json');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should cache templates after first load', async () => {
      // Mock successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      // First call - should fetch
      const templates1 = await loadSectionTemplates();
      expect(templates1).toEqual(mockTemplates);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should return cached
      const templates2 = await loadSectionTemplates();
      expect(templates2).toEqual(mockTemplates);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it('should return cached templates on subsequent calls', async () => {
      // Mock successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      await loadSectionTemplates();

      // Subsequent calls should not fetch again
      const templates = await loadSectionTemplates();
      expect(templates).toEqual(mockTemplates);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockFetch.mockRejectedValueOnce(new Error(errorMessage));

      // Import mocked logger
      const { logger } = await import('./logger');

      await expect(loadSectionTemplates()).rejects.toThrow(errorMessage);
      expect(logger.error).toHaveBeenCalledWith(
        'Error loading section templates',
        expect.any(Error),
      );
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(loadSectionTemplates()).rejects.toThrow(
        'Failed to load section templates: Not Found',
      );
    });

    it('should sort templates by section number (#1318)', async () => {
      // Templates in wrong order (matching the bug report)
      const unorderedTemplates: SectionTemplate[] = [
        {
          number: 1,
          title: 'Section 1',
          description: 'First section',
          requiredWords: 100,
          aiPrompt: 'Generate section 1',
        },
        {
          number: 4,
          title: 'Section 4',
          description: 'Fourth section',
          requiredWords: 100,
          aiPrompt: 'Generate section 4',
        },
        {
          number: 2,
          title: 'Section 2',
          description: 'Second section',
          requiredWords: 100,
          aiPrompt: 'Generate section 2',
        },
        {
          number: 3,
          title: 'Section 3',
          description: 'Third section',
          requiredWords: 100,
          aiPrompt: 'Generate section 3',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => unorderedTemplates,
      });

      const templates = await loadSectionTemplates();

      // Verify templates are sorted by number
      expect(templates.map((t) => t.number)).toEqual([1, 2, 3, 4]);
      expect(templates[0].number).toBe(1);
      expect(templates[1].number).toBe(2);
      expect(templates[2].number).toBe(3);
      expect(templates[3].number).toBe(4);
    });
  });

  describe('getSectionTemplates', () => {
    it('should return empty array when templates not loaded', () => {
      const templates = getSectionTemplates();
      expect(templates).toEqual([]);
    });

    it('should return cached templates after load', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      await loadSectionTemplates();

      const templates = getSectionTemplates();
      expect(templates).toEqual(mockTemplates);
    });
  });

  describe('clearTemplatesCache', () => {
    it('should clear the cached templates', async () => {
      // Load templates first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      await loadSectionTemplates();
      expect(getSectionTemplates()).toEqual(mockTemplates);

      // Clear cache
      clearTemplatesCache();

      // Should return empty array after clearing
      expect(getSectionTemplates()).toEqual([]);
    });

    it('should allow reloading after cache clear', async () => {
      // First load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      await loadSectionTemplates();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearTemplatesCache();

      // Second load should fetch again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      await loadSectionTemplates();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

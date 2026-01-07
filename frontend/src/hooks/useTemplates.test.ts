import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTemplates } from './useTemplates';
import { apiHelpers } from '@/lib/api';
import { EtpTemplate, EtpTemplateType } from '@/types/template';

// Mock the api module
vi.mock('@/lib/api', () => ({
  apiHelpers: {
    get: vi.fn(),
  },
}));

// Mock logger to prevent console output during tests
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock api-errors
vi.mock('@/lib/api-errors', () => ({
  getContextualErrorMessage: vi.fn(
    (action: string, resource: string) => `Erro ao ${action} ${resource}`,
  ),
}));

const mockTemplates: EtpTemplate[] = [
  {
    id: '1',
    name: 'Template para Obras',
    type: EtpTemplateType.OBRAS,
    description: 'Descricao do template',
    requiredFields: ['objeto'],
    optionalFields: [],
    defaultSections: ['1'],
    prompts: [],
    legalReferences: [],
    priceSourcesPreferred: [],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Template para TI',
    type: EtpTemplateType.TI,
    description: 'Descricao do template TI',
    requiredFields: ['objeto', 'justificativa'],
    optionalFields: ['riscos'],
    defaultSections: ['1', '2'],
    prompts: [],
    legalReferences: ['IN SGD/ME no 94/2022'],
    priceSourcesPreferred: ['PNCP'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('useTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial fetch', () => {
    it('should fetch templates on mount', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      // Initial state should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.templates).toEqual([]);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.templates).toEqual(mockTemplates);
      expect(apiHelpers.get).toHaveBeenCalledWith('/templates');
      expect(apiHelpers.get).toHaveBeenCalledTimes(1);
    });

    it('should not fetch twice on mount', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockTemplates);

      const { result, rerender } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger a rerender
      rerender();

      // API should still only be called once
      expect(apiHelpers.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should set error state on API failure', async () => {
      const mockError = new Error('Network error');
      vi.mocked(apiHelpers.get).mockRejectedValue(mockError);

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Erro ao carregar os templates');
      expect(result.current.templates).toEqual([]);
    });
  });

  describe('Refetch', () => {
    it('should allow manual refetch after initial load', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.get).toHaveBeenCalledTimes(1);

      // Update mock to return different data
      const updatedTemplates = [
        ...mockTemplates,
        {
          id: '3',
          name: 'New Template',
          type: EtpTemplateType.SERVICOS,
          description: 'New template',
          requiredFields: [],
          optionalFields: [],
          defaultSections: [],
          prompts: [],
          legalReferences: [],
          priceSourcesPreferred: [],
          isActive: true,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ];
      vi.mocked(apiHelpers.get).mockResolvedValue(updatedTemplates);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(apiHelpers.get).toHaveBeenCalledTimes(2);
      expect(result.current.templates).toEqual(updatedTemplates);
    });

    it('should clear error and set loading on refetch', async () => {
      // First call fails
      vi.mocked(apiHelpers.get).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second call succeeds
      vi.mocked(apiHelpers.get).mockResolvedValue(mockTemplates);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.templates).toEqual(mockTemplates);
    });
  });

  describe('Return values', () => {
    it('should return templates array', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.templates).toBeInstanceOf(Array);
      expect(result.current.templates).toHaveLength(2);
    });

    it('should return isLoading boolean', () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('should return error as string or null', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });

    it('should return refetch function', () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

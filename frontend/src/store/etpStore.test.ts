import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useETPStore } from './etpStore';
import api, { apiHelpers } from '@/lib/api';
import type {
  ETP,
  Section,
  Reference,
  ValidationResult,
  AIGenerationRequest,
  AIGenerationResponse, // Used in return type assertions
} from '@/types/etp';

// Mock do módulo apiHelpers e api default
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  apiHelpers: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock polling module for async generation tests (#222)
vi.mock('@/lib/polling', () => ({
  pollJobStatus: vi.fn(),
  JobFailedError: class JobFailedError extends Error {
    constructor(jobId: string, reason?: string) {
      super(reason || `Job ${jobId} failed`);
      this.name = 'JobFailedError';
    }
  },
  PollingTimeoutError: class PollingTimeoutError extends Error {
    constructor(jobId: string) {
      super(`Timeout for job ${jobId}`);
      this.name = 'PollingTimeoutError';
    }
  },
}));

describe('etpStore', () => {
  // Mock data fixtures
  const mockETP: ETP = {
    id: 'etp-1',
    title: 'ETP Teste',
    description: 'Descrição teste',
    status: 'draft',
    progress: 0,
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    sections: [
      {
        id: 'section-1',
        etpId: 'etp-1',
        sectionNumber: 1,
        title: 'Seção 1',
        content: 'Conteúdo seção 1',
        isRequired: true,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  };

  const mockSection: Section = {
    id: 'section-1',
    etpId: 'etp-1',
    sectionNumber: 1,
    title: 'Seção 1 Atualizada',
    content: 'Conteúdo atualizado',
    isRequired: true,
    isCompleted: true,
    aiGenerated: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  };

  const mockReferences: Reference[] = [
    {
      id: 'ref-1',
      title: 'Referência 1',
      source: 'Fonte 1',
      url: 'https://example.com',
      relevance: 0.9,
    },
    {
      id: 'ref-2',
      title: 'Referência 2',
      source: 'Fonte 2',
      relevance: 0.8,
    },
  ];

  const mockValidationResult: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    completeness: 75,
  };

  const mockAIGenerationRequest: AIGenerationRequest = {
    etpId: 'etp-1',
    sectionNumber: 1,
    prompt: 'Gerar seção 1',
    context: {},
  };

  // Note: mockAIGenerationResponse removed as tests now use async flow (#222)
  // The async flow returns Section from polling, not AIGenerationResponse directly

  beforeEach(() => {
    // Limpar todos os mocks
    vi.clearAllMocks();

    // Reset do store usando a API pública
    useETPStore.setState({
      etps: [],
      currentETP: null,
      references: [],
      isLoading: false,
      error: null,
      aiGenerating: false,
      validationResult: null,
      // Async generation state (#222)
      generationProgress: 0,
      generationStatus: 'idle',
      generationJobId: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Teste 1: fetchETPs', () => {
    it('should populate ETPs array on successful fetch', async () => {
      const mockETPs = [mockETP, { ...mockETP, id: 'etp-2', title: 'ETP 2' }];
      vi.mocked(apiHelpers.get).mockResolvedValue(mockETPs);

      const { result } = renderHook(() => useETPStore());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.etps).toEqual([]);

      await act(async () => {
        await result.current.fetchETPs();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/etps');
      expect(result.current.etps).toEqual(mockETPs);
      expect(result.current.error).toBeNull();
    });

    it('should set error state on fetch failure', async () => {
      const errorMessage = 'Erro ao carregar ETPs';
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useETPStore());

      await act(async () => {
        await result.current.fetchETPs();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.etps).toEqual([]);
    });
  });

  describe('Teste 2: fetchETP', () => {
    it('should set currentETP on successful fetch', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockETP);

      const { result } = renderHook(() => useETPStore());

      expect(result.current.currentETP).toBeNull();

      await act(async () => {
        await result.current.fetchETP('etp-1');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/etps/etp-1');
      expect(result.current.currentETP).toEqual(mockETP);
      expect(result.current.error).toBeNull();
    });

    it('should set error state on fetch failure', async () => {
      const errorMessage = 'Erro ao carregar ETP';
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useETPStore());

      await act(async () => {
        await result.current.fetchETP('invalid-id');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.currentETP).toBeNull();
    });
  });

  describe('Teste 3: createETP', () => {
    it('should add ETP to array and return ID on successful creation', async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue(mockETP);

      const { result } = renderHook(() => useETPStore());

      expect(result.current.etps).toEqual([]);

      let createdETP: ETP | undefined;
      await act(async () => {
        createdETP = await result.current.createETP({
          title: 'ETP Teste',
          description: 'Descrição teste',
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith('/etps', {
        title: 'ETP Teste',
        description: 'Descrição teste',
      });
      expect(createdETP).toEqual(mockETP);
      expect(result.current.etps).toEqual([mockETP]);
      expect(result.current.currentETP).toEqual(mockETP);
      expect(result.current.error).toBeNull();
    });

    it('should throw error and not add ETP on creation failure', async () => {
      const errorMessage = 'Erro ao criar ETP';
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useETPStore());

      await expect(async () => {
        await act(async () => {
          await result.current.createETP({ title: 'ETP Teste' });
        });
      }).rejects.toThrow();

      // ETP should not be added to array on error
      expect(result.current.etps).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Teste 4: updateSection', () => {
    it('should update specific section in currentETP', async () => {
      vi.mocked(apiHelpers.put).mockResolvedValue(mockSection);

      const { result } = renderHook(() => useETPStore());

      // Setup: set currentETP
      act(() => {
        result.current.setCurrentETP(mockETP);
      });

      expect(result.current.currentETP?.sections[0].content).toBe(
        'Conteúdo seção 1',
      );
      expect(result.current.currentETP?.sections[0].isCompleted).toBe(false);

      await act(async () => {
        await result.current.updateSection('etp-1', 'section-1', {
          content: 'Conteúdo atualizado',
          isCompleted: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.put).toHaveBeenCalledWith(
        '/etps/etp-1/sections/section-1',
        {
          content: 'Conteúdo atualizado',
          isCompleted: true,
        },
      );
      expect(result.current.currentETP?.sections[0]).toEqual(mockSection);
      expect(result.current.error).toBeNull();
    });

    it('should not reset loading state when currentETP is null (BUG DOCUMENTED)', async () => {
      // Este teste documenta um bug identificado: updateSection não reseta isLoading
      // quando currentETP é null (linha 156 do etpStore.ts retorna state sem modificar isLoading)

      vi.mocked(apiHelpers.put).mockResolvedValue(mockSection);

      const { result } = renderHook(() => useETPStore());

      expect(result.current.currentETP).toBeNull();
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.updateSection('etp-1', 'section-1', {
          content: 'Conteúdo',
        });
      });

      // API call is made
      expect(apiHelpers.put).toHaveBeenCalled();

      // BUG: isLoading permanece true quando currentETP é null
      // Deveria ser false após a operação ser concluída
      expect(result.current.isLoading).toBe(true);

      // currentETP remains null since there was no ETP to update
      expect(result.current.currentETP).toBeNull();
    });

    it('should throw error on update failure', async () => {
      const errorMessage = 'Erro ao atualizar seção';
      vi.mocked(apiHelpers.put).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useETPStore());

      act(() => {
        result.current.setCurrentETP(mockETP);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.updateSection('etp-1', 'section-1', {
            content: 'Conteúdo',
          });
        });
      }).rejects.toThrow();

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Utility methods', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useETPStore());

      // Set error manually
      act(() => {
        result.current.fetchETPs(); // Trigger error
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useETPStore());

      // Populate store with data
      act(() => {
        result.current.setCurrentETP(mockETP);
        result.current.addReference(mockReferences[0]);
      });

      expect(result.current.currentETP).not.toBeNull();
      expect(result.current.references).toHaveLength(1);

      // Reset store
      act(() => {
        result.current.resetStore();
      });

      expect(result.current.currentETP).toBeNull();
      expect(result.current.references).toEqual([]);
      expect(result.current.etps).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.aiGenerating).toBe(false);
    });

    it('should add reference to array', () => {
      const { result } = renderHook(() => useETPStore());

      expect(result.current.references).toEqual([]);

      act(() => {
        result.current.addReference(mockReferences[0]);
      });

      expect(result.current.references).toEqual([mockReferences[0]]);

      act(() => {
        result.current.addReference(mockReferences[1]);
      });

      expect(result.current.references).toEqual(mockReferences);
    });
  });

  describe('Additional coverage tests', () => {
    it('should update ETP in array on updateETP', async () => {
      const updatedETP = { ...mockETP, title: 'ETP Atualizado' };
      vi.mocked(apiHelpers.put).mockResolvedValue(updatedETP);

      const { result } = renderHook(() => useETPStore());

      // Setup: add ETP to array
      act(() => {
        result.current.setCurrentETP(mockETP);
      });

      await act(async () => {
        await result.current.updateETP('etp-1', { title: 'ETP Atualizado' });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.put).toHaveBeenCalledWith('/etps/etp-1', {
        title: 'ETP Atualizado',
      });
    });

    it('should delete ETP from array on deleteETP', async () => {
      vi.mocked(apiHelpers.delete).mockResolvedValue(undefined);

      const { result } = renderHook(() => useETPStore());

      // Setup: populate etps array
      await act(async () => {
        vi.mocked(apiHelpers.get).mockResolvedValue([mockETP]);
        await result.current.fetchETPs();
      });

      expect(result.current.etps).toHaveLength(1);

      await act(async () => {
        await result.current.deleteETP('etp-1');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.delete).toHaveBeenCalledWith('/etps/etp-1');
      expect(result.current.etps).toEqual([]);
    });

    it('should validate ETP and return validation result', async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockValidationResult);

      const { result } = renderHook(() => useETPStore());

      let validationResult: ValidationResult | undefined;
      await act(async () => {
        validationResult = await result.current.validateETP('etp-1');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/etps/etp-1/validate');
      expect(validationResult).toEqual(mockValidationResult);
      expect(result.current.validationResult).toEqual(mockValidationResult);
    });

    it('should regenerate section with AI (async flow #222)', async () => {
      // Import the mocked pollJobStatus
      const { pollJobStatus } = await import('@/lib/polling');

      // Mock async response from POST - returns section with jobId
      const mockAsyncResponse = {
        data: {
          id: 'section-1',
          etpId: 'etp-1',
          content: '',
          metadata: { jobId: 'job-123', queuedAt: new Date().toISOString() },
        },
      };

      // Mock final result from polling
      const mockPollingResult = {
        id: 'section-1',
        etpId: 'etp-1',
        sectionNumber: 1,
        title: 'Seção Regenerada',
        content: 'Conteúdo regenerado por IA',
        isRequired: true,
        isCompleted: true,
        aiGenerated: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      vi.mocked(apiHelpers.post).mockResolvedValue(mockAsyncResponse);
      vi.mocked(pollJobStatus).mockResolvedValue(mockPollingResult);

      const { result } = renderHook(() => useETPStore());

      let response: AIGenerationResponse | undefined;
      await act(async () => {
        response = await result.current.regenerateSection(
          mockAIGenerationRequest,
        );
      });

      await waitFor(() => {
        expect(result.current.aiGenerating).toBe(false);
        expect(result.current.generationStatus).toBe('completed');
      });

      // Verify the POST call for async generation
      expect(apiHelpers.post).toHaveBeenCalledWith(
        `/sections/etp/${mockAIGenerationRequest.etpId}/generate`,
        expect.objectContaining({
          type: `section_${mockAIGenerationRequest.sectionNumber}`,
        }),
      );

      // Verify polling was called with jobId
      expect(pollJobStatus).toHaveBeenCalledWith(
        'job-123',
        expect.any(Function),
      );

      // Verify response format
      expect(response?.content).toBe('Conteúdo regenerado por IA');
    });

    it('should export ETP to JSON', async () => {
      const mockJSON = JSON.stringify(mockETP);
      vi.mocked(apiHelpers.get).mockResolvedValue(mockJSON);

      const { result } = renderHook(() => useETPStore());

      let jsonString: string | undefined;
      await act(async () => {
        jsonString = await result.current.exportJSON('etp-1');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.get).toHaveBeenCalledWith('/etps/etp-1/export/json');
      expect(jsonString).toBe(mockJSON);
    });

    it('should export ETP to DOCX (#551)', async () => {
      const mockBlob = new Blob(['mock docx content'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      vi.mocked(api.get).mockResolvedValue({ data: mockBlob });

      const { result } = renderHook(() => useETPStore());

      let blob: Blob | undefined;
      await act(async () => {
        blob = await result.current.exportDocx('etp-1');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(api.get).toHaveBeenCalledWith('/export/etp/etp-1/docx', {
        responseType: 'blob',
      });
      expect(blob).toEqual(mockBlob);
      expect(result.current.error).toBeNull();
    });

    it('should set error state on DOCX export failure (#551)', async () => {
      const errorMessage = 'Erro ao exportar DOCX';
      vi.mocked(api.get).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useETPStore());

      // Use try/catch to handle the thrown error while testing state
      await act(async () => {
        try {
          await result.current.exportDocx('etp-1');
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
    });
  });
});

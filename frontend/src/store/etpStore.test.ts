import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useETPStore } from "./etpStore";
import { apiHelpers } from "@/lib/api";
import type {
  ETP,
  AIGenerationRequest,
  AIGenerationResponse,
  Reference,
} from "@/types/etp";

// Mock do módulo apiHelpers
vi.mock("@/lib/api", () => ({
  apiHelpers: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("etpStore", () => {
  // Mock data fixtures
  const mockETP: ETP = {
    id: "etp-1",
    title: "ETP Teste",
    description: "Descrição teste",
    status: "draft",
    progress: 0,
    userId: "user-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    sections: [
      {
        id: "section-1",
        etpId: "etp-1",
        sectionNumber: 1,
        title: "Seção 1",
        content: "Conteúdo seção 1",
        isRequired: true,
        isCompleted: false,
        aiGenerated: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ],
  };

  const mockAIGenerationRequest: AIGenerationRequest = {
    etpId: "etp-1",
    sectionNumber: 1,
    prompt: "Gerar seção 1",
    context: {},
  };

  const mockAIGenerationResponse: AIGenerationResponse = {
    content: "Conteúdo gerado por IA",
    references: [
      {
        id: "ref-1",
        title: "Referência 1",
        source: "Fonte 1",
        url: "https://example.com",
        relevance: 0.9,
        excerpt: "Excerto da referência",
      },
    ],
    confidence: 0.85,
    warnings: [],
  };

  const mockReferences: Reference[] = [
    {
      id: "ref-1",
      title: "Referência 1",
      source: "Fonte 1",
      url: "https://example.com",
      relevance: 0.9,
    },
    {
      id: "ref-2",
      title: "Referência 2",
      source: "Fonte 2",
      relevance: 0.8,
    },
  ];

  const mockBlob = new Blob(["PDF content"], { type: "application/pdf" });

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
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Teste 5: generateSection", () => {
    it("should make POST request and update section with AI-generated content", async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue(mockAIGenerationResponse);

      const { result } = renderHook(() => useETPStore());

      expect(result.current.aiGenerating).toBe(false);

      let response: AIGenerationResponse | undefined;
      await act(async () => {
        response = await result.current.generateSection(
          mockAIGenerationRequest,
        );
      });

      await waitFor(() => {
        expect(result.current.aiGenerating).toBe(false);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith(
        "/etps/etp-1/sections/1/generate",
        mockAIGenerationRequest,
      );
      expect(response).toEqual(mockAIGenerationResponse);
      expect(result.current.error).toBeNull();
    });

    it("should set aiGenerating to false after generation completes", async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue(mockAIGenerationResponse);

      const { result } = renderHook(() => useETPStore());

      expect(result.current.aiGenerating).toBe(false);

      await act(async () => {
        await result.current.generateSection(mockAIGenerationRequest);
      });

      // Verificar que aiGenerating volta para false após conclusão
      expect(result.current.aiGenerating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should throw error on generation failure", async () => {
      const errorMessage = "Erro ao gerar seção com IA";
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useETPStore());

      await expect(async () => {
        await act(async () => {
          await result.current.generateSection(mockAIGenerationRequest);
        });
      }).rejects.toThrow();

      expect(result.current.aiGenerating).toBe(false);
    });
  });

  describe("Teste 6: exportPDF", () => {
    it("should return blob on successful PDF export", async () => {
      vi.mocked(apiHelpers.post).mockResolvedValue(mockBlob);

      const { result } = renderHook(() => useETPStore());

      let blob: Blob | undefined;
      await act(async () => {
        blob = await result.current.exportPDF("etp-1", {
          format: "pdf",
          includeDrafts: false,
          includeReferences: true,
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiHelpers.post).toHaveBeenCalledWith("/etps/etp-1/export/pdf", {
        format: "pdf",
        includeDrafts: false,
        includeReferences: true,
      });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob?.type).toBe("application/pdf");
      expect(result.current.error).toBeNull();
    });

    it("should throw error on export failure", async () => {
      const errorMessage = "Erro ao exportar PDF";
      vi.mocked(apiHelpers.post).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useETPStore());

      await expect(async () => {
        await act(async () => {
          await result.current.exportPDF("etp-1");
        });
      }).rejects.toThrow();

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Teste 7: fetchReferences", () => {
    it("should update references array on successful fetch", async () => {
      vi.mocked(apiHelpers.get).mockResolvedValue(mockReferences);

      const { result } = renderHook(() => useETPStore());

      expect(result.current.references).toEqual([]);

      await act(async () => {
        await result.current.fetchReferences("etp-1");
      });

      expect(apiHelpers.get).toHaveBeenCalledWith("/etps/etp-1/references");
      expect(result.current.references).toEqual(mockReferences);
    });

    it("should silently swallow errors (BUG DOCUMENTED)", async () => {
      // Este teste documenta o bug identificado na issue #12:
      // fetchReferences não propaga erros, apenas loga no console.error
      // Isso significa que erros são engolidos silenciosamente.

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const errorMessage = "Erro ao carregar referências";
      vi.mocked(apiHelpers.get).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useETPStore());

      // fetchReferences não lança erro nem atualiza error state
      await act(async () => {
        await result.current.fetchReferences("etp-1");
      });

      // Verificar que o erro foi apenas logado no console
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Erro ao carregar referências:",
        expect.any(Error),
      );

      // BUG: error state não é atualizado (deveria ser!)
      expect(result.current.error).toBeNull();

      // BUG: references permanece vazio (comportamento inconsistente com outros métodos)
      expect(result.current.references).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });
});

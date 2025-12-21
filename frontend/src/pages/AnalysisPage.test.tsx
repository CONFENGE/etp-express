import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import { AnalysisPage } from './AnalysisPage';
import api from '@/lib/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock stores
vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({ sidebarOpen: false }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User' },
    isAuthenticated: true,
    isAuthInitialized: true,
  }),
}));

/**
 * Helper to render component with router
 */
function renderWithRouter() {
  return render(
    <BrowserRouter>
      <AnalysisPage />
    </BrowserRouter>,
  );
}

/**
 * Creates a mock file for testing
 */
function createMockFile(name: string, size: number, type: string): File {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/**
 * Mock analysis response
 */
const mockAnalysisResponse = {
  data: {
    data: {
      analysisId: 'test-analysis-id',
      originalFilename: 'test.pdf',
      mimeType: 'application/pdf',
      overallScore: 75,
      meetsMinimumQuality: true,
      verdict: 'needs-review',
      documentInfo: {
        wordCount: 1500,
        sectionCount: 5,
      },
      issueSummary: {
        critical: 1,
        important: 3,
        suggestion: 5,
      },
      dimensions: [
        { dimension: 'legal', score: 80, passed: true },
        { dimension: 'clarity', score: 70, passed: true },
        { dimension: 'foundation', score: 75, passed: true },
      ],
      message: 'Documento analisado com sucesso.',
    },
    disclaimer: 'Disclaimer text',
  },
};

describe('AnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders page title and description', () => {
      renderWithRouter();

      expect(screen.getByText('Import & Analysis')).toBeInTheDocument();
      expect(
        screen.getByText(
          /faça upload de um etp existente para analisar sua qualidade/i,
        ),
      ).toBeInTheDocument();
    });

    it('renders upload area', () => {
      renderWithRouter();

      expect(screen.getByText('Upload de Documento')).toBeInTheDocument();
      expect(
        screen.getByText(/selecione um arquivo pdf ou docx para análise/i),
      ).toBeInTheDocument();
    });

    it('renders instructions', () => {
      renderWithRouter();

      expect(screen.getByText('Como funciona')).toBeInTheDocument();
      expect(screen.getByText('Faça upload')).toBeInTheDocument();
      expect(screen.getByText('Análise automática')).toBeInTheDocument();
      expect(screen.getByText('Converta para ETP')).toBeInTheDocument();
    });

    it('renders empty state when no file selected', () => {
      renderWithRouter();

      expect(
        screen.getByText(/selecione um documento para ver a análise/i),
      ).toBeInTheDocument();
    });
  });

  describe('File Upload Flow', () => {
    it('shows analyze button after file selection', async () => {
      const user = userEvent.setup();
      renderWithRouter();

      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      await user.upload(input, file);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /analisar documento/i }),
        ).toBeInTheDocument();
      });
    });

    it('shows loading state during analysis', async () => {
      const user = userEvent.setup();

      // Mock slow API response
      vi.mocked(api.post).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockAnalysisResponse), 1000),
          ),
      );

      renderWithRouter();

      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      await user.upload(input, file);

      const analyzeButton = await screen.findByRole('button', {
        name: /analisar documento/i,
      });
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText(/analisando qualidade/i)).toBeInTheDocument();
      });
    });

    it('displays analysis results after successful upload', async () => {
      const user = userEvent.setup();

      vi.mocked(api.post).mockResolvedValue(mockAnalysisResponse);

      renderWithRouter();

      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      await user.upload(input, file);

      const analyzeButton = await screen.findByRole('button', {
        name: /analisar documento/i,
      });
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Resultado da Análise')).toBeInTheDocument();
      });

      // Check score display
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('Pontuação Geral')).toBeInTheDocument();

      // Check verdict badge
      expect(screen.getByText('Necessita Revisão')).toBeInTheDocument();

      // Check dimensions
      expect(screen.getByText('Conformidade Legal')).toBeInTheDocument();
      expect(screen.getByText('Clareza e Legibilidade')).toBeInTheDocument();
      expect(
        screen.getByText('Qualidade da Fundamentação'),
      ).toBeInTheDocument();

      // Check issue summary
      expect(screen.getByText('Críticos')).toBeInTheDocument();
      expect(screen.getByText('Importantes')).toBeInTheDocument();
      expect(screen.getByText('Sugestões')).toBeInTheDocument();
    });

    it('displays error message on upload failure', async () => {
      const user = userEvent.setup();

      vi.mocked(api.post).mockRejectedValue({
        message: 'Erro ao processar arquivo',
      });

      renderWithRouter();

      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');

      await user.upload(input, file);

      const analyzeButton = await screen.findByRole('button', {
        name: /analisar documento/i,
      });
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(screen.getByText('Erro na Análise')).toBeInTheDocument();
      });

      expect(
        screen.getByRole('button', { name: /tentar novamente/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('downloads PDF report when button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(api.post).mockResolvedValue(mockAnalysisResponse);
      vi.mocked(api.get).mockResolvedValue({
        data: new Blob(['pdf content'], { type: 'application/pdf' }),
      });

      // Mock URL methods
      const mockCreateObjectURL = vi.fn(() => 'blob:test');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      renderWithRouter();

      // Upload and analyze
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      await user.upload(input, file);

      const analyzeButton = await screen.findByRole('button', {
        name: /analisar documento/i,
      });
      await user.click(analyzeButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Resultado da Análise')).toBeInTheDocument();
      });

      // Click download button
      const downloadButton = screen.getByRole('button', {
        name: /baixar relatório pdf/i,
      });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/analysis/test-analysis-id/report/pdf',
          expect.any(Object),
        );
      });
    });

    it('converts to ETP when button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(api.post)
        .mockResolvedValueOnce(mockAnalysisResponse)
        .mockResolvedValueOnce({
          data: {
            data: {
              etpId: 'new-etp-id',
              title: 'Converted ETP',
              status: 'draft',
              sectionsCount: 5,
              mappedSectionsCount: 4,
              customSectionsCount: 1,
              convertedAt: new Date().toISOString(),
              message: 'Documento convertido com sucesso.',
            },
            disclaimer: 'Disclaimer',
          },
        });

      renderWithRouter();

      // Upload and analyze
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      await user.upload(input, file);

      const analyzeButton = await screen.findByRole('button', {
        name: /analisar documento/i,
      });
      await user.click(analyzeButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Resultado da Análise')).toBeInTheDocument();
      });

      // Click convert button
      const convertButton = screen.getByRole('button', {
        name: /converter para etp/i,
      });
      await user.click(convertButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/etps/new-etp-id');
      });
    });

    it('resets state when analyze another document is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(api.post).mockResolvedValue(mockAnalysisResponse);

      renderWithRouter();

      // Upload and analyze
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      await user.upload(input, file);

      const analyzeButton = await screen.findByRole('button', {
        name: /analisar documento/i,
      });
      await user.click(analyzeButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Resultado da Análise')).toBeInTheDocument();
      });

      // Click reset button
      const resetButton = screen.getByRole('button', {
        name: /analisar outro documento/i,
      });
      await user.click(resetButton);

      await waitFor(() => {
        expect(
          screen.getByText(/selecione um documento para ver a análise/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Quality Indicators', () => {
    it('shows positive quality indicator when meets minimum', async () => {
      const user = userEvent.setup();

      vi.mocked(api.post).mockResolvedValue(mockAnalysisResponse);

      renderWithRouter();

      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      await user.upload(input, file);

      const analyzeButton = await screen.findByRole('button', {
        name: /analisar documento/i,
      });
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(
          screen.getByText(/atende qualidade mínima/i),
        ).toBeInTheDocument();
      });
    });

    it('shows negative quality indicator when does not meet minimum', async () => {
      const user = userEvent.setup();

      const lowQualityResponse = {
        data: {
          data: {
            ...mockAnalysisResponse.data.data,
            meetsMinimumQuality: false,
            overallScore: 45,
            verdict: 'rejected',
          },
          disclaimer: 'Disclaimer',
        },
      };

      vi.mocked(api.post).mockResolvedValue(lowQualityResponse);

      renderWithRouter();

      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      await user.upload(input, file);

      const analyzeButton = await screen.findByRole('button', {
        name: /analisar documento/i,
      });
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(
          screen.getByText(/não atende qualidade mínima/i),
        ).toBeInTheDocument();
      });
    });
  });
});

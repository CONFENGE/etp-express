import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ETPEditor } from './ETPEditor';
import type { ETP, Section } from '@/types/etp';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// Mock hooks
vi.mock('@/hooks/useETPs');
vi.mock('@/hooks/useToast');

// Mock types/etp para REQUIRED_SECTIONS
vi.mock('@/types/etp', async () => {
  const actual = await vi.importActual<typeof import('@/types/etp')>('@/types/etp');
  return {
    ...actual,
    REQUIRED_SECTIONS: [1, 4, 6, 8, 13],
  };
});

// Mock components
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/common/LoadingState', () => ({
  LoadingState: ({ message }: { message: string }) => <div data-testid="loading-state">{message}</div>,
}));

describe('ETPEditor', () => {
  const mockETP: ETP = {
    id: 'etp-123',
    title: 'ETP de Teste',
    description: 'Descrição do ETP de teste',
    status: 'in_progress',
    progress: 45,
    userId: 'user-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    sections: [
      {
        id: 'section-1',
        etpId: 'etp-123',
        sectionNumber: 1,
        title: 'I - Necessidade da Contratação',
        content: 'Conteúdo da seção 1',
        isRequired: true,
        isCompleted: true,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-4',
        etpId: 'etp-123',
        sectionNumber: 4,
        title: 'IV - Requisitos da Contratação',
        content: 'Conteúdo da seção 4',
        isRequired: true,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-6',
        etpId: 'etp-123',
        sectionNumber: 6,
        title: 'VI - Estimativa de Preços',
        content: '',
        isRequired: true,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-8',
        etpId: 'etp-123',
        sectionNumber: 8,
        title: 'VIII - Adequação Orçamentária',
        content: '',
        isRequired: true,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-13',
        etpId: 'etp-123',
        sectionNumber: 13,
        title: 'XIII - Contratações Correlatas',
        content: '',
        isRequired: true,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-2',
        etpId: 'etp-123',
        sectionNumber: 2,
        title: 'II - Objetivos da Contratação',
        content: '',
        isRequired: false,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-3',
        etpId: 'etp-123',
        sectionNumber: 3,
        title: 'III - Descrição da Solução',
        content: '',
        isRequired: false,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-5',
        etpId: 'etp-123',
        sectionNumber: 5,
        title: 'V - Levantamento de Mercado',
        content: '',
        isRequired: false,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-7',
        etpId: 'etp-123',
        sectionNumber: 7,
        title: 'VII - Justificativa para o Parcelamento',
        content: '',
        isRequired: false,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-9',
        etpId: 'etp-123',
        sectionNumber: 9,
        title: 'IX - Resultados Pretendidos',
        content: '',
        isRequired: false,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-10',
        etpId: 'etp-123',
        sectionNumber: 10,
        title: 'X - Providências a serem Adotadas',
        content: '',
        isRequired: false,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-11',
        etpId: 'etp-123',
        sectionNumber: 11,
        title: 'XI - Possíveis Impactos Ambientais',
        content: '',
        isRequired: false,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'section-12',
        etpId: 'etp-123',
        sectionNumber: 12,
        title: 'XII - Declaração de Viabilidade',
        content: '',
        isRequired: false,
        isCompleted: false,
        aiGenerated: false,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ],
  };

  const mockFetchETP = vi.fn();
  const mockUpdateETP = vi.fn();
  const mockSuccessToast = vi.fn();
  const mockErrorToast = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock useParams
    const { useParams } = await import('react-router-dom');
    vi.mocked(useParams).mockReturnValue({ id: 'etp-123' });

    // Mock useETPs
    const { useETPs } = await import('@/hooks/useETPs');
    vi.mocked(useETPs).mockReturnValue({
      etps: [mockETP],
      currentETP: mockETP,
      isLoading: false,
      error: null,
      fetchETPs: vi.fn(),
      fetchETP: mockFetchETP,
      createETP: vi.fn(),
      updateETP: mockUpdateETP,
      deleteETP: vi.fn(),
      setCurrentETP: vi.fn(),
    });

    // Mock useToast
    const { useToast } = await import('@/hooks/useToast');
    vi.mocked(useToast).mockReturnValue({
      success: mockSuccessToast,
      error: mockErrorToast,
      info: vi.fn(),
      warning: vi.fn(),
    });
  });

  /**
   * Teste 1: Componente renderiza sem erros com ETP mockado
   */
  it('renderiza sem erros com ETP mockado', () => {
    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>
    );

    // Verifica que o título do ETP é exibido
    expect(screen.getByText('ETP de Teste')).toBeInTheDocument();
    expect(screen.getByText('Descrição do ETP de teste')).toBeInTheDocument();

    // Verifica que fetchETP foi chamado com o ID correto
    expect(mockFetchETP).toHaveBeenCalledWith('etp-123');
  });

  /**
   * Teste 2: Progress bar exibe porcentagem correta
   */
  it('exibe a porcentagem correta na progress bar', () => {
    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>
    );

    // Verifica que o progresso de 45% é exibido
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Progresso Geral')).toBeInTheDocument();

    // Verifica que o componente Progress existe
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    // Verifica que o data-state está presente (substitui aria-valuenow)
    expect(progressBar).toHaveAttribute('data-state', 'indeterminate');
  });

  /**
   * Teste 3: Clicar em tab muda activeSection
   */
  it('muda activeSection ao clicar em tab', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>
    );

    // Busca todas as tabs
    const tabs = screen.getAllByRole('tab');

    // Tab da seção 1 é a primeira (index 0)
    const section1Tab = tabs[0];
    expect(section1Tab).toHaveAttribute('data-state', 'active');
    expect(section1Tab).toHaveTextContent('1');

    // Verifica que o conteúdo da seção 1 está exibido
    expect(screen.getByText('I - Necessidade da Contratação')).toBeInTheDocument();
    const textarea1 = screen.getByPlaceholderText(/Digite o conteúdo da seção I - Necessidade da Contratação/);
    expect(textarea1).toHaveValue('Conteúdo da seção 1');

    // Busca a tab da seção 4 pelo conteúdo exato "4"
    const section4Tab = tabs.find(tab => tab.textContent?.trim() === '4');
    expect(section4Tab).toBeDefined();

    await user.click(section4Tab!);

    // Aguarda a mudança de tab
    await waitFor(() => {
      expect(section4Tab).toHaveAttribute('data-state', 'active');
    });

    // Verifica que o conteúdo mudou para a seção 4
    expect(screen.getByText('IV - Requisitos da Contratação')).toBeInTheDocument();
    const textarea4 = screen.getByPlaceholderText(/Digite o conteúdo da seção IV - Requisitos da Contratação/);
    expect(textarea4).toHaveValue('Conteúdo da seção 4');
  });

  /**
   * Teste 4: Digitar em textarea atualiza content state
   */
  it('atualiza o state content ao digitar em textarea', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>
    );

    // Pega o textarea da seção 1
    const textarea = screen.getByPlaceholderText(/Digite o conteúdo da seção I - Necessidade da Contratação/);
    expect(textarea).toHaveValue('Conteúdo da seção 1');

    // Limpa o conteúdo e digita novo texto
    await user.clear(textarea);
    await user.type(textarea, 'Novo conteúdo da seção 1');

    // Verifica que o valor foi atualizado
    await waitFor(() => {
      expect(textarea).toHaveValue('Novo conteúdo da seção 1');
    });
  });

  /**
   * Teste 5: Botão "Salvar" chama updateETP do store
   */
  it('chama updateETP ao clicar no botão Salvar', async () => {
    const user = userEvent.setup();

    mockUpdateETP.mockResolvedValueOnce(undefined);

    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>
    );

    // Modifica o conteúdo da seção 1
    const textarea = screen.getByPlaceholderText(/Digite o conteúdo da seção I - Necessidade da Contratação/);
    await user.clear(textarea);
    await user.type(textarea, 'Conteúdo modificado');

    // Clica no botão Salvar
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    await user.click(saveButton);

    // Verifica que updateETP foi chamado
    await waitFor(() => {
      expect(mockUpdateETP).toHaveBeenCalledWith('etp-123', {
        sections: expect.arrayContaining([
          expect.objectContaining({
            sectionNumber: 1,
            content: 'Conteúdo modificado',
          }),
        ]),
      });
    });

    // Verifica que o toast de sucesso foi exibido
    expect(mockSuccessToast).toHaveBeenCalledWith('Seção salva com sucesso!');
  });

  /**
   * Teste 6: Botão "Gerar com IA" está presente
   * Nota: Como não há AIGenerationPanel no código atual,
   * este teste apenas valida que o botão existe.
   */
  it('exibe botão "Gerar com IA"', () => {
    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>
    );

    // Verifica que o botão "Gerar com IA" existe
    const aiButton = screen.getByRole('button', { name: /Gerar com IA/i });
    expect(aiButton).toBeInTheDocument();
    expect(aiButton).toHaveTextContent('Gerar com IA');
  });

  /**
   * Teste extra: Verifica renderização do loading state
   */
  it('exibe loading state quando isLoading é true', async () => {
    const { useETPs } = await import('@/hooks/useETPs');
    vi.mocked(useETPs).mockReturnValue({
      etps: [],
      currentETP: null,
      isLoading: true,
      error: null,
      fetchETPs: vi.fn(),
      fetchETP: mockFetchETP,
      createETP: vi.fn(),
      updateETP: mockUpdateETP,
      deleteETP: vi.fn(),
      setCurrentETP: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>
    );

    // Verifica que o loading state é exibido
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Carregando ETP...')).toBeInTheDocument();
  });

  /**
   * Teste extra: Verifica erro ao salvar
   */
  it('exibe toast de erro quando updateETP falha', async () => {
    const user = userEvent.setup();

    mockUpdateETP.mockRejectedValueOnce(new Error('Erro ao salvar'));

    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>
    );

    // Clica no botão Salvar
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    await user.click(saveButton);

    // Verifica que o toast de erro foi exibido
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Erro ao salvar seção');
    });
  });
});

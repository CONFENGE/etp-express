import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ETPEditor } from './ETPEditor';
import type { ETP } from '@/types/etp';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    // Mock useBlocker to avoid "must be used within a data router" error (#610)
    useBlocker: vi.fn(() => ({
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
      location: undefined,
    })),
  };
});

// Mock hooks
vi.mock('@/hooks/useETPs');
vi.mock('@/hooks/useToast');

// Mock types/etp para REQUIRED_SECTIONS
vi.mock('@/types/etp', async () => {
  const actual =
    await vi.importActual<typeof import('@/types/etp')>('@/types/etp');
  return {
    ...actual,
    REQUIRED_SECTIONS: [1, 4, 6, 8, 13],
  };
});

// Mock section-templates loader
vi.mock('@/lib/section-templates', () => ({
  loadSectionTemplates: vi.fn(() =>
    Promise.resolve([
      {
        number: 1,
        title: 'I - Necessidade da Contratação',
        description: 'Demonstração da necessidade da contratação',
        isRequired: true,
        fields: [],
      },
      {
        number: 4,
        title: 'IV - Requisitos da Contratação',
        description: 'Especificação dos requisitos da contratação',
        isRequired: true,
        fields: [],
      },
      {
        number: 6,
        title: 'VI - Estimativa de Preços',
        description: 'Estimativa do valor da contratação',
        isRequired: true,
        fields: [],
      },
      {
        number: 8,
        title: 'VIII - Adequação Orçamentária',
        description: 'Demonstração da adequação orçamentária',
        isRequired: true,
        fields: [],
      },
      {
        number: 13,
        title: 'XIII - Contratações Correlatas e/ou Interdependentes',
        description: 'Análise de contratações correlatas',
        isRequired: true,
        fields: [],
      },
    ]),
  ),
}));

// Mock components
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: () => <nav aria-label="Breadcrumb" data-testid="breadcrumb" />,
}));

vi.mock('@/components/common/LoadingState', () => ({
  LoadingState: ({ message }: { message: string }) => (
    <div data-testid="loading-state">{message}</div>
  ),
}));

// Mock ETP Editor subcomponents
vi.mock('@/components/etp/ETPEditorHeader', () => ({
  ETPEditorHeader: ({
    etpTitle,
    etpDescription,
    onSave,
    isSaving,
  }: {
    etpTitle: string;
    etpDescription?: string;
    onSave: () => void;
    isSaving?: boolean;
  }) => (
    <div>
      <h1>{etpTitle}</h1>
      {etpDescription && <p>{etpDescription}</p>}
      <button onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  ),
  // Export initialExportState for #612
  initialExportState: {
    isExporting: false,
    progress: 0,
    stage: 'idle',
    format: null,
  },
}));

vi.mock('@/components/etp/ETPEditorProgress', () => ({
  ETPEditorProgress: ({ progress }: { progress: number }) => (
    <div>
      <span>Progresso Geral</span>
      <span>{progress}%</span>
      <div role="progressbar" data-state="indeterminate" />
    </div>
  ),
}));

vi.mock('@/components/etp/ETPEditorTabsList', () => ({
  ETPEditorTabsList: ({
    sections,
  }: {
    sections: Array<{ id: string; title: string; completed: boolean }>;
  }) => (
    <div role="tablist">
      {sections.map((section, index) => (
        <button
          key={section.id}
          role="tab"
          data-state={index === 0 ? 'active' : 'inactive'}
        >
          {section.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/etp/ETPEditorContent', () => ({
  ETPEditorContent: ({
    sections,
    currentContent,
    onContentChange,
  }: {
    sections: Array<{
      number: number;
      title: string;
      description: string;
      content: string;
      isRequired: boolean;
    }>;
    currentContent: string;
    onContentChange: (content: string) => void;
  }) => (
    <div>
      {sections.length > 0 && (
        <div key={sections[0].number}>
          <h3>{sections[0].title}</h3>
          <p>{sections[0].description}</p>
          <textarea
            value={currentContent}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={`Digite o conteúdo da seção ${sections[0].title}...`}
          />
          <button>Gerar Sugestao</button>
        </div>
      )}
    </div>
  ),
}));

vi.mock('@/components/etp/ETPEditorSidebar', () => ({
  ETPEditorSidebar: ({
    sections,
    onGenerateAll,
    isGenerating,
  }: {
    sections: Array<{ id: string; title: string; completed: boolean }>;
    onGenerateAll: () => void;
    isGenerating: boolean;
  }) => (
    <div>
      <div>
        {sections.filter((s) => s.completed).length}/{sections.length} seções
        geradas
      </div>
      <button onClick={onGenerateAll} disabled={isGenerating}>
        {isGenerating ? 'Gerando...' : 'Gerar Todas Seções'}
      </button>
    </div>
  ),
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
      toast: vi.fn(),
      success: mockSuccessToast,
      error: mockErrorToast,
    });
  });

  /**
   * Teste 1: Componente renderiza sem erros com ETP mockado
   */
  it('renderiza sem erros com ETP mockado', async () => {
    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>,
    );

    // Aguarda templates carregarem
    await waitFor(() => {
      expect(screen.getByText('ETP de Teste')).toBeInTheDocument();
    });

    // Verifica que o título do ETP é exibido
    expect(screen.getByText('ETP de Teste')).toBeInTheDocument();
    expect(screen.getByText('Descrição do ETP de teste')).toBeInTheDocument();

    // Verifica que fetchETP foi chamado com o ID correto
    expect(mockFetchETP).toHaveBeenCalledWith('etp-123');
  });

  /**
   * Teste 2: Progress bar exibe porcentagem correta
   */
  it('exibe a porcentagem correta na progress bar', async () => {
    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>,
    );

    // Aguarda templates carregarem
    await waitFor(() => {
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

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
   * Teste 3: Verifica que tabs são renderizadas corretamente
   * Nota: A funcionalidade de troca de tabs é responsabilidade do componente Tabs do Radix UI.
   * Este teste valida que o ETPEditor renderiza corretamente as tabs através dos subcomponentes.
   */
  it('renderiza tabs com ETPEditorTabsList', async () => {
    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>,
    );

    // Aguarda templates carregarem
    await waitFor(() => {
      expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
    });

    // Busca todas as tabs
    const tabs = screen.getAllByRole('tab');

    // Verifica que temos 5 tabs (5 templates mockados)
    expect(tabs.length).toBe(5);

    // Tab da seção 1 é a primeira (index 0) e deve estar ativa
    const section1Tab = tabs[0];
    expect(section1Tab).toHaveAttribute('data-state', 'active');
    expect(section1Tab).toHaveTextContent('1');

    // Verifica que o conteúdo da seção 1 está exibido via ETPEditorContent
    expect(
      screen.getByText('I - Necessidade da Contratação'),
    ).toBeInTheDocument();
    const textarea1 = screen.getByPlaceholderText(
      /Digite o conteúdo da seção I - Necessidade da Contratação/,
    );
    expect(textarea1).toHaveValue('Conteúdo da seção 1');
  });

  /**
   * Teste 4: Digitar em textarea atualiza content state
   */
  it('atualiza o state content ao digitar em textarea', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>,
    );

    // Aguarda templates carregarem
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          /Digite o conteúdo da seção I - Necessidade da Contratação/,
        ),
      ).toBeInTheDocument();
    });

    // Pega o textarea da seção 1
    const textarea = screen.getByPlaceholderText(
      /Digite o conteúdo da seção I - Necessidade da Contratação/,
    );
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
      </BrowserRouter>,
    );

    // Aguarda templates carregarem
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText(
          /Digite o conteúdo da seção I - Necessidade da Contratação/,
        ),
      ).toBeInTheDocument();
    });

    // Modifica o conteúdo da seção 1
    const textarea = screen.getByPlaceholderText(
      /Digite o conteúdo da seção I - Necessidade da Contratação/,
    );
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
   * Teste 6: Botao "Gerar Sugestao" esta presente
   * Nota: Como nao ha AIGenerationPanel no codigo atual,
   * este teste apenas valida que o botao existe.
   */
  it('exibe botao "Gerar Sugestao"', async () => {
    render(
      <BrowserRouter>
        <ETPEditor />
      </BrowserRouter>,
    );

    // Aguarda templates carregarem
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Gerar Sugestao/i }),
      ).toBeInTheDocument();
    });

    // Verifica que o botao "Gerar Sugestao" existe
    const aiButton = screen.getByRole('button', { name: /Gerar Sugestao/i });
    expect(aiButton).toBeInTheDocument();
    expect(aiButton).toHaveTextContent('Gerar Sugestao');
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
      </BrowserRouter>,
    );

    // Verifica que o loading state é exibido
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    // A mensagem pode ser "Carregando templates..." ou "Carregando ETP..."
    // dependendo do que carrega primeiro
    expect(
      screen.getByText(/Carregando (templates\.\.\.|ETP\.\.\.)/),
    ).toBeInTheDocument();
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
      </BrowserRouter>,
    );

    // Aguarda templates carregarem
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Salvar/i }),
      ).toBeInTheDocument();
    });

    // Clica no botão Salvar
    const saveButton = screen.getByRole('button', { name: /Salvar/i });
    await user.click(saveButton);

    // Verifica que o toast de erro foi exibido
    await waitFor(() => {
      expect(mockErrorToast).toHaveBeenCalledWith('Erro ao salvar seção');
    });
  });
});

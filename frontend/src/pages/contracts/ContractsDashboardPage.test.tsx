import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContractsDashboardPage } from './ContractsDashboardPage';

// Mock MainLayout to avoid nested routing issues
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

// Mock useAuth hook
const mockUser = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  domainId: 'domain-123',
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isAuthInitialized: true,
  }),
}));

// Mock useContractKPIs hook
const mockKPIData = {
  totalContracts: 42,
  totalValue: 5234567.89,
  expiringIn30Days: 3,
  pendingMeasurements: 8,
};

let mockHookReturn = {
  data: null,
  isLoading: true,
  error: null,
};

vi.mock('@/hooks/contracts/useContractKPIs', () => ({
  useContractKPIs: () => mockHookReturn,
}));

// Mock useContracts hook
vi.mock('@/hooks/contracts/useContracts', () => ({
  useContracts: vi.fn(() => ({
    data: undefined,
    isLoading: true,
    error: null,
  })),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('ContractsDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to loading state by default (shows skeletons)
    mockHookReturn = {
      data: null,
      isLoading: true,
      error: null,
    };
  });

  const renderPage = () => {
    const queryClient = createQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ContractsDashboardPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );
  };

  it('renders page title', () => {
    renderPage();

    expect(
      screen.getByText('Dashboard de Contratos'),
    ).toBeInTheDocument();
  });

  it('renders page description', () => {
    renderPage();

    expect(
      screen.getByText('Visão geral e gestão de contratos do órgão'),
    ).toBeInTheDocument();
  });

  it('renders KPI cards skeleton section', () => {
    renderPage();

    const kpiSection = screen.getByLabelText('Indicadores de Contratos');
    expect(kpiSection).toBeInTheDocument();

    // Should show 4 skeleton cards
    const skeletonCards = screen.getAllByLabelText('Carregando indicador');
    expect(skeletonCards).toHaveLength(4);
  });

  it('renders charts section with 2 skeletons', () => {
    renderPage();

    const chartsSection = screen.getByLabelText('Gráficos e Análises');
    expect(chartsSection).toBeInTheDocument();

    // Charts section should have 2 chart skeletons
    const chartSkeletons = screen.getAllByLabelText('Carregando gráfico');
    expect(chartSkeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders table and timeline section', () => {
    renderPage();

    const tableSection = screen.getByLabelText('Lista de Contratos');
    expect(tableSection).toBeInTheDocument();

    // ContractsTable has internal skeleton loading (tested in ContractsTable.test.tsx)
    // Just verify the section is rendered
  });

  it('uses MainLayout component', () => {
    renderPage();

    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('applies responsive grid classes', () => {
    // Set mock to return data (not loading)
    mockHookReturn = {
      data: mockKPIData,
      isLoading: false,
      error: null,
    };

    renderPage();

    // The grid classes are on the SummaryCards wrapper (role="region")
    // not on the <section> element
    const gridContainer = screen.getAllByRole('region').find(el =>
      el.getAttribute('aria-label') === 'Indicadores de Contratos' &&
      el.className.includes('grid')
    );

    expect(gridContainer).toBeDefined();
    expect(gridContainer?.className).toContain('grid');
    expect(gridContainer?.className).toContain('md:grid-cols-2');
    expect(gridContainer?.className).toContain('lg:grid-cols-4');
  });

  it('applies spacing according to Apple HIG tokens', () => {
    renderPage();

    const mainContainer = screen.getByText('Dashboard de Contratos')
      .closest('div')
      ?.parentElement?.parentElement;

    // Expect space-y-6 (24px gap between sections)
    expect(mainContainer?.className).toContain('space-y-6');
  });

  it('has accessible ARIA labels for sections', () => {
    renderPage();

    expect(screen.getByLabelText('Indicadores de Contratos')).toBeInTheDocument();
    expect(screen.getByLabelText('Gráficos e Análises')).toBeInTheDocument();
    expect(screen.getByLabelText('Lista de Contratos')).toBeInTheDocument();
  });

  it('skeleton cards have pulse animation', () => {
    renderPage();

    const skeletonCards = screen.getAllByLabelText('Carregando indicador');

    skeletonCards.forEach((card) => {
      expect(card.className).toContain('animate-pulse');
    });
  });

  it('ContractsTable component is rendered', () => {
    renderPage();

    const tableSection = screen.getByLabelText('Lista de Contratos');

    // Verify the section exists (ContractsTable is tested separately)
    expect(tableSection).toBeInTheDocument();
  });

  it('maintains consistent card styling with design system', () => {
    renderPage();

    const skeletonCards = screen.getAllByLabelText('Carregando indicador');

    skeletonCards.forEach((card) => {
      // Check for design system classes
      expect(card.className).toContain('rounded-lg');
      expect(card.className).toContain('border');
      expect(card.className).toContain('bg-card');
    });
  });
});

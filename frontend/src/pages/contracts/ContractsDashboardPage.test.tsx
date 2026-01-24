import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
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

describe('ContractsDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <ContractsDashboardPage />
      </BrowserRouter>,
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

    // Should show table skeleton
    expect(
      screen.getByLabelText('Carregando tabela de contratos'),
    ).toBeInTheDocument();
  });

  it('uses MainLayout component', () => {
    renderPage();

    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });

  it('applies responsive grid classes', () => {
    renderPage();

    const kpiSection = screen.getByLabelText('Indicadores de Contratos');

    // Check for responsive grid classes (Tailwind)
    expect(kpiSection.className).toContain('grid');
    expect(kpiSection.className).toContain('md:grid-cols-2');
    expect(kpiSection.className).toContain('lg:grid-cols-4');
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

  it('table skeleton shows 10 placeholder rows', () => {
    renderPage();

    const tableSkeleton = screen.getByLabelText('Carregando tabela de contratos');

    // Should have 10 skeleton rows
    const skeletonRows = tableSkeleton.querySelectorAll('.h-12');
    expect(skeletonRows).toHaveLength(10);
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

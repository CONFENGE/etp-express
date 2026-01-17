import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductivityRanking } from './ProductivityRanking';
import { useAdminStore, ProductivityRankingResponse } from '@/store/adminStore';

// Mock the store
vi.mock('@/store/adminStore', () => ({
  useAdminStore: vi.fn(),
}));

// Mock PeriodFilter component
vi.mock('@/components/metrics', () => ({
  PeriodFilter: ({
    onPeriodChange,
  }: {
    onPeriodChange: (days: number) => void;
  }) => (
    <button
      data-testid="period-filter"
      onClick={() => onPeriodChange(30)}
      type="button"
    >
      Mock Period Filter
    </button>
  ),
}));

describe('ProductivityRanking', () => {
  const mockFetchProductivityRanking = vi.fn();

  const mockRankingData: ProductivityRankingResponse = {
    ranking: [
      {
        position: 1,
        userId: 'user-1',
        userName: 'Maria Silva',
        userEmail: 'maria@prefeitura.gov.br',
        etpsCreated: 15,
        etpsCompleted: 12,
        completionRate: 80.0,
      },
      {
        position: 2,
        userId: 'user-2',
        userName: 'Joao Santos',
        userEmail: 'joao@prefeitura.gov.br',
        etpsCreated: 10,
        etpsCompleted: 8,
        completionRate: 80.0,
      },
      {
        position: 3,
        userId: 'user-3',
        userName: 'Ana Costa',
        userEmail: 'ana@prefeitura.gov.br',
        etpsCreated: 8,
        etpsCompleted: 5,
        completionRate: 62.5,
      },
    ],
    totalUsers: 3,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: null,
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);
  });

  it('renders loading skeleton when loading', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: null,
      rankingLoading: true,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    expect(
      screen.getByRole('status', { name: /carregando ranking/i }),
    ).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: { ...mockRankingData, ranking: [], totalUsers: 0 },
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    expect(screen.getByText('Nenhum usuário encontrado')).toBeInTheDocument();
  });

  it('renders ranking table with data', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: mockRankingData,
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    // Check title
    expect(screen.getByText('Ranking de Produtividade')).toBeInTheDocument();

    // Check user names are displayed
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Joao Santos')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();

    // Check emails are displayed
    expect(screen.getByText('maria@prefeitura.gov.br')).toBeInTheDocument();

    // Check completion rates (two users have 80%)
    const rateElements = screen.getAllByText('80%');
    expect(rateElements.length).toBe(2);
    expect(screen.getByText('62.5%')).toBeInTheDocument();
  });

  it('fetches ranking on mount', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: mockRankingData,
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    expect(mockFetchProductivityRanking).toHaveBeenCalledWith(0, 1, 10);
  });

  it('refetches when period changes', async () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: mockRankingData,
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    // Click the mock period filter to change to 30 days
    fireEvent.click(screen.getByTestId('period-filter'));

    await waitFor(() => {
      expect(mockFetchProductivityRanking).toHaveBeenCalledWith(30, 1, 10);
    });
  });

  it('renders pagination controls when multiple pages', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: {
        ...mockRankingData,
        totalUsers: 25,
        totalPages: 3,
      },
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    expect(screen.getByText('Pagina 1 de 3')).toBeInTheDocument();
    expect(screen.getByText('25 usuarios no total')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /pagina anterior/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /proxima pagina/i }),
    ).toBeInTheDocument();
  });

  it('does not render pagination when only one page', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: mockRankingData,
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    expect(screen.queryByText(/pagina \d+ de \d+/i)).not.toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: {
        ...mockRankingData,
        page: 1,
        totalPages: 3,
        totalUsers: 25,
      },
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    const prevButton = screen.getByRole('button', { name: /pagina anterior/i });
    expect(prevButton).toBeDisabled();
  });

  it('applies position badge styling for top 3', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: mockRankingData,
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    render(<ProductivityRanking />);

    // Check that positions 1, 2, 3 are rendered
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    vi.mocked(useAdminStore).mockReturnValue({
      productivityRanking: mockRankingData,
      rankingLoading: false,
      fetchProductivityRanking: mockFetchProductivityRanking,
    } as unknown as ReturnType<typeof useAdminStore>);

    const { container } = render(
      <ProductivityRanking className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

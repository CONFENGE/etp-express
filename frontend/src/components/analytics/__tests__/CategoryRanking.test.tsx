import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CategoryRanking } from '../CategoryRanking';
import type { CategoryRanking as CategoryRankingType } from '@/store/marketAnalyticsStore';

const mockCategories: CategoryRankingType[] = [
  {
    categoryId: 'cat-1',
    categoryCode: 'CATMAT-44122',
    categoryName: 'Material de Escritorio',
    contractCount: 1500,
    totalValue: 4500000,
    averagePrice: 3000,
  },
  {
    categoryId: 'cat-2',
    categoryCode: 'CATMAT-44555',
    categoryName: 'Equipamentos de Informatica',
    contractCount: 1200,
    totalValue: 12000000,
    averagePrice: 10000,
  },
  {
    categoryId: 'cat-3',
    categoryCode: 'CATSER-12345',
    categoryName: 'Servicos de Limpeza',
    contractCount: 800,
    totalValue: 3200000,
    averagePrice: 4000,
  },
];

describe('CategoryRanking', () => {
  it('renders all categories when data is provided', () => {
    render(<CategoryRanking data={mockCategories} />);

    // Check for category names
    expect(screen.getByText('Material de Escritorio')).toBeInTheDocument();
    expect(screen.getByText('Equipamentos de Informatica')).toBeInTheDocument();
    expect(screen.getByText('Servicos de Limpeza')).toBeInTheDocument();
  });

  it('shows card title and description', () => {
    render(<CategoryRanking data={mockCategories} />);

    expect(screen.getByText('Top Categorias Contratadas')).toBeInTheDocument();
    expect(
      screen.getByText('Categorias com maior volume de contratacoes'),
    ).toBeInTheDocument();
  });

  it('shows empty state when no data is provided', () => {
    render(<CategoryRanking data={[]} />);

    expect(screen.getByText('Nenhuma categoria disponivel')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<CategoryRanking data={[]} isLoading={true} />);

    // Should not show empty state when loading
    expect(
      screen.queryByText('Nenhuma categoria disponivel'),
    ).not.toBeInTheDocument();
  });

  it('displays total contracts count in footer', () => {
    render(<CategoryRanking data={mockCategories} />);

    // Total contracts: 1500 + 1200 + 800 = 3500
    expect(screen.getByText('3.500 contratos')).toBeInTheDocument();
  });

  it('displays category codes', () => {
    render(<CategoryRanking data={mockCategories} />);

    expect(screen.getByText('CATMAT-44122')).toBeInTheDocument();
    expect(screen.getByText('CATSER-12345')).toBeInTheDocument();
  });

  it('has correct test id for container', () => {
    render(<CategoryRanking data={mockCategories} />);

    expect(screen.getByTestId('category-ranking')).toBeInTheDocument();
  });

  it('shows medal badges for top 3 positions on mobile', () => {
    render(<CategoryRanking data={mockCategories} />);

    // Position numbers should be visible (1, 2, 3)
    const positions = screen.getAllByText(/^[123]$/);
    expect(positions.length).toBeGreaterThan(0);
  });
});

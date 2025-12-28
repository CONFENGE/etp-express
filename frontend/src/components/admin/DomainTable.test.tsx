import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { DomainTable } from './DomainTable';
import { AuthorizedDomain } from '@/store/adminStore';

const mockDomains: AuthorizedDomain[] = [
  {
    id: '1',
    domain: 'example.com',
    createdAt: '2024-01-01T00:00:00Z',
    maxUsers: 50,
    isActive: true,
    managerId: 'user-1',
    managerName: 'John Doe',
    currentUsers: 25,
  },
  {
    id: '2',
    domain: 'test.org',
    createdAt: '2024-01-02T00:00:00Z',
    maxUsers: 100,
    isActive: false,
    currentUsers: 0,
  },
];

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('DomainTable', () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render table headers', () => {
      renderWithRouter(
        <DomainTable
          domains={mockDomains}
          loading={false}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText('Domínio')).toBeInTheDocument();
      expect(screen.getByText('Usuários')).toBeInTheDocument();
      expect(screen.getByText('Gestor')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Ações')).toBeInTheDocument();
    });

    it('should render domain data correctly', () => {
      renderWithRouter(
        <DomainTable
          domains={mockDomains}
          loading={false}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText('example.com')).toBeInTheDocument();
      expect(screen.getByText('test.org')).toBeInTheDocument();
      expect(screen.getByText('25 / 50')).toBeInTheDocument();
      expect(screen.getByText('0 / 100')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should show "Não atribuído" for domains without manager', () => {
      renderWithRouter(
        <DomainTable
          domains={mockDomains}
          loading={false}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText('Não atribuído')).toBeInTheDocument();
    });

    it('should show correct status badges', () => {
      renderWithRouter(
        <DomainTable
          domains={mockDomains}
          loading={false}
          onDelete={mockOnDelete}
        />,
      );

      expect(screen.getByText('Ativo')).toBeInTheDocument();
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show skeleton when loading', () => {
      const { container } = renderWithRouter(
        <DomainTable domains={[]} loading={true} onDelete={mockOnDelete} />,
      );

      // Should show skeleton rows
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty state', () => {
    it('should show empty message when no domains', () => {
      renderWithRouter(
        <DomainTable domains={[]} loading={false} onDelete={mockOnDelete} />,
      );

      expect(
        screen.getByText('Nenhum domínio cadastrado ainda.'),
      ).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should have action buttons for each domain', () => {
      renderWithRouter(
        <DomainTable
          domains={mockDomains}
          loading={false}
          onDelete={mockOnDelete}
        />,
      );

      const actionButtons = screen.getAllByRole('button', {
        name: /actions for/i,
      });
      expect(actionButtons.length).toBe(mockDomains.length);
    });
  });
});

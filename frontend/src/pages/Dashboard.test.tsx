import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { Dashboard } from './Dashboard';
import * as useAuthHook from '@/hooks/useAuth';
import * as useETPs from '@/hooks/useETPs';
import * as useSuccessRate from '@/hooks/useSuccessRate';
import * as useAvgCompletionTime from '@/hooks/useAvgCompletionTime';
import * as useStatusDistribution from '@/hooks/useStatusDistribution';

// Mock all hooks
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useETPs');
vi.mock('@/hooks/useSuccessRate');
vi.mock('@/hooks/useAvgCompletionTime');
vi.mock('@/hooks/useStatusDistribution');

const mockUseAuth = vi.spyOn(useAuthHook, 'useAuth');
const mockUseETPs = vi.spyOn(useETPs, 'useETPs');
const mockUseSuccessRate = vi.spyOn(useSuccessRate, 'useSuccessRate');
const mockUseAvgCompletionTime = vi.spyOn(
  useAvgCompletionTime,
  'useAvgCompletionTime',
);
const mockUseStatusDistribution = vi.spyOn(
  useStatusDistribution,
  'useStatusDistribution',
);

describe('Dashboard - Demo User Blocked (#1446)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseETPs.mockReturnValue({
      etps: [],
      isLoading: false,
      createETP: vi.fn(),
      updateETP: vi.fn(),
      deleteETP: vi.fn(),
    });

    mockUseSuccessRate.mockReturnValue({
      data: null,
      isLoading: false,
    });

    mockUseAvgCompletionTime.mockReturnValue({
      data: null,
      isLoading: false,
    });

    mockUseStatusDistribution.mockReturnValue({
      data: null,
      isLoading: false,
    });
  });

  it('should show blocked banner for demo user with isDemoBlocked=true', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'demo-user-1',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'demo',
        isDemoBlocked: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isAuthInitialized: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      clearAuth: vi.fn(),
      changePassword: vi.fn(),
    });

    mockUseETPs.mockReturnValue({
      etps: [
        {
          id: 'etp-1',
          title: 'ETP Teste',
          description: 'Descricao',
          status: 'in_progress',
          progress: 50,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      createETP: vi.fn(),
      updateETP: vi.fn(),
      deleteETP: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    // Check if blocked banner is visible
    const banner = screen.getByTestId('demo-blocked-banner');
    expect(banner).toBeInTheDocument();

    // Check banner content
    expect(screen.getByText(/Limite de ETPs atingido/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Seu limite de 3 ETPs foi atingido. Você pode visualizar seus ETPs existentes, mas não criar novos./i,
      ),
    ).toBeInTheDocument();
  });

  it('should disable "Criar ETP" button for blocked demo user', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'demo-user-1',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'demo',
        isDemoBlocked: true,
      },
      isAuthenticated: true,
      isLoading: false,
      isAuthInitialized: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      clearAuth: vi.fn(),
      changePassword: vi.fn(),
    });

    mockUseETPs.mockReturnValue({
      etps: [
        {
          id: 'etp-1',
          title: 'ETP Teste',
          description: 'Descricao',
          status: 'in_progress',
          progress: 50,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      createETP: vi.fn(),
      updateETP: vi.fn(),
      deleteETP: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    // Check if button is disabled
    const createButton = screen.getByTestId('create-etp-button-disabled');
    expect(createButton).toBeDisabled();
    expect(createButton).toHaveAttribute('title', 'Limite de ETPs atingido');
  });

  it('should NOT show blocked banner for normal user', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Normal User',
        email: 'user@example.com',
        role: 'user',
        isDemoBlocked: false,
      },
      isAuthenticated: true,
      isLoading: false,
      isAuthInitialized: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      clearAuth: vi.fn(),
      changePassword: vi.fn(),
    });

    mockUseETPs.mockReturnValue({
      etps: [
        {
          id: 'etp-1',
          title: 'ETP Teste',
          description: 'Descricao',
          status: 'in_progress',
          progress: 50,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      createETP: vi.fn(),
      updateETP: vi.fn(),
      deleteETP: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    // Check if blocked banner is NOT visible
    expect(screen.queryByTestId('demo-blocked-banner')).not.toBeInTheDocument();
  });

  it('should enable "Criar ETP" button for normal user', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Normal User',
        email: 'user@example.com',
        role: 'user',
        isDemoBlocked: false,
      },
      isAuthenticated: true,
      isLoading: false,
      isAuthInitialized: true,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      clearAuth: vi.fn(),
      changePassword: vi.fn(),
    });

    mockUseETPs.mockReturnValue({
      etps: [
        {
          id: 'etp-1',
          title: 'ETP Teste',
          description: 'Descricao',
          status: 'in_progress',
          progress: 50,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      isLoading: false,
      createETP: vi.fn(),
      updateETP: vi.fn(),
      deleteETP: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    // Check if button is enabled
    const createButton = screen.getByTestId('create-etp-button');
    expect(createButton).not.toBeDisabled();
  });
});

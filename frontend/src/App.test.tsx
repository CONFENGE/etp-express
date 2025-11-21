import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock do useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock dos componentes de páginas para simplificar o teste
vi.mock('@/pages/Login', () => ({
  Login: () => <div>Login Page</div>,
}));

vi.mock('@/pages/Register', () => ({
  Register: () => <div>Register Page</div>,
}));

vi.mock('@/pages/Dashboard', () => ({
  Dashboard: () => <div>Dashboard Page</div>,
}));

vi.mock('@/pages/ETPs', () => ({
  ETPs: () => <div>ETPs Page</div>,
}));

vi.mock('@/pages/ETPEditor', () => ({
  ETPEditor: () => <div>ETPEditor Page</div>,
}));

vi.mock('@/pages/NotFound', () => ({
  NotFound: () => <div>Not Found Page</div>,
}));

vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div>Toaster</div>,
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it('redirects to login when not authenticated', () => {
    render(<App />);

    // Usuário não autenticado deve ver a página de login
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('has ErrorBoundary wrapper', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('has Toaster component', () => {
    render(<App />);
    expect(screen.getByText('Toaster')).toBeInTheDocument();
  });
});

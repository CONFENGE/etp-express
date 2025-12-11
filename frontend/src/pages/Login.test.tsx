import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './Login';

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>,
  );
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Visibility Toggle', () => {
    it('should render password input with type="password" by default', () => {
      renderLogin();

      const passwordInput = screen.getByLabelText('Senha');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render toggle button with correct aria-label', () => {
      renderLogin();

      const toggleButton = screen.getByRole('button', {
        name: 'Mostrar senha',
      });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle password visibility when button is clicked', async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = screen.getByLabelText('Senha');
      const toggleButton = screen.getByRole('button', {
        name: 'Mostrar senha',
      });

      // Initially password is hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Button aria-label should change
      expect(toggleButton).toHaveAttribute('aria-label', 'Ocultar senha');

      // Click to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(toggleButton).toHaveAttribute('aria-label', 'Mostrar senha');
    });

    it('should render Eye icon when password is hidden', () => {
      renderLogin();

      const toggleButton = screen.getByRole('button', {
        name: 'Mostrar senha',
      });

      // The Eye icon should be visible (EyeOff hidden)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
    });

    it('should have tabIndex={-1} to not interfere with form navigation', () => {
      renderLogin();

      const toggleButton = screen.getByRole('button', {
        name: 'Mostrar senha',
      });
      expect(toggleButton).toHaveAttribute('tabIndex', '-1');
    });

    it('should have accessible aria-hidden on icons', () => {
      renderLogin();

      const toggleButton = screen.getByRole('button', {
        name: 'Mostrar senha',
      });
      const icon = toggleButton.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Form Rendering', () => {
    it('should render email and password fields', () => {
      renderLogin();

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    });

    it('should render login button', () => {
      renderLogin();

      expect(
        screen.getByRole('button', { name: /entrar/i }),
      ).toBeInTheDocument();
    });

    it('should render link to register page', () => {
      renderLogin();

      expect(screen.getByText('Cadastre-se')).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Register } from './Register';

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    register: vi.fn(),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

const renderRegister = () => {
  return render(
    <BrowserRouter>
      <Register />
    </BrowserRouter>,
  );
};

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Visibility Toggle', () => {
    it('should render password input with type="password" by default', () => {
      renderRegister();

      const passwordInput = screen.getByLabelText('Senha');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render confirm password input with type="password" by default', () => {
      renderRegister();

      const confirmPasswordInput = screen.getByLabelText('Confirmar Senha');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('should render toggle buttons for both password fields', () => {
      renderRegister();

      const toggleButtons = screen.getAllByRole('button', {
        name: 'Mostrar senha',
      });
      expect(toggleButtons).toHaveLength(2);
    });

    it('should toggle password visibility independently', async () => {
      const user = userEvent.setup();
      renderRegister();

      const passwordInput = screen.getByLabelText('Senha');
      const confirmPasswordInput = screen.getByLabelText('Confirmar Senha');
      const toggleButtons = screen.getAllByRole('button', {
        name: 'Mostrar senha',
      });

      // Initially both passwords are hidden
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // Click first toggle (password field)
      await user.click(toggleButtons[0]);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');

      // Click second toggle (confirm password field)
      await user.click(toggleButtons[1]);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });

    it('should update aria-label when password visibility toggles', async () => {
      const user = userEvent.setup();
      renderRegister();

      const toggleButtons = screen.getAllByRole('button', {
        name: 'Mostrar senha',
      });

      // Click to show password
      await user.click(toggleButtons[0]);

      // First button should now say "Ocultar senha"
      expect(toggleButtons[0]).toHaveAttribute('aria-label', 'Ocultar senha');
      // Second button should still say "Mostrar senha"
      expect(toggleButtons[1]).toHaveAttribute('aria-label', 'Mostrar senha');
    });

    it('should have tabIndex={-1} on all toggle buttons', () => {
      renderRegister();

      const toggleButtons = screen.getAllByRole('button', {
        name: 'Mostrar senha',
      });

      toggleButtons.forEach((button) => {
        expect(button).toHaveAttribute('tabIndex', '-1');
      });
    });

    it('should have accessible aria-hidden on icons', () => {
      renderRegister();

      const toggleButtons = screen.getAllByRole('button', {
        name: 'Mostrar senha',
      });

      toggleButtons.forEach((button) => {
        const icon = button.querySelector('svg');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Form Rendering', () => {
    it('should render all required fields', () => {
      renderRegister();

      expect(screen.getByLabelText('Nome')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar Senha')).toBeInTheDocument();
    });

    it('should render register button', () => {
      renderRegister();

      expect(
        screen.getByRole('button', { name: /cadastrar/i }),
      ).toBeInTheDocument();
    });

    it('should render link to login page', () => {
      renderRegister();

      expect(screen.getByText('Entre')).toBeInTheDocument();
    });

    it('should render LGPD consent checkbox', () => {
      renderRegister();

      expect(screen.getByText(/termos de uso/)).toBeInTheDocument();
      expect(screen.getByText(/política de privacidade/)).toBeInTheDocument();
    });

    it('should render international transfer consent checkbox', () => {
      renderRegister();

      expect(
        screen.getByText(/transferência internacional de dados/),
      ).toBeInTheDocument();
    });
  });
});

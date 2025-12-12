import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './Login';

// Create mock functions that can be controlled in tests
const mockLogin = vi.fn();
const mockError = vi.fn();
const mockSuccess = vi.fn();

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: mockError,
    success: mockSuccess,
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
    mockLogin.mockReset();
    mockError.mockReset();
    mockSuccess.mockReset();
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

  describe('Loading State with Spinner', () => {
    it('should show loading overlay with spinner when form is submitted', async () => {
      const user = userEvent.setup();
      // Make login return a promise that doesn't resolve immediately
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      renderLogin();

      // Fill in valid credentials
      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha'), 'password123');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      // Check for loading overlay
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Autenticando')).toBeInTheDocument();
      expect(screen.getByText('Autenticando...')).toBeInTheDocument();

      // Wait for the promise to resolve
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });

    it('should show spinner icon in button during loading', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha'), 'password123');

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      await user.click(submitButton);

      // Button should show loading text and be disabled
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Entrando...')).toBeInTheDocument();
    });

    it('should hide loading overlay after login completes', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({});
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha'), 'password123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should hide loading overlay after login fails', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Login failed'));
      renderLogin();

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Senha'), 'password123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Error should have been shown
      expect(mockError).toHaveBeenCalledWith('Login failed');
    });
  });
});

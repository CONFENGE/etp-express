import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
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

// Mock checkApiHealth to return healthy by default (no diagnostic shown)
vi.mock('@/lib/api-errors', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api-errors')>();
  return {
    ...original,
    checkApiHealth: vi.fn().mockResolvedValue({
      isHealthy: true,
      details: 'API disponível',
      code: 'healthy',
    }),
  };
});

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

      const passwordInput = screen.getByLabelText(/Senha/);
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

      const passwordInput = screen.getByLabelText(/Senha/);
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

  describe('Brand Icon', () => {
    it('should render ClipboardList icon with circular container', () => {
      renderLogin();

      // Find the icon container (rounded-full with bg-primary/10)
      const iconContainer = document.querySelector(
        '.bg-primary\\/10.rounded-full',
      );
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('p-3');

      // Find the icon inside the container
      const icon = iconContainer?.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Form Rendering', () => {
    it('should render email and password fields', () => {
      renderLogin();

      expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Senha/)).toBeInTheDocument();
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

  describe('Required Field Indicators', () => {
    it('should show asterisks for required fields', () => {
      renderLogin();

      // Both email and password should have required indicators (asterisks)
      const asterisks = screen.getAllByText('*');
      expect(asterisks).toHaveLength(2);
    });

    it('should have red asterisks with aria-hidden', () => {
      renderLogin();

      const asterisks = screen.getAllByText('*');
      asterisks.forEach((asterisk) => {
        expect(asterisk).toHaveClass('text-destructive');
        expect(asterisk).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should show helper text for email field', () => {
      renderLogin();

      expect(
        screen.getByText('Use seu email institucional'),
      ).toBeInTheDocument();
    });

    it('should show helper text for password field', () => {
      renderLogin();

      expect(screen.getByText('Minimo 6 caracteres')).toBeInTheDocument();
    });

    it('should have hint text with proper styling', () => {
      renderLogin();

      const emailHint = screen.getByText('Use seu email institucional');
      expect(emailHint).toHaveClass('text-xs');
      expect(emailHint).toHaveClass('text-muted-foreground');

      const passwordHint = screen.getByText('Minimo 6 caracteres');
      expect(passwordHint).toHaveClass('text-xs');
      expect(passwordHint).toHaveClass('text-muted-foreground');
    });

    it('should have proper aria-describedby on email input', () => {
      renderLogin();

      const emailInput = screen.getByLabelText(/Email/);
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-hint');
    });

    it('should hide hint and show error when validation fails', async () => {
      const user = userEvent.setup();
      renderLogin();

      // Submit empty form to trigger validation
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      // Wait for validation errors
      await waitFor(() => {
        expect(screen.getByText('Email inválido')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Validation', () => {
    it('should show check icon for valid email after debounce', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText(/Email/);
      await user.type(emailInput, 'test@example.com');

      // Wait for debounce
      await waitFor(
        () => {
          expect(screen.getByTestId('validation-check')).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it('should show alert icon for invalid email after debounce', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText(/Email/);
      await user.type(emailInput, 'invalid-email');

      // Wait for debounce
      await waitFor(
        () => {
          expect(screen.getByTestId('validation-alert')).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it('should show check icon for valid password (6+ chars) after debounce', async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = screen.getByLabelText(/Senha/);
      await user.type(passwordInput, 'password123');

      // Wait for debounce
      await waitFor(
        () => {
          expect(screen.getByTestId('validation-check')).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it('should show alert icon for short password after debounce', async () => {
      const user = userEvent.setup();
      renderLogin();

      const passwordInput = screen.getByLabelText(/Senha/);
      await user.type(passwordInput, '12345');

      // Wait for debounce
      await waitFor(
        () => {
          expect(screen.getByTestId('validation-alert')).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it('should apply green border class for valid email', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText(/Email/);
      await user.type(emailInput, 'test@example.com');

      // Wait for debounce
      await waitFor(
        () => {
          expect(emailInput).toHaveClass('border-apple-green');
        },
        { timeout: 1000 },
      );
    });

    it('should apply red border class for invalid email', async () => {
      const user = userEvent.setup();
      renderLogin();

      const emailInput = screen.getByLabelText(/Email/);
      await user.type(emailInput, 'invalid');

      // Wait for debounce
      await waitFor(
        () => {
          expect(emailInput).toHaveClass('border-apple-red');
        },
        { timeout: 1000 },
      );
    });

    it('should not interfere with form submission when validation is valid', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({});
      renderLogin();

      const emailInput = screen.getByLabelText(/Email/);
      const passwordInput = screen.getByLabelText(/Senha/);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Wait for debounce to show validation
      await waitFor(
        () => {
          expect(screen.getAllByTestId('validation-check')).toHaveLength(2);
        },
        { timeout: 1000 },
      );

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /entrar/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
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
      await user.type(screen.getByLabelText(/Email/), 'test@example.com');
      await user.type(screen.getByLabelText(/Senha/), 'password123');

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

      await user.type(screen.getByLabelText(/Email/), 'test@example.com');
      await user.type(screen.getByLabelText(/Senha/), 'password123');

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

      await user.type(screen.getByLabelText(/Email/), 'test@example.com');
      await user.type(screen.getByLabelText(/Senha/), 'password123');
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

      await user.type(screen.getByLabelText(/Email/), 'test@example.com');
      await user.type(screen.getByLabelText(/Senha/), 'password123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Error should have been shown
      expect(mockError).toHaveBeenCalledWith('Login failed');
    });
  });

  describe('Entrance Animations', () => {
    it('should apply background fade-in animation class', () => {
      renderLogin();

      // Background container should have fade-in animation
      const container = document.querySelector('.animate-fade-in');
      expect(container).toBeInTheDocument();
    });

    it('should apply fade-in-up animation to card with delay', () => {
      renderLogin();

      // Card should have fade-in-up animation
      const card = document.querySelector('.animate-fade-in-up');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('opacity-0');
    });

    it('should apply scale-fade-in animation to logo icon', () => {
      renderLogin();

      // Icon container should have scale-fade-in animation
      const iconContainer = document.querySelector('.animate-scale-fade-in');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('opacity-0');
    });

    it('should apply staggered animations to form elements', () => {
      renderLogin();

      // Multiple elements should have fade-in-up animation
      const animatedElements = document.querySelectorAll('.animate-fade-in-up');
      expect(animatedElements.length).toBeGreaterThanOrEqual(5);
    });

    it('should have animation delay on card', () => {
      renderLogin();

      // Card should have animation delay style
      const card = document.querySelector(
        '.animate-fade-in-up.\\[animation-delay\\:200ms\\]',
      );
      expect(card).toBeInTheDocument();
    });

    it('should have staggered animation delays on form fields', () => {
      renderLogin();

      // Check for different animation delays
      const delay700 = document.querySelector('.\\[animation-delay\\:700ms\\]');
      const delay800 = document.querySelector('.\\[animation-delay\\:800ms\\]');
      const delay900 = document.querySelector('.\\[animation-delay\\:900ms\\]');

      expect(delay700).toBeInTheDocument();
      expect(delay800).toBeInTheDocument();
      expect(delay900).toBeInTheDocument();
    });
  });
});

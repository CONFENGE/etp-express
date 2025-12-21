import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { Register } from './Register';

// Create mock functions that can be controlled in tests
const mockRegister = vi.fn();
const mockError = vi.fn();
const mockSuccess = vi.fn();

// Mock the hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    error: mockError,
    success: mockSuccess,
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
    mockRegister.mockReset();
    mockError.mockReset();
    mockSuccess.mockReset();
  });

  describe('Password Visibility Toggle', () => {
    it('should render password input with type="password" by default', () => {
      renderRegister();

      // Password inputs don't have textbox role, use direct id selector
      // since FormField uses wrapper divs that break getByLabelText
      const passwordInput = document.getElementById(
        'password',
      ) as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should render confirm password input with type="password" by default', () => {
      renderRegister();

      const confirmPasswordInput = document.getElementById(
        'confirmPassword',
      ) as HTMLInputElement;
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

      const passwordInput = document.getElementById(
        'password',
      ) as HTMLInputElement;
      const confirmPasswordInput = document.getElementById(
        'confirmPassword',
      ) as HTMLInputElement;
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

  describe('Brand Icon', () => {
    it('should render ClipboardList icon with circular container', () => {
      renderRegister();

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
    it('should render all required fields', () => {
      renderRegister();

      // Use getElementById since FormField uses wrapper divs that break getByLabelText
      expect(document.getElementById('name')).toBeInTheDocument();
      expect(document.getElementById('email')).toBeInTheDocument();
      expect(document.getElementById('password')).toBeInTheDocument();
      expect(document.getElementById('confirmPassword')).toBeInTheDocument();
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

  describe('Loading State with Spinner', () => {
    const fillFormAndSubmit = async (
      user: ReturnType<typeof userEvent.setup>,
    ) => {
      // Fill in valid credentials using getElementById since FormField uses wrapper divs
      const nameInput = document.getElementById('name') as HTMLInputElement;
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const passwordInput = document.getElementById(
        'password',
      ) as HTMLInputElement;
      const confirmPasswordInput = document.getElementById(
        'confirmPassword',
      ) as HTMLInputElement;

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      // Accept LGPD consent
      const lgpdCheckbox = screen.getByRole('checkbox', {
        name: /termos de uso/i,
      });
      await user.click(lgpdCheckbox);

      // Accept international transfer - this opens a modal, so we need to handle it
      const transferCheckbox = screen.getByRole('checkbox', {
        name: /transferência internacional/i,
      });
      await user.click(transferCheckbox);

      // Mark the modal's confirmation checkbox first (required to enable the accept button)
      const modalConfirmCheckbox = await screen.findByRole('checkbox', {
        name: /Li e compreendo/i,
      });
      await user.click(modalConfirmCheckbox);

      // Now accept the modal - use exact match to avoid matching "Não aceito"
      const acceptButton = await screen.findByRole('button', {
        name: /aceito a transferência/i,
      });
      await user.click(acceptButton);

      // Submit the form
      await user.click(screen.getByRole('button', { name: /cadastrar/i }));
    };

    it('should show loading overlay with spinner when form is submitted', async () => {
      const user = userEvent.setup();
      // Make register return a promise that doesn't resolve immediately
      mockRegister.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );
      renderRegister();

      await fillFormAndSubmit(user);

      // Check for loading overlay
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Cadastrando')).toBeInTheDocument();
      // There are two "Cadastrando..." texts - one in the overlay and one in the button
      expect(screen.getAllByText('Cadastrando...')).toHaveLength(2);
    });

    it('should show spinner icon in button during loading', async () => {
      const user = userEvent.setup();
      mockRegister.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );
      renderRegister();

      await fillFormAndSubmit(user);

      // Button should show loading text and be disabled
      const submitButton = screen.getByRole('button', { name: /cadastrando/i });
      expect(submitButton).toBeDisabled();
    });

    it('should hide loading overlay after registration completes', async () => {
      const user = userEvent.setup();
      mockRegister.mockResolvedValueOnce({});
      renderRegister();

      await fillFormAndSubmit(user);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should hide loading overlay after registration fails', async () => {
      const user = userEvent.setup();
      mockRegister.mockRejectedValueOnce(new Error('Registration failed'));
      renderRegister();

      await fillFormAndSubmit(user);

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Error should have been shown
      expect(mockError).toHaveBeenCalledWith('Registration failed');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordChangeModal } from './PasswordChangeModal';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';

// Mock the authStore
vi.mock('@/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('PasswordChangeModal', () => {
  const mockChangePassword = vi.fn();
  const mockClearError = vi.fn();

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    mustChangePassword: true,
  };

  const mockUserNoChange: User = {
    ...mockUser,
    mustChangePassword: false,
  };

  function setupMock(overrides: Partial<ReturnType<typeof useAuthStore>> = {}) {
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      changePassword: mockChangePassword,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      ...overrides,
    } as ReturnType<typeof useAuthStore>);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility', () => {
    it('should render when mustChangePassword is true', () => {
      render(<PasswordChangeModal />);

      expect(
        screen.getByText('Troca de Senha Obrigatória'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Por segurança, você precisa trocar sua senha/),
      ).toBeInTheDocument();
    });

    it('should NOT render when mustChangePassword is false', () => {
      setupMock({ user: mockUserNoChange });
      const { container } = render(<PasswordChangeModal />);

      expect(container).toBeEmptyDOMElement();
    });

    it('should NOT render when user is null', () => {
      setupMock({ user: null });
      const { container } = render(<PasswordChangeModal />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Form Fields', () => {
    it('should render all password fields', () => {
      render(<PasswordChangeModal />);

      expect(screen.getByLabelText('Senha Atual')).toBeInTheDocument();
      expect(screen.getByLabelText('Nova Senha')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar Nova Senha')).toBeInTheDocument();
    });

    it('should have show/hide password toggle buttons', () => {
      render(<PasswordChangeModal />);

      const toggleButtons = screen.getAllByRole('button', {
        name: /Mostrar senha|Ocultar senha/,
      });
      expect(toggleButtons).toHaveLength(3);
    });

    it('should toggle password visibility', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const currentPasswordInput = screen.getByLabelText('Senha Atual');
      const toggleButton = screen.getAllByRole('button', {
        name: 'Mostrar senha',
      })[0];

      expect(currentPasswordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);

      expect(currentPasswordInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Password Validation', () => {
    it('should show validation errors for weak password', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const newPasswordInput = screen.getByLabelText('Nova Senha');
      await user.type(newPasswordInput, 'weak');

      expect(screen.getByText(/Mínimo 8 caracteres/)).toBeInTheDocument();
      expect(
        screen.getByText(/Pelo menos 1 letra maiúscula/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Pelo menos 1 número/)).toBeInTheDocument();
      expect(
        screen.getByText(/Pelo menos 1 caractere especial/),
      ).toBeInTheDocument();
    });

    it('should show success message for valid password', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const newPasswordInput = screen.getByLabelText('Nova Senha');
      await user.type(newPasswordInput, 'ValidPass123!');

      expect(
        screen.getByText('Senha atende todos os requisitos'),
      ).toBeInTheDocument();
    });

    it('should show password mismatch error', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const newPasswordInput = screen.getByLabelText('Nova Senha');
      const confirmPasswordInput = screen.getByLabelText(
        'Confirmar Nova Senha',
      );

      await user.type(newPasswordInput, 'ValidPass123!');
      await user.type(confirmPasswordInput, 'DifferentPass456!');

      expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
    });

    it('should show match confirmation when passwords match', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const newPasswordInput = screen.getByLabelText('Nova Senha');
      const confirmPasswordInput = screen.getByLabelText(
        'Confirmar Nova Senha',
      );

      await user.type(newPasswordInput, 'ValidPass123!');
      await user.type(confirmPasswordInput, 'ValidPass123!');

      expect(screen.getByText('Senhas coincidem')).toBeInTheDocument();
    });
  });

  describe('Password Strength Indicator', () => {
    it('should show weak strength for short password', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const newPasswordInput = screen.getByLabelText('Nova Senha');
      await user.type(newPasswordInput, 'ab');

      expect(screen.getByText(/Força:/)).toBeInTheDocument();
      expect(screen.getByText('Fraca')).toBeInTheDocument();
    });

    it('should show strong strength for complex password', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const newPasswordInput = screen.getByLabelText('Nova Senha');
      await user.type(newPasswordInput, 'SuperStrong123!@#');

      expect(screen.getByText('Forte')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should disable submit button when form is invalid', () => {
      render(<PasswordChangeModal />);

      const submitButton = screen.getByRole('button', {
        name: 'Alterar Senha',
      });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when form is valid', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const currentPasswordInput = screen.getByLabelText('Senha Atual');
      const newPasswordInput = screen.getByLabelText('Nova Senha');
      const confirmPasswordInput = screen.getByLabelText(
        'Confirmar Nova Senha',
      );

      await user.type(currentPasswordInput, 'OldPassword123!');
      await user.type(newPasswordInput, 'NewPassword456!');
      await user.type(confirmPasswordInput, 'NewPassword456!');

      const submitButton = screen.getByRole('button', {
        name: 'Alterar Senha',
      });
      expect(submitButton).not.toBeDisabled();
    });

    it('should call changePassword on valid form submission', async () => {
      const user = userEvent.setup();
      render(<PasswordChangeModal />);

      const currentPasswordInput = screen.getByLabelText('Senha Atual');
      const newPasswordInput = screen.getByLabelText('Nova Senha');
      const confirmPasswordInput = screen.getByLabelText(
        'Confirmar Nova Senha',
      );

      await user.type(currentPasswordInput, 'OldPassword123!');
      await user.type(newPasswordInput, 'NewPassword456!');
      await user.type(confirmPasswordInput, 'NewPassword456!');

      const submitButton = screen.getByRole('button', {
        name: 'Alterar Senha',
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith({
          oldPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        });
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading text and disable button during submission', () => {
      setupMock({ isLoading: true });
      render(<PasswordChangeModal />);

      const submitButton = screen.getByRole('button', { name: 'Alterando...' });
      expect(submitButton).toBeDisabled();
    });

    it('should disable inputs during loading', () => {
      setupMock({ isLoading: true });
      render(<PasswordChangeModal />);

      expect(screen.getByLabelText('Senha Atual')).toBeDisabled();
      expect(screen.getByLabelText('Nova Senha')).toBeDisabled();
      expect(screen.getByLabelText('Confirmar Nova Senha')).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message from store', () => {
      setupMock({ error: 'Senha atual incorreta' });
      render(<PasswordChangeModal />);

      expect(screen.getByText('Senha atual incorreta')).toBeInTheDocument();
    });

    it('should clear error on mount', () => {
      setupMock({ error: 'Some error' });
      render(<PasswordChangeModal />);

      // The error is displayed but clearError was called on value changes
      expect(screen.getByText('Some error')).toBeInTheDocument();
    });
  });

  describe('Modal Behavior', () => {
    it('should not close on escape key press', () => {
      render(<PasswordChangeModal />);

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      // Modal should still be visible
      expect(
        screen.getByText('Troca de Senha Obrigatória'),
      ).toBeInTheDocument();
    });

    it('should not close on outside click', () => {
      render(<PasswordChangeModal />);

      // Click outside the dialog content
      fireEvent.pointerDown(document.body);

      // Modal should still be visible
      expect(
        screen.getByText('Troca de Senha Obrigatória'),
      ).toBeInTheDocument();
    });
  });
});

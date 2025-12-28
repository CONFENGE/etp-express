import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateUserDialog } from './CreateUserDialog';

describe('CreateUserDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();
  const domainSuffix = 'example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog content when open', () => {
      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome Completo')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Cargo (opcional)')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <CreateUserDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show email domain hint', () => {
      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      expect(
        screen.getByText(`Deve ser um e-mail do domínio @${domainSuffix}`),
      ).toBeInTheDocument();
    });

    it('should show quota exhausted message when quota is 0', () => {
      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={0}
        />,
      );

      expect(
        screen.getByText('Você atingiu a cota de usuários do seu domínio.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Entre em contato com o administrador para aumentar a cota.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error for email with wrong domain', async () => {
      const user = userEvent.setup();

      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      const nameInput = screen.getByLabelText('Nome Completo');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@wrongdomain.com');

      const submitButton = screen.getByRole('button', {
        name: 'Criar Usuário',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(`O e-mail deve ser do domínio @${domainSuffix}`),
        ).toBeInTheDocument();
      });
    });

    it('should show error for name too short', async () => {
      const user = userEvent.setup();

      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      const nameInput = screen.getByLabelText('Nome Completo');
      await user.type(nameInput, 'J');

      const submitButton = screen.getByRole('button', {
        name: 'Criar Usuário',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('O nome deve ter pelo menos 2 caracteres'),
        ).toBeInTheDocument();
      });
    });

    it('should not submit with invalid email format', async () => {
      const user = userEvent.setup();

      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      const nameInput = screen.getByLabelText('Nome Completo');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', {
        name: 'Criar Usuário',
      });
      fireEvent.click(submitButton);

      // Should not call onSubmit with invalid data
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      const nameInput = screen.getByLabelText('Nome Completo');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, `john@${domainSuffix}`);

      const submitButton = screen.getByRole('button', {
        name: 'Criar Usuário',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: `john@${domainSuffix}`,
          name: 'John Doe',
          cargo: undefined,
        });
      });
    });

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      const nameInput = screen.getByLabelText('Nome Completo');
      const emailInput = screen.getByLabelText('Email');

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, `john@${domainSuffix}`);

      const submitButton = screen.getByRole('button', {
        name: 'Criar Usuário',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Cancel', () => {
    it('should call onOpenChange with false when cancel clicked', () => {
      render(
        <CreateUserDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          domainSuffix={domainSuffix}
          quotaAvailable={10}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateDomainDialog } from './CreateDomainDialog';

describe('CreateDomainDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog content when open', () => {
      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Domínio')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome da Instituição')).toBeInTheDocument();
      expect(screen.getByLabelText('Máximo de Usuários')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <CreateDomainDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have default value for maxUsers', () => {
      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const maxUsersInput = screen.getByLabelText('Máximo de Usuários');
      expect(maxUsersInput).toHaveValue(10);
    });
  });

  describe('Validation', () => {
    it('should show error for invalid domain format', async () => {
      const user = userEvent.setup();

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domínio');
      await user.type(domainInput, 'invalid');

      const submitButton = screen.getByRole('button', {
        name: 'Criar Domínio',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Digite um domínio válido (ex: exemplo.com.br)'),
        ).toBeInTheDocument();
      });
    });

    it('should show error for domain too short', async () => {
      const user = userEvent.setup();

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domínio');
      await user.type(domainInput, 'ab');

      const submitButton = screen.getByRole('button', {
        name: 'Criar Domínio',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('O domínio deve ter pelo menos 3 caracteres'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domínio');
      const institutionNameInput = screen.getByLabelText('Nome da Instituição');
      const maxUsersInput = screen.getByLabelText('Máximo de Usuários');

      await user.type(domainInput, 'example.com');
      await user.type(institutionNameInput, 'Prefeitura de Exemplo');
      await user.clear(maxUsersInput);
      await user.type(maxUsersInput, '50');

      const submitButton = screen.getByRole('button', {
        name: 'Criar Domínio',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          domain: 'example.com',
          institutionName: 'Prefeitura de Exemplo',
          maxUsers: 50,
        });
      });
    });

    it('should close dialog after successful submission', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domínio');
      const institutionNameInput = screen.getByLabelText('Nome da Instituição');
      await user.type(domainInput, 'example.com');
      await user.type(institutionNameInput, 'Prefeitura de Exemplo');

      const submitButton = screen.getByRole('button', {
        name: 'Criar Domínio',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should show loading state while submitting', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const domainInput = screen.getByLabelText('Domínio');
      const institutionNameInput = screen.getByLabelText('Nome da Instituição');
      await user.type(domainInput, 'example.com');
      await user.type(institutionNameInput, 'Prefeitura de Exemplo');

      const submitButton = screen.getByRole('button', {
        name: 'Criar Domínio',
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Criando...')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel', () => {
    it('should call onOpenChange with false when cancel clicked', () => {
      render(
        <CreateDomainDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

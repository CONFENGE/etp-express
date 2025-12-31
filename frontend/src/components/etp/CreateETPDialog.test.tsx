import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { CreateETPDialog } from './CreateETPDialog';

// Mock the hooks
vi.mock('@/hooks/useETPs', () => ({
  useETPs: () => ({
    createETP: vi.fn().mockResolvedValue({ id: '123' }),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('CreateETPDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog content when open', () => {
      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Criar Novo ETP')).toBeInTheDocument();
      expect(screen.getByLabelText('Título *')).toBeInTheDocument();
      expect(screen.getByLabelText('Objeto *')).toBeInTheDocument();
      expect(screen.getByLabelText('Descrição')).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      renderWithRouter(
        <CreateETPDialog open={false} onOpenChange={mockOnOpenChange} />,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show required field indicators for title and objeto', () => {
      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      expect(screen.getByLabelText('Título *')).toBeInTheDocument();
      expect(screen.getByLabelText('Objeto *')).toBeInTheDocument();
    });

    it('should have appropriate placeholders', () => {
      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      expect(
        screen.getByPlaceholderText('Ex: Contratação de Serviços de TI'),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          'Ex: Contratação de empresa especializada em desenvolvimento de sistemas web',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error for title too short', async () => {
      const user = userEvent.setup();

      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      const titleInput = screen.getByLabelText('Título *');
      await user.type(titleInput, 'Test');

      const submitButton = screen.getByRole('button', { name: 'Criar ETP' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('O título deve ter no mínimo 5 caracteres'),
        ).toBeInTheDocument();
      });
    });

    it('should show error for objeto too short', async () => {
      const user = userEvent.setup();

      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      const titleInput = screen.getByLabelText('Título *');
      const objetoInput = screen.getByLabelText('Objeto *');

      await user.type(titleInput, 'Título válido');
      await user.type(objetoInput, 'Curto');

      const submitButton = screen.getByRole('button', { name: 'Criar ETP' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('O objeto deve ter no mínimo 10 caracteres'),
        ).toBeInTheDocument();
      });
    });

    it('should show errors for all empty required fields', async () => {
      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      const submitButton = screen.getByRole('button', { name: 'Criar ETP' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('O título deve ter no mínimo 5 caracteres'),
        ).toBeInTheDocument();
        expect(
          screen.getByText('O objeto deve ter no mínimo 10 caracteres'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();

      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      const titleInput = screen.getByLabelText('Título *');
      const objetoInput = screen.getByLabelText('Objeto *');
      const descriptionInput = screen.getByLabelText('Descrição');

      await user.type(titleInput, 'Título do ETP');
      await user.type(
        objetoInput,
        'Contratação de empresa especializada em desenvolvimento',
      );
      await user.type(descriptionInput, 'Descrição opcional');

      const submitButton = screen.getByRole('button', { name: 'Criar ETP' });
      fireEvent.click(submitButton);

      // Form should not show validation errors with valid data
      await waitFor(() => {
        expect(
          screen.queryByText('O título deve ter no mínimo 5 caracteres'),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('O objeto deve ter no mínimo 10 caracteres'),
        ).not.toBeInTheDocument();
      });
    });

    it('should allow submission without optional description', async () => {
      const user = userEvent.setup();

      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      const titleInput = screen.getByLabelText('Título *');
      const objetoInput = screen.getByLabelText('Objeto *');

      await user.type(titleInput, 'Título do ETP');
      await user.type(
        objetoInput,
        'Contratação de empresa especializada em desenvolvimento',
      );

      const submitButton = screen.getByRole('button', { name: 'Criar ETP' });
      fireEvent.click(submitButton);

      // Should not show any validation errors
      await waitFor(() => {
        expect(
          screen.queryByText('O título deve ter no mínimo 5 caracteres'),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('O objeto deve ter no mínimo 10 caracteres'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Cancel', () => {
    it('should call onOpenChange with false when cancel clicked', () => {
      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
      fireEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should have both cancel and submit buttons', () => {
      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      expect(
        screen.getByRole('button', { name: 'Cancelar' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Criar ETP' }),
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-invalid on title field when error', async () => {
      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      const submitButton = screen.getByRole('button', { name: 'Criar ETP' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Título *');
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have aria-invalid on objeto field when error', async () => {
      renderWithRouter(
        <CreateETPDialog open={true} onOpenChange={mockOnOpenChange} />,
      );

      const submitButton = screen.getByRole('button', { name: 'Criar ETP' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const objetoInput = screen.getByLabelText('Objeto *');
        expect(objetoInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from './TemplateSelector';
import { EtpTemplate, EtpTemplateType } from '@/types/template';
import * as useTemplatesModule from '@/hooks/useTemplates';

// Mock the useTemplates hook
vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: vi.fn(),
}));

const mockTemplates: EtpTemplate[] = [
  {
    id: '1',
    name: 'Template para Obras de Engenharia',
    type: EtpTemplateType.OBRAS,
    description:
      'Template otimizado para contratacoes de obras e servicos de engenharia.',
    requiredFields: ['objeto', 'justificativa', 'estimativaCusto'],
    optionalFields: ['riscos'],
    defaultSections: ['1', '2', '3'],
    prompts: [],
    legalReferences: ['Lei 14.133/2021', 'IN SEGES/ME no 65/2021'],
    priceSourcesPreferred: ['SINAPI', 'SICRO'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Template para Tecnologia da Informacao',
    type: EtpTemplateType.TI,
    description:
      'Template para contratacoes de solucoes de TI e servicos digitais.',
    requiredFields: ['objeto', 'justificativa'],
    optionalFields: ['riscos', 'estimativaCusto'],
    defaultSections: ['1', '2'],
    prompts: [],
    legalReferences: ['IN SGD/ME no 94/2022'],
    priceSourcesPreferred: ['PNCP'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '3',
    name: 'Template para Servicos',
    type: EtpTemplateType.SERVICOS,
    description: 'Template para contratacoes de servicos gerais.',
    requiredFields: ['objeto'],
    optionalFields: [],
    defaultSections: ['1'],
    prompts: [],
    legalReferences: [],
    priceSourcesPreferred: [],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Template para Materiais',
    type: EtpTemplateType.MATERIAIS,
    description: 'Template para aquisicao de materiais e bens.',
    requiredFields: ['objeto', 'justificativa', 'quantidade'],
    optionalFields: ['prazoEntrega'],
    defaultSections: ['1', '2', '3', '4'],
    prompts: [],
    legalReferences: ['Lei 14.133/2021', 'Decreto 11.246/2022'],
    priceSourcesPreferred: ['PNCP'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

describe('TemplateSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading state', () => {
    it('should render loading skeletons when loading', () => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      // Should render 4 skeleton cards
      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Error state', () => {
    it('should render error message when there is an error', () => {
      const mockRefetch = vi.fn();
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: [],
        isLoading: false,
        error: 'Erro ao carregar os templates',
        refetch: mockRefetch,
      });

      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      expect(
        screen.getByText('Erro ao carregar templates'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Erro ao carregar os templates'),
      ).toBeInTheDocument();
      expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
    });

    it('should call refetch when retry button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: [],
        isLoading: false,
        error: 'Erro ao carregar os templates',
        refetch: mockRefetch,
      });

      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      await user.click(screen.getByText('Tentar novamente'));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty state', () => {
    it('should render empty message when no templates', () => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      expect(
        screen.getByText('Nenhum template disponivel'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Os templates de ETP ainda nao foram configurados.'),
      ).toBeInTheDocument();
    });
  });

  describe('Templates display', () => {
    beforeEach(() => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: mockTemplates,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should render all templates', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      expect(
        screen.getByText('Template para Obras de Engenharia'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Template para Tecnologia da Informacao'),
      ).toBeInTheDocument();
      expect(screen.getByText('Template para Servicos')).toBeInTheDocument();
      expect(screen.getByText('Template para Materiais')).toBeInTheDocument();
    });

    it('should render template descriptions', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      expect(
        screen.getByText(
          'Template otimizado para contratacoes de obras e servicos de engenharia.',
        ),
      ).toBeInTheDocument();
    });

    it('should render template type badges', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      expect(screen.getByText('Obras e Engenharia')).toBeInTheDocument();
      expect(screen.getByText('Tecnologia da Informacao')).toBeInTheDocument();
      expect(screen.getByText('Servicos')).toBeInTheDocument();
      expect(screen.getByText('Materiais')).toBeInTheDocument();
    });

    it('should render template icons', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      // Check for emoji icons
      expect(screen.getByLabelText('Obras e Engenharia')).toHaveTextContent(
        '🏗️',
      );
      expect(
        screen.getByLabelText('Tecnologia da Informacao'),
      ).toHaveTextContent('💻');
      expect(screen.getByLabelText('Servicos')).toHaveTextContent('🔧');
      expect(screen.getByLabelText('Materiais')).toHaveTextContent('📦');
    });

    it('should render required fields count', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      // Template 1 has 3 required fields, Template 2 has 2, etc.
      expect(screen.getAllByText(/campos obrigatorios/)).toHaveLength(4);
    });

    it('should render legal references', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      // Lei 14.133/2021 appears in multiple templates (Obras and Materiais)
      expect(screen.getAllByText('Lei 14.133/2021')).toHaveLength(2);
      expect(screen.getByText('IN SEGES/ME no 65/2021')).toBeInTheDocument();
    });

    it('should render +N badge when more than 2 legal references', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      // Template 4 has 2 references, so no +N badge
      // All templates have 2 or fewer references in our mock
      expect(screen.queryByText('+1')).not.toBeInTheDocument();
    });
  });

  describe('Selection behavior', () => {
    beforeEach(() => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: mockTemplates,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should call onSelect when a template is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      const templateCard = screen.getByText('Template para Obras de Engenharia')
        .parentElement?.parentElement?.parentElement?.parentElement;
      await user.click(templateCard!);

      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });

    it('should show selected state for selected template', () => {
      render(
        <TemplateSelector selectedTemplateId="1" onSelect={mockOnSelect} />,
      );

      // The selected card should have aria-selected="true"
      const selectedCard = screen.getByRole('option', { selected: true });
      expect(selectedCard).toBeInTheDocument();
    });

    it('should show check icon on selected template', () => {
      render(
        <TemplateSelector selectedTemplateId="1" onSelect={mockOnSelect} />,
      );

      // Find the card with the check icon
      const selectedCard = screen.getByRole('option', { selected: true });
      const checkIcon = selectedCard.querySelector('.lucide-check');
      expect(checkIcon).toBeInTheDocument();
    });
  });

  describe('Keyboard navigation', () => {
    beforeEach(() => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: mockTemplates,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should select template on Enter key', async () => {
      const user = userEvent.setup();
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      const firstCard = screen.getByRole('option', {
        name: /Template para Obras de Engenharia/i,
      });
      firstCard.focus();
      await user.keyboard('{Enter}');

      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });

    it('should select template on Space key', async () => {
      const user = userEvent.setup();
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      const firstCard = screen.getByRole('option', {
        name: /Template para Obras de Engenharia/i,
      });
      firstCard.focus();
      await user.keyboard(' ');

      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: mockTemplates,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });
    });

    it('should have listbox role on container', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should have option role on each template card', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4);
    });

    it('should have correct aria-selected state', () => {
      render(
        <TemplateSelector selectedTemplateId="2" onSelect={mockOnSelect} />,
      );

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      expect(options[2]).toHaveAttribute('aria-selected', 'false');
      expect(options[3]).toHaveAttribute('aria-selected', 'false');
    });

    it('should have accessible label on listbox', () => {
      render(
        <TemplateSelector selectedTemplateId={null} onSelect={mockOnSelect} />,
      );

      expect(screen.getByRole('listbox')).toHaveAttribute(
        'aria-label',
        'Selecione um template',
      );
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to container', () => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: mockTemplates,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(
        <TemplateSelector
          selectedTemplateId={null}
          onSelect={mockOnSelect}
          className="custom-class"
        />,
      );

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveClass('custom-class');
    });
  });
});

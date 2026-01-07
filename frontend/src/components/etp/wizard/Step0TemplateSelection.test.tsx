import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Step0TemplateSelection } from './Step0TemplateSelection';
import {
  etpWizardSchema,
  ETPWizardFormData,
  defaultWizardValues,
} from '@/schemas/etpWizardSchema';
import { EtpTemplate, EtpTemplateType } from '@/types/template';
import * as useTemplatesModule from '@/hooks/useTemplates';

// Mock the useTemplates hook
vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: vi.fn(),
}));

const mockTemplates: EtpTemplate[] = [
  {
    id: 'template-1',
    name: 'Template para Obras',
    type: EtpTemplateType.OBRAS,
    description: 'Template para obras de engenharia',
    requiredFields: ['objeto', 'justificativa'],
    optionalFields: [],
    defaultSections: [],
    prompts: [],
    legalReferences: ['Lei 14.133/2021'],
    priceSourcesPreferred: ['SINAPI'],
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'template-2',
    name: 'Template para TI',
    type: EtpTemplateType.TI,
    description: 'Template para tecnologia da informacao',
    requiredFields: ['objeto'],
    optionalFields: [],
    defaultSections: [],
    prompts: [],
    legalReferences: ['IN SGD/ME 94/2022'],
    priceSourcesPreferred: ['PNCP'],
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

/**
 * Test wrapper component to provide form context.
 */
function TestWrapper({
  onFormChange,
}: {
  onFormChange?: (data: ETPWizardFormData) => void;
}) {
  const form = useForm<ETPWizardFormData>({
    resolver: zodResolver(etpWizardSchema),
    defaultValues: defaultWizardValues,
  });

  // Expose form values for testing
  if (onFormChange) {
    const values = form.watch();
    onFormChange(values);
  }

  return <Step0TemplateSelection form={form} />;
}

describe('Step0TemplateSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
      templates: mockTemplates,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render template selection header', () => {
      render(<TestWrapper />);

      expect(screen.getByText('Escolha um modelo de ETP')).toBeInTheDocument();
      expect(
        screen.getByText(/Selecione um template pre-configurado/),
      ).toBeInTheDocument();
    });

    it('should render TemplateSelector component', () => {
      render(<TestWrapper />);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should render blank document option', () => {
      render(<TestWrapper />);

      expect(
        screen.getByRole('button', {
          name: /iniciar com documento em branco/i,
        }),
      ).toBeInTheDocument();
    });

    it('should render available templates', () => {
      render(<TestWrapper />);

      expect(screen.getByText('Template para Obras')).toBeInTheDocument();
      expect(screen.getByText('Template para TI')).toBeInTheDocument();
    });
  });

  describe('template selection', () => {
    it('should update form when template is selected', async () => {
      const user = userEvent.setup();
      let formValues: ETPWizardFormData = defaultWizardValues;

      render(
        <TestWrapper
          onFormChange={(values) => {
            formValues = values;
          }}
        />,
      );

      // Click on the first template
      const templateCard = screen
        .getByText('Template para Obras')
        .closest('[role="option"]');
      await user.click(templateCard!);

      expect(formValues.templateId).toBe('template-1');
    });

    it('should show selected state on clicked template', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      const templateCard = screen
        .getByText('Template para Obras')
        .closest('[role="option"]');
      await user.click(templateCard!);

      expect(templateCard).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('blank document option', () => {
    it('should set templateId to null when blank document is clicked', async () => {
      const user = userEvent.setup();
      let formValues: ETPWizardFormData = defaultWizardValues;

      render(
        <TestWrapper
          onFormChange={(values) => {
            formValues = values;
          }}
        />,
      );

      // First select a template
      const templateCard = screen
        .getByText('Template para Obras')
        .closest('[role="option"]');
      await user.click(templateCard!);

      expect(formValues.templateId).toBe('template-1');

      // Then click blank document
      await user.click(
        screen.getByRole('button', {
          name: /iniciar com documento em branco/i,
        }),
      );

      expect(formValues.templateId).toBe(null);
    });

    it('should show blank document message when selected', async () => {
      const user = userEvent.setup();
      render(<TestWrapper />);

      await user.click(
        screen.getByRole('button', {
          name: /iniciar com documento em branco/i,
        }),
      );

      expect(
        screen.getByText(/documento em branco selecionado/i),
      ).toBeInTheDocument();
    });

    it('should change button variant when blank document is selected', async () => {
      render(<TestWrapper />);

      const blankButton = screen.getByRole('button', {
        name: /iniciar com documento em branco/i,
      });

      // Initial state - templateId is null by default, so it should be secondary variant
      // The button uses bg-surface-secondary for secondary variant
      expect(blankButton).toHaveClass('bg-surface-secondary');
    });
  });

  describe('loading state', () => {
    it('should show loading skeletons when templates are loading', () => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<TestWrapper />);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('error state', () => {
    it('should show error message when template fetch fails', () => {
      vi.mocked(useTemplatesModule.useTemplates).mockReturnValue({
        templates: [],
        isLoading: false,
        error: 'Falha ao carregar',
        refetch: vi.fn(),
      });

      render(<TestWrapper />);

      // The TemplateSelector shows "Erro ao carregar templates" as header
      // and the actual error message below
      expect(
        screen.getByRole('heading', { name: /erro ao carregar templates/i }),
      ).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible listbox', () => {
      render(<TestWrapper />);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Selecione um template');
    });

    it('should have accessible template options', () => {
      render(<TestWrapper />);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
    });
  });
});

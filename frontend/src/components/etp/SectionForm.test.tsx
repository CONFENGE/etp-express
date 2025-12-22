import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SectionForm } from './SectionForm';
import type { SectionTemplate } from '@/types/etp';

describe('SectionForm', () => {
  describe('Text field rendering', () => {
    const templateWithText: SectionTemplate = {
      number: 1,
      title: 'Test Section',
      description: 'Test description',
      isRequired: true,
      fields: [
        {
          name: 'text_field',
          label: 'Text Field',
          type: 'text',
          required: true,
          placeholder: 'Enter text...',
        },
      ],
    };

    it('should render text input for text fields', () => {
      const onSave = vi.fn();
      render(<SectionForm template={templateWithText} onSave={onSave} />);

      expect(screen.getByLabelText(/text field/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });
  });

  describe('Textarea field rendering', () => {
    const templateWithTextarea: SectionTemplate = {
      number: 2,
      title: 'Test Section',
      description: 'Test description',
      isRequired: false,
      fields: [
        {
          name: 'textarea_field',
          label: 'Textarea Field',
          type: 'textarea',
          required: false,
          placeholder: 'Enter description...',
        },
      ],
    };

    it('should render textarea for textarea fields', () => {
      const onSave = vi.fn();
      render(<SectionForm template={templateWithTextarea} onSave={onSave} />);

      const textarea = screen.getByPlaceholderText('Enter description...');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName.toLowerCase()).toBe('textarea');
    });
  });

  describe('Richtext field rendering', () => {
    const templateWithRichtext: SectionTemplate = {
      number: 1,
      title: 'Necessidade da Contratacao',
      description: 'Demonstracao da necessidade da contratacao',
      isRequired: true,
      fields: [
        {
          name: 'description',
          label: 'Descricao da Necessidade',
          type: 'richtext',
          required: true,
          placeholder: 'Descreva a necessidade...',
        },
      ],
    };

    it('should render RichTextEditor for richtext fields', async () => {
      const onSave = vi.fn();
      render(<SectionForm template={templateWithRichtext} onSave={onSave} />);

      // RichTextEditor renders a toolbar
      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });
    });

    it('should render placeholder in RichTextEditor', async () => {
      const onSave = vi.fn();
      render(<SectionForm template={templateWithRichtext} onSave={onSave} />);

      await waitFor(() => {
        expect(
          screen.getByText('Descreva a necessidade...'),
        ).toBeInTheDocument();
      });
    });

    it('should render label for richtext field', async () => {
      const onSave = vi.fn();
      render(<SectionForm template={templateWithRichtext} onSave={onSave} />);

      expect(screen.getByText('Descricao da Necessidade')).toBeInTheDocument();
    });

    it('should show required indicator for required richtext field', async () => {
      const onSave = vi.fn();
      render(<SectionForm template={templateWithRichtext} onSave={onSave} />);

      const requiredIndicator = screen.getByText('*');
      expect(requiredIndicator).toHaveClass('text-destructive');
    });

    it('should disable RichTextEditor when form is loading', async () => {
      const onSave = vi.fn();
      const { container } = render(
        <SectionForm
          template={templateWithRichtext}
          onSave={onSave}
          isLoading={true}
        />,
      );

      await waitFor(() => {
        // When disabled, the editor container should have opacity-50
        const editorWrapper = container.querySelector('.opacity-50');
        expect(editorWrapper).toBeInTheDocument();
      });
    });
  });

  describe('Select field rendering', () => {
    const templateWithSelect: SectionTemplate = {
      number: 3,
      title: 'Test Section',
      description: 'Test description',
      isRequired: false,
      fields: [
        {
          name: 'select_field',
          label: 'Select Field',
          type: 'select',
          required: false,
          options: ['Option 1', 'Option 2', 'Option 3'],
        },
      ],
    };

    it('should render select for select fields', () => {
      const onSave = vi.fn();
      render(<SectionForm template={templateWithSelect} onSave={onSave} />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });
  });

  describe('Form submission', () => {
    const templateWithRichtext: SectionTemplate = {
      number: 1,
      title: 'Test Section',
      description: 'Test description',
      isRequired: true,
      fields: [
        {
          name: 'richtext_content',
          label: 'Rich Text Content',
          type: 'richtext',
          required: false,
          placeholder: 'Type here...',
        },
      ],
    };

    it('should call onSave when form is submitted', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<SectionForm template={templateWithRichtext} onSave={onSave} />);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /salvar/i });
      await user.click(submitButton);

      expect(onSave).toHaveBeenCalled();
    });
  });

  describe('Default values', () => {
    const templateWithRichtext: SectionTemplate = {
      number: 1,
      title: 'Test Section',
      description: 'Test description',
      isRequired: true,
      fields: [
        {
          name: 'content',
          label: 'Content',
          type: 'richtext',
          required: false,
          placeholder: 'Type here...',
        },
      ],
    };

    it('should render RichTextEditor with default HTML content', async () => {
      const onSave = vi.fn();
      const defaultValues = {
        content: '<p>Default rich text content</p>',
      };

      render(
        <SectionForm
          template={templateWithRichtext}
          onSave={onSave}
          defaultValues={defaultValues}
        />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('Default rich text content'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Help text', () => {
    const templateWithHelpText: SectionTemplate = {
      number: 1,
      title: 'Test Section',
      description: 'Test description',
      isRequired: true,
      fields: [
        {
          name: 'content',
          label: 'Content',
          type: 'richtext',
          required: true,
          placeholder: 'Type here...',
          helpText: 'This is helpful information',
        },
      ],
    };

    it('should render help tooltip for fields with helpText', async () => {
      const onSave = vi.fn();
      render(<SectionForm template={templateWithHelpText} onSave={onSave} />);

      // HelpTooltip renders a button with aria-label
      const helpButton = screen.getByRole('button', { name: /ajuda/i });
      expect(helpButton).toBeInTheDocument();
    });
  });

  describe('Mixed field types', () => {
    const templateWithMixedFields: SectionTemplate = {
      number: 4,
      title: 'Requisitos',
      description: 'Requisitos da contratacao',
      isRequired: true,
      fields: [
        {
          name: 'budget_source',
          label: 'Fonte Orcamentaria',
          type: 'text',
          required: true,
          placeholder: 'Ex: Programa de Trabalho 123456',
        },
        {
          name: 'requirements',
          label: 'Requisitos',
          type: 'richtext',
          required: true,
          placeholder: 'Liste os requisitos...',
        },
        {
          name: 'simple_notes',
          label: 'Notas',
          type: 'textarea',
          required: false,
          placeholder: 'Notas simples...',
        },
      ],
    };

    it('should render appropriate input types for each field', async () => {
      const onSave = vi.fn();
      render(
        <SectionForm template={templateWithMixedFields} onSave={onSave} />,
      );

      // Text input
      expect(
        screen.getByPlaceholderText('Ex: Programa de Trabalho 123456'),
      ).toBeInTheDocument();

      // RichTextEditor (toolbar)
      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      // Textarea
      const textarea = screen.getByPlaceholderText('Notas simples...');
      expect(textarea.tagName.toLowerCase()).toBe('textarea');
    });
  });
});

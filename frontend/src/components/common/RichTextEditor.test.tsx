import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RichTextEditor, type RichTextEditorRef } from './RichTextEditor';
import { createRef } from 'react';

describe('RichTextEditor', () => {
  describe('Rendering', () => {
    it('should render the editor', async () => {
      render(<RichTextEditor />);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });
    });

    it('should render with initial content', async () => {
      render(<RichTextEditor content="<p>Hello World</p>" />);

      await waitFor(() => {
        expect(screen.getByText('Hello World')).toBeInTheDocument();
      });
    });

    it('should render placeholder when empty', async () => {
      render(<RichTextEditor placeholder="Digite seu texto aqui..." />);

      await waitFor(() => {
        expect(
          screen.getByText('Digite seu texto aqui...'),
        ).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(<RichTextEditor className="custom-class" />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });

    it('should apply custom minHeight', async () => {
      const { container } = render(<RichTextEditor minHeight="300px" />);

      await waitFor(() => {
        const editorContainer = container.querySelector(
          '[style*="min-height"]',
        );
        expect(editorContainer).toHaveStyle({ minHeight: '300px' });
      });
    });
  });

  describe('Toolbar', () => {
    it('should render bold button', async () => {
      render(<RichTextEditor />);

      await waitFor(() => {
        expect(screen.getByTitle('Negrito (Ctrl+B)')).toBeInTheDocument();
      });
    });

    it('should render italic button', async () => {
      render(<RichTextEditor />);

      await waitFor(() => {
        expect(screen.getByTitle('Italico (Ctrl+I)')).toBeInTheDocument();
      });
    });

    it('should render list buttons', async () => {
      render(<RichTextEditor />);

      await waitFor(() => {
        expect(screen.getByTitle('Lista com marcadores')).toBeInTheDocument();
        expect(screen.getByTitle('Lista numerada')).toBeInTheDocument();
      });
    });

    it('should render table button', async () => {
      render(<RichTextEditor />);

      await waitFor(() => {
        expect(screen.getByTitle('Inserir tabela')).toBeInTheDocument();
      });
    });

    it('should render undo/redo buttons', async () => {
      render(<RichTextEditor />);

      await waitFor(() => {
        expect(screen.getByTitle('Desfazer (Ctrl+Z)')).toBeInTheDocument();
        expect(screen.getByTitle('Refazer (Ctrl+Y)')).toBeInTheDocument();
      });
    });

    it('should have accessible toolbar', async () => {
      render(<RichTextEditor />);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toHaveAttribute(
          'aria-label',
          'Formatacao de texto',
        );
      });
    });
  });

  describe('Disabled state', () => {
    it('should apply disabled styles when disabled', async () => {
      const { container } = render(<RichTextEditor disabled />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('opacity-50');
      });
    });

    it('should not show placeholder when disabled', async () => {
      render(<RichTextEditor disabled placeholder="Digite aqui..." />);

      await waitFor(() => {
        expect(screen.queryByText('Digite aqui...')).not.toBeInTheDocument();
      });
    });
  });

  describe('onChange callback', () => {
    it('should call onChange when content is set via ref', async () => {
      const handleChange = vi.fn();
      const ref = createRef<RichTextEditorRef>();

      render(<RichTextEditor ref={ref} onChange={handleChange} />);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      // Set content via ref to trigger onChange
      ref.current?.setContent('<p>Test content</p>');

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
        expect(handleChange).toHaveBeenCalledWith(
          expect.stringContaining('Test content'),
        );
      });
    });
  });

  describe('Ref methods', () => {
    it('should expose getEditor method', async () => {
      const ref = createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);

      await waitFor(() => {
        expect(ref.current?.getEditor()).toBeTruthy();
      });
    });

    it('should expose getHTML method', async () => {
      const ref = createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} content="<p>Test</p>" />);

      await waitFor(() => {
        const html = ref.current?.getHTML();
        expect(html).toContain('Test');
      });
    });

    it('should expose setContent method', async () => {
      const ref = createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);

      await waitFor(() => {
        ref.current?.setContent('<p>New content</p>');
      });

      await waitFor(() => {
        expect(screen.getByText('New content')).toBeInTheDocument();
      });
    });

    it('should expose clear method', async () => {
      const ref = createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} content="<p>Some content</p>" />);

      await waitFor(() => {
        expect(screen.getByText('Some content')).toBeInTheDocument();
      });

      ref.current?.clear();

      await waitFor(() => {
        expect(screen.queryByText('Some content')).not.toBeInTheDocument();
      });
    });

    it('should expose focus method', async () => {
      const ref = createRef<RichTextEditorRef>();
      render(<RichTextEditor ref={ref} />);

      await waitFor(() => {
        ref.current?.focus();
      });

      await waitFor(() => {
        const editor = document.querySelector('.ProseMirror');
        expect(document.activeElement).toBe(editor);
      });
    });
  });

  describe('Accessibility', () => {
    it('should pass aria-describedby to editor', async () => {
      render(<RichTextEditor aria-describedby="help-text" id="my-editor" />);

      await waitFor(() => {
        const editor = document.querySelector('.ProseMirror');
        expect(editor).toHaveAttribute('aria-describedby', 'help-text');
      });
    });

    it('should pass aria-invalid to editor', async () => {
      render(<RichTextEditor aria-invalid={true} />);

      await waitFor(() => {
        const editor = document.querySelector('.ProseMirror');
        expect(editor).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should pass id to editor', async () => {
      render(<RichTextEditor id="my-editor" />);

      await waitFor(() => {
        const editor = document.querySelector('.ProseMirror');
        expect(editor).toHaveAttribute('id', 'my-editor');
      });
    });

    it('toolbar buttons should have aria-labels', async () => {
      render(<RichTextEditor />);

      await waitFor(() => {
        expect(screen.getByLabelText('Alternar negrito')).toBeInTheDocument();
        expect(screen.getByLabelText('Alternar italico')).toBeInTheDocument();
        expect(
          screen.getByLabelText('Alternar lista com marcadores'),
        ).toBeInTheDocument();
        expect(
          screen.getByLabelText('Alternar lista numerada'),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Inserir tabela')).toBeInTheDocument();
        expect(screen.getByLabelText('Desfazer')).toBeInTheDocument();
        expect(screen.getByLabelText('Refazer')).toBeInTheDocument();
      });
    });
  });

  describe('Focus ring', () => {
    it('should have focus-within ring classes', async () => {
      const { container } = render(<RichTextEditor />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('focus-within:ring-2');
        expect(container.firstChild).toHaveClass(
          'focus-within:ring-apple-accent',
        );
      });
    });
  });
});

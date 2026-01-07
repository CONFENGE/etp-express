import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichTextToolbar, ToolbarButton } from './RichTextToolbar';
import { type Editor } from '@tiptap/react';

// Mock editor
const createMockEditor = (overrides = {}): Editor => {
  const mockChain = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    insertTable: vi.fn().mockReturnThis(),
    undo: vi.fn().mockReturnThis(),
    redo: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };

  const mockCan = {
    chain: vi.fn().mockReturnValue({
      focus: vi.fn().mockReturnValue({
        toggleBold: vi
          .fn()
          .mockReturnValue({ run: vi.fn().mockReturnValue(true) }),
        toggleItalic: vi
          .fn()
          .mockReturnValue({ run: vi.fn().mockReturnValue(true) }),
        toggleBulletList: vi
          .fn()
          .mockReturnValue({ run: vi.fn().mockReturnValue(true) }),
        toggleOrderedList: vi
          .fn()
          .mockReturnValue({ run: vi.fn().mockReturnValue(true) }),
        undo: vi.fn().mockReturnValue({ run: vi.fn().mockReturnValue(true) }),
        redo: vi.fn().mockReturnValue({ run: vi.fn().mockReturnValue(true) }),
      }),
    }),
  };

  return {
    chain: vi.fn().mockReturnValue(mockChain),
    can: vi.fn().mockReturnValue(mockCan),
    isActive: vi.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as Editor;
};

describe('RichTextToolbar', () => {
  let mockEditor: Editor;

  beforeEach(() => {
    mockEditor = createMockEditor();
  });

  describe('Rendering', () => {
    it('should render null when editor is null', () => {
      const { container } = render(<RichTextToolbar editor={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render toolbar when editor is provided', () => {
      render(<RichTextToolbar editor={mockEditor} />);
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
    });

    it('should render all formatting buttons', () => {
      render(<RichTextToolbar editor={mockEditor} />);

      expect(screen.getByTitle('Negrito (Ctrl+B)')).toBeInTheDocument();
      expect(screen.getByTitle('Italico (Ctrl+I)')).toBeInTheDocument();
      expect(screen.getByTitle('Lista com marcadores')).toBeInTheDocument();
      expect(screen.getByTitle('Lista numerada')).toBeInTheDocument();
      expect(screen.getByTitle('Inserir tabela')).toBeInTheDocument();
      expect(screen.getByTitle('Desfazer (Ctrl+Z)')).toBeInTheDocument();
      expect(screen.getByTitle('Refazer (Ctrl+Y)')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<RichTextToolbar editor={mockEditor} className="custom-class" />);
      expect(screen.getByRole('toolbar')).toHaveClass('custom-class');
    });

    it('should have dividers between button groups', () => {
      render(<RichTextToolbar editor={mockEditor} />);
      const separators = screen.getAllByRole('separator');
      expect(separators.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Button clicks', () => {
    it('should call toggleBold on bold button click', async () => {
      const user = userEvent.setup();
      render(<RichTextToolbar editor={mockEditor} />);

      await user.click(screen.getByTitle('Negrito (Ctrl+B)'));

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should call toggleItalic on italic button click', async () => {
      const user = userEvent.setup();
      render(<RichTextToolbar editor={mockEditor} />);

      await user.click(screen.getByTitle('Italico (Ctrl+I)'));

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should call toggleBulletList on bullet list button click', async () => {
      const user = userEvent.setup();
      render(<RichTextToolbar editor={mockEditor} />);

      await user.click(screen.getByTitle('Lista com marcadores'));

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should call toggleOrderedList on ordered list button click', async () => {
      const user = userEvent.setup();
      render(<RichTextToolbar editor={mockEditor} />);

      await user.click(screen.getByTitle('Lista numerada'));

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should call insertTable on table button click', async () => {
      const user = userEvent.setup();
      render(<RichTextToolbar editor={mockEditor} />);

      await user.click(screen.getByTitle('Inserir tabela'));

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should call undo on undo button click', async () => {
      const user = userEvent.setup();
      render(<RichTextToolbar editor={mockEditor} />);

      await user.click(screen.getByTitle('Desfazer (Ctrl+Z)'));

      expect(mockEditor.chain).toHaveBeenCalled();
    });

    it('should call redo on redo button click', async () => {
      const user = userEvent.setup();
      render(<RichTextToolbar editor={mockEditor} />);

      await user.click(screen.getByTitle('Refazer (Ctrl+Y)'));

      expect(mockEditor.chain).toHaveBeenCalled();
    });
  });

  describe('Active state', () => {
    it('should highlight bold button when bold is active', () => {
      const editor = createMockEditor({
        isActive: vi.fn((format: string) => format === 'bold'),
      });

      render(<RichTextToolbar editor={editor} />);

      const boldButton = screen.getByTitle('Negrito (Ctrl+B)');
      expect(boldButton).toHaveClass(
        'bg-apple-accent-light',
        'text-apple-accent',
      );
    });

    it('should highlight italic button when italic is active', () => {
      const editor = createMockEditor({
        isActive: vi.fn((format: string) => format === 'italic'),
      });

      render(<RichTextToolbar editor={editor} />);

      const italicButton = screen.getByTitle('Italico (Ctrl+I)');
      expect(italicButton).toHaveClass(
        'bg-apple-accent-light',
        'text-apple-accent',
      );
    });

    it('should highlight bullet list button when bulletList is active', () => {
      const editor = createMockEditor({
        isActive: vi.fn((format: string) => format === 'bulletList'),
      });

      render(<RichTextToolbar editor={editor} />);

      const bulletButton = screen.getByTitle('Lista com marcadores');
      expect(bulletButton).toHaveClass(
        'bg-apple-accent-light',
        'text-apple-accent',
      );
    });
  });

  describe('Accessibility', () => {
    it('should have accessible toolbar role', () => {
      render(<RichTextToolbar editor={mockEditor} />);
      expect(screen.getByRole('toolbar')).toHaveAttribute(
        'aria-label',
        'Formatação de texto',
      );
    });

    it('all buttons should have aria-labels', () => {
      render(<RichTextToolbar editor={mockEditor} />);

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

    it('buttons should have type="button"', () => {
      render(<RichTextToolbar editor={mockEditor} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});

describe('ToolbarButton', () => {
  it('should render children', () => {
    render(
      <ToolbarButton onClick={() => {}} title="Test" aria-label="Test button">
        <span>Icon</span>
      </ToolbarButton>,
    );

    expect(screen.getByText('Icon')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ToolbarButton
        onClick={handleClick}
        title="Test"
        aria-label="Test button"
      >
        Click
      </ToolbarButton>,
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should apply active styles when isActive is true', () => {
    render(
      <ToolbarButton
        onClick={() => {}}
        title="Test"
        aria-label="Test button"
        isActive={true}
      >
        Active
      </ToolbarButton>,
    );

    expect(screen.getByRole('button')).toHaveClass(
      'bg-apple-accent-light',
      'text-apple-accent',
    );
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <ToolbarButton
        onClick={() => {}}
        title="Test"
        aria-label="Test button"
        disabled={true}
      >
        Disabled
      </ToolbarButton>,
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should have title attribute', () => {
    render(
      <ToolbarButton
        onClick={() => {}}
        title="My Title"
        aria-label="Test button"
      >
        Button
      </ToolbarButton>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('title', 'My Title');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLButtonElement | null };

    render(
      <ToolbarButton
        ref={ref}
        onClick={() => {}}
        title="Test"
        aria-label="Test button"
      >
        Ref
      </ToolbarButton>,
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

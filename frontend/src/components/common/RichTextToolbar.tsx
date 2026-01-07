import * as React from 'react';
import { type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Table,
  Undo,
  Redo,
} from 'lucide-react';

export interface RichTextToolbarProps {
  editor: Editor | null;
  className?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  'aria-label': string;
  children: React.ReactNode;
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ onClick, isActive, disabled, title, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
          'hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-accent focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isActive && 'bg-apple-accent-light text-apple-accent',
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
ToolbarButton.displayName = 'ToolbarButton';

const ToolbarDivider: React.FC = () => (
  <div className="mx-1 h-6 w-px bg-border-primary" role="separator" />
);

/**
 * RichTextToolbar - Toolbar component for RichTextEditor
 *
 * Features:
 * - Bold, Italic formatting
 * - Bullet and Ordered lists
 * - Table insertion
 * - Undo/Redo
 * - Accessible with keyboard navigation
 */
const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  editor,
  className,
}) => {
  if (!editor) {
    return null;
  }

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-border-primary bg-surface-primary p-1',
        className,
      )}
      role="toolbar"
      aria-label="Formatação de texto"
    >
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Negrito (Ctrl+B)"
        aria-label="Alternar negrito"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Italico (Ctrl+I)"
        aria-label="Alternar italico"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        disabled={!editor.can().chain().focus().toggleBulletList().run()}
        title="Lista com marcadores"
        aria-label="Alternar lista com marcadores"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        disabled={!editor.can().chain().focus().toggleOrderedList().run()}
        title="Lista numerada"
        aria-label="Alternar lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Table */}
      <ToolbarButton
        onClick={insertTable}
        isActive={editor.isActive('table')}
        title="Inserir tabela"
        aria-label="Inserir tabela"
      >
        <Table className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* History */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Desfazer (Ctrl+Z)"
        aria-label="Desfazer"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Refazer (Ctrl+Y)"
        aria-label="Refazer"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
};

RichTextToolbar.displayName = 'RichTextToolbar';

export { RichTextToolbar, ToolbarButton };

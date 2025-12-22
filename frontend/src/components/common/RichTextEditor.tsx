import * as React from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { cn } from '@/lib/utils';
import { RichTextToolbar } from './RichTextToolbar';

export interface RichTextEditorProps {
  /** Initial HTML content */
  content?: string;
  /** Callback when content changes */
  onChange?: (html: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the editor content area */
  editorClassName?: string;
  /** Minimum height of the editor */
  minHeight?: string;
  /** ID for the editor element */
  id?: string;
  /** aria-describedby for accessibility */
  'aria-describedby'?: string;
  /** aria-invalid for form validation */
  'aria-invalid'?: boolean;
}

export interface RichTextEditorRef {
  /** Get the TipTap editor instance */
  getEditor: () => Editor | null;
  /** Get the current HTML content */
  getHTML: () => string;
  /** Set the HTML content */
  setContent: (html: string) => void;
  /** Clear the editor content */
  clear: () => void;
  /** Focus the editor */
  focus: () => void;
}

/**
 * RichTextEditor - WYSIWYG editor component based on TipTap
 *
 * Features:
 * - Rich text formatting (bold, italic)
 * - Lists (bullet and ordered)
 * - Tables with header rows
 * - Undo/Redo support
 * - Keyboard shortcuts
 * - Accessible with ARIA attributes
 * - Controlled and uncontrolled usage
 *
 * @example
 * ```tsx
 * // Uncontrolled usage
 * <RichTextEditor
 *   content="<p>Initial content</p>"
 *   onChange={(html) => console.log(html)}
 * />
 *
 * // With ref for imperative control
 * const editorRef = useRef<RichTextEditorRef>(null);
 * <RichTextEditor ref={editorRef} />
 * // Later: editorRef.current?.getHTML()
 * ```
 */
const RichTextEditor = React.forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      content = '',
      onChange,
      placeholder = 'Digite aqui...',
      disabled = false,
      className,
      editorClassName,
      minHeight = '200px',
      id,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
    },
    ref,
  ) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // History is included by default
          heading: false, // Disable headings for now (can be added later)
        }),
        TableKit.configure({
          table: {
            resizable: true,
            HTMLAttributes: {
              class: 'rich-text-table',
            },
          },
        }),
      ],
      content,
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-sm max-w-none focus:outline-none',
            'min-h-[inherit] p-3',
            '[&_ul]:list-disc [&_ul]:pl-5',
            '[&_ol]:list-decimal [&_ol]:pl-5',
            '[&_table]:border-collapse [&_table]:w-full',
            '[&_th]:border [&_th]:border-border-primary [&_th]:bg-surface-secondary [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold',
            '[&_td]:border [&_td]:border-border-primary [&_td]:p-2',
            disabled && 'cursor-not-allowed opacity-50',
          ),
          ...(id && { id }),
          ...(ariaDescribedBy && { 'aria-describedby': ariaDescribedBy }),
          ...(ariaInvalid !== undefined && {
            'aria-invalid': String(ariaInvalid),
          }),
        },
      },
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
    });

    // Expose imperative methods via ref
    React.useImperativeHandle(ref, () => ({
      getEditor: () => editor,
      getHTML: () => editor?.getHTML() ?? '',
      setContent: (html: string) => {
        editor?.commands.setContent(html);
      },
      clear: () => {
        editor?.commands.clearContent();
      },
      focus: () => {
        editor?.commands.focus();
      },
    }));

    // Update editable state when disabled prop changes
    React.useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    return (
      <div
        className={cn(
          'overflow-hidden rounded-md border border-border-primary bg-background transition-colors',
          'focus-within:ring-2 focus-within:ring-apple-accent focus-within:ring-offset-2',
          disabled && 'opacity-50',
          className,
        )}
      >
        <RichTextToolbar editor={editor} />
        <div style={{ minHeight }} className={cn('relative', editorClassName)}>
          {editor && !editor.getText() && !disabled && (
            <div
              className="pointer-events-none absolute left-3 top-3 text-text-tertiary"
              aria-hidden="true"
            >
              {placeholder}
            </div>
          )}
          <EditorContent editor={editor} className="min-h-[inherit]" />
        </div>
      </div>
    );
  },
);

RichTextEditor.displayName = 'RichTextEditor';

export { RichTextEditor };

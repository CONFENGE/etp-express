import { useState, useCallback, useRef, memo, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Props for ChatInput component
 */
export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Chat input component with send button.
 *
 * Features:
 * - Auto-resizing textarea
 * - Send on Enter (Shift+Enter for new line)
 * - Character count
 * - Loading state
 * - Keyboard accessible
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export const ChatInput = memo(function ChatInput({
  onSend,
  disabled = false,
  isLoading = false,
  placeholder = 'Digite sua pergunta...',
  className,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_LENGTH = 2000;
  const charCount = message.length;
  const isOverLimit = charCount > MAX_LENGTH;
  const canSend = message.trim().length > 0 && !disabled && !isLoading && !isOverLimit;

  /**
   * Handle message submission
   */
  const handleSubmit = useCallback(() => {
    if (!canSend) return;

    onSend(message.trim());
    setMessage('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [canSend, message, onSend]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift sends message
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  /**
   * Handle textarea change with auto-resize
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setMessage(value);

      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    },
    [],
  );

  return (
    <div className={cn('border-t border-[var(--border-secondary)] p-4', className)}>
      {/* Input area */}
      <div
        className={cn(
          'flex items-end gap-2 bg-surface-secondary rounded-apple-lg p-2',
          'border border-transparent transition-colors duration-150',
          'focus-within:border-apple-accent focus-within:ring-1 focus-within:ring-apple-accent/30',
          isOverLimit && 'border-apple-red focus-within:border-apple-red',
        )}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            'flex-1 bg-transparent resize-none border-none outline-none',
            'text-apple-sm text-text-apple-primary placeholder:text-text-apple-tertiary',
            'min-h-[24px] max-h-[120px] py-1.5 px-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          aria-label="Digite sua mensagem"
          aria-describedby="char-count"
        />

        <Button
          type="button"
          variant="default"
          size="icon"
          onClick={handleSubmit}
          disabled={!canSend}
          className="h-9 w-9 flex-shrink-0"
          aria-label={isLoading ? 'Enviando...' : 'Enviar mensagem'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Character count and hint */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-text-apple-tertiary">
          Enter para enviar, Shift+Enter para nova linha
        </span>
        <span
          id="char-count"
          className={cn(
            'text-xs',
            isOverLimit ? 'text-apple-red' : 'text-text-apple-tertiary',
          )}
          aria-live="polite"
        >
          {charCount}/{MAX_LENGTH}
        </span>
      </div>
    </div>
  );
});

export default ChatInput;

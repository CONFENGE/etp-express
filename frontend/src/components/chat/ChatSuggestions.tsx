import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_SUGGESTIONS,
  FIELD_SUGGESTIONS,
  type ChatSuggestion,
} from './suggestions-data';

// Re-export types and data for backwards compatibility
export { DEFAULT_SUGGESTIONS, FIELD_SUGGESTIONS };
export type { ChatSuggestion };

/**
 * Props for ChatSuggestions component
 */
export interface ChatSuggestionsProps {
  onSelect: (prompt: string) => void;
  currentField?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Quick action suggestion buttons for common questions.
 *
 * Features:
 * - Context-aware suggestions based on current field
 * - Default suggestions when no field context
 * - Horizontal scrollable on mobile
 * - Keyboard accessible
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export const ChatSuggestions = memo(function ChatSuggestions({
  onSelect,
  currentField,
  disabled = false,
  className,
}: ChatSuggestionsProps) {
  /**
   * Get suggestions based on current field context
   */
  const getSuggestions = useCallback((): ChatSuggestion[] => {
    if (currentField) {
      const normalizedField = currentField.toLowerCase().replace(/\s+/g, '');

      // Check for field-specific suggestions
      for (const [key, suggestions] of Object.entries(FIELD_SUGGESTIONS)) {
        if (normalizedField.includes(key)) {
          return [...suggestions, ...DEFAULT_SUGGESTIONS.slice(0, 2)];
        }
      }
    }

    return DEFAULT_SUGGESTIONS;
  }, [currentField]);

  const suggestions = getSuggestions();

  return (
    <div
      className={cn(
        'flex gap-2 px-4 py-2 overflow-x-auto',
        'scrollbar-thin scrollbar-thumb-surface-tertiary scrollbar-track-transparent',
        className,
      )}
      role="group"
      aria-label="Sugestoes de perguntas"
    >
      {suggestions.map((suggestion) => (
        <SuggestionButton
          key={suggestion.id}
          suggestion={suggestion}
          onClick={() => onSelect(suggestion.prompt)}
          disabled={disabled}
        />
      ))}
    </div>
  );
});

/**
 * Individual suggestion button
 */
interface SuggestionButtonProps {
  suggestion: ChatSuggestion;
  onClick: () => void;
  disabled?: boolean;
}

const SuggestionButton = memo(function SuggestionButton({
  suggestion,
  onClick,
  disabled,
}: SuggestionButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-shrink-0 h-8 px-3 gap-1.5 text-xs font-normal',
        'bg-surface-primary hover:bg-surface-secondary',
        'border-[var(--border-secondary)] hover:border-apple-accent/50',
        'text-text-apple-secondary hover:text-apple-accent',
        'transition-all duration-150',
      )}
      aria-label={`Perguntar: ${suggestion.label}`}
    >
      {suggestion.icon && (
        <span className="text-apple-accent">{suggestion.icon}</span>
      )}
      {suggestion.label}
    </Button>
  );
});

export default ChatSuggestions;

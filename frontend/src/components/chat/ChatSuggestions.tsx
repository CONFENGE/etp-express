import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MessageCircle, FileText, AlertTriangle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Suggestion item definition
 */
export interface ChatSuggestion {
  id: string;
  label: string;
  prompt: string;
  icon?: React.ReactNode;
  category?: 'campo' | 'legislacao' | 'risco' | 'geral';
}

/**
 * Default suggestions for ETP assistance
 */
export const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
  {
    id: 'help-field',
    label: 'O que escrever aqui?',
    prompt: 'O que devo escrever neste campo? Me de um exemplo pratico.',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
    category: 'campo',
  },
  {
    id: 'legislation',
    label: 'Ver legislacao',
    prompt: 'Qual a legislacao aplicavel a este campo do ETP? Cite os artigos relevantes.',
    icon: <FileText className="w-3.5 h-3.5" />,
    category: 'legislacao',
  },
  {
    id: 'risks',
    label: 'Riscos do campo',
    prompt: 'Quais sao os principais riscos que devo considerar ao preencher este campo?',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    category: 'risco',
  },
  {
    id: 'estimate',
    label: 'Como estimar',
    prompt: 'Como devo fazer a estimativa de custos para este tipo de contratacao?',
    icon: <Calculator className="w-3.5 h-3.5" />,
    category: 'geral',
  },
];

/**
 * Context-aware suggestions based on current field
 */
export const FIELD_SUGGESTIONS: Record<string, ChatSuggestion[]> = {
  justificativa: [
    {
      id: 'just-example',
      label: 'Exemplo de justificativa',
      prompt: 'Me de um exemplo de justificativa de contratacao bem elaborada.',
      icon: <FileText className="w-3.5 h-3.5" />,
      category: 'campo',
    },
    {
      id: 'just-lei',
      label: 'Base legal',
      prompt: 'Quais artigos da Lei 14.133 fundamentam a justificativa da contratacao?',
      icon: <FileText className="w-3.5 h-3.5" />,
      category: 'legislacao',
    },
  ],
  objeto: [
    {
      id: 'obj-redacao',
      label: 'Redacao do objeto',
      prompt: 'Como devo redigir o objeto da contratacao de forma clara e precisa?',
      icon: <MessageCircle className="w-3.5 h-3.5" />,
      category: 'campo',
    },
  ],
  riscos: [
    {
      id: 'risk-matriz',
      label: 'Matriz de riscos',
      prompt: 'Como elaborar uma matriz de riscos para esta contratacao?',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      category: 'risco',
    },
  ],
};

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

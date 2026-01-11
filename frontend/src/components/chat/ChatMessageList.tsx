import { useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Bot, MessageSquare } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType } from './hooks/useChat';

/**
 * Props for ChatMessageList component
 */
export interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading?: boolean;
  onInsertSuggestion?: (content: string) => void;
  className?: string;
}

/**
 * Scrollable message list with auto-scroll to newest message.
 *
 * Features:
 * - Auto-scrolls to bottom when new messages arrive
 * - Empty state with helpful prompt
 * - Smooth scroll behavior
 * - Keyboard accessible with list semantics
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export const ChatMessageList = memo(function ChatMessageList({
  messages,
  isLoading = false,
  onInsertSuggestion,
  className,
}: ChatMessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to bottom when messages change
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn('flex-1 flex items-center justify-center p-6', className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={cn(
        'flex-1 overflow-y-auto px-4 py-4 space-y-4',
        'scrollbar-thin scrollbar-thumb-surface-tertiary scrollbar-track-transparent',
        className,
      )}
      role="list"
      aria-label="Historico de mensagens"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          onInsertSuggestion={onInsertSuggestion}
        />
      ))}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  );
});

/**
 * Empty state component with welcome message
 */
function EmptyState() {
  return (
    <div className="text-center max-w-xs">
      <div className="w-16 h-16 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
        <Bot className="w-8 h-8 text-apple-accent" />
      </div>
      <h3 className="text-apple-base font-semibold text-text-apple-primary mb-2">
        Assistente ETP
      </h3>
      <p className="text-apple-sm text-text-apple-secondary mb-4">
        Estou aqui para ajudar voce a preencher seu ETP. Faca perguntas sobre os campos,
        legislacao ou boas praticas.
      </p>
      <div className="flex flex-col gap-2 text-left">
        <SuggestionChip icon={<MessageSquare className="w-3.5 h-3.5" />}>
          &quot;O que devo escrever na justificativa?&quot;
        </SuggestionChip>
        <SuggestionChip icon={<MessageSquare className="w-3.5 h-3.5" />}>
          &quot;Explique os requisitos da contratacao&quot;
        </SuggestionChip>
        <SuggestionChip icon={<MessageSquare className="w-3.5 h-3.5" />}>
          &quot;Quais riscos devo considerar?&quot;
        </SuggestionChip>
      </div>
    </div>
  );
}

/**
 * Suggestion chip for empty state
 */
function SuggestionChip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface-secondary rounded-apple text-apple-sm text-text-apple-secondary">
      {icon && <span className="text-apple-accent">{icon}</span>}
      <span className="italic">{children}</span>
    </div>
  );
}

export default ChatMessageList;

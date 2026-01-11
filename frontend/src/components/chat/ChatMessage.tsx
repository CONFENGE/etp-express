import { cn } from '@/lib/utils';
import { Bot, User, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback, memo } from 'react';
import type { ChatMessage as ChatMessageType } from './hooks/useChat';

/**
 * Props for ChatMessage component
 */
export interface ChatMessageProps {
  message: ChatMessageType;
  onInsertSuggestion?: (content: string) => void;
}

/**
 * Individual chat message bubble component.
 *
 * Displays messages with appropriate styling based on role:
 * - User messages: Right-aligned, accent color
 * - Assistant messages: Left-aligned, surface color
 *
 * Features:
 * - Copy message content to clipboard
 * - Loading state with typing indicator
 * - Suggested content insertion button
 * - Related legislation links
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export const ChatMessage = memo(function ChatMessage({
  message,
  onInsertSuggestion,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;

  /**
   * Copy message content to clipboard
   */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = message.content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.content]);

  /**
   * Handle insert suggestion click
   */
  const handleInsertSuggestion = useCallback(() => {
    if (message.suggestedContent && onInsertSuggestion) {
      onInsertSuggestion(message.suggestedContent);
    }
  }, [message.suggestedContent, onInsertSuggestion]);

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
      role="listitem"
      aria-label={`Mensagem de ${isUser ? 'voce' : 'assistente'}`}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-apple-accent text-white'
            : 'bg-surface-secondary text-text-apple-secondary',
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'flex-1 max-w-[85%] space-y-2',
          isUser ? 'flex flex-col items-end' : 'flex flex-col items-start',
        )}
      >
        <div
          className={cn(
            'px-4 py-3 rounded-apple-lg text-apple-sm',
            isUser
              ? 'bg-apple-accent text-white rounded-tr-sm'
              : 'bg-surface-secondary text-text-apple-primary rounded-tl-sm',
          )}
        >
          {isLoading ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Assistant message actions */}
        {!isUser && !isLoading && (
          <div className="flex flex-col gap-2 w-full">
            {/* Copy button */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2 text-text-apple-tertiary hover:text-text-apple-primary"
                aria-label={copied ? 'Copiado' : 'Copiar mensagem'}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    <span className="text-xs">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    <span className="text-xs">Copiar</span>
                  </>
                )}
              </Button>
            </div>

            {/* Suggested content */}
            {message.suggestedContent && (
              <div className="bg-apple-accent-light/30 border border-apple-accent/20 rounded-apple p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-apple-accent" />
                  <span className="text-xs font-medium text-apple-accent">
                    Sugestao de texto
                  </span>
                </div>
                <p className="text-apple-sm text-text-apple-secondary mb-2 line-clamp-3">
                  {message.suggestedContent}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInsertSuggestion}
                  className="h-7 text-xs"
                >
                  Inserir no campo
                </Button>
              </div>
            )}

            {/* Related legislation */}
            {message.relatedLegislation && message.relatedLegislation.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {message.relatedLegislation.map((legislation, index) => (
                  <a
                    key={index}
                    href={`https://www.planalto.gov.br/ccivil_03/_Ato2019-2022/2021/Lei/L14133.htm`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-apple',
                      'bg-surface-tertiary text-text-apple-secondary text-xs',
                      'hover:bg-apple-accent-light hover:text-apple-accent',
                      'transition-colors duration-150',
                    )}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {legislation}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-text-apple-tertiary">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
});

/**
 * Typing indicator animation
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Digitando...">
      <span className="w-2 h-2 bg-text-apple-tertiary rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-text-apple-tertiary rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-text-apple-tertiary rounded-full animate-bounce" />
    </div>
  );
}

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default ChatMessage;

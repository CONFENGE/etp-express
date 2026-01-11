import { useState, useCallback, memo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MessageCircle, X, Trash2, AlertCircle, RefreshCw, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ChatSuggestions } from './ChatSuggestions';
import { useChat } from './hooks/useChat';
import {
  useProactiveSuggestions,
  ProactiveSuggestion,
} from './hooks/useProactiveSuggestions';

/**
 * Props for ChatWidget component
 */
export interface ChatWidgetProps {
  etpId: string;
  currentField?: string;
  onInsertSuggestion?: (content: string) => void;
  className?: string;
}

/**
 * Main chat widget component with floating button and slide-in panel.
 *
 * Features:
 * - Floating action button in bottom-right corner
 * - Slide-in panel with chat interface
 * - Context-aware suggestions based on current field
 * - Error handling with retry functionality
 * - Clear history option
 * - Mobile responsive (full-screen on small screens)
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * <ChatWidget
 *   etpId={etp.id}
 *   currentField="Justificativa"
 *   onInsertSuggestion={(content) => setFieldValue(content)}
 * />
 * ```
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export const ChatWidget = memo(function ChatWidget({
  etpId,
  currentField,
  onInsertSuggestion,
  className,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const [showProactiveHint, setShowProactiveHint] = useState(true);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    retryLastMessage,
  } = useChat(etpId);

  const {
    suggestions: proactiveSuggestions = [],
    highPriorityCount = 0,
    getSuggestionForField,
  } = useProactiveSuggestions(etpId, currentField, {
    enabled: isOpen,
    refreshInterval: 60000, // Refresh every minute when open
  });

  // Get the most relevant suggestion for current context
  const currentFieldSuggestion = currentField && getSuggestionForField
    ? getSuggestionForField(currentField)
    : undefined;

  // Get the highest priority undismissed suggestion
  const activeProactiveSuggestion: ProactiveSuggestion | undefined =
    (proactiveSuggestions || [])
      .filter((s) => !dismissedSuggestions.has(s.field))
      .find((s) => s.priority === 'high') ||
    currentFieldSuggestion;

  // Reset showProactiveHint when field changes
  useEffect(() => {
    setShowProactiveHint(true);
  }, [currentField]);

  /**
   * Handle sending a message with optional context
   */
  const handleSendMessage = useCallback(
    (content: string) => {
      sendMessage(content, currentField);
    },
    [sendMessage, currentField],
  );

  /**
   * Handle suggestion selection
   */
  const handleSuggestionSelect = useCallback(
    (prompt: string) => {
      sendMessage(prompt, currentField);
    },
    [sendMessage, currentField],
  );

  /**
   * Handle clear history confirmation
   */
  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    setShowClearConfirm(false);
  }, [clearHistory]);

  /**
   * Handle clicking the proactive suggestion help button
   */
  const handleProactiveSuggestionClick = useCallback(
    (suggestion: ProactiveSuggestion) => {
      if (suggestion.helpPrompt) {
        sendMessage(suggestion.helpPrompt, suggestion.field);
      }
      setShowProactiveHint(false);
    },
    [sendMessage],
  );

  /**
   * Dismiss a proactive suggestion
   */
  const handleDismissSuggestion = useCallback((field: string) => {
    setDismissedSuggestions((prev) => new Set(prev).add(field));
    setShowProactiveHint(false);
  }, []);

  /**
   * Open the chat panel
   */
  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  /**
   * Close the chat panel
   */
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={handleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'h-14 w-14 rounded-full shadow-apple-lg',
          'bg-apple-accent hover:bg-apple-accent-hover',
          'hover:shadow-xl hover:scale-105',
          'transition-all duration-200 ease-out',
          'focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2',
          isOpen && 'scale-0 opacity-0',
          className,
        )}
        aria-label="Abrir assistente de chat"
        aria-expanded={isOpen}
        aria-controls="chat-panel"
      >
        <MessageCircle className="h-6 w-6 text-white" />

        {/* Unread indicator - shows when there are messages and chat is closed */}
        {messages.length > 0 && !isOpen && (
          <span
            className="absolute -top-1 -right-1 h-5 w-5 bg-apple-red rounded-full flex items-center justify-center text-xs text-white font-medium"
            aria-label={`${messages.length} mensagens`}
          >
            {messages.length > 9 ? '9+' : messages.length}
          </span>
        )}

        {/* Proactive suggestions indicator - shows when there are high priority suggestions */}
        {highPriorityCount > 0 && !isOpen && messages.length === 0 && (
          <span
            className="absolute -top-1 -right-1 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center animate-pulse"
            aria-label={`${highPriorityCount} sugestoes importantes`}
          >
            <Lightbulb className="h-3 w-3 text-white" />
          </span>
        )}
      </Button>

      {/* Chat Panel - Using Dialog for accessibility and animations */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          id="chat-panel"
          className={cn(
            // Override default dialog positioning for side panel
            'fixed right-0 top-0 bottom-0 left-auto translate-x-0 translate-y-0',
            'h-full max-h-screen w-full sm:w-[400px] max-w-[100vw]',
            'rounded-none sm:rounded-l-apple-lg',
            'border-l border-[var(--border-secondary)] shadow-apple-lg',
            'flex flex-col p-0 gap-0',
            // Animation overrides
            'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
          )}
          aria-describedby="chat-description"
        >
          {/* Header */}
          <DialogHeader className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-secondary)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-apple-accent/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-apple-accent" />
                </div>
                <div>
                  <DialogTitle className="text-apple-base font-semibold">
                    Assistente ETP
                  </DialogTitle>
                  <DialogDescription
                    id="chat-description"
                    className="text-xs text-text-apple-tertiary"
                  >
                    {currentField
                      ? `Contexto: ${currentField}`
                      : 'Tire suas duvidas sobre o ETP'}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowClearConfirm(true)}
                    className="h-8 w-8 text-text-apple-tertiary hover:text-apple-red"
                    aria-label="Limpar historico"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 text-text-apple-tertiary hover:text-text-apple-primary"
                  aria-label="Fechar chat"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Error Banner */}
          {error && (
            <div className="flex-shrink-0 mx-4 mt-2 p-3 bg-apple-red/10 border border-apple-red/20 rounded-apple">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-apple-red flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-apple-sm text-apple-red">{error.message}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={retryLastMessage}
                    className="h-7 px-2 mt-1 text-xs text-apple-red hover:bg-apple-red/10"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Tentar novamente
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Proactive Suggestion Banner */}
          {activeProactiveSuggestion && showProactiveHint && !isLoading && (
            <div
              className={cn(
                'flex-shrink-0 mx-4 mt-2 p-3 rounded-apple',
                activeProactiveSuggestion.priority === 'high'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-blue-50 border border-blue-200',
              )}
            >
              <div className="flex items-start gap-2">
                <Lightbulb
                  className={cn(
                    'h-4 w-4 flex-shrink-0 mt-0.5',
                    activeProactiveSuggestion.priority === 'high'
                      ? 'text-amber-600'
                      : 'text-blue-600',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-apple-sm',
                      activeProactiveSuggestion.priority === 'high'
                        ? 'text-amber-800'
                        : 'text-blue-800',
                    )}
                  >
                    {activeProactiveSuggestion.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {activeProactiveSuggestion.helpPrompt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleProactiveSuggestionClick(activeProactiveSuggestion)
                        }
                        className={cn(
                          'h-7 px-2 text-xs',
                          activeProactiveSuggestion.priority === 'high'
                            ? 'text-amber-700 hover:bg-amber-100'
                            : 'text-blue-700 hover:bg-blue-100',
                        )}
                      >
                        <Lightbulb className="h-3 w-3 mr-1" />
                        Ajudar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDismissSuggestion(activeProactiveSuggestion.field)
                      }
                      className="h-7 px-2 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Ignorar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message List */}
          <ChatMessageList
            messages={messages}
            isLoading={isLoading}
            onInsertSuggestion={onInsertSuggestion}
            className="flex-1 min-h-0"
          />

          {/* Suggestions */}
          <ChatSuggestions
            onSelect={handleSuggestionSelect}
            currentField={currentField}
            disabled={isLoading}
            className="flex-shrink-0 border-t border-[var(--border-secondary)]"
          />

          {/* Input */}
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            disabled={!etpId}
            placeholder={
              currentField
                ? `Pergunte sobre ${currentField}...`
                : 'Digite sua pergunta...'
            }
            className="flex-shrink-0"
          />
        </DialogContent>
      </Dialog>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Limpar historico?</DialogTitle>
            <DialogDescription>
              Esta acao ira apagar todas as mensagens desta conversa. Esta acao nao
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowClearConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearHistory}
              className="bg-apple-red hover:bg-apple-red/90"
            >
              Limpar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default ChatWidget;

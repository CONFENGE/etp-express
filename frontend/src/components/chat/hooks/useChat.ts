import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { logger } from '@/lib/logger';

/**
 * Chat message role type
 */
export type ChatMessageRole = 'user' | 'assistant';

/**
 * Chat message structure matching backend DTOs
 */
export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: Date;
  suggestedContent?: string;
  relatedLegislation?: string[];
  isLoading?: boolean;
}

/**
 * Response metadata from the chatbot
 */
export interface ChatResponseMetadata {
  tokens: number;
  latencyMs: number;
  model?: string;
}

/**
 * Full response from the chat API
 */
interface ChatApiResponse {
  id: string;
  content: string;
  suggestedContent?: string;
  relatedLegislation?: string[];
  metadata: ChatResponseMetadata;
}

/**
 * History item from the API
 */
interface ChatHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

/**
 * Hook options
 */
export interface UseChatOptions {
  onError?: (error: Error) => void;
  onSuccess?: (response: ChatApiResponse) => void;
}

/**
 * Hook return type
 */
export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string, contextField?: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  retryLastMessage: () => Promise<void>;
}

/**
 * Custom hook for managing chat state and API interactions.
 *
 * Provides functionality to:
 * - Send messages to the ETP chatbot
 * - Retrieve conversation history
 * - Clear conversation history
 * - Handle loading and error states
 *
 * @param etpId - UUID of the ETP being edited
 * @param options - Optional callbacks for error/success handling
 * @returns Chat state and control functions
 *
 * @example
 * ```tsx
 * const { messages, sendMessage, isLoading } = useChat(etpId, {
 *   onError: (err) => toast.error(err.message),
 *   onSuccess: () => console.log('Message sent'),
 * });
 *
 * await sendMessage('O que devo escrever aqui?', 'Justificativa');
 * ```
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */
export function useChat(
  etpId: string,
  options: UseChatOptions = {},
): UseChatReturn {
  const { onError, onSuccess } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track last message for retry functionality
  const lastMessageRef = useRef<{ content: string; contextField?: string } | null>(
    null,
  );

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Track if initial history was already fetched
  const hasFetchedHistoryRef = useRef(false);

  /**
   * Fetch chat history on mount
   */
  useEffect(() => {
    if (!etpId || hasFetchedHistoryRef.current) return;

    const fetchHistory = async () => {
      try {
        hasFetchedHistoryRef.current = true;
        const response = await api.get<ChatHistoryItem[]>(
          `/chat/etp/${etpId}/history`,
        );

        if (!isMountedRef.current) return;

        const historyMessages: ChatMessage[] = response.data.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: new Date(item.createdAt),
        }));

        setMessages(historyMessages);
      } catch (err) {
        // History fetch failure is not critical - just log it
        logger.warn('Failed to fetch chat history', err);
      }
    };

    fetchHistory();
  }, [etpId]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Send a message to the chatbot
   */
  const sendMessage = useCallback(
    async (content: string, contextField?: string) => {
      if (!content.trim() || !etpId) return;

      // Store for retry
      lastMessageRef.current = { content, contextField };

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        createdAt: new Date(),
      };

      // Add loading placeholder for assistant
      const loadingMessage: ChatMessage = {
        id: `loading-${Date.now()}`,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post<ChatApiResponse>(
          `/chat/etp/${etpId}/message`,
          {
            message: content.trim(),
            contextField,
          },
        );

        if (!isMountedRef.current) return;

        // Replace loading message with actual response
        const assistantMessage: ChatMessage = {
          id: response.data.id,
          role: 'assistant',
          content: response.data.content,
          createdAt: new Date(),
          suggestedContent: response.data.suggestedContent,
          relatedLegislation: response.data.relatedLegislation,
        };

        setMessages((prev) =>
          prev.map((msg) =>
            msg.isLoading ? assistantMessage : msg,
          ),
        );

        onSuccess?.(response.data);
      } catch (err) {
        if (!isMountedRef.current) return;

        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao enviar mensagem';
        const chatError = new Error(errorMessage);

        // Remove loading message on error
        setMessages((prev) => prev.filter((msg) => !msg.isLoading));
        setError(chatError);
        onError?.(chatError);

        logger.error('Failed to send chat message', err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [etpId, onError, onSuccess],
  );

  /**
   * Retry the last failed message
   */
  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current) return;

    const { content, contextField } = lastMessageRef.current;
    await sendMessage(content, contextField);
  }, [sendMessage]);

  /**
   * Clear all conversation history
   */
  const clearHistory = useCallback(async () => {
    if (!etpId) return;

    try {
      await api.delete(`/chat/etp/${etpId}/history`);

      if (!isMountedRef.current) return;

      setMessages([]);
      setError(null);
      lastMessageRef.current = null;
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao limpar historico';
      const chatError = new Error(errorMessage);

      setError(chatError);
      onError?.(chatError);

      logger.error('Failed to clear chat history', err);
    }
  }, [etpId, onError]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    retryLastMessage,
  };
}

/**
 * Chat component module exports.
 *
 * Provides all components and hooks for the ETP chat assistant functionality.
 *
 * @example
 * ```tsx
 * import { ChatWidget, useChat } from '@/components/chat';
 *
 * function ETPEditor({ etpId }) {
 *   return (
 *     <div>
 *       <ChatWidget etpId={etpId} currentField="Justificativa" />
 *     </div>
 *   );
 * }
 * ```
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 * Parent: #1167 - [Assistente] Implementar chatbot para duvidas
 */

// Main widget component
export { ChatWidget } from './ChatWidget';
export type { ChatWidgetProps } from './ChatWidget';

// Sub-components
export { ChatMessage } from './ChatMessage';
export type { ChatMessageProps } from './ChatMessage';

export { ChatMessageList } from './ChatMessageList';
export type { ChatMessageListProps } from './ChatMessageList';

export { ChatInput } from './ChatInput';
export type { ChatInputProps } from './ChatInput';

export { ChatSuggestions, DEFAULT_SUGGESTIONS, FIELD_SUGGESTIONS } from './ChatSuggestions';
export type { ChatSuggestionsProps, ChatSuggestion } from './ChatSuggestions';

// Hook
export { useChat } from './hooks/useChat';
export type {
  ChatMessage as ChatMessageType,
  ChatMessageRole,
  ChatResponseMetadata,
  UseChatOptions,
  UseChatReturn,
} from './hooks/useChat';

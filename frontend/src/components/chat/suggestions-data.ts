import { MessageCircle, FileText, AlertTriangle, Calculator } from 'lucide-react';
import { createElement } from 'react';

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
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 */
export const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
  {
    id: 'help-field',
    label: 'O que escrever aqui?',
    prompt: 'O que devo escrever neste campo? Me de um exemplo pratico.',
    icon: createElement(MessageCircle, { className: 'w-3.5 h-3.5' }),
    category: 'campo',
  },
  {
    id: 'legislation',
    label: 'Ver legislacao',
    prompt: 'Qual a legislacao aplicavel a este campo do ETP? Cite os artigos relevantes.',
    icon: createElement(FileText, { className: 'w-3.5 h-3.5' }),
    category: 'legislacao',
  },
  {
    id: 'risks',
    label: 'Riscos do campo',
    prompt: 'Quais sao os principais riscos que devo considerar ao preencher este campo?',
    icon: createElement(AlertTriangle, { className: 'w-3.5 h-3.5' }),
    category: 'risco',
  },
  {
    id: 'estimate',
    label: 'Como estimar',
    prompt: 'Como devo fazer a estimativa de custos para este tipo de contratacao?',
    icon: createElement(Calculator, { className: 'w-3.5 h-3.5' }),
    category: 'geral',
  },
];

/**
 * Context-aware suggestions based on current field
 *
 * Issue #1395 - [CHAT-1167d] Create ChatWidget React component
 */
export const FIELD_SUGGESTIONS: Record<string, ChatSuggestion[]> = {
  justificativa: [
    {
      id: 'just-example',
      label: 'Exemplo de justificativa',
      prompt: 'Me de um exemplo de justificativa de contratacao bem elaborada.',
      icon: createElement(FileText, { className: 'w-3.5 h-3.5' }),
      category: 'campo',
    },
    {
      id: 'just-lei',
      label: 'Base legal',
      prompt: 'Quais artigos da Lei 14.133 fundamentam a justificativa da contratacao?',
      icon: createElement(FileText, { className: 'w-3.5 h-3.5' }),
      category: 'legislacao',
    },
  ],
  objeto: [
    {
      id: 'obj-redacao',
      label: 'Redacao do objeto',
      prompt: 'Como devo redigir o objeto da contratacao de forma clara e precisa?',
      icon: createElement(MessageCircle, { className: 'w-3.5 h-3.5' }),
      category: 'campo',
    },
  ],
  riscos: [
    {
      id: 'risk-matriz',
      label: 'Matriz de riscos',
      prompt: 'Como elaborar uma matriz de riscos para esta contratacao?',
      icon: createElement(AlertTriangle, { className: 'w-3.5 h-3.5' }),
      category: 'risco',
    },
  ],
};

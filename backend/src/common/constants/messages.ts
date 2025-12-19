/**
 * Centralized constants for system messages, warnings, and disclaimers.
 *
 * This module exports reusable message strings used across the application
 * to ensure consistency and facilitate future updates.
 *
 * @module messages
 * @since 1.0.0
 */

/**
 * Standard disclaimer warning about system limitations and the need for human verification.
 *
 * This message is displayed to users to remind them that AI-generated content
 * must always be reviewed and validated by a responsible public servant before
 * being submitted or used in official processes.
 *
 * **Usage:** Include this disclaimer in all API responses involving AI-generated content.
 *
 * @constant {string} DISCLAIMER
 * @example
 * ```typescript
 * import { DISCLAIMER } from './common/constants/messages';
 *
 * return {
 * content: generatedText,
 * warning: DISCLAIMER
 * };
 * ```
 */
export const DISCLAIMER =
  'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.';

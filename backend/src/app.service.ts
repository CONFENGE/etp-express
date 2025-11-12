import { Injectable } from '@nestjs/common';

/**
 * Service responsible for application health monitoring and system information.
 *
 * Provides endpoints for health checks and system metadata used by monitoring
 * tools and the frontend dashboard.
 *
 * @class AppService
 * @since 1.0.0
 */
@Injectable()
export class AppService {
  /**
   * Returns the current health status of the application.
   *
   * Used by load balancers and monitoring systems to check if the
   * service is responsive and ready to handle requests.
   *
   * @returns Object containing health status, timestamp, and warning message
   * @returns {string} status - Always 'ok' when service is running
   * @returns {string} timestamp - Current server time in ISO 8601 format
   * @returns {string} message - Human-readable status message
   * @returns {string} warning - Legal disclaimer about system limitations
   *
   * @example
   * ```typescript
   * const health = appService.getHealth();
   * console.log(health.status); // 'ok'
   * console.log(health.timestamp); // '2025-01-08T12:30:00.000Z'
   * ```
   */
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      warning:
        '⚠️ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
      message: 'ETP Express Backend is running',
    };
  }

  /**
   * Returns system information and feature list.
   *
   * Provides metadata about the ETP Express system including version,
   * available features, and legal disclaimers. Used by the frontend
   * to display system capabilities and warnings.
   *
   * @returns Object with system name, version, features, and disclaimers
   * @returns {string} name - Application name
   * @returns {string} version - Current version (semver)
   * @returns {string} description - Brief system description
   * @returns {string} warning - Legal disclaimer about system limitations
   * @returns {string[]} features - List of available features
   * @returns {string[]} disclaimer - Legal disclaimers and warnings
   *
   * @example
   * ```typescript
   * const info = appService.getInfo();
   * console.log(info.name); // 'ETP Express'
   * console.log(info.features.length); // 6
   * ```
   */
  getInfo() {
    return {
      name: 'ETP Express',
      version: '1.0.0',
      description:
        'Sistema assistivo para elaboração de Estudos Técnicos Preliminares (Lei 14.133/2021)',
      warning:
        '⚠️ O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
      features: [
        'Geração assistida por LLM (OpenAI GPT-4)',
        'Busca de contratações similares (Perplexity API)',
        'Sistema de subagentes especializados',
        'Versionamento e auditoria completos',
        'Export para PDF, JSON e XML',
        'Analytics de UX',
      ],
      disclaimer: [
        'Este sistema NÃO substitui responsabilidade administrativa',
        'Este sistema NÃO é ato conclusivo',
        'Este sistema NÃO exime conferência humana',
        'Toda geração deve ser validada por servidor responsável',
      ],
    };
  }
}

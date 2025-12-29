import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { EtpsService } from '../etps/etps.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtpSection, SectionStatus } from '../../entities/etp-section.entity';
import { PrometheusMetricsService } from '../../health/prometheus-metrics.service';

/**
 * Job payload for section generation queue
 */
export interface GenerateSectionJobData {
  etpId: string;
  sectionType: string;
  title: string;
  userInput?: string;
  context?: Record<string, unknown>;
  userId: string;
  organizationId: string;
  sectionId: string; // Pre-created section ID
}

/**
 * Section generation result
 */
export interface GeneratedSectionResult {
  sectionId: string;
  status: SectionStatus;
  content?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * BullMQ processor for asynchronous section generation
 *
 * @remarks
 * This processor handles the long-running AI content generation operations
 * that were previously blocking HTTP requests (30-60s). By moving generation
 * to a queue-based architecture:
 *
 * - HTTP requests return immediately with a job ID
 * - Generation happens in background workers
 * - Progress updates are tracked via job.updateProgress()
 * - Automatic retries on failure (3 attempts with exponential backoff)
 * - Multiple workers can process jobs in parallel
 *
 * Architecture:
 * - Uses BullMQ for Redis-backed job queue
 * - Integrates with existing OrchestratorService for AI generation
 * - Updates EtpSection entity directly upon completion
 * - Coordinates with EtpsService for completion percentage updates
 *
 * @see SectionsService - Queues jobs for this processor
 * @see OrchestratorService - Handles AI content generation
 * @see EtpsService - Manages ETP completion tracking
 */
@Processor('sections')
export class SectionsProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(SectionsProcessor.name);

  constructor(
    @InjectRepository(EtpSection)
    private sectionsRepository: Repository<EtpSection>,
    private orchestratorService: OrchestratorService,
    private etpsService: EtpsService,
    private prometheusMetrics: PrometheusMetricsService,
  ) {
    super();
  }

  /**
   * Graceful shutdown handler for BullMQ worker (#607)
   *
   * Called automatically by NestJS when the application receives shutdown signal.
   * Ensures currently processing jobs complete before the worker terminates.
   *
   * @param signal - The signal that triggered shutdown (SIGTERM, SIGINT)
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `SectionsProcessor shutting down (${signal || 'unknown signal'})...`,
    );

    try {
      // WorkerHost from @nestjs/bullmq provides access to the underlying worker
      const worker = this.worker;

      if (worker) {
        // Close the worker gracefully - this waits for active jobs to complete
        // Force: false means wait for current job to finish
        await worker.close(false);
        this.logger.log('BullMQ worker closed gracefully');
      }
    } catch (error) {
      this.logger.error(
        `Error closing BullMQ worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Processes a section generation job
   *
   * @remarks
   * This method is automatically called by BullMQ for each job in the queue.
   * It performs the following steps:
   *
   * 1. Validates the section still exists (10% progress)
   * 2. Loads ETP data for context
   * 3. Calls OrchestratorService for AI generation (10-90% progress)
   * 4. Saves generated content to database (90% progress)
   * 5. Updates ETP completion percentage (95% progress)
   * 6. Marks job as complete (100% progress)
   *
   * Progress updates allow frontend to show real-time generation status.
   *
   * On failure:
   * - Job is automatically retried up to 3 times (configured in SectionsService)
   * - Section status is set to PENDING with error message
   * - Error is logged and rethrown for BullMQ to handle
   *
   * @param job - BullMQ job containing GenerateSectionJobData
   * @returns GeneratedSectionResult with final section state
   * @throws {Error} If section not found, ETP not found, or generation fails
   */
  async process(
    job: Job<GenerateSectionJobData>,
  ): Promise<GeneratedSectionResult> {
    const {
      etpId,
      sectionType,
      title,
      userInput,
      context,
      userId,
      organizationId,
      sectionId,
    } = job.data;

    this.logger.log(
      `Processing section generation job ${job.id} for ETP ${etpId}, section ${sectionType}`,
    );

    const jobStartTime = Date.now();

    try {
      // Step 1: Validate section exists
      await job.updateProgress(10);

      const section = await this.sectionsRepository.findOne({
        where: { id: sectionId },
      });

      if (!section) {
        throw new Error(`Section ${sectionId} not found`);
      }

      // Step 2: Load ETP data for context
      const etp = await this.etpsService.findOneMinimal(
        etpId,
        organizationId,
        userId,
      );

      if (!etp) {
        throw new Error(`ETP ${etpId} not found`);
      }

      // Step 3: Generate content with progress tracking
      this.logger.log(`Calling OrchestratorService for section ${sectionType}`);

      const generationResult = await this.orchestratorService.generateSection({
        sectionType,
        title,
        userInput: userInput || '',
        context,
        etpData: {
          objeto: etp.objeto,
          metadata: etp.metadata,
        },
      });

      await job.updateProgress(90);

      // Step 4: Save generated content
      section.content = generationResult.content;
      section.status = SectionStatus.GENERATED;
      section.metadata = {
        ...generationResult.metadata,
        warnings: generationResult.warnings,
        generatedAt: new Date().toISOString(),
        jobId: job.id,
      };
      const validationResults = this.convertValidationResults(
        generationResult.validationResults,
      );
      if (validationResults) {
        section.validationResults = validationResults;
      }

      await this.sectionsRepository.save(section);

      await job.updateProgress(95);

      // Step 5: Update ETP completion percentage with tenancy validation (Issue #758)
      await this.etpsService.updateCompletionPercentage(etpId, organizationId);

      await job.updateProgress(100);

      this.logger.log(
        `Section generation job ${job.id} completed successfully`,
      );

      // Record BullMQ job success metric (#862)
      const jobDurationSeconds = (Date.now() - jobStartTime) / 1000;
      this.prometheusMetrics.recordBullMQJob(
        'sections',
        'completed',
        jobDurationSeconds,
      );

      return {
        sectionId: section.id,
        status: SectionStatus.GENERATED,
        content: section.content,
        metadata: section.metadata,
      };
    } catch (error) {
      // Get user-friendly error message for display (#1047)
      const userFriendlyMessage = this.getUserFriendlyErrorMessage(
        error as Error,
      );
      const errorCategory = this.getErrorCategory(error as Error);

      // Enhanced structured logging for debugging (#1047)
      this.logger.error(
        `Section generation failed [job=${job.id}] [etp=${etpId}] [section=${sectionType}] [category=${errorCategory}]`,
        {
          jobId: job.id,
          etpId,
          sectionType,
          sectionId,
          errorCategory,
          errorName: (error as Error).name,
          errorMessage: (error as Error).message,
          userFriendlyMessage,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts?.attempts || 3,
          stack: (error as Error).stack,
        },
      );

      // Update section with user-friendly error status
      try {
        const section = await this.sectionsRepository.findOne({
          where: { id: sectionId },
        });

        if (section) {
          section.status = SectionStatus.PENDING;
          // Store user-friendly message in content for display
          section.content = userFriendlyMessage;
          section.metadata = {
            ...section.metadata,
            // User-friendly message for frontend
            error: userFriendlyMessage,
            // Technical error details for debugging (not shown to user)
            errorDetails: {
              category: errorCategory,
              originalMessage: (error as Error).message,
              name: (error as Error).name,
            },
            failedAt: new Date().toISOString(),
            jobId: job.id,
            attemptsMade: job.attemptsMade + 1,
          };

          await this.sectionsRepository.save(section);

          this.logger.debug(
            `Section ${sectionId} updated with error status [category=${errorCategory}]`,
          );
        }
      } catch (saveError) {
        this.logger.error(
          `Failed to update section ${sectionId} with error status`,
          {
            sectionId,
            saveError: (saveError as Error).message,
          },
        );
      }

      // Record BullMQ job failure metric with category (#862, #1047)
      const jobDurationSeconds = (Date.now() - jobStartTime) / 1000;
      this.prometheusMetrics.recordBullMQJob(
        'sections',
        'failed',
        jobDurationSeconds,
        errorCategory,
      );

      // Create error with user-friendly message for BullMQ's failedReason (#1047)
      // This message will be returned to the frontend via job status polling
      const friendlyError = new Error(userFriendlyMessage);
      friendlyError.name = errorCategory;

      throw friendlyError; // Rethrow with friendly message for BullMQ
    }
  }

  /**
   * Converts validation results from orchestrator format to section metadata format
   *
   * @param validationResults - Validation results from orchestrator
   * @returns Converted validation results or null
   */
  private convertValidationResults(
    validationResults: unknown,
  ): Record<string, unknown> | null {
    if (!validationResults || typeof validationResults !== 'object') {
      return null;
    }

    const results = validationResults as Record<string, unknown>;
    return {
      isCompliant: results.isCompliant,
      complianceScore: results.complianceScore,
      issues: results.issues || [],
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Converts technical error messages to user-friendly Portuguese messages.
   *
   * @remarks
   * This method categorizes errors into specific types and returns
   * appropriate user-facing messages. The original error is preserved
   * in logs for debugging while the user sees a helpful message.
   *
   * Error categories:
   * - Rate limiting: OpenAI/API rate limits exceeded
   * - Timeout: Service response timeouts
   * - Service unavailable: Circuit breaker open, service down
   * - Validation: LLM output validation failures
   * - Network: Connection issues
   * - Default: Generic fallback message
   *
   * @param error - The original error to categorize
   * @returns User-friendly error message in Portuguese
   * @see #1047 - Improve AI section generation error messages
   */
  private getUserFriendlyErrorMessage(error: Error): string {
    const message = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';

    // Rate limit errors (OpenAI 429, API throttling)
    if (
      message.includes('rate_limit') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests') ||
      message.includes('throttl')
    ) {
      return 'Limite de requisicoes excedido. Aguarde alguns minutos e tente novamente.';
    }

    // Timeout errors
    if (
      message.includes('timeout') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('aborted')
    ) {
      return 'O servico de IA demorou para responder. Tente novamente.';
    }

    // Service unavailable (circuit breaker or explicit)
    if (
      message.includes('temporariamente indisponivel') ||
      message.includes('service unavailable') ||
      message.includes('503') ||
      errorName.includes('serviceunavailable')
    ) {
      return 'Servico de IA temporariamente indisponivel. Tente novamente em instantes.';
    }

    // Circuit breaker open
    if (message.includes('circuit') || errorName === 'eopenbreaker') {
      return 'Servico de IA temporariamente indisponivel devido a multiplas falhas. Tente novamente em alguns minutos.';
    }

    // LLM output validation failures
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('llmoutputvalidationerror')
    ) {
      return 'A geracao nao atendeu aos criterios de qualidade. Tente novamente com instrucoes mais especificas.';
    }

    // OpenAI specific errors
    if (
      message.includes('openai') ||
      message.includes('api key') ||
      message.includes('authentication')
    ) {
      return 'Erro de configuracao do servico de IA. Entre em contato com o suporte.';
    }

    // Network/connection errors
    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('fetch')
    ) {
      return 'Erro de conexao com o servico de IA. Verifique sua conexao e tente novamente.';
    }

    // ETP or Section not found
    if (message.includes('not found') || message.includes('nao encontrad')) {
      return 'O ETP ou secao nao foi encontrado. Atualize a pagina e tente novamente.';
    }

    // Generic server errors
    if (message.includes('500') || message.includes('internal server')) {
      return 'Erro interno do servidor. Nossa equipe foi notificada. Tente novamente em instantes.';
    }

    // Default fallback with helpful guidance
    return 'Erro ao gerar conteudo da secao. Tente novamente ou entre em contato com o suporte se o problema persistir.';
  }

  /**
   * Determines the error category for metrics and logging.
   *
   * @param error - The error to categorize
   * @returns Error category string for Prometheus metrics
   * @see #1047 - Improve AI section generation error messages
   */
  private getErrorCategory(error: Error): string {
    const message = error.message?.toLowerCase() || '';

    if (
      message.includes('rate_limit') ||
      message.includes('429') ||
      message.includes('throttl')
    ) {
      return 'rate_limit';
    }
    if (message.includes('timeout') || message.includes('etimedout')) {
      return 'timeout';
    }
    if (message.includes('circuit') || message.includes('unavailable')) {
      return 'service_unavailable';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation_error';
    }
    if (message.includes('network') || message.includes('econn')) {
      return 'network_error';
    }
    return error.name || 'unknown_error';
  }
}

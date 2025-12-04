import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { EtpsService } from '../etps/etps.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtpSection, SectionStatus } from '../../entities/etp-section.entity';

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
  metadata?: Record<string, any>;
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
export class SectionsProcessor extends WorkerHost {
  private readonly logger = new Logger(SectionsProcessor.name);

  constructor(
    @InjectRepository(EtpSection)
    private sectionsRepository: Repository<EtpSection>,
    private orchestratorService: OrchestratorService,
    private etpsService: EtpsService,
  ) {
    super();
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

      // Step 5: Update ETP completion percentage
      await this.etpsService.updateCompletionPercentage(etpId);

      await job.updateProgress(100);

      this.logger.log(
        `Section generation job ${job.id} completed successfully`,
      );

      return {
        sectionId: section.id,
        status: SectionStatus.GENERATED,
        content: section.content,
        metadata: section.metadata,
      };
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id}: ${error.message}`,
        error.stack,
      );

      // Update section with error status
      try {
        const section = await this.sectionsRepository.findOne({
          where: { id: sectionId },
        });

        if (section) {
          section.status = SectionStatus.PENDING;
          section.content = `Erro ao gerar conteúdo: ${error.message}`;
          section.metadata = {
            ...section.metadata,
            error: error.message,
            failedAt: new Date().toISOString(),
            jobId: job.id,
          };

          await this.sectionsRepository.save(section);
        }
      } catch (saveError) {
        this.logger.error(
          `Failed to update section with error status: ${saveError.message}`,
        );
      }

      throw error; // Rethrow to trigger BullMQ retry
    }
  }

  /**
   * Converts validation results from orchestrator format to section metadata format
   *
   * @param validationResults - Validation results from orchestrator
   * @returns Converted validation results or null
   */
  private convertValidationResults(
    validationResults: any,
  ): Record<string, any> | null {
    if (!validationResults) {
      return null;
    }

    return {
      isCompliant: validationResults.isCompliant,
      complianceScore: validationResults.complianceScore,
      issues: validationResults.issues || [],
      checkedAt: new Date().toISOString(),
    };
  }
}

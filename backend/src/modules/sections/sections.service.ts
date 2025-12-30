import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository, DataSource } from 'typeorm';
import { Queue } from 'bullmq';
import { Observable } from 'rxjs';
import { EtpSection, SectionStatus } from '../../entities/etp-section.entity';
import { Etp } from '../../entities/etp.entity';
import { GenerateSectionDto } from './dto/generate-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import {
  OrchestratorService,
  GenerationResult,
} from '../orchestrator/orchestrator.service';
import { EtpsService } from '../etps/etps.service';
import { DISCLAIMER } from '../../common/constants/messages';
import { GenerateSectionJobData } from './sections.processor';
import { SectionProgressService } from './section-progress.service';
import {
  ProgressEvent,
  SseMessageEvent,
} from './interfaces/progress-event.interface';

/**
 * Type alias for validation results from OrchestratorService.
 * Extracted from GenerationResult.validationResults for type safety.
 *
 * @see #510 - Fix 'any' types remaining in codebase
 */
type OrchestratorValidationResults = GenerationResult['validationResults'];

/**
 * Interface for job status response.
 *
 * @see #509 - Fix 'any' types in DTOs and interfaces
 */
export interface JobStatusResponse {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: number;
  result?: EtpSection;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  processedOn?: Date;
  failedReason?: string;
  attemptsMade?: number;
  attemptsMax?: number;
  /**
   * Status of data sources queried during enrichment phase.
   * Available after enrichment phase completes (~30% progress).
   * @see #756 - DataSourceStatus frontend component
   */
  dataSourceStatus?: {
    status:
      | 'SUCCESS'
      | 'PARTIAL'
      | 'SERVICE_UNAVAILABLE'
      | 'RATE_LIMITED'
      | 'TIMEOUT';
    sources: Array<{
      name: string;
      status:
        | 'SUCCESS'
        | 'PARTIAL'
        | 'SERVICE_UNAVAILABLE'
        | 'RATE_LIMITED'
        | 'TIMEOUT';
      error?: string;
      latencyMs?: number;
      resultCount?: number;
    }>;
    message: string;
  };
}

/**
 * Service responsible for managing ETP sections and coordinating AI-powered content generation.
 *
 * @remarks
 * This service handles the complete lifecycle of ETP sections including:
 * - Section creation with AI-generated content via OrchestratorService
 * - Manual section updates and edits
 * - Content regeneration for existing sections
 * - Validation of section content quality and compliance
 * - Section deletion with automatic ETP completion percentage recalculation
 *
 * Architecture notes:
 * - Uses TypeORM repositories for database operations on EtpSection entities
 * - Uses BullMQ for asynchronous AI generation (Issue #220)
 * - Integrates with OrchestratorService for all AI generation and validation
 * - Coordinates with EtpsService for authorization checks and completion tracking
 * - Implements section ordering and required section flagging
 *
 * Generation is now asynchronous via BullMQ queue for better scalability and UX.
 * HTTP requests return immediately with a job ID, and generation happens in background workers.
 *
 * @see SectionsProcessor - Background worker for AI generation jobs
 * @see OrchestratorService - AI orchestration for content generation
 * @see EtpsService - Parent ETP management and authorization
 * @see EtpSection - Section entity model
 */
@Injectable()
export class SectionsService {
  private readonly logger = new Logger(SectionsService.name);

  constructor(
    @InjectRepository(EtpSection)
    private sectionsRepository: Repository<EtpSection>,
    @InjectRepository(Etp)
    private etpsRepository: Repository<Etp>,
    @InjectQueue('sections') private sectionsQueue: Queue,
    private orchestratorService: OrchestratorService,
    private etpsService: EtpsService,
    private dataSource: DataSource,
  ) {}

  /**
   * Generates a new ETP section with AI-powered content asynchronously via BullMQ.
   *
   * @remarks
   * This method orchestrates the async section generation workflow:
   * 1. Verifies ETP exists and user has access (via EtpsService)
   * 2. Checks that section type doesn't already exist (prevents duplicates)
   * 3. Creates section entity with GENERATING status
   * 4. Queues generation job in BullMQ (returns immediately)
   * 5. Returns section with jobId in metadata for progress tracking
   *
   * Generation is now **asynchronous** (Issue #220):
   * - HTTP request returns in <100ms with section and jobId
   * - AI generation happens in background worker (SectionsProcessor)
   * - Client can poll job status via jobId (future: Issue #221)
   * - Progress updates tracked: 10% → 90% → 95% → 100%
   *
   * Section ordering is automatically managed, and required section flags
   * are set based on section type.
   *
   * @param etpId - Parent ETP unique identifier
   * @param generateDto - Section generation parameters (type, title, user input, context)
   * @param userId - Current user ID for authorization check
   * @param organizationId - Organization ID for multi-tenancy
   * @returns Created section entity with GENERATING status and jobId in metadata
   * @throws {NotFoundException} If parent ETP not found
   * @throws {ForbiddenException} If user doesn't own the ETP
   * @throws {BadRequestException} If section of this type already exists
   *
   * @example
   * ```ts
   * const section = await sectionsService.generateSection(
   * 'etp-uuid-123',
   * {
   * type: 'justificativa',
   * title: 'Justificativa da Contratação',
   * userInput: 'Necessidade de modernizar infraestrutura de TI',
   * context: { department: 'TI' }
   * },
   * 'user-uuid-456',
   * 'org-uuid-789'
   * );
   *
   * console.log(section.status); // 'generating'
   * console.log(section.metadata.jobId); // 'bull:sections:123'
   * // Client polls /jobs/:jobId for progress
   * ```
   */
  async generateSection(
    etpId: string,
    generateDto: GenerateSectionDto,
    userId: string,
    organizationId: string,
  ): Promise<EtpSection> {
    this.logger.log(
      `Queueing section generation ${generateDto.type} for ETP ${etpId}`,
    );

    // Verify ETP exists and user has access (minimal loading - only needs metadata)
    const etp = await this.etpsService.findOneMinimal(
      etpId,
      organizationId,
      userId,
    );

    if (!etp) {
      throw new NotFoundException(`ETP ${etpId} não encontrado`);
    }

    // Check if section already exists
    const existingSection = await this.sectionsRepository.findOne({
      where: { etpId, type: generateDto.type },
    });

    if (existingSection) {
      throw new BadRequestException(
        `Seção do tipo ${generateDto.type} já existe. Use PATCH para atualizar.`,
      );
    }

    // Create section entity with GENERATING status
    const section = this.sectionsRepository.create({
      etpId,
      type: generateDto.type,
      title: generateDto.title,
      userInput: generateDto.userInput,
      status: SectionStatus.GENERATING,
      order: await this.getNextOrder(etpId),
      isRequired: this.isRequiredSection(generateDto.type),
    });

    let savedSection: EtpSection;
    try {
      savedSection = await this.sectionsRepository.save(section);
    } catch (error) {
      // Handle PostgreSQL unique violation (race condition)
      if ((error as { code?: string }).code === '23505') {
        const existing = await this.sectionsRepository.findOne({
          where: { etpId, type: generateDto.type },
        });
        if (existing) {
          this.logger.warn(
            `Section ${generateDto.type} already exists for ETP ${etpId}, returning existing`,
          );
          return existing;
        }
      }
      throw error;
    }

    // Queue generation job in BullMQ (async)
    const job = await this.sectionsQueue.add(
      'generate',
      {
        etpId,
        sectionType: generateDto.type,
        title: generateDto.title,
        userInput: generateDto.userInput,
        context: generateDto.context,
        userId,
        organizationId,
        sectionId: savedSection.id,
      } as GenerateSectionJobData,
      {
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 5000, // Start with 5s delay, then 10s, 20s
        },
        removeOnComplete: 100, // Keep last 100 completed jobs for debugging
        removeOnFail: 1000, // Keep last 1000 failed jobs for analysis
      },
    );

    // Update section metadata with job ID
    savedSection.metadata = {
      jobId: job.id,
      queuedAt: new Date().toISOString(),
    };

    await this.sectionsRepository.save(savedSection);

    this.logger.log(
      `Section generation queued with job ID ${job.id}: ${savedSection.id}`,
    );

    return savedSection;
  }

  /**
   * Generates a new ETP section with real-time progress streaming via SSE.
   *
   * @remarks
   * Unlike `generateSection()` which queues the job asynchronously, this method
   * executes the generation synchronously while streaming progress events to the
   * client via Server-Sent Events (SSE).
   *
   * This is ideal for clients that want real-time feedback during generation
   * instead of polling for job status.
   *
   * **Progress Phases:**
   * 1. sanitization (0-10%): Input sanitization and PII redaction
   * 2. enrichment (10-30%): Market data enrichment via Gov-API/Exa
   * 3. generation (30-70%): LLM content generation
   * 4. validation (70-95%): Multi-agent validation
   * 5. complete (100%): Final result ready
   *
   * @param etpId - Parent ETP unique identifier
   * @param generateDto - Section generation parameters
   * @param userId - Current user ID for authorization
   * @param organizationId - Organization ID for multi-tenancy
   * @param progressService - Service for emitting progress events
   * @returns Observable of SSE MessageEvents with progress updates and final result
   * @throws {NotFoundException} If ETP not found
   * @throws {BadRequestException} If section already exists
   *
   * @see #754 - SSE streaming implementation
   */
  generateSectionWithProgress(
    etpId: string,
    generateDto: GenerateSectionDto,
    userId: string,
    organizationId: string,
    progressService: SectionProgressService,
  ): Observable<SseMessageEvent> {
    const jobId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `Starting SSE generation ${generateDto.type} for ETP ${etpId} (job: ${jobId})`,
    );

    // Create progress stream
    const progressStream = progressService.createProgressStream(jobId);

    // Execute generation in background, emitting progress
    this.executeGenerationWithProgress(
      etpId,
      generateDto,
      userId,
      organizationId,
      jobId,
      progressService,
    ).catch((error) => {
      progressService.errorStream(jobId, error);
    });

    return progressStream;
  }

  /**
   * Executes the section generation pipeline with progress callbacks.
   *
   * @private
   */
  private async executeGenerationWithProgress(
    etpId: string,
    generateDto: GenerateSectionDto,
    userId: string,
    organizationId: string,
    jobId: string,
    progressService: SectionProgressService,
  ): Promise<void> {
    try {
      // Phase 1: Validation and setup (0-10%)
      progressService.emitProgress(jobId, {
        phase: 'sanitization',
        step: 1,
        totalSteps: 5,
        message: 'Validando dados de entrada...',
        percentage: 5,
        timestamp: Date.now(),
      });

      // Verify ETP exists and user has access
      const etp = await this.etpsService.findOneMinimal(
        etpId,
        organizationId,
        userId,
      );

      if (!etp) {
        throw new NotFoundException(`ETP ${etpId} não encontrado`);
      }

      // Check if section already exists
      const existingSection = await this.sectionsRepository.findOne({
        where: { etpId, type: generateDto.type },
      });

      if (existingSection) {
        throw new BadRequestException(
          `Seção do tipo ${generateDto.type} já existe. Use PATCH para atualizar.`,
        );
      }

      progressService.emitProgress(jobId, {
        phase: 'sanitization',
        step: 1,
        totalSteps: 5,
        message: 'Preparando geração de conteúdo...',
        percentage: 10,
        timestamp: Date.now(),
      });

      // Create section entity with GENERATING status
      const section = this.sectionsRepository.create({
        etpId,
        type: generateDto.type,
        title: generateDto.title,
        userInput: generateDto.userInput,
        status: SectionStatus.GENERATING,
        order: await this.getNextOrder(etpId),
        isRequired: this.isRequiredSection(generateDto.type),
        metadata: { jobId, startedAt: new Date().toISOString() },
      });

      let savedSection: EtpSection;
      try {
        savedSection = await this.sectionsRepository.save(section);
      } catch (error) {
        // Handle PostgreSQL unique violation (race condition)
        if ((error as { code?: string }).code === '23505') {
          const existing = await this.sectionsRepository.findOne({
            where: { etpId, type: generateDto.type },
          });
          if (existing) {
            this.logger.warn(
              `Section ${generateDto.type} already exists for ETP ${etpId}, returning existing via SSE`,
            );
            // Complete the stream with existing section
            progressService.emitProgress(jobId, {
              phase: 'complete',
              step: 5,
              totalSteps: 5,
              message: 'Seção já existe, retornando existente.',
              percentage: 100,
              timestamp: Date.now(),
            });
            progressService.completeStream(jobId);
            return;
          }
        }
        throw error;
      }

      // Phase 2: Generate content with progress callbacks
      const generationResult =
        await this.orchestratorService.generateSectionWithProgress(
          {
            sectionType: generateDto.type,
            title: generateDto.title,
            userInput: generateDto.userInput || '',
            context: generateDto.context,
            etpData: {
              objeto: etp.objeto,
              metadata: etp.metadata,
            },
          },
          (event: ProgressEvent) => {
            progressService.emitProgress(jobId, event);
          },
        );

      // Phase 5: Save and complete (95-100%)
      progressService.emitProgress(jobId, {
        phase: 'complete',
        step: 5,
        totalSteps: 5,
        message: 'Salvando resultado...',
        percentage: 95,
        timestamp: Date.now(),
      });

      savedSection.content = generationResult.content;
      savedSection.status = SectionStatus.GENERATED;
      savedSection.metadata = {
        ...savedSection.metadata,
        ...generationResult.metadata,
        warnings: generationResult.warnings,
        completedAt: new Date().toISOString(),
      };
      savedSection.validationResults = this.convertValidationResults(
        generationResult.validationResults,
      );

      await this.sectionsRepository.save(savedSection);

      // Update ETP completion percentage
      await this.etpsService.updateCompletionPercentage(etpId, organizationId);

      // Emit final complete event with section data
      progressService.emitProgress(jobId, {
        phase: 'complete',
        step: 5,
        totalSteps: 5,
        message: 'Seção gerada com sucesso!',
        percentage: 100,
        timestamp: Date.now(),
        details: {
          agents: generationResult.metadata.agentsUsed,
          enrichmentSource: generationResult.metadata.enrichmentSource,
        },
      });

      // Complete the stream
      progressService.completeStream(jobId);

      this.logger.log(`SSE generation completed for job ${jobId}`);
    } catch (error) {
      this.logger.error(
        `SSE generation failed for job ${jobId}: ${error.message}`,
      );
      progressService.errorStream(jobId, error);
      throw error;
    }
  }

  /**
   * Retrieves the status of an async section generation job.
   *
   * @remarks
   * This method queries BullMQ to get real-time status of a section generation job.
   * It provides progress tracking, completion status, and error information.
   *
   * Status flow:
   * - waiting: Job is queued but not yet processing
   * - active: Job is currently being processed
   * - completed: Job finished successfully
   * - failed: Job failed after all retry attempts
   * - delayed: Job is delayed (rate limiting or backoff)
   * - unknown: Job not found or expired
   *
   * @param jobId - BullMQ job identifier (returned from generateSection)
   * @returns Job status with progress, result, and metadata
   * @throws {NotFoundException} If job not found in queue
   * @see #186 - Async queue processing
   * @see #391 - Job Status API
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    this.logger.log(`Fetching status for job ${jobId}`);

    try {
      const job = await this.sectionsQueue.getJob(jobId);

      if (!job) {
        this.logger.warn(`Job ${jobId} not found in queue`);
        throw new NotFoundException(
          `Job ${jobId} não encontrado ou já expirou`,
        );
      }

      const state = await job.getState();
      const progress = job.progress as number;

      // Build base response
      const response: JobStatusResponse = {
        jobId: job.id ?? jobId,
        status: this.mapJobState(state),
        progress: typeof progress === 'number' ? progress : 0,
        createdAt: new Date(job.timestamp),
        attemptsMade: job.attemptsMade,
        attemptsMax: job.opts?.attempts || 3,
      };

      // Add processedOn if job started processing
      if (job.processedOn) {
        response.processedOn = new Date(job.processedOn);
      }

      // Add completion data for completed jobs
      if (state === 'completed') {
        response.completedAt = job.finishedOn
          ? new Date(job.finishedOn)
          : undefined;
        response.result = job.returnvalue as EtpSection;
        response.progress = 100;

        // Extract dataSourceStatus from section metadata (#756)
        const metadata = (
          job.returnvalue as { metadata?: Record<string, unknown> }
        )?.metadata;
        if (metadata?.dataSourceStatus) {
          response.dataSourceStatus =
            metadata.dataSourceStatus as JobStatusResponse['dataSourceStatus'];
        }
      }

      // Add error data for failed jobs
      if (state === 'failed') {
        response.completedAt = job.finishedOn
          ? new Date(job.finishedOn)
          : undefined;
        response.failedReason = job.failedReason;
        response.error = job.failedReason || 'Erro desconhecido';
      }

      this.logger.log(`Job ${jobId} status: ${state} (${progress}% complete)`);

      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error fetching job status for ${jobId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Maps BullMQ job state to our API status format
   */
  private mapJobState(
    state: string,
  ): 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown' {
    const stateMap: Record<string, JobStatusResponse['status']> = {
      waiting: 'waiting',
      'waiting-children': 'waiting',
      active: 'active',
      completed: 'completed',
      failed: 'failed',
      delayed: 'delayed',
      paused: 'waiting',
    };

    return stateMap[state] || 'unknown';
  }

  /**
   * Retrieves all sections for a specific ETP ordered by their sequence.
   *
   * @param etpId - Parent ETP unique identifier
   * @returns Array of sections ordered by the 'order' field (ascending)
   */
  async findAll(etpId: string): Promise<EtpSection[]> {
    return this.sectionsRepository.find({
      where: { etpId },
      order: { order: 'ASC' },
    });
  }

  /**
   * Retrieves a single section by ID with parent ETP relationship loaded.
   *
   * @param id - Section unique identifier
   * @returns Section entity with eager-loaded ETP relationship
   * @throws {NotFoundException} If section not found
   */
  async findOne(id: string): Promise<EtpSection> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: ['etp'],
    });

    if (!section) {
      throw new NotFoundException(`Seção ${id} não encontrada`);
    }

    return section;
  }

  /**
   * Updates an existing section with new data.
   *
   * @remarks
   * Allows manual editing of section fields including content, title, and status.
   * After update, automatically recalculates parent ETP completion percentage
   * to reflect changes in section status.
   *
   * **ACID Transaction (Issue #1064):**
   * Uses a single database transaction to ensure atomicity between section update
   * and ETP completion percentage recalculation. This prevents race conditions
   * where completion could become desynchronized from actual section status.
   *
   * **Security (Issue #758):**
   * Validates organizationId when updating ETP completion to prevent cross-tenant
   * data access.
   *
   * @param id - Section unique identifier
   * @param updateDto - Fields to update (content, title, status, etc.)
   * @param organizationId - Organization ID for tenancy validation
   * @returns Updated section entity
   * @throws {NotFoundException} If section not found
   */
  async update(
    id: string,
    updateDto: UpdateSectionDto,
    organizationId: string,
  ): Promise<EtpSection> {
    const section = await this.findOne(id);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update section within transaction
      Object.assign(section, updateDto);
      const updatedSection = await queryRunner.manager.save(section);

      // Calculate and update ETP completion percentage within same transaction
      // Uses pessimistic_write lock to prevent race conditions (Issue #1057)
      const etp = await queryRunner.manager
        .createQueryBuilder(Etp, 'etp')
        .leftJoinAndSelect('etp.sections', 'sections')
        .where('etp.id = :id', { id: section.etpId })
        .andWhere('etp.organizationId = :organizationId', { organizationId })
        .setLock('pessimistic_write')
        .getOne();

      if (etp) {
        const completedSections = etp.sections.filter(
          (s) => s.status === SectionStatus.APPROVED,
        ).length;
        const totalSections = etp.sections.length;
        const percentage =
          totalSections > 0
            ? Math.round((completedSections / totalSections) * 100)
            : 0;

        await queryRunner.manager.update(Etp, section.etpId, {
          completionPercentage: percentage,
        });
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Section updated: ${id}`);

      return updatedSection;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Regenerates section content using AI orchestration.
   *
   * @remarks
   * Discards existing content and generates fresh content using the same
   * section type, title, and user input from the original section. Useful when:
   * - Previous generation had quality issues
   * - User wants alternative content
   * - Underlying ETP data has changed significantly
   *
   * The section's status is set to GENERATING during the process. If regeneration
   * fails, status reverts to PENDING without overwriting existing content.
   *
   * Adds a 'regeneratedAt' timestamp to metadata for audit trail.
   *
   * @param id - Section unique identifier
   * @param userId - Current user ID for authorization check
   * @returns Regenerated section entity with new content and validation results
   * @throws {NotFoundException} If section or parent ETP not found
   * @throws {ForbiddenException} If user doesn't own the parent ETP
   * @throws {Error} If AI generation fails (section kept with PENDING status)
   */
  async regenerateSection(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<EtpSection> {
    const section = await this.findOne(id);

    // Verify user access (minimal loading - only needs ownership check)
    await this.etpsService.findOneMinimal(
      section.etpId,
      organizationId,
      userId,
    );

    section.status = SectionStatus.GENERATING;
    await this.sectionsRepository.save(section);

    try {
      const generationResult = await this.orchestratorService.generateSection({
        sectionType: section.type,
        title: section.title,
        userInput: section.userInput || '',
        etpData: {
          objeto: section.etp.objeto,
          metadata: section.etp.metadata,
        },
      });

      section.content = generationResult.content;
      section.status = SectionStatus.GENERATED;
      section.metadata = {
        ...generationResult.metadata,
        warnings: generationResult.warnings,
        regeneratedAt: new Date().toISOString(),
      };
      section.validationResults = this.convertValidationResults(
        generationResult.validationResults,
      );

      await this.sectionsRepository.save(section);

      this.logger.log(`Section regenerated successfully: ${id}`);
    } catch (error) {
      this.logger.error(
        `Error regenerating section: ${error.message}`,
        error.stack,
      );

      section.status = SectionStatus.PENDING;
      await this.sectionsRepository.save(section);

      throw error;
    }

    return section;
  }

  /**
   * Validates existing section content against quality and compliance criteria.
   *
   * @remarks
   * Runs OrchestratorService validation on current section content without
   * regenerating it. Useful for:
   * - Re-validating manually edited content
   * - Getting updated quality scores after content changes
   * - Checking if old content meets current standards
   *
   * Validation results are saved to the section entity for persistence and
   * also returned in the response.
   *
   * @param id - Section unique identifier
   * @returns Object containing section entity, validation results, and disclaimer
   * @throws {NotFoundException} If section not found
   * @throws {BadRequestException} If section has no content to validate
   */
  async validateSection(id: string) {
    const section = await this.findOne(id);

    if (!section.content) {
      throw new BadRequestException('Seção não possui conteúdo para validar');
    }

    const validationResults = await this.orchestratorService.validateContent(
      section.content,
      section.type,
    );

    section.validationResults =
      this.convertValidationResults(validationResults);
    await this.sectionsRepository.save(section);

    this.logger.log(`Section validated: ${id}`);

    return {
      section,
      validationResults,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Deletes a section and updates parent ETP completion percentage.
   *
   * @remarks
   * Permanently removes the section from the database. Authorization is
   * verified by checking user ownership of the parent ETP. After deletion,
   * the parent ETP's completion percentage is automatically recalculated.
   *
   * @param id - Section unique identifier
   * @param userId - Current user ID for authorization check
   * @returns Promise that resolves when deletion is complete
   * @throws {NotFoundException} If section or parent ETP not found
   * @throws {ForbiddenException} If user doesn't own the parent ETP
   */
  async remove(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const section = await this.findOne(id);

    // Verify user access (minimal loading - only needs ownership check)
    await this.etpsService.findOneMinimal(
      section.etpId,
      organizationId,
      userId,
    );

    await this.sectionsRepository.remove(section);

    // Update ETP completion percentage with tenancy validation
    await this.etpsService.updateCompletionPercentage(
      section.etpId,
      organizationId,
    );

    this.logger.log(`Section deleted: ${id}`);
  }

  /**
   * Calculates the next sequential order number for a new section.
   *
   * @remarks
   * Uses SERIALIZABLE isolation level to prevent race conditions where
   * concurrent section creations could get the same order number.
   * The FOR UPDATE lock ensures only one transaction can read the max
   * order at a time, preventing duplicates.
   *
   * @see #1065 - Fix race condition in getNextOrder
   *
   * @param etpId - Parent ETP unique identifier
   * @returns Next available order number for section sequencing
   */
  private async getNextOrder(etpId: string): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Use FOR UPDATE to lock rows and prevent concurrent reads
      const maxOrder = await queryRunner.manager
        .createQueryBuilder(EtpSection, 'section')
        .select('MAX(section.order)', 'maxOrder')
        .where('section.etpId = :etpId', { etpId })
        .setLock('pessimistic_write')
        .getRawOne();

      const nextOrder = (maxOrder?.maxOrder || 0) + 1;

      await queryRunner.commitTransaction();
      return nextOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Determines if a section type is mandatory for ETP compliance.
   *
   * @remarks
   * Required sections are defined by Lei 14.133/2021 and internal business rules.
   * These sections must be completed before an ETP can be finalized.
   *
   * @param type - Section type identifier
   * @returns True if section is required, false otherwise
   */
  private isRequiredSection(type: string): boolean {
    const requiredSections = [
      'introducao',
      'justificativa',
      'descricao_solucao',
      'requisitos',
      'estimativa_valor',
    ];

    return requiredSections.includes(type);
  }

  /**
   * Converts OrchestratorService validation results to section entity format.
   *
   * @remarks
   * Transforms the detailed validation results from multiple agents into a
   * simplified structure suitable for storage in the EtpSection entity.
   * Includes runtime type checking and safe defaults for missing data.
   *
   * Aggregates warnings from multiple validation dimensions (legal, clarity,
   * simplification) into a single warnings array.
   *
   * @param validationResults - Raw validation results from OrchestratorService
   * @returns Simplified validation results object with normalized structure
   */
  private convertValidationResults(
    validationResults: OrchestratorValidationResults | unknown,
  ) {
    if (!validationResults || typeof validationResults !== 'object') {
      return {
        legalCompliance: true,
        clarityScore: 0,
        hallucinationCheck: true,
        warnings: [] as string[],
        suggestions: [] as string[],
      };
    }

    // Type assertion after runtime validation - using proper interface type
    // @see #510 - Fix 'any' types remaining in codebase
    const results = validationResults as OrchestratorValidationResults;

    return {
      legalCompliance: results.legal?.isCompliant ?? true,
      clarityScore: results.clareza?.score ?? 0,
      hallucinationCheck: results.antiHallucination?.verified ?? true,
      warnings: [
        ...(results.legal?.issues || []),
        ...(results.clareza?.issues || []),
        ...(results.simplificacao?.simplifiedSuggestions || []),
      ],
      suggestions: results.antiHallucination?.suggestions || [],
    };
  }
}

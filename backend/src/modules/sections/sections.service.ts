import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EtpSection, SectionStatus } from '../../entities/etp-section.entity';
import { Etp } from '../../entities/etp.entity';
import { GenerateSectionDto } from './dto/generate-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { EtpsService } from '../etps/etps.service';
import { DISCLAIMER } from '../../common/constants/messages';

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
 * - Integrates with OrchestratorService for all AI generation and validation
 * - Coordinates with EtpsService for authorization checks and completion tracking
 * - Implements section ordering and required section flagging
 *
 * Generation is currently synchronous but could be moved to a queue-based
 * architecture for better scalability and user experience.
 *
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
    private orchestratorService: OrchestratorService,
    private etpsService: EtpsService,
  ) {}

  /**
   * Generates a new ETP section with AI-powered content.
   *
   * @remarks
   * This method orchestrates the complete section generation workflow:
   * 1. Verifies ETP exists and user has access (via EtpsService)
   * 2. Checks that section type doesn't already exist (prevents duplicates)
   * 3. Creates section entity with GENERATING status
   * 4. Invokes OrchestratorService for AI content generation
   * 5. Updates section with generated content and validation results
   * 6. Recalculates parent ETP completion percentage
   *
   * Generation is synchronous and may take 30-60 seconds. If generation fails,
   * the section status is set to PENDING with error message in content field.
   *
   * Section ordering is automatically managed, and required section flags
   * are set based on section type.
   *
   * @param etpId - Parent ETP unique identifier
   * @param generateDto - Section generation parameters (type, title, user input, context)
   * @param userId - Current user ID for authorization check
   * @returns Created section entity with AI-generated content and metadata
   * @throws {NotFoundException} If parent ETP not found
   * @throws {ForbiddenException} If user doesn't own the ETP
   * @throws {BadRequestException} If section of this type already exists
   * @throws {Error} If AI generation fails (section saved with PENDING status)
   *
   * @example
   * ```ts
   * const section = await sectionsService.generateSection(
   *   'etp-uuid-123',
   *   {
   *     type: 'justificativa',
   *     title: 'Justificativa da Contratação',
   *     userInput: 'Necessidade de modernizar infraestrutura de TI',
   *     context: { department: 'TI' }
   *   },
   *   'user-uuid-456'
   * );
   *
   * console.log(section.status); // 'generated'
   * console.log(section.content); // AI-generated markdown content
   * console.log(section.metadata.warnings); // Validation warnings
   * ```
   */
  async generateSection(
    etpId: string,
    generateDto: GenerateSectionDto,
    userId: string,
  ): Promise<EtpSection> {
    this.logger.log(`Generating section ${generateDto.type} for ETP ${etpId}`);

    // Verify ETP exists and user has access
    const etp = await this.etpsService.findOne(etpId, userId);

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

    // Create section entity with pending status
    const section = this.sectionsRepository.create({
      etpId,
      type: generateDto.type,
      title: generateDto.title,
      userInput: generateDto.userInput,
      status: SectionStatus.GENERATING,
      order: await this.getNextOrder(etpId),
      isRequired: this.isRequiredSection(generateDto.type),
    });

    const savedSection = await this.sectionsRepository.save(section);

    // Generate content asynchronously (in real implementation, this could be a queue job)
    try {
      const generationResult = await this.orchestratorService.generateSection({
        sectionType: generateDto.type,
        title: generateDto.title,
        userInput: generateDto.userInput || '',
        context: generateDto.context,
        etpData: {
          objeto: etp.objeto,
          metadata: etp.metadata,
        },
      });

      // Update section with generated content
      savedSection.content = generationResult.content;
      savedSection.status = SectionStatus.GENERATED;
      savedSection.metadata = {
        ...generationResult.metadata,
        warnings: generationResult.warnings,
      };
      savedSection.validationResults = this.convertValidationResults(
        generationResult.validationResults,
      );

      await this.sectionsRepository.save(savedSection);

      // Update ETP completion percentage
      await this.etpsService.updateCompletionPercentage(etpId);

      this.logger.log(`Section generated successfully: ${savedSection.id}`);
    } catch (error) {
      this.logger.error(
        `Error generating section: ${error.message}`,
        error.stack,
      );

      // Update section with error status
      savedSection.status = SectionStatus.PENDING;
      savedSection.content = `Erro ao gerar conteúdo: ${error.message}`;
      await this.sectionsRepository.save(savedSection);

      throw error;
    }

    return savedSection;
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
   * @param id - Section unique identifier
   * @param updateDto - Fields to update (content, title, status, etc.)
   * @returns Updated section entity
   * @throws {NotFoundException} If section not found
   */
  async update(id: string, updateDto: UpdateSectionDto): Promise<EtpSection> {
    const section = await this.findOne(id);

    Object.assign(section, updateDto);

    const updatedSection = await this.sectionsRepository.save(section);

    // Update ETP completion percentage
    await this.etpsService.updateCompletionPercentage(section.etpId);

    this.logger.log(`Section updated: ${id}`);

    return updatedSection;
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
  async regenerateSection(id: string, userId: string): Promise<EtpSection> {
    const section = await this.findOne(id);

    // Verify user access
    await this.etpsService.findOne(section.etpId, userId);

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
      disclaimer:
        DISCLAIMER,
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
  async remove(id: string, userId: string): Promise<void> {
    const section = await this.findOne(id);

    // Verify user access
    await this.etpsService.findOne(section.etpId, userId);

    await this.sectionsRepository.remove(section);

    // Update ETP completion percentage
    await this.etpsService.updateCompletionPercentage(section.etpId);

    this.logger.log(`Section deleted: ${id}`);
  }

  /**
   * Calculates the next sequential order number for a new section.
   *
   * @remarks
   * Queries the database to find the maximum order value among existing
   * sections for the given ETP, then returns that value + 1. If no sections
   * exist, returns 1.
   *
   * @param etpId - Parent ETP unique identifier
   * @returns Next available order number for section sequencing
   */
  private async getNextOrder(etpId: string): Promise<number> {
    const maxOrder = await this.sectionsRepository
      .createQueryBuilder('section')
      .select('MAX(section.order)', 'maxOrder')
      .where('section.etpId = :etpId', { etpId })
      .getRawOne();

    return (maxOrder?.maxOrder || 0) + 1;
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
  private convertValidationResults(validationResults: unknown) {
    if (!validationResults || typeof validationResults !== 'object') {
      return {
        legalCompliance: true,
        clarityScore: 0,
        hallucinationCheck: true,
        warnings: [],
        suggestions: [],
      };
    }

    // Type assertion after runtime validation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = validationResults as any;

    return {
      legalCompliance: results.legal?.isCompliant ?? true,
      clarityScore: results.clareza?.score ?? 0,
      hallucinationCheck: results.antiHallucination?.isPassing ?? true,
      warnings: [
        ...(results.legal?.issues || []),
        ...(results.clareza?.issues || []),
        ...(results.simplificacao?.suggestions || []),
      ],
      suggestions: results.antiHallucination?.recommendations || [],
    };
  }
}

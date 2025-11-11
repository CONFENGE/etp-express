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

  async findAll(etpId: string): Promise<EtpSection[]> {
    return this.sectionsRepository.find({
      where: { etpId },
      order: { order: 'ASC' },
    });
  }

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

  async update(id: string, updateDto: UpdateSectionDto): Promise<EtpSection> {
    const section = await this.findOne(id);

    Object.assign(section, updateDto);

    const updatedSection = await this.sectionsRepository.save(section);

    // Update ETP completion percentage
    await this.etpsService.updateCompletionPercentage(section.etpId);

    this.logger.log(`Section updated: ${id}`);

    return updatedSection;
  }

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
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  async remove(id: string, userId: string): Promise<void> {
    const section = await this.findOne(id);

    // Verify user access
    await this.etpsService.findOne(section.etpId, userId);

    await this.sectionsRepository.remove(section);

    // Update ETP completion percentage
    await this.etpsService.updateCompletionPercentage(section.etpId);

    this.logger.log(`Section deleted: ${id}`);
  }

  private async getNextOrder(etpId: string): Promise<number> {
    const maxOrder = await this.sectionsRepository
      .createQueryBuilder('section')
      .select('MAX(section.order)', 'maxOrder')
      .where('section.etpId = :etpId', { etpId })
      .getRawOne();

    return (maxOrder?.maxOrder || 0) + 1;
  }

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

  private convertValidationResults(validationResults: any) {
    if (!validationResults) {
      return {
        legalCompliance: true,
        clarityScore: 0,
        hallucinationCheck: true,
        warnings: [],
        suggestions: [],
      };
    }

    return {
      legalCompliance: validationResults.legal?.isCompliant ?? true,
      clarityScore: validationResults.clareza?.score ?? 0,
      hallucinationCheck:
        validationResults.antiHallucination?.isPassing ?? true,
      warnings: [
        ...(validationResults.legal?.issues || []),
        ...(validationResults.clareza?.issues || []),
        ...(validationResults.simplificacao?.suggestions || []),
      ],
      suggestions: validationResults.antiHallucination?.recommendations || [],
    };
  }
}

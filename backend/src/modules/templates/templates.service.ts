import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EtpTemplate,
  EtpTemplateType,
} from '../../entities/etp-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

/**
 * Service para gerenciamento de templates de ETP.
 * Issue #1161 - [Templates] Criar modelos pré-configurados por tipo
 */
@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(EtpTemplate)
    private readonly templateRepository: Repository<EtpTemplate>,
  ) {}

  /**
   * Lista todos os templates ativos.
   */
  async findAll(): Promise<EtpTemplate[]> {
    this.logger.debug('Fetching all active templates');
    return this.templateRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Busca um template por ID.
   * @throws NotFoundException se não encontrar
   */
  async findOne(id: string): Promise<EtpTemplate> {
    this.logger.debug(`Fetching template: ${id}`);
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template com ID ${id} não encontrado`);
    }

    return template;
  }

  /**
   * Lista templates por tipo de contratação.
   */
  async findByType(type: EtpTemplateType): Promise<EtpTemplate[]> {
    this.logger.debug(`Fetching templates by type: ${type}`);
    return this.templateRepository.find({
      where: { type, isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Cria um novo template.
   */
  async create(createTemplateDto: CreateTemplateDto): Promise<EtpTemplate> {
    this.logger.log(`Creating template: ${createTemplateDto.name}`);

    const template = this.templateRepository.create({
      ...createTemplateDto,
      optionalFields: createTemplateDto.optionalFields || [],
      prompts: createTemplateDto.prompts || [],
      legalReferences: createTemplateDto.legalReferences || [],
      priceSourcesPreferred: createTemplateDto.priceSourcesPreferred || [],
      isActive: createTemplateDto.isActive ?? true,
    });

    return this.templateRepository.save(template);
  }

  /**
   * Atualiza um template existente.
   * @throws NotFoundException se não encontrar
   */
  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<EtpTemplate> {
    this.logger.log(`Updating template: ${id}`);

    const template = await this.findOne(id);

    Object.assign(template, updateTemplateDto);

    return this.templateRepository.save(template);
  }

  /**
   * Remove (soft delete) um template.
   * Na prática, marca como inativo.
   * @throws NotFoundException se não encontrar
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Removing template: ${id}`);

    const template = await this.findOne(id);
    template.isActive = false;

    await this.templateRepository.save(template);
  }
}

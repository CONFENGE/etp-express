import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TermoReferencia,
  TermoReferenciaStatus,
} from '../../entities/termo-referencia.entity';
import { Etp } from '../../entities/etp.entity';
import { CreateTermoReferenciaDto, UpdateTermoReferenciaDto } from './dto';

/**
 * Service para gerenciamento de Termos de Referencia.
 *
 * Responsabilidades:
 * - CRUD de Termos de Referencia
 * - Validacao de relacionamento com ETP
 * - Isolamento multi-tenant via organizationId
 *
 * Seguranca:
 * - Todas operacoes verificam se o usuario pertence a organizacao do ETP/TR
 * - TR herda organizationId do ETP de origem
 *
 * Issue #1248 - [TR-a] Criar entity TermoReferencia e relacionamentos
 * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
 */
@Injectable()
export class TermoReferenciaService {
  private readonly logger = new Logger(TermoReferenciaService.name);

  constructor(
    @InjectRepository(TermoReferencia)
    private readonly termoReferenciaRepository: Repository<TermoReferencia>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
  ) {}

  /**
   * Cria um novo Termo de Referencia a partir de um ETP.
   *
   * @param dto Dados do TR
   * @param userId ID do usuario criador
   * @param organizationId ID da organizacao do usuario
   * @returns TR criado
   * @throws NotFoundException se ETP nao existir
   * @throws ForbiddenException se ETP pertencer a outra organizacao
   */
  async create(
    dto: CreateTermoReferenciaDto,
    userId: string,
    organizationId: string,
  ): Promise<TermoReferencia> {
    this.logger.log(`Creating TR for ETP ${dto.etpId} by user ${userId}`);

    // Verificar se ETP existe e pertence a organizacao
    const etp = await this.etpRepository.findOne({
      where: { id: dto.etpId },
    });

    if (!etp) {
      throw new NotFoundException(`ETP with ID ${dto.etpId} not found`);
    }

    if (etp.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have permission to create TR for this ETP',
      );
    }

    const termoReferencia = this.termoReferenciaRepository.create({
      ...dto,
      organizationId,
      createdById: userId,
      status: TermoReferenciaStatus.DRAFT,
      versao: 1,
    });

    const saved = await this.termoReferenciaRepository.save(termoReferencia);
    this.logger.log(`TR ${saved.id} created successfully`);

    return saved;
  }

  /**
   * Busca todos os TRs de uma organizacao.
   *
   * @param organizationId ID da organizacao
   * @returns Lista de TRs
   */
  async findAllByOrganization(
    organizationId: string,
  ): Promise<TermoReferencia[]> {
    return this.termoReferenciaRepository.find({
      where: { organizationId },
      relations: ['etp', 'createdBy'],
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Busca TRs de um ETP especifico.
   *
   * @param etpId ID do ETP
   * @param organizationId ID da organizacao para validacao
   * @returns Lista de TRs do ETP
   */
  async findByEtp(
    etpId: string,
    organizationId: string,
  ): Promise<TermoReferencia[]> {
    return this.termoReferenciaRepository.find({
      where: { etpId, organizationId },
      relations: ['createdBy'],
      order: { versao: 'DESC' },
    });
  }

  /**
   * Busca um TR por ID.
   *
   * @param id ID do TR
   * @param organizationId ID da organizacao para validacao
   * @returns TR encontrado
   * @throws NotFoundException se TR nao existir
   * @throws ForbiddenException se TR pertencer a outra organizacao
   */
  async findOne(id: string, organizationId: string): Promise<TermoReferencia> {
    const termoReferencia = await this.termoReferenciaRepository.findOne({
      where: { id },
      relations: ['etp', 'createdBy', 'organization'],
    });

    if (!termoReferencia) {
      throw new NotFoundException(`TermoReferencia with ID ${id} not found`);
    }

    if (termoReferencia.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have permission to access this TR',
      );
    }

    return termoReferencia;
  }

  /**
   * Atualiza um TR existente.
   *
   * @param id ID do TR
   * @param dto Dados para atualizacao
   * @param organizationId ID da organizacao para validacao
   * @returns TR atualizado
   */
  async update(
    id: string,
    dto: UpdateTermoReferenciaDto,
    organizationId: string,
  ): Promise<TermoReferencia> {
    const termoReferencia = await this.findOne(id, organizationId);

    Object.assign(termoReferencia, dto);

    const saved = await this.termoReferenciaRepository.save(termoReferencia);
    this.logger.log(`TR ${id} updated successfully`);

    return saved;
  }

  /**
   * Remove um TR.
   *
   * @param id ID do TR
   * @param organizationId ID da organizacao para validacao
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const termoReferencia = await this.findOne(id, organizationId);

    await this.termoReferenciaRepository.remove(termoReferencia);
    this.logger.log(`TR ${id} removed successfully`);
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PesquisaPrecos,
  PesquisaPrecosStatus,
  ItemPesquisado,
} from '../../entities/pesquisa-precos.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import { CreatePesquisaPrecosDto, UpdatePesquisaPrecosDto } from './dto';

/**
 * Service para gerenciamento de Pesquisas de Precos.
 *
 * Responsabilidades:
 * - CRUD de Pesquisas de Precos
 * - Calculos estatisticos (media, mediana, menor preco)
 * - Validacao de relacionamento com ETP/TR
 * - Isolamento multi-tenant via organizationId
 *
 * Seguranca:
 * - Todas operacoes verificam se o usuario pertence a organizacao
 * - Pesquisa herda organizationId do usuario
 *
 * @see IN SEGES/ME n 65/2021 - Pesquisa de precos para contratacoes
 * @see Issue #1255 - [Pesquisa-a] Criar entity PesquisaPrecos
 * Parent: #1254 - [Pesquisa] Modulo de Pesquisa de Precos - EPIC
 */
@Injectable()
export class PesquisaPrecosService {
  private readonly logger = new Logger(PesquisaPrecosService.name);

  constructor(
    @InjectRepository(PesquisaPrecos)
    private readonly pesquisaPrecosRepository: Repository<PesquisaPrecos>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
    @InjectRepository(TermoReferencia)
    private readonly termoReferenciaRepository: Repository<TermoReferencia>,
  ) {}

  /**
   * Cria uma nova Pesquisa de Precos.
   *
   * @param dto Dados da pesquisa
   * @param userId ID do usuario criador
   * @param organizationId ID da organizacao do usuario
   * @returns Pesquisa criada
   * @throws NotFoundException se ETP/TR vinculado nao existir
   * @throws ForbiddenException se ETP/TR pertencer a outra organizacao
   */
  async create(
    dto: CreatePesquisaPrecosDto,
    userId: string,
    organizationId: string,
  ): Promise<PesquisaPrecos> {
    this.logger.log(`Creating price research: ${dto.titulo} by user ${userId}`);

    // Validar ETP se fornecido
    if (dto.etpId) {
      const etp = await this.etpRepository.findOne({
        where: { id: dto.etpId },
      });

      if (!etp) {
        throw new NotFoundException(`ETP with ID ${dto.etpId} not found`);
      }

      if (etp.organizationId !== organizationId) {
        throw new ForbiddenException(
          'You do not have permission to link this ETP',
        );
      }
    }

    // Validar TR se fornecido
    if (dto.termoReferenciaId) {
      const tr = await this.termoReferenciaRepository.findOne({
        where: { id: dto.termoReferenciaId },
      });

      if (!tr) {
        throw new NotFoundException(
          `Termo de Referencia with ID ${dto.termoReferenciaId} not found`,
        );
      }

      if (tr.organizationId !== organizationId) {
        throw new ForbiddenException(
          'You do not have permission to link this Termo de Referencia',
        );
      }
    }

    // Calcular estatisticas se itens forem fornecidos
    let calculatedStats = {};
    if (dto.itens && dto.itens.length > 0) {
      calculatedStats = this.calculateStatistics(dto.itens as ItemPesquisado[]);
    }

    const pesquisaPrecos = this.pesquisaPrecosRepository.create({
      ...dto,
      ...calculatedStats,
      organizationId,
      createdById: userId,
      status: PesquisaPrecosStatus.DRAFT,
      versao: 1,
    });

    const saved = await this.pesquisaPrecosRepository.save(pesquisaPrecos);
    this.logger.log(`Price research ${saved.id} created successfully`);

    return saved;
  }

  /**
   * Lista pesquisas de precos de uma organizacao.
   *
   * @param organizationId ID da organizacao
   * @param etpId Filtro opcional por ETP
   * @param termoReferenciaId Filtro opcional por TR
   * @param status Filtro opcional por status
   * @returns Lista de pesquisas
   */
  async findAll(
    organizationId: string,
    etpId?: string,
    termoReferenciaId?: string,
    status?: PesquisaPrecosStatus,
  ): Promise<PesquisaPrecos[]> {
    const whereClause: Record<string, unknown> = { organizationId };

    if (etpId) {
      whereClause.etpId = etpId;
    }

    if (termoReferenciaId) {
      whereClause.termoReferenciaId = termoReferenciaId;
    }

    if (status) {
      whereClause.status = status;
    }

    return this.pesquisaPrecosRepository.find({
      where: whereClause,
      relations: ['createdBy', 'etp', 'termoReferencia'],
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Busca uma pesquisa de precos por ID.
   *
   * @param id ID da pesquisa
   * @param organizationId ID da organizacao (para validacao)
   * @returns Pesquisa encontrada
   * @throws NotFoundException se pesquisa nao existir
   * @throws ForbiddenException se pesquisa pertencer a outra organizacao
   */
  async findOne(id: string, organizationId: string): Promise<PesquisaPrecos> {
    const pesquisa = await this.pesquisaPrecosRepository.findOne({
      where: { id },
      relations: ['createdBy', 'etp', 'termoReferencia', 'organization'],
    });

    if (!pesquisa) {
      throw new NotFoundException(`Price research with ID ${id} not found`);
    }

    if (pesquisa.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have permission to access this price research',
      );
    }

    return pesquisa;
  }

  /**
   * Atualiza uma pesquisa de precos.
   *
   * @param id ID da pesquisa
   * @param dto Dados para atualizacao
   * @param organizationId ID da organizacao (para validacao)
   * @returns Pesquisa atualizada
   */
  async update(
    id: string,
    dto: UpdatePesquisaPrecosDto,
    organizationId: string,
  ): Promise<PesquisaPrecos> {
    const pesquisa = await this.findOne(id, organizationId);

    // Recalcular estatisticas se itens foram atualizados
    let calculatedStats = {};
    if (dto.itens && dto.itens.length > 0) {
      calculatedStats = this.calculateStatistics(dto.itens as ItemPesquisado[]);
    }

    Object.assign(pesquisa, dto, calculatedStats);

    const updated = await this.pesquisaPrecosRepository.save(pesquisa);
    this.logger.log(`Price research ${id} updated successfully`);

    return updated;
  }

  /**
   * Remove uma pesquisa de precos.
   *
   * @param id ID da pesquisa
   * @param organizationId ID da organizacao (para validacao)
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const pesquisa = await this.findOne(id, organizationId);

    await this.pesquisaPrecosRepository.remove(pesquisa);
    this.logger.log(`Price research ${id} removed successfully`);
  }

  /**
   * Calcula estatisticas dos itens pesquisados.
   *
   * @param itens Lista de itens com precos
   * @returns Estatisticas calculadas
   */
  calculateStatistics(itens: ItemPesquisado[]): {
    valorTotalEstimado: number;
    mediaGeral: number;
    medianaGeral: number;
    menorPrecoTotal: number;
    coeficienteVariacao: number;
  } {
    let valorTotalEstimado = 0;
    const todosPrecos: number[] = [];
    let menorPrecoTotal = 0;

    for (const item of itens) {
      if (item.precos && item.precos.length > 0) {
        const precos = item.precos.map((p) => p.valor);
        todosPrecos.push(...precos);

        // Calcular estatisticas do item
        const mediaItem = this.calculateMean(precos);
        const medianaItem = this.calculateMedian(precos);
        const menorItem = Math.min(...precos);

        item.media = mediaItem;
        item.mediana = medianaItem;
        item.menorPreco = menorItem;

        // Usar preco adotado ou mediana para total
        const precoAdotado = item.precoAdotado || medianaItem;
        valorTotalEstimado += precoAdotado * item.quantidade;
        menorPrecoTotal += menorItem * item.quantidade;
      }
    }

    const mediaGeral =
      todosPrecos.length > 0 ? this.calculateMean(todosPrecos) : 0;
    const medianaGeral =
      todosPrecos.length > 0 ? this.calculateMedian(todosPrecos) : 0;
    const coeficienteVariacao =
      todosPrecos.length > 0
        ? this.calculateCoefficientOfVariation(todosPrecos)
        : 0;

    return {
      valorTotalEstimado: Math.round(valorTotalEstimado * 100) / 100,
      mediaGeral: Math.round(mediaGeral * 100) / 100,
      medianaGeral: Math.round(medianaGeral * 100) / 100,
      menorPrecoTotal: Math.round(menorPrecoTotal * 100) / 100,
      coeficienteVariacao: Math.round(coeficienteVariacao * 100) / 100,
    };
  }

  /**
   * Calcula a media de um array de numeros.
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calcula a mediana de um array de numeros.
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  /**
   * Calcula o coeficiente de variacao (%).
   * CV = (desvio padrao / media) * 100
   */
  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = this.calculateMean(values);
    if (mean === 0) return 0;

    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    const stdDev = Math.sqrt(avgSquaredDiff);

    return (stdDev / mean) * 100;
  }
}

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
  MetodologiaPesquisa,
  FonteConsultada,
} from '../../entities/pesquisa-precos.entity';
import { Etp } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import {
  CreatePesquisaPrecosDto,
  UpdatePesquisaPrecosDto,
  ColetarPrecosDto,
  ItemParaPesquisaDto,
  ColetaPrecosResultDto,
  ItemColetaResultDto,
  MapaComparativoDto,
  ItemMapaComparativoDto,
  PrecoFonteMapaDto,
  ResumoMapaComparativoDto,
  GerarMapaComparativoResponseDto,
} from './dto';
import { SinapiService } from '../gov-api/sinapi/sinapi.service';
import { SicroService } from '../gov-api/sicro/sicro.service';
import { PncpService } from '../gov-api/pncp/pncp.service';
import { PriceAggregationService } from '../gov-api/price-aggregation/price-aggregation.service';
import {
  GovApiPriceReference,
  GovApiContract,
  GovApiSource,
} from '../gov-api/interfaces/gov-api.interface';

/**
 * Resultado da coleta de precos para um item.
 *
 * @see Issue #1412 - [Pesquisa-b1] Integrar PriceAggregation no PesquisaPrecosService
 */
export interface ColetaResult {
  /** Item pesquisado com precos coletados */
  item: ItemPesquisado;
  /** Fontes consultadas com sucesso */
  fontesConsultadas: FonteConsultada[];
  /** Total de fontes que retornaram precos */
  totalFontes: number;
  /** Nivel de confianca baseado em fontes e variancia */
  confianca: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Metodologia sugerida baseada nas fontes */
  metodologiaSugerida: MetodologiaPesquisa;
  /** Duracao da coleta em ms */
  duracaoMs: number;
}

/**
 * Opcoes para coleta de precos.
 */
export interface ColetaOptions {
  /** UF para filtrar precos (default: 'DF') */
  uf?: string;
  /** Excluir outliers na agregacao (default: true) */
  excluirOutliers?: boolean;
  /** Timeout por fonte em ms (default: 10000) */
  timeoutMs?: number;
}

/**
 * Service para gerenciamento de Pesquisas de Precos.
 *
 * Responsabilidades:
 * - CRUD de Pesquisas de Precos
 * - Calculos estatisticos (media, mediana, menor preco)
 * - Validacao de relacionamento com ETP/TR
 * - Isolamento multi-tenant via organizationId
 * - Coleta automatica de precos multi-fonte (#1412)
 *
 * Seguranca:
 * - Todas operacoes verificam se o usuario pertence a organizacao
 * - Pesquisa herda organizationId do usuario
 *
 * @see IN SEGES/ME n 65/2021 - Pesquisa de precos para contratacoes
 * @see Issue #1255 - [Pesquisa-a] Criar entity PesquisaPrecos
 * @see Issue #1412 - [Pesquisa-b1] Integrar PriceAggregation no PesquisaPrecosService
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
    private readonly sinapiService: SinapiService,
    private readonly sicroService: SicroService,
    private readonly pncpService: PncpService,
    private readonly priceAggregationService: PriceAggregationService,
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

  // ============================================
  // Coleta Automatica de Precos (#1412)
  // ============================================

  /**
   * Coleta precos de multiplas fontes governamentais para um item.
   *
   * Fontes consultadas (ordem de prioridade conforme IN 65/2021):
   * 1. SINAPI - Tabela de precos de construcao civil
   * 2. SICRO - Tabela de precos de infraestrutura rodoviaria
   * 3. PNCP - Contratos publicos similares
   *
   * @param itemDescricao Descricao do item para pesquisa
   * @param quantidade Quantidade estimada do item
   * @param unidade Unidade de medida do item
   * @param options Opcoes de coleta
   * @returns Resultado da coleta com item, fontes e confianca
   *
   * @example
   * ```typescript
   * const result = await service.coletarPrecos(
   *   'cimento portland cp-ii 50kg',
   *   100,
   *   'SC',
   *   { uf: 'DF' }
   * );
   * ```
   *
   * @see Issue #1412 - [Pesquisa-b1] Integrar PriceAggregation no PesquisaPrecosService
   */
  async coletarPrecos(
    itemDescricao: string,
    quantidade: number,
    unidade: string,
    options: ColetaOptions = {},
  ): Promise<ColetaResult> {
    const startTime = Date.now();
    const { uf = 'DF', excluirOutliers = true, timeoutMs = 10000 } = options;

    this.logger.log(
      `Iniciando coleta de precos para: "${itemDescricao}" (${quantidade} ${unidade})`,
    );

    // Buscar precos de cada fonte em paralelo com timeout
    const [sinapiResult, sicroResult, pncpResult] = await Promise.allSettled([
      this.fetchWithTimeout(
        () => this.sinapiService.search(itemDescricao, { uf }),
        timeoutMs,
        'SINAPI',
      ),
      this.fetchWithTimeout(
        () => this.sicroService.search(itemDescricao, { uf }),
        timeoutMs,
        'SICRO',
      ),
      this.fetchWithTimeout(
        () => this.pncpService.search(itemDescricao, { uf }),
        timeoutMs,
        'PNCP',
      ),
    ]);

    // Extrair precos de cada fonte
    const sinapiPrices = this.extractPriceReferences(sinapiResult, 'sinapi');
    const sicroPrices = this.extractPriceReferences(sicroResult, 'sicro');
    const contractPrices = this.extractContracts(pncpResult);

    // Registrar fontes consultadas
    const fontesConsultadas = this.buildFontesConsultadas(
      sinapiResult,
      sicroResult,
      pncpResult,
    );

    this.logger.debug(
      `Precos encontrados: SINAPI=${sinapiPrices.length}, SICRO=${sicroPrices.length}, PNCP=${contractPrices.length}`,
    );

    // Agregar precos usando PriceAggregationService
    const aggregationResult = this.priceAggregationService.aggregatePrices(
      itemDescricao,
      sinapiPrices,
      sicroPrices,
      contractPrices,
      { excludeOutliers: excluirOutliers },
    );

    // Converter para formato ItemPesquisado
    const item = this.buildItemPesquisado(
      itemDescricao,
      quantidade,
      unidade,
      aggregationResult,
    );

    // Determinar metodologia baseada nas fontes
    const metodologiaSugerida = this.determinarMetodologia(fontesConsultadas);

    const duracaoMs = Date.now() - startTime;
    this.logger.log(
      `Coleta concluida em ${duracaoMs}ms: ${fontesConsultadas.length} fontes, confianca: ${aggregationResult.overallConfidence}`,
    );

    return {
      item,
      fontesConsultadas,
      totalFontes: fontesConsultadas.length,
      confianca: aggregationResult.overallConfidence,
      metodologiaSugerida,
      duracaoMs,
    };
  }

  /**
   * Executa uma funcao async com timeout.
   */
  private async fetchWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    sourceName: string,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(`Timeout: ${sourceName} demorou mais de ${timeoutMs}ms`),
          ),
        timeoutMs,
      ),
    );

    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * Extrai referencias de preco de resultado SINAPI/SICRO.
   */
  private extractPriceReferences(
    result: PromiseSettledResult<unknown>,
    source: GovApiSource,
  ): GovApiPriceReference[] {
    if (result.status === 'rejected') {
      this.logger.warn(
        `Falha ao buscar ${source.toUpperCase()}: ${result.reason}`,
      );
      return [];
    }

    const response = result.value as { data?: GovApiPriceReference[] };
    if (!response?.data || !Array.isArray(response.data)) {
      return [];
    }

    return response.data.filter(
      (item): item is GovApiPriceReference =>
        item !== null &&
        typeof item === 'object' &&
        'precoUnitario' in item &&
        typeof item.precoUnitario === 'number',
    );
  }

  /**
   * Extrai contratos de resultado PNCP.
   */
  private extractContracts(
    result: PromiseSettledResult<unknown>,
  ): GovApiContract[] {
    if (result.status === 'rejected') {
      this.logger.warn(`Falha ao buscar PNCP: ${result.reason}`);
      return [];
    }

    const response = result.value as { data?: GovApiContract[] };
    if (!response?.data || !Array.isArray(response.data)) {
      return [];
    }

    return response.data.filter(
      (item): item is GovApiContract =>
        item !== null &&
        typeof item === 'object' &&
        'valorTotal' in item &&
        typeof item.valorTotal === 'number',
    );
  }

  /**
   * Constroi lista de fontes consultadas.
   */
  private buildFontesConsultadas(
    sinapiResult: PromiseSettledResult<unknown>,
    sicroResult: PromiseSettledResult<unknown>,
    pncpResult: PromiseSettledResult<unknown>,
  ): FonteConsultada[] {
    const fontes: FonteConsultada[] = [];
    const now = new Date().toISOString();

    if (sinapiResult.status === 'fulfilled') {
      fontes.push({
        tipo: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
        nome: 'SINAPI - Sistema Nacional de Pesquisa de Custos',
        dataConsulta: now,
        referencia: 'https://www.caixa.gov.br/sinapi',
        observacoes: 'Tabela de precos de construcao civil',
      });
    }

    if (sicroResult.status === 'fulfilled') {
      fontes.push({
        tipo: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
        nome: 'SICRO - Sistema de Custos Referenciais de Obras',
        dataConsulta: now,
        referencia: 'https://www.gov.br/dnit/sicro',
        observacoes: 'Tabela de precos de infraestrutura rodoviaria',
      });
    }

    if (pncpResult.status === 'fulfilled') {
      fontes.push({
        tipo: MetodologiaPesquisa.CONTRATACOES_SIMILARES,
        nome: 'PNCP - Portal Nacional de Contratacoes Publicas',
        dataConsulta: now,
        referencia: 'https://pncp.gov.br',
        observacoes: 'Contratos publicos similares',
      });
    }

    return fontes;
  }

  /**
   * Constroi ItemPesquisado a partir do resultado da agregacao.
   */
  private buildItemPesquisado(
    descricao: string,
    quantidade: number,
    unidade: string,
    aggregation: ReturnType<PriceAggregationService['aggregatePrices']>,
  ): ItemPesquisado {
    const precos: ItemPesquisado['precos'] = [];

    // Converter agregacoes em precos
    for (const agg of aggregation.aggregations) {
      for (const source of agg.sources) {
        precos.push({
          fonte: this.getSourceDisplayName(source.source),
          valor: source.price,
          data:
            source.date instanceof Date
              ? source.date.toISOString()
              : String(source.date),
          observacao: source.reference,
        });
      }
    }

    // Calcular estatisticas
    const valores = precos.map((p) => p.valor);
    const media = valores.length > 0 ? this.calculateMean(valores) : 0;
    const mediana = valores.length > 0 ? this.calculateMedian(valores) : 0;
    const menorPreco = valores.length > 0 ? Math.min(...valores) : 0;

    return {
      descricao,
      quantidade,
      unidade,
      precos,
      media: Math.round(media * 100) / 100,
      mediana: Math.round(mediana * 100) / 100,
      menorPreco: Math.round(menorPreco * 100) / 100,
      precoAdotado: Math.round(mediana * 100) / 100, // Adotar mediana por padrao
      justificativaPreco: aggregation.methodologySummary,
    };
  }

  /**
   * Determina a metodologia baseada nas fontes consultadas.
   * Segue ordem de preferencia da IN 65/2021.
   */
  private determinarMetodologia(
    fontes: FonteConsultada[],
  ): MetodologiaPesquisa {
    // Verificar tipos de fontes disponiveis
    const tipos = fontes.map((f) => f.tipo);

    // Ordem de preferencia conforme Art. 5 da IN 65/2021
    if (tipos.includes(MetodologiaPesquisa.PAINEL_PRECOS)) {
      return MetodologiaPesquisa.PAINEL_PRECOS;
    }
    if (tipos.includes(MetodologiaPesquisa.CONTRATACOES_SIMILARES)) {
      return MetodologiaPesquisa.CONTRATACOES_SIMILARES;
    }
    if (tipos.includes(MetodologiaPesquisa.MIDIA_ESPECIALIZADA)) {
      return MetodologiaPesquisa.MIDIA_ESPECIALIZADA;
    }
    if (tipos.includes(MetodologiaPesquisa.SITES_ELETRONICOS)) {
      return MetodologiaPesquisa.SITES_ELETRONICOS;
    }
    if (tipos.includes(MetodologiaPesquisa.PESQUISA_FORNECEDORES)) {
      return MetodologiaPesquisa.PESQUISA_FORNECEDORES;
    }

    // Default: midia especializada (SINAPI/SICRO)
    return MetodologiaPesquisa.MIDIA_ESPECIALIZADA;
  }

  /**
   * Retorna nome de exibicao para fonte.
   */
  private getSourceDisplayName(source: GovApiSource): string {
    const names: Record<GovApiSource, string> = {
      pncp: 'PNCP',
      comprasgov: 'Compras.gov.br',
      sinapi: 'SINAPI',
      sicro: 'SICRO',
    };
    return names[source] || source.toUpperCase();
  }

  // ============================================
  // Coleta de Precos para Pesquisa (#1415)
  // ============================================

  /**
   * Coleta precos de multiplas fontes para uma pesquisa existente.
   *
   * Este endpoint aciona a coleta automatica de precos para todos os itens
   * fornecidos, consultando SINAPI, SICRO e PNCP em paralelo.
   *
   * Comportamento:
   * 1. Valida que a pesquisa existe e pertence a organizacao
   * 2. Para cada item, coleta precos de ate 3 fontes (SINAPI, SICRO, PNCP)
   * 3. Aplica timeout configuravel (default 30s por fonte)
   * 4. Continua coleta se uma fonte falhar (fallback resiliente)
   * 5. Atualiza a pesquisa com os novos itens coletados
   * 6. Recalcula estatisticas consolidadas
   *
   * @param pesquisaId ID da pesquisa de precos
   * @param dto Dados dos itens e opcoes de coleta
   * @param organizationId ID da organizacao (para validacao)
   * @returns Resultado da coleta com itens, fontes e estatisticas
   *
   * @throws NotFoundException se pesquisa nao existir
   * @throws ForbiddenException se pesquisa pertencer a outra organizacao
   *
   * @example
   * ```typescript
   * const result = await service.coletarPrecosParaPesquisa(
   *   'pesquisa-uuid',
   *   {
   *     itens: [
   *       { descricao: 'Cimento CP-II 50kg', quantidade: 100, unidade: 'SC' },
   *       { descricao: 'Areia lavada m3', quantidade: 50, unidade: 'M3' }
   *     ],
   *     options: { uf: 'DF', timeoutMs: 30000 }
   *   },
   *   'org-uuid'
   * );
   * ```
   *
   * @see Issue #1415 - [Pesquisa-b4] Endpoint e testes de integracao para coleta multi-fonte
   */
  async coletarPrecosParaPesquisa(
    pesquisaId: string,
    dto: ColetarPrecosDto,
    organizationId: string,
  ): Promise<ColetaPrecosResultDto> {
    const startTime = Date.now();

    this.logger.log(
      `Iniciando coleta de precos para pesquisa ${pesquisaId} (${dto.itens.length} itens)`,
    );

    // 1. Validar que a pesquisa existe e pertence a organizacao
    const pesquisa = await this.findOne(pesquisaId, organizationId);

    // 2. Configurar opcoes de coleta com defaults
    const options = {
      uf: dto.options?.uf || 'DF',
      excluirOutliers: dto.options?.excluirOutliers ?? true,
      timeoutMs: dto.options?.timeoutMs || 30000,
    };

    // 3. Coletar precos para cada item em paralelo
    const resultados: ItemColetaResultDto[] = [];
    const coletaPromises = dto.itens.map((item) =>
      this.coletarPrecosComFallback(item, options),
    );

    const coletaResults = await Promise.allSettled(coletaPromises);

    for (let i = 0; i < coletaResults.length; i++) {
      const result = coletaResults[i];
      if (result.status === 'fulfilled') {
        resultados.push(result.value);
      } else {
        // Em caso de falha total, criar item vazio com indicador de falha
        this.logger.warn(
          `Falha ao coletar precos para item "${dto.itens[i].descricao}": ${result.reason}`,
        );
        resultados.push({
          item: {
            descricao: dto.itens[i].descricao,
            quantidade: dto.itens[i].quantidade,
            unidade: dto.itens[i].unidade,
            codigo: dto.itens[i].codigo,
            precos: [],
            media: 0,
            mediana: 0,
            menorPreco: 0,
          },
          fontesConsultadas: [],
          totalFontes: 0,
          confianca: 'LOW',
          metodologiaSugerida: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
          duracaoMs: 0,
        });
      }
    }

    // 4. Consolidar fontes unicas
    const fontesMap = new Map<string, FonteConsultada>();
    for (const resultado of resultados) {
      for (const fonte of resultado.fontesConsultadas) {
        const key = `${fonte.tipo}-${fonte.nome}`;
        if (!fontesMap.has(key)) {
          fontesMap.set(key, fonte);
        }
      }
    }
    const fontesConsolidadas = Array.from(fontesMap.values());

    // 5. Calcular confianca geral
    const confiancaGeral = this.calcularConfiancaGeral(resultados);

    // 6. Atualizar pesquisa com novos itens
    const itensAtualizados: ItemPesquisado[] = [
      ...(pesquisa.itens || []),
      ...resultados.map((r) => r.item),
    ];

    // 7. Atualizar fontes consultadas
    const fontesAtualizadas: FonteConsultada[] = [
      ...(pesquisa.fontesConsultadas || []),
      ...fontesConsolidadas,
    ];

    // 8. Determinar metodologia principal baseada nas fontes
    const metodologia = this.determinarMetodologia(fontesAtualizadas);

    // 9. Salvar pesquisa atualizada
    const pesquisaAtualizada = await this.update(
      pesquisaId,
      {
        itens: itensAtualizados,
        fontesConsultadas: fontesAtualizadas,
        metodologia,
        metodologiasComplementares: this.extrairMetodologiasComplementares(
          fontesAtualizadas,
          metodologia,
        ),
      },
      organizationId,
    );

    const duracaoTotalMs = Date.now() - startTime;
    const itensComPrecos = resultados.filter(
      (r) => r.item.precos.length > 0,
    ).length;

    this.logger.log(
      `Coleta concluida em ${duracaoTotalMs}ms: ${itensComPrecos}/${dto.itens.length} itens com precos, confianca: ${confiancaGeral}`,
    );

    return {
      pesquisaId,
      resultados,
      totalItens: dto.itens.length,
      itensComPrecos,
      fontesConsolidadas,
      confiancaGeral,
      duracaoTotalMs,
      pesquisaAtualizada: !!pesquisaAtualizada,
    };
  }

  /**
   * Coleta precos para um item com fallback em caso de falha.
   */
  private async coletarPrecosComFallback(
    item: ItemParaPesquisaDto,
    options: ColetaOptions,
  ): Promise<ItemColetaResultDto> {
    try {
      const result = await this.coletarPrecos(
        item.descricao,
        item.quantidade,
        item.unidade,
        options,
      );

      // Adicionar codigo se fornecido
      if (item.codigo) {
        result.item.codigo = item.codigo;
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Erro ao coletar precos para "${item.descricao}": ${error.message}`,
      );

      // Retornar item vazio em caso de falha total
      return {
        item: {
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          codigo: item.codigo,
          precos: [],
          media: 0,
          mediana: 0,
          menorPreco: 0,
        },
        fontesConsultadas: [],
        totalFontes: 0,
        confianca: 'LOW',
        metodologiaSugerida: MetodologiaPesquisa.MIDIA_ESPECIALIZADA,
        duracaoMs: 0,
      };
    }
  }

  /**
   * Calcula confianca geral baseada nos resultados individuais.
   */
  private calcularConfiancaGeral(
    resultados: ItemColetaResultDto[],
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (resultados.length === 0) return 'LOW';

    const confiancaValues = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const totalScore = resultados.reduce(
      (sum, r) => sum + confiancaValues[r.confianca],
      0,
    );
    const avgScore = totalScore / resultados.length;

    if (avgScore >= 2.5) return 'HIGH';
    if (avgScore >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Extrai metodologias complementares das fontes.
   */
  private extrairMetodologiasComplementares(
    fontes: FonteConsultada[],
    metodologiaPrincipal: MetodologiaPesquisa,
  ): MetodologiaPesquisa[] {
    const tipos = [...new Set(fontes.map((f) => f.tipo))];
    return tipos.filter((t) => t !== metodologiaPrincipal);
  }

  // ============================================
  // Mapa Comparativo de Precos (#1257)
  // ============================================

  /**
   * Gera mapa comparativo de precos para uma pesquisa.
   *
   * O mapa comparativo apresenta:
   * - Tabela com todos os itens e precos de cada fonte
   * - Calculos estatisticos: media, mediana, menor preco, desvio padrao
   * - Identificacao de outliers (> 2 desvios padrao)
   * - Preco sugerido (mediana por padrao)
   * - Resumo com totais consolidados
   *
   * @param pesquisaId ID da pesquisa de precos
   * @param organizationId ID da organizacao (para validacao)
   * @returns Mapa comparativo gerado e pesquisa atualizada
   *
   * @throws NotFoundException se pesquisa nao existir
   * @throws ForbiddenException se pesquisa pertencer a outra organizacao
   *
   * @example
   * ```typescript
   * const result = await service.gerarMapaComparativo(
   *   'pesquisa-uuid',
   *   'org-uuid'
   * );
   * console.log(result.mapaComparativo.resumo.valorTotalEstimado);
   * ```
   *
   * @see Issue #1257 - [Pesquisa-c] Gerar mapa comparativo de precos
   */
  async gerarMapaComparativo(
    pesquisaId: string,
    organizationId: string,
  ): Promise<GerarMapaComparativoResponseDto> {
    const startTime = Date.now();

    this.logger.log(`Gerando mapa comparativo para pesquisa ${pesquisaId}`);

    // 1. Buscar pesquisa e validar acesso
    const pesquisa = await this.findOne(pesquisaId, organizationId);

    if (!pesquisa.itens || pesquisa.itens.length === 0) {
      this.logger.warn(
        `Pesquisa ${pesquisaId} nao possui itens para gerar mapa comparativo`,
      );
      // Retornar mapa vazio mas valido
      const mapaVazio = this.criarMapaVazio();
      return {
        pesquisaId,
        mapaComparativo: mapaVazio,
        pesquisaAtualizada: false,
        duracaoMs: Date.now() - startTime,
      };
    }

    // 2. Extrair nomes unicos das fontes
    const fontesUnicas = this.extrairFontesUnicas(pesquisa.itens);

    // 3. Gerar itens do mapa com calculos estatisticos
    const itensDoMapa = this.gerarItensMapaComparativo(pesquisa.itens);

    // 4. Gerar resumo consolidado
    const resumo = this.gerarResumoMapaComparativo(itensDoMapa, fontesUnicas);

    // 5. Montar mapa comparativo completo
    const mapaComparativo: MapaComparativoDto = {
      itens: itensDoMapa,
      resumo,
      metodologia: this.gerarDescricaoMetodologia(pesquisa),
      referenciaLegal: 'IN SEGES/ME n 65/2021 e Lei 14.133/2021',
    };

    // 6. Salvar mapa na pesquisa
    await this.update(
      pesquisaId,
      {
        mapaComparativo: mapaComparativo as unknown as Record<string, unknown>,
      },
      organizationId,
    );

    const duracaoMs = Date.now() - startTime;
    this.logger.log(
      `Mapa comparativo gerado em ${duracaoMs}ms: ${itensDoMapa.length} itens, valor total: R$ ${resumo.valorTotalEstimado.toFixed(2)}`,
    );

    return {
      pesquisaId,
      mapaComparativo,
      pesquisaAtualizada: true,
      duracaoMs,
    };
  }

  /**
   * Extrai nomes unicos das fontes dos itens.
   */
  private extrairFontesUnicas(itens: ItemPesquisado[]): string[] {
    const fontesSet = new Set<string>();
    for (const item of itens) {
      if (item.precos) {
        for (const preco of item.precos) {
          fontesSet.add(preco.fonte);
        }
      }
    }
    return Array.from(fontesSet).sort();
  }

  /**
   * Gera itens do mapa comparativo com calculos estatisticos.
   */
  private gerarItensMapaComparativo(
    itens: ItemPesquisado[],
  ): ItemMapaComparativoDto[] {
    return itens.map((item) => this.calcularItemMapa(item));
  }

  /**
   * Calcula estatisticas para um item do mapa.
   */
  private calcularItemMapa(item: ItemPesquisado): ItemMapaComparativoDto {
    const precos = item.precos || [];
    const valores = precos.map((p) => p.valor).filter((v) => v > 0);

    // Estatisticas basicas
    const { media, mediana, menorPreco, maiorPreco, desvioPadrao, cv } =
      this.calcularEstatisticasCompletas(valores);

    // Identificar outliers (> 2 desvios padrao)
    const limiteInferior = media - 2 * desvioPadrao;
    const limiteSuperior = media + 2 * desvioPadrao;

    const fontesComOutliers: PrecoFonteMapaDto[] = precos.map((p) => ({
      fonte: p.fonte,
      valor: p.valor,
      data: p.data,
      isOutlier:
        desvioPadrao > 0 &&
        (p.valor < limiteInferior || p.valor > limiteSuperior),
    }));

    const outliersExcluidos = fontesComOutliers.filter(
      (f) => f.isOutlier,
    ).length;

    // Recalcular media excluindo outliers
    const valoresSemOutliers = fontesComOutliers
      .filter((f) => !f.isOutlier)
      .map((f) => f.valor);

    const mediaSemOutliers =
      valoresSemOutliers.length > 0
        ? this.calculateMean(valoresSemOutliers)
        : media;

    // Preco adotado: usar o da pesquisa ou mediana
    const precoAdotado = item.precoAdotado || mediana || mediaSemOutliers;

    // Justificativa do preco adotado
    const justificativa =
      item.justificativaPreco ||
      this.gerarJustificativaPreco(precoAdotado, media, mediana, menorPreco);

    return {
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      fontes: fontesComOutliers,
      media: Math.round(mediaSemOutliers * 100) / 100,
      mediana: Math.round(mediana * 100) / 100,
      menorPreco: Math.round(menorPreco * 100) / 100,
      maiorPreco: Math.round(maiorPreco * 100) / 100,
      desvioPadrao: Math.round(desvioPadrao * 100) / 100,
      coeficienteVariacao: Math.round(cv * 100) / 100,
      precoAdotado: Math.round(precoAdotado * 100) / 100,
      justificativa,
      valorTotal: Math.round(precoAdotado * item.quantidade * 100) / 100,
      quantidadeFontes: valores.length,
      outliersExcluidos,
    };
  }

  /**
   * Calcula estatisticas completas para um conjunto de valores.
   */
  private calcularEstatisticasCompletas(valores: number[]): {
    media: number;
    mediana: number;
    menorPreco: number;
    maiorPreco: number;
    desvioPadrao: number;
    cv: number;
  } {
    if (valores.length === 0) {
      return {
        media: 0,
        mediana: 0,
        menorPreco: 0,
        maiorPreco: 0,
        desvioPadrao: 0,
        cv: 0,
      };
    }

    const sorted = [...valores].sort((a, b) => a - b);
    const media = this.calculateMean(valores);
    const mediana = this.calculateMedian(valores);
    const menorPreco = sorted[0];
    const maiorPreco = sorted[sorted.length - 1];

    // Desvio padrao
    const squaredDiffs = valores.map((val) => Math.pow(val - media, 2));
    const avgSquaredDiff =
      squaredDiffs.reduce((acc, val) => acc + val, 0) / valores.length;
    const desvioPadrao = Math.sqrt(avgSquaredDiff);

    // Coeficiente de variacao (%)
    const cv = media > 0 ? (desvioPadrao / media) * 100 : 0;

    return { media, mediana, menorPreco, maiorPreco, desvioPadrao, cv };
  }

  /**
   * Gera justificativa automatica para o preco adotado.
   */
  private gerarJustificativaPreco(
    precoAdotado: number,
    media: number,
    mediana: number,
    menorPreco: number,
  ): string {
    const tolerancia = 0.01; // 1% de tolerancia para comparacao

    if (Math.abs(precoAdotado - mediana) / mediana < tolerancia) {
      return 'Adotada a mediana dos precos pesquisados conforme recomendacao da IN SEGES/ME n 65/2021, Art. 6, como valor de referencia mais representativo do mercado.';
    }

    if (Math.abs(precoAdotado - media) / media < tolerancia) {
      return 'Adotada a media aritmetica dos precos pesquisados, pois a dispersao de valores e baixa (CV < 25%).';
    }

    if (Math.abs(precoAdotado - menorPreco) / menorPreco < tolerancia) {
      return 'Adotado o menor preco encontrado na pesquisa, observada sua viabilidade e consistencia com o mercado.';
    }

    return 'Preco adotado com base na analise dos valores pesquisados e criterios de aceitabilidade definidos.';
  }

  /**
   * Gera resumo consolidado do mapa comparativo.
   */
  private gerarResumoMapaComparativo(
    itens: ItemMapaComparativoDto[],
    fontes: string[],
  ): ResumoMapaComparativoDto {
    const valorTotalEstimado = itens.reduce(
      (sum, item) => sum + item.valorTotal,
      0,
    );

    const menorValorTotal = itens.reduce(
      (sum, item) => sum + item.menorPreco * item.quantidade,
      0,
    );

    const economiaPotencial = valorTotalEstimado - menorValorTotal;

    // Media geral ponderada pela quantidade
    const totalQuantidade = itens.reduce(
      (sum, item) => sum + item.quantidade,
      0,
    );
    const mediaGeral =
      totalQuantidade > 0 ? valorTotalEstimado / totalQuantidade : 0;

    // CV geral: media dos CVs ponderada
    const cvPonderado =
      itens.length > 0
        ? itens.reduce((sum, item) => sum + item.coeficienteVariacao, 0) /
          itens.length
        : 0;

    return {
      totalItens: itens.length,
      totalFontes: fontes.length,
      fontes,
      valorTotalEstimado: Math.round(valorTotalEstimado * 100) / 100,
      menorValorTotal: Math.round(menorValorTotal * 100) / 100,
      economiaPotencial: Math.round(economiaPotencial * 100) / 100,
      mediaGeral: Math.round(mediaGeral * 100) / 100,
      coeficienteVariacaoGeral: Math.round(cvPonderado * 100) / 100,
      dataGeracao: new Date().toISOString(),
      versao: 1,
    };
  }

  /**
   * Gera descricao da metodologia aplicada.
   */
  private gerarDescricaoMetodologia(pesquisa: PesquisaPrecos): string {
    const metodologias: string[] = [];

    if (pesquisa.metodologia) {
      metodologias.push(this.getMetodologiaDisplayName(pesquisa.metodologia));
    }

    if (pesquisa.metodologiasComplementares) {
      for (const m of pesquisa.metodologiasComplementares) {
        metodologias.push(this.getMetodologiaDisplayName(m));
      }
    }

    const metodologiasStr =
      metodologias.length > 0 ? metodologias.join(', ') : 'Midia especializada';

    return (
      `Pesquisa de precos realizada utilizando ${metodologiasStr}. ` +
      `Calculos efetuados com base na mediana dos precos coletados, ` +
      `excluindo valores discrepantes (outliers superiores a 2 desvios padrao). ` +
      `Conforme IN SEGES/ME n 65/2021 e Lei 14.133/2021.`
    );
  }

  /**
   * Retorna nome de exibicao da metodologia.
   */
  private getMetodologiaDisplayName(metodologia: MetodologiaPesquisa): string {
    const names: Record<MetodologiaPesquisa, string> = {
      [MetodologiaPesquisa.PAINEL_PRECOS]: 'Painel de Precos',
      [MetodologiaPesquisa.CONTRATACOES_SIMILARES]: 'Contratacoes Similares',
      [MetodologiaPesquisa.MIDIA_ESPECIALIZADA]: 'Midia Especializada',
      [MetodologiaPesquisa.SITES_ELETRONICOS]: 'Sites Eletronicos',
      [MetodologiaPesquisa.PESQUISA_FORNECEDORES]: 'Pesquisa de Fornecedores',
      [MetodologiaPesquisa.NOTAS_FISCAIS]: 'Notas Fiscais',
    };
    return names[metodologia] || metodologia;
  }

  /**
   * Cria mapa comparativo vazio (para pesquisas sem itens).
   */
  private criarMapaVazio(): MapaComparativoDto {
    return {
      itens: [],
      resumo: {
        totalItens: 0,
        totalFontes: 0,
        fontes: [],
        valorTotalEstimado: 0,
        menorValorTotal: 0,
        economiaPotencial: 0,
        mediaGeral: 0,
        coeficienteVariacaoGeral: 0,
        dataGeracao: new Date().toISOString(),
        versao: 1,
      },
      metodologia: 'Nenhum item pesquisado',
      referenciaLegal: 'IN SEGES/ME n 65/2021 e Lei 14.133/2021',
    };
  }
}

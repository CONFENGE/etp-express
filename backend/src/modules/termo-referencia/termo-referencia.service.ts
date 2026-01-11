import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TermoReferencia,
  TermoReferenciaStatus,
} from '../../entities/termo-referencia.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import {
  CreateTermoReferenciaDto,
  UpdateTermoReferenciaDto,
  GenerateTrResponseDto,
} from './dto';
import { OpenAIService, LLMResponse } from '../orchestrator/llm/openai.service';

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
    private readonly openAIService: OpenAIService,
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

  /**
   * Gera um Termo de Referencia automaticamente a partir de um ETP aprovado.
   *
   * O processo inclui:
   * 1. Validacao de que o ETP existe e pertence a organizacao
   * 2. Validacao de que o ETP esta com status 'completed' (aprovado)
   * 3. Mapeamento de campos do ETP para estrutura do TR
   * 4. Enriquecimento de textos via IA (justificativa, especificacoes)
   * 5. Criacao do TR vinculado ao ETP
   *
   * @param etpId ID do ETP de origem
   * @param userId ID do usuario criador
   * @param organizationId ID da organizacao do usuario
   * @returns TR gerado com metadados de processamento
   * @throws NotFoundException se ETP nao existir
   * @throws ForbiddenException se ETP pertencer a outra organizacao
   * @throws BadRequestException se ETP nao estiver aprovado
   *
   * Issue #1249 - [TR-b] Implementar geracao automatica TR a partir do ETP
   * Parent: #1247 - [TR] Modulo de Termo de Referencia - EPIC
   */
  async generateFromEtp(
    etpId: string,
    userId: string,
    organizationId: string,
  ): Promise<GenerateTrResponseDto> {
    const startTime = Date.now();
    this.logger.log(
      `Generating TR from ETP ${etpId} by user ${userId} in org ${organizationId}`,
    );

    // 1. Buscar ETP com validacao de existencia
    const etp = await this.etpRepository.findOne({
      where: { id: etpId },
      relations: ['organization', 'template'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${etpId} nao encontrado`);
    }

    // 2. Validar organizacao (multi-tenancy)
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `IDOR attempt: Org ${organizationId} tried to generate TR from ETP ${etpId} of org ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Voce nao tem permissao para gerar TR a partir deste ETP',
      );
    }

    // 3. Validar status do ETP (deve estar aprovado/completed)
    const allowedStatuses = [EtpStatus.COMPLETED, EtpStatus.REVIEW];
    if (!allowedStatuses.includes(etp.status)) {
      throw new BadRequestException(
        `O ETP deve estar com status 'completed' ou 'review' para gerar TR. Status atual: ${etp.status}`,
      );
    }

    // 4. Mapear campos do ETP para TR
    const trData = this.mapEtpToTr(etp);

    // 5. Enriquecer textos com IA
    let aiResponse: LLMResponse | null = null;
    let aiEnhanced = false;
    try {
      const enhancedContent = await this.enhanceWithAI(etp, trData);
      Object.assign(trData, enhancedContent);
      aiEnhanced = true;
      aiResponse = enhancedContent._aiResponse || null;
      delete trData._aiResponse;
    } catch (error) {
      this.logger.warn(
        `AI enhancement failed for TR generation from ETP ${etpId}, proceeding with basic mapping`,
        error,
      );
      // Continua sem enriquecimento de IA
    }

    // 6. Criar TR no banco de dados
    const termoReferencia = this.termoReferenciaRepository.create({
      ...trData,
      etpId,
      organizationId,
      createdById: userId,
      status: TermoReferenciaStatus.DRAFT,
      versao: 1,
    });

    const saved = await this.termoReferenciaRepository.save(termoReferencia);
    const latencyMs = Date.now() - startTime;

    this.logger.log(
      `TR ${saved.id} generated from ETP ${etpId} in ${latencyMs}ms (AI enhanced: ${aiEnhanced})`,
    );

    // 7. Montar resposta com metadados
    return {
      id: saved.id,
      etpId: saved.etpId,
      objeto: saved.objeto,
      fundamentacaoLegal: saved.fundamentacaoLegal,
      descricaoSolucao: saved.descricaoSolucao,
      requisitosContratacao: saved.requisitosContratacao,
      modeloExecucao: saved.modeloExecucao,
      modeloGestao: saved.modeloGestao,
      criteriosSelecao: saved.criteriosSelecao,
      valorEstimado: saved.valorEstimado,
      dotacaoOrcamentaria: saved.dotacaoOrcamentaria,
      prazoVigencia: saved.prazoVigencia,
      obrigacoesContratante: saved.obrigacoesContratante,
      obrigacoesContratada: saved.obrigacoesContratada,
      sancoesPenalidades: saved.sancoesPenalidades,
      status: saved.status,
      versao: saved.versao,
      createdAt: saved.createdAt,
      metadata: {
        tokens: aiResponse?.tokens,
        model: aiResponse?.model,
        latencyMs,
        aiEnhanced,
      },
    };
  }

  /**
   * Mapeia campos do ETP para estrutura do TR.
   * Realiza conversao basica sem enriquecimento de IA.
   */
  private mapEtpToTr(
    etp: Etp,
  ): Partial<TermoReferencia> & { _aiResponse?: LLMResponse } {
    return {
      // Objeto - mantido do ETP
      objeto: etp.objeto || etp.title,

      // Descricao da solucao - combina descricoes do ETP
      descricaoSolucao: this.combineTexts([
        etp.descricaoDetalhada,
        etp.description,
        etp.beneficiosEsperados,
      ]),

      // Requisitos - combina requisitos tecnicos e de qualificacao
      requisitosContratacao: this.combineTexts([
        etp.requisitosTecnicos,
        etp.requisitosQualificacao,
        etp.criteriosSustentabilidade,
      ]),

      // Valores financeiros
      valorEstimado: etp.valorEstimado,
      dotacaoOrcamentaria: etp.dotacaoOrcamentaria,

      // Prazo de vigencia (converte de prazoExecucao)
      prazoVigencia: etp.prazoExecucao,

      // Fundamentacao legal padrao
      fundamentacaoLegal: this.generateFundamentacaoLegal(etp),

      // Modelo de execucao baseado no tipo de template
      modeloExecucao: this.determineModeloExecucao(etp),

      // Criterios de selecao padrao
      criteriosSelecao:
        'Menor preco global, conforme art. 33 da Lei 14.133/2021.',

      // Garantia contratual
      garantiaContratual: etp.garantiaExigida,

      // Especificacoes tecnicas (se houver campos dinamicos)
      especificacoesTecnicas: etp.dynamicFields
        ? { ...etp.dynamicFields }
        : undefined,
    };
  }

  /**
   * Enriquece o conteudo do TR usando IA.
   * Gera textos mais elaborados para campos importantes.
   */
  private async enhanceWithAI(
    etp: Etp,
    baseData: Partial<TermoReferencia>,
  ): Promise<Partial<TermoReferencia> & { _aiResponse?: LLMResponse }> {
    const systemPrompt = `Voce e um especialista em contratacoes publicas brasileiras.
Sua tarefa e enriquecer um Termo de Referencia (TR) baseado em um Estudo Tecnico Preliminar (ETP).

Regras:
- Use linguagem tecnica e formal adequada a documentos oficiais
- Cite a Lei 14.133/2021 quando apropriado
- Seja objetivo e direto
- Nao invente informacoes - use apenas os dados fornecidos
- Responda APENAS em formato JSON valido

Formato de resposta obrigatorio (JSON):
{
  "obrigacoesContratante": "texto das obrigacoes do orgao contratante",
  "obrigacoesContratada": "texto das obrigacoes do fornecedor",
  "modeloGestao": "texto do modelo de gestao do contrato",
  "sancoesPenalidades": "texto das sancoes e penalidades"
}`;

    const userPrompt = `Enriqueça o Termo de Referencia baseado neste ETP:

DADOS DO ETP:
- Titulo: ${etp.title}
- Objeto: ${etp.objeto}
- Descricao: ${etp.description || 'Nao informado'}
- Justificativa: ${etp.justificativaContratacao || 'Nao informado'}
- Necessidade: ${etp.necessidadeAtendida || 'Nao informado'}
- Valor Estimado: R$ ${etp.valorEstimado?.toLocaleString('pt-BR') || 'Nao informado'}
- Prazo de Execucao: ${etp.prazoExecucao ? etp.prazoExecucao + ' dias' : 'Nao informado'}
- Nivel de Risco: ${etp.nivelRisco || 'Nao informado'}
- Riscos Identificados: ${etp.descricaoRiscos || 'Nao informado'}
- Tipo de Contratacao: ${etp.templateType || 'Geral'}

DADOS BASE DO TR:
- Objeto: ${baseData.objeto}
- Requisitos: ${baseData.requisitosContratacao || 'Nao informado'}
- Modelo de Execucao: ${baseData.modeloExecucao || 'Nao informado'}

Gere os campos faltantes em formato JSON.`;

    const response = await this.openAIService.generateCompletion({
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      maxTokens: 2000,
      model: 'gpt-4.1-nano',
    });

    // Parse da resposta JSON
    let enhanced: Partial<TermoReferencia> = {};
    try {
      // Remove possivel markdown code block
      let content = response.content.trim();
      if (content.startsWith('```json')) {
        content = content.slice(7);
      }
      if (content.startsWith('```')) {
        content = content.slice(3);
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3);
      }
      content = content.trim();

      enhanced = JSON.parse(content);
    } catch (parseError) {
      this.logger.warn(
        'Failed to parse AI response as JSON, using raw content',
        parseError,
      );
      // Se nao conseguir parsear, usa valores padrao
      enhanced = {
        obrigacoesContratante: this.getDefaultObrigacoesContratante(),
        obrigacoesContratada: this.getDefaultObrigacoesContratada(),
        modeloGestao: this.getDefaultModeloGestao(),
        sancoesPenalidades: this.getDefaultSancoesPenalidades(),
      };
    }

    return {
      ...enhanced,
      _aiResponse: response,
    };
  }

  /**
   * Combina multiplos textos em um unico paragrafo.
   */
  private combineTexts(texts: (string | undefined | null)[]): string {
    return texts
      .filter((t): t is string => t != null && t.trim().length > 0)
      .join('\n\n');
  }

  /**
   * Gera fundamentacao legal padrao baseada no tipo de contratacao.
   */
  private generateFundamentacaoLegal(etp: Etp): string {
    const baseLegal =
      'Lei 14.133/2021 (Nova Lei de Licitacoes e Contratos Administrativos)';

    const templateReferences: Record<string, string> = {
      TI: `${baseLegal}; IN SEGES/ME n 94/2022 (Contratacoes de TI)`,
      OBRAS: `${baseLegal}; IN SEGES/ME n 5/2017 (Execucao de Obras)`,
      SERVICOS: `${baseLegal}; IN SEGES/ME n 5/2017 (Prestacao de Servicos)`,
      MATERIAIS: `${baseLegal}; Decreto n 11.462/2023 (Aquisicao de Bens)`,
    };

    return templateReferences[etp.templateType || ''] || baseLegal;
  }

  /**
   * Determina o modelo de execucao baseado no tipo de contratacao.
   */
  private determineModeloExecucao(etp: Etp): string {
    const modelos: Record<string, string> = {
      TI: 'Execucao indireta, sob regime de empreitada por preco global, com entregas parciais conforme cronograma acordado.',
      OBRAS:
        'Execucao indireta, sob regime de empreitada por preco unitario, conforme projeto basico aprovado.',
      SERVICOS:
        'Execucao continuada, com dedicacao exclusiva de mao de obra, conforme produtividade minima estabelecida.',
      MATERIAIS:
        'Fornecimento parcelado, conforme demanda do orgao contratante, mediante ordem de fornecimento.',
    };

    return (
      modelos[etp.templateType || ''] ||
      'Execucao conforme especificacoes tecnicas do objeto, mediante acompanhamento e fiscalizacao do contratante.'
    );
  }

  /**
   * Retorna texto padrao de obrigacoes do contratante.
   */
  private getDefaultObrigacoesContratante(): string {
    return `a) Efetuar o pagamento conforme estabelecido no contrato;
b) Designar gestor e fiscal para acompanhamento da execucao;
c) Fornecer as informacoes necessarias a execucao do objeto;
d) Comunicar a contratada sobre irregularidades observadas;
e) Rejeitar, no todo ou em parte, os bens ou servicos em desacordo com as especificacoes.`;
  }

  /**
   * Retorna texto padrao de obrigacoes da contratada.
   */
  private getDefaultObrigacoesContratada(): string {
    return `a) Executar o objeto conforme especificacoes tecnicas e prazos estabelecidos;
b) Manter preposto aceito pela Administracao para representa-la;
c) Comunicar qualquer anormalidade que interfira na execucao;
d) Reparar, corrigir ou substituir, as suas expensas, o objeto em desacordo;
e) Manter sigilo sobre informacoes obtidas em razao do contrato;
f) Cumprir as normas de seguranca e medicina do trabalho.`;
  }

  /**
   * Retorna texto padrao de modelo de gestao.
   */
  private getDefaultModeloGestao(): string {
    return `O contrato sera gerido por servidor designado pelo ordenador de despesas, com atribuicoes de:
a) Acompanhar e fiscalizar a execucao contratual;
b) Anotar em registro proprio as ocorrencias relacionadas;
c) Determinar providencias para regularizacao de faltas;
d) Atestar as faturas para fins de pagamento;
e) Emitir parecer tecnico sobre aditamentos e prorrogacoes.`;
  }

  /**
   * Retorna texto padrao de sancoes e penalidades.
   */
  private getDefaultSancoesPenalidades(): string {
    return `Conforme art. 155 da Lei 14.133/2021, o contratado estara sujeito as seguintes sancoes:
a) Advertencia, por escrito, para faltas leves;
b) Multa de 0,5% a 30% do valor do contrato, conforme gravidade;
c) Impedimento de licitar e contratar por ate 3 anos;
d) Declaracao de inidoneidade, nos casos de fraude comprovada.

A aplicacao das sancoes nao exclui a responsabilidade civil e criminal.`;
  }
}

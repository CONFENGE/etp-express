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
  Edital,
  EditalStatus,
  EditalModalidade,
  EditalCriterioJulgamento,
  EditalModoDisputa,
} from '../../entities/edital.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { TermoReferencia } from '../../entities/termo-referencia.entity';
import {
  PesquisaPrecos,
  PesquisaPrecosStatus,
} from '../../entities/pesquisa-precos.entity';
import { EditalTemplate } from '../../entities/edital-template.entity';
import { OpenAIService, LLMResponse } from '../orchestrator/llm/openai.service';
import { GenerateEditalDto, GenerateEditalResponseDto } from './dto';

/**
 * Service para geração automática de Editais.
 *
 * Responsabilidades:
 * - Compilar dados de ETP, TR e PesquisaPrecos em Edital completo
 * - Mapear campos entre documentos fonte e Edital
 * - Enriquecer cláusulas com IA
 * - Validar documentos fonte antes de gerar
 *
 * Issue #1279 - [Edital-c] Geração automática a partir de ETP+TR+Pesquisa
 * Milestone: M14 - Geração de Edital
 */
@Injectable()
export class EditalGenerationService {
  private readonly logger = new Logger(EditalGenerationService.name);

  constructor(
    @InjectRepository(Edital)
    private readonly editalRepository: Repository<Edital>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
    @InjectRepository(TermoReferencia)
    private readonly termoReferenciaRepository: Repository<TermoReferencia>,
    @InjectRepository(PesquisaPrecos)
    private readonly pesquisaPrecosRepository: Repository<PesquisaPrecos>,
    @InjectRepository(EditalTemplate)
    private readonly editalTemplateRepository: Repository<EditalTemplate>,
    private readonly openAIService: OpenAIService,
  ) {}

  /**
   * Gera um Edital automaticamente a partir de ETP, TR e PesquisaPrecos.
   *
   * Fluxo:
   * 1. Buscar e validar documentos fonte (ETP obrigatório, TR e Pesquisa opcionais)
   * 2. Validar status dos documentos e permissions (multi-tenancy)
   * 3. Buscar template de Edital por modalidade
   * 4. Mapear campos dos documentos fonte para estrutura do Edital
   * 5. Enriquecer cláusulas complementares com IA
   * 6. Criar e persistir Edital
   *
   * @param dto Dados para geração (etpId obrigatório, termoReferenciaId e pesquisaPrecosId opcionais)
   * @param userId ID do usuário criador
   * @param organizationId ID da organização (multi-tenancy)
   * @returns Edital gerado com metadados
   * @throws NotFoundException se ETP não existir
   * @throws ForbiddenException se documentos pertencem a outra organização
   * @throws BadRequestException se ETP não está aprovado ou documentos inválidos
   */
  async generateFromEtp(
    dto: GenerateEditalDto,
    userId: string,
    organizationId: string,
  ): Promise<GenerateEditalResponseDto> {
    const startTime = Date.now();
    this.logger.log(
      `Generating Edital from ETP ${dto.etpId} by user ${userId} in org ${organizationId}`,
    );

    // 1. Buscar e validar ETP (obrigatório)
    const etp = await this.etpRepository.findOne({
      where: { id: dto.etpId },
      relations: ['organization', 'template'],
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${dto.etpId} não encontrado`);
    }

    // 2. Validar organização (multi-tenancy)
    if (etp.organizationId !== organizationId) {
      this.logger.warn(
        `IDOR attempt: Org ${organizationId} tried to generate Edital from ETP ${dto.etpId} of org ${etp.organizationId}`,
      );
      throw new ForbiddenException(
        'Você não tem permissão para gerar Edital a partir deste ETP',
      );
    }

    // 3. Validar status do ETP (deve estar completo ou em revisão)
    const allowedStatuses = [EtpStatus.COMPLETED, EtpStatus.REVIEW];
    if (!allowedStatuses.includes(etp.status)) {
      throw new BadRequestException(
        `O ETP deve estar com status 'completed' ou 'review' para gerar Edital. Status atual: ${etp.status}`,
      );
    }

    // 4. Buscar TR vinculado (opcional)
    let termoReferencia: TermoReferencia | null = null;
    if (dto.termoReferenciaId) {
      termoReferencia = await this.termoReferenciaRepository.findOne({
        where: { id: dto.termoReferenciaId },
      });

      if (!termoReferencia) {
        throw new NotFoundException(
          `Termo de Referência com ID ${dto.termoReferenciaId} não encontrado`,
        );
      }

      if (termoReferencia.organizationId !== organizationId) {
        throw new ForbiddenException(
          'Você não tem permissão para usar este Termo de Referência',
        );
      }

      // Validar se TR pertence ao mesmo ETP
      if (termoReferencia.etpId !== dto.etpId) {
        throw new BadRequestException(
          'O Termo de Referência não pertence ao ETP informado',
        );
      }
    }

    // 5. Buscar Pesquisa de Preços vinculada (opcional)
    let pesquisaPrecos: PesquisaPrecos | null = null;
    if (dto.pesquisaPrecosId) {
      pesquisaPrecos = await this.pesquisaPrecosRepository.findOne({
        where: { id: dto.pesquisaPrecosId },
      });

      if (!pesquisaPrecos) {
        throw new NotFoundException(
          `Pesquisa de Preços com ID ${dto.pesquisaPrecosId} não encontrada`,
        );
      }

      if (pesquisaPrecos.organizationId !== organizationId) {
        throw new ForbiddenException(
          'Você não tem permissão para usar esta Pesquisa de Preços',
        );
      }

      // Validar se Pesquisa foi aprovada
      if (pesquisaPrecos.status !== PesquisaPrecosStatus.APPROVED) {
        throw new BadRequestException(
          `A Pesquisa de Preços deve estar com status 'approved'. Status atual: ${pesquisaPrecos.status}`,
        );
      }
    }

    // 6. Buscar template de Edital (se aplicável)
    const template = await this.getTemplateByModalidade(etp);

    // 7. Mapear campos dos documentos fonte para Edital
    const editalData = this.mapSourceDocumentsToEdital(
      etp,
      termoReferencia,
      pesquisaPrecos,
      template,
    );

    // 8. Gerar número do edital (se não fornecido)
    if (dto.numero) {
      editalData.numero = dto.numero;
    } else {
      editalData.numero = await this.generateEditalNumber(
        etp,
        editalData.modalidade || null,
      );
    }

    // 9. Enriquecer cláusulas complementares com IA
    let aiResponse: LLMResponse | null = null;
    let aiEnhanced = false;
    try {
      const enhancedContent = await this.enhanceWithAI(
        etp,
        termoReferencia,
        pesquisaPrecos,
        editalData,
      );
      Object.assign(editalData, enhancedContent);
      aiEnhanced = true;
      aiResponse = enhancedContent._aiResponse || null;
      delete editalData._aiResponse;
    } catch (error) {
      this.logger.warn(
        `AI enhancement failed for Edital generation from ETP ${dto.etpId}, proceeding with basic mapping`,
        error,
      );
      // Continua sem enriquecimento de IA
    }

    // 10. Criar Edital no banco de dados
    const edital = this.editalRepository.create({
      ...editalData,
      etpId: dto.etpId,
      termoReferenciaId: dto.termoReferenciaId || null,
      pesquisaPrecosId: dto.pesquisaPrecosId || null,
      organizationId,
      createdById: userId,
      status: EditalStatus.DRAFT,
      versao: 1,
    });

    const saved = await this.editalRepository.save(edital);
    const latencyMs = Date.now() - startTime;

    this.logger.log(
      `Edital ${saved.id} generated from ETP ${dto.etpId} in ${latencyMs}ms (AI enhanced: ${aiEnhanced}, template: ${template?.modalidade || 'none'})`,
    );

    // 11. Montar resposta com metadados
    return {
      id: saved.id,
      numero: saved.numero,
      objeto: saved.objeto,
      modalidade: saved.modalidade,
      tipoContratacaoDireta: saved.tipoContratacaoDireta,
      valorEstimado: saved.valorEstimado,
      status: saved.status,
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
   * Busca o template de Edital por modalidade.
   * Infere modalidade a partir do ETP (ex: template type OBRAS → Pregão).
   *
   * @param etp ETP de origem
   * @returns Template encontrado ou null
   */
  private async getTemplateByModalidade(
    _etp: Etp,
  ): Promise<EditalTemplate | null> {
    // Inferir modalidade a partir do template type do ETP
    // OBRAS, TI, SERVICOS → geralmente Pregão
    // Lógica simplificada: usar primeiro template ativo encontrado
    const template = await this.editalTemplateRepository.findOne({
      where: { isActive: true },
    });

    if (template) {
      this.logger.debug(`Found Edital template: ${template.name}`);
    } else {
      this.logger.debug('No active Edital template found');
    }

    return template;
  }

  /**
   * Mapeia campos dos documentos fonte (ETP, TR, PesquisaPrecos) para estrutura do Edital.
   *
   * Mapeamento de campos:
   * - ETP.objeto → Edital.objeto
   * - TR.especificacoesTecnicas → Edital.clausulas (especificações técnicas)
   * - PesquisaPrecos.valorTotalEstimado → Edital.valorEstimado
   * - ETP.prazoExecucao → Edital.prazoVigencia
   * - ETP.dotacaoOrcamentaria → Edital.dotacaoOrcamentaria
   *
   * @param etp ETP obrigatório
   * @param termoReferencia TR opcional
   * @param pesquisaPrecos Pesquisa de Preços opcional
   * @param template Template opcional
   * @returns Dados parciais do Edital
   */
  private mapSourceDocumentsToEdital(
    etp: Etp,
    termoReferencia: TermoReferencia | null,
    pesquisaPrecos: PesquisaPrecos | null,
    template: EditalTemplate | null,
  ): Partial<Edital> & { _aiResponse?: LLMResponse } {
    this.logger.debug('Mapping source documents to Edital structure');

    // Campos base do ETP
    const baseData: Partial<Edital> = {
      // Identificação e objeto
      objeto: etp.objeto || etp.title,
      descricaoObjeto: etp.descricaoDetalhada || etp.description || null,
      numeroProcesso: etp.numeroProcesso || null,

      // Modalidade (inferir a partir do template ou usar padrão)
      modalidade: this.inferModalidade(etp),
      criterioJulgamento: EditalCriterioJulgamento.MENOR_PRECO,
      modoDisputa: EditalModoDisputa.ABERTO,

      // Valores financeiros
      dotacaoOrcamentaria: etp.dotacaoOrcamentaria || null,

      // Prazo de vigência (converter de prazoExecucao)
      prazoVigencia: etp.prazoExecucao || null,

      // Fundamentação legal
      fundamentacaoLegal: this.generateFundamentacaoLegal(),

      // Garantia
      garantiaContratual: etp.garantiaExigida || null,
    };

    // Se houver TR, adicionar especificações técnicas e obrigações
    if (termoReferencia) {
      this.logger.debug('Including Termo de Referência data in Edital');

      baseData.requisitosHabilitacao = termoReferencia.requisitosContratacao
        ? {
            requisitos: termoReferencia.requisitosContratacao,
            especificacoesTecnicas: termoReferencia.especificacoesTecnicas,
          }
        : null;

      // Cláusulas contratuais baseadas no TR
      baseData.clausulas = {
        obrigacoesContratante: termoReferencia.obrigacoesContratante,
        obrigacoesContratada: termoReferencia.obrigacoesContratada,
      };

      baseData.sancoesAdministrativas =
        termoReferencia.sancoesPenalidades || null;
      baseData.condicoesPagamento = termoReferencia.condicoesPagamento || null;
      baseData.localEntrega = termoReferencia.localExecucao || null;
    }

    // Se houver Pesquisa de Preços, adicionar valor estimado
    if (pesquisaPrecos) {
      this.logger.debug('Including Pesquisa de Preços data in Edital');

      baseData.valorEstimado =
        pesquisaPrecos.valorTotalEstimado?.toString() || null;

      // Adicionar referência à pesquisa de preços nas cláusulas
      if (!baseData.clausulas) {
        baseData.clausulas = {};
      }
      baseData.clausulas['fundamentacaoPrecos'] = {
        metodologia: pesquisaPrecos.metodologia,
        justificativa: pesquisaPrecos.justificativaMetodologia,
      };
    }

    // Aplicar valores do template (se disponível)
    if (template) {
      this.logger.debug(`Applying template ${template.name} defaults`);

      // Mapear EditalTemplateModalidade para EditalModalidade
      if (template.modalidade) {
        baseData.modalidade =
          template.modalidade as unknown as EditalModalidade;
      }
    }

    return baseData;
  }

  /**
   * Enriquece cláusulas complementares com IA.
   * Usa OpenAI para gerar cláusulas adicionais com base no contexto.
   *
   * @param etp ETP de origem
   * @param termoReferencia TR opcional
   * @param pesquisaPrecos Pesquisa de Preços opcional
   * @param editalData Dados base do Edital
   * @returns Dados enriquecidos com IA
   */
  private async enhanceWithAI(
    etp: Etp,
    termoReferencia: TermoReferencia | null,
    pesquisaPrecos: PesquisaPrecos | null,
    editalData: Partial<Edital>,
  ): Promise<Partial<Edital> & { _aiResponse: LLMResponse }> {
    this.logger.debug('Enhancing Edital with AI-generated clauses');

    const prompt = `Você é um especialista em licitações públicas e Lei 14.133/2021.

Com base nos documentos fornecidos, gere cláusulas complementares para o edital de licitação.

**Contexto da Contratação:**
- Objeto: ${editalData.objeto}
- Descrição: ${editalData.descricaoObjeto || 'Não informada'}
- Valor Estimado: R$ ${editalData.valorEstimado || 'Não informado'}
- Modalidade: ${editalData.modalidade || 'A definir'}
- Prazo de Vigência: ${editalData.prazoVigencia || 'Não informado'} dias

${termoReferencia ? `**Termo de Referência:**\n- Requisitos: ${termoReferencia.requisitosContratacao || 'Não especificados'}` : ''}

${pesquisaPrecos ? `**Pesquisa de Preços:**\n- Metodologia: ${pesquisaPrecos.metodologia}\n- Justificativa: ${pesquisaPrecos.justificativaMetodologia || 'Não especificada'}` : ''}

Gere as seguintes cláusulas em formato estruturado (JSON):

1. **condicoesParticipacao**: Condições para participação na licitação (ex: porte da empresa, regularidade fiscal).
2. **prazos**: Estrutura com prazos do processo (proposta, impugnação, recursos, sessão pública).
3. **reajusteContratual**: Índice e condições para reajuste de preços.

Retorne **APENAS** um JSON válido no formato:
{
  "condicoesParticipacao": "texto",
  "prazos": {
    "proposta": "X dias",
    "impugnacao": "Y dias",
    "recursos": "Z dias",
    "sessaoPublica": "data/hora"
  },
  "reajusteContratual": "texto"
}`;

    const response = await this.openAIService.generateCompletion({
      systemPrompt:
        'Você é um especialista em licitações públicas e Lei 14.133/2021.',
      userPrompt: prompt,
    });

    // Parsear resposta JSON
    let enhancedData: Partial<Edital>;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      const parsed = JSON.parse(jsonMatch[0]);

      enhancedData = {
        condicoesParticipacao: parsed.condicoesParticipacao || null,
        prazos: parsed.prazos || null,
        reajusteContratual: parsed.reajusteContratual || null,
      };
    } catch (error) {
      this.logger.warn(
        'Failed to parse AI response as JSON, using fallback values',
        error,
      );
      enhancedData = {};
    }

    return {
      ...enhancedData,
      _aiResponse: response,
    };
  }

  /**
   * Infere a modalidade de licitação a partir do tipo de ETP.
   * Lógica simplificada: OBRAS, TI, SERVICOS → Pregão (mais comum).
   *
   * @param etp ETP de origem
   * @returns Modalidade inferida
   */
  private inferModalidade(_etp: Etp): EditalModalidade {
    // Lógica simplificada: usar Pregão como padrão (modalidade mais comum)
    // Em produção, isso pode ser mais sofisticado baseado no tipo e valor da contratação
    return EditalModalidade.PREGAO;
  }

  /**
   * Gera fundamentação legal padrão para o Edital.
   *
   * @returns Fundamentação legal baseada na Lei 14.133/2021
   */
  private generateFundamentacaoLegal(): string {
    return [
      'Lei Federal nº 14.133, de 1º de abril de 2021 (Nova Lei de Licitações e Contratos)',
      'Lei Complementar nº 123, de 14 de dezembro de 2006 (Estatuto da Micro e Pequena Empresa)',
      'Lei nº 8.078, de 11 de setembro de 1990 (Código de Defesa do Consumidor)',
      'Decreto Municipal nº [NÚMERO]/[ANO] (Regulamentação local)',
    ].join('\n');
  }

  /**
   * Gera número automático do edital no formato "XXX/YYYY-MODALIDADE".
   * Ex: "001/2024-PREGAO"
   *
   * @param etp ETP de origem
   * @param modalidade Modalidade inferida
   * @returns Número do edital gerado
   */
  private async generateEditalNumber(
    etp: Etp,
    modalidade: EditalModalidade | null,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const modalidadeSuffix = modalidade || 'EDITAL';

    // Buscar último edital da organização no ano
    const lastEdital = await this.editalRepository.findOne({
      where: {
        organizationId: etp.organizationId,
      },
      order: { createdAt: 'DESC' },
    });

    let sequenceNumber = 1;
    if (lastEdital && lastEdital.numero) {
      // Extrair número sequencial do formato "XXX/YYYY-MODALIDADE"
      const match = lastEdital.numero.match(/^(\d+)\//);
      if (match) {
        sequenceNumber = parseInt(match[1], 10) + 1;
      }
    }

    const sequencePadded = sequenceNumber.toString().padStart(3, '0');
    return `${sequencePadded}/${year}-${modalidadeSuffix}`;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';
import { TreeNode } from '../interfaces/tree-node.interface';

/**
 * Pre-built tree structure for Lei 14.133/2021.
 *
 * This seeder creates a hierarchical representation of the Nova Lei de Licitacoes
 * for use as a PoC for PageIndex reasoning-based retrieval.
 *
 * Structure:
 * - Root: Lei 14.133/2021
 *   - Titulo I: Disposicoes Preliminares
 *     - Capitulo I: Ambito de Aplicacao
 *     - Capitulo II: Principios
 *   - Titulo II: Das Licitacoes
 *     - Capitulo I: Processo Licitatorio
 *     - Capitulo II: Modalidades de Licitacao
 *     - Capitulo III: Dispensas e Inexigibilidades
 *     - Capitulo IV: Habilitacao
 *   - Titulo III: Contratos Administrativos
 *     - Capitulo I: Formalizacao
 *     - Capitulo II: Alteracoes
 *     - Capitulo III: Execucao
 *     - Capitulo IV: Sancoes
 *   - Titulo IV: Irregularidades
 *   - Titulo V: Disposicoes Gerais
 *
 * @see Issue #1554 - [PI-1538e] PoC PageIndex com Lei 14.133/2021
 */
@Injectable()
export class Lei14133Seeder {
  private readonly logger = new Logger(Lei14133Seeder.name);

  constructor(
    @InjectRepository(DocumentTree)
    private readonly documentTreeRepository: Repository<DocumentTree>,
  ) {}

  /**
   * Seed the Lei 14.133/2021 tree structure.
   *
   * @returns The created DocumentTree
   */
  async seed(): Promise<DocumentTree> {
    this.logger.log('Starting Lei 14.133/2021 seeding...');

    // Check if already exists
    const existing = await this.documentTreeRepository.findOne({
      where: { documentName: 'Lei 14.133/2021 - Nova Lei de Licitacoes' },
    });

    if (existing) {
      this.logger.log('Lei 14.133/2021 already seeded', { id: existing.id });
      return existing;
    }

    // Get document path
    const documentPath = path.join(
      __dirname,
      '..',
      'assets',
      'lei-14133-2021.txt',
    );

    // Read content for reference
    let fullContent = '';
    try {
      fullContent = fs.readFileSync(documentPath, 'utf-8');
    } catch (error) {
      this.logger.warn('Could not read document file', { documentPath, error });
    }

    // Build the tree structure
    const treeStructure = this.buildTreeStructure(fullContent);

    // Count nodes and calculate depth
    const { nodeCount, maxDepth } = this.calculateTreeMetrics(treeStructure);

    // Create the document tree
    const documentTree = this.documentTreeRepository.create({
      documentName: 'Lei 14.133/2021 - Nova Lei de Licitacoes',
      documentPath: documentPath,
      sourceUrl:
        'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm',
      documentType: DocumentType.LEGISLATION,
      status: DocumentTreeStatus.INDEXED,
      treeStructure: treeStructure,
      nodeCount,
      maxDepth,
      indexedAt: new Date(),
      processingTimeMs: 0, // Pre-built, no processing time
    });

    const saved = await this.documentTreeRepository.save(documentTree);

    this.logger.log('Lei 14.133/2021 seeded successfully', {
      id: saved.id,
      nodeCount,
      maxDepth,
    });

    return saved;
  }

  /**
   * Build the hierarchical tree structure for Lei 14.133/2021.
   */
  private buildTreeStructure(fullContent: string): TreeNode {
    // Extract content sections using regex
    const sections = this.extractSections(fullContent);

    return {
      id: 'root',
      title: 'Lei 14.133/2021 - Nova Lei de Licitacoes',
      level: 0,
      content:
        'Lei de Licitacoes e Contratos Administrativos. Estabelece normas gerais de licitacao e contratacao para as Administracoes Publicas.',
      children: [
        this.buildTituloI(sections),
        this.buildTituloII(sections),
        this.buildTituloIII(sections),
        this.buildTituloIV(sections),
        this.buildTituloV(sections),
      ],
    };
  }

  /**
   * Extract content sections from the full document text.
   */
  private extractSections(
    content: string,
  ): Map<string, { title: string; content: string }> {
    const sections = new Map<string, { title: string; content: string }>();

    // Article extraction patterns
    const articlePattern = /Art\.\s+(\d+)\.\s+([\s\S]*?)(?=Art\.\s+\d+\.|$)/g;
    let match;

    while ((match = articlePattern.exec(content)) !== null) {
      const articleNum = match[1];
      const articleContent = match[2].trim();
      sections.set(`art${articleNum}`, {
        title: `Art. ${articleNum}`,
        content: articleContent.substring(0, 2000), // Limit content size
      });
    }

    return sections;
  }

  /**
   * Build Titulo I - Disposicoes Preliminares
   */
  private buildTituloI(
    sections: Map<string, { title: string; content: string }>,
  ): TreeNode {
    return {
      id: 'titulo-i',
      title: 'Titulo I - Disposicoes Preliminares',
      level: 1,
      content:
        'Disposicoes preliminares sobre ambito de aplicacao e principios da lei de licitacoes.',
      children: [
        {
          id: 'titulo-i-cap-i',
          title: 'Capitulo I - Do Ambito de Aplicacao',
          level: 2,
          content:
            'Define o ambito de aplicacao da lei para Administracoes Publicas diretas, autarquicas e fundacionais.',
          children: [
            {
              id: 'art-1',
              title: 'Art. 1 - Ambito de aplicacao',
              level: 3,
              content:
                sections.get('art1')?.content ||
                'Esta Lei estabelece normas gerais de licitacao e contratacao para as Administracoes Publicas diretas, autarquicas e fundacionais da Uniao, dos Estados, do Distrito Federal e dos Municipios.',
              children: [],
            },
          ],
        },
        {
          id: 'titulo-i-cap-ii',
          title: 'Capitulo II - Dos Principios',
          level: 2,
          content:
            'Principios aplicaveis a licitacao: legalidade, impessoalidade, moralidade, publicidade, eficiencia.',
          children: [
            {
              id: 'art-5',
              title: 'Art. 5 - Principios aplicaveis',
              level: 3,
              content:
                sections.get('art5')?.content ||
                'Na aplicacao desta Lei, serao observados os principios da legalidade, da impessoalidade, da moralidade, da publicidade, da eficiencia, do interesse publico, da probidade administrativa, da igualdade, do planejamento, da transparencia, da eficacia, da segregacao de funcoes, da motivacao, da vinculacao ao edital, do julgamento objetivo, da seguranca juridica, da razoabilidade, da competitividade, da proporcionalidade, da celeridade, da economicidade e do desenvolvimento nacional sustentavel.',
              children: [],
            },
          ],
        },
      ],
    };
  }

  /**
   * Build Titulo II - Das Licitacoes
   */
  private buildTituloII(
    sections: Map<string, { title: string; content: string }>,
  ): TreeNode {
    return {
      id: 'titulo-ii',
      title: 'Titulo II - Das Licitacoes',
      level: 1,
      content:
        'Normas sobre processo licitatorio, modalidades, dispensas, inexigibilidades e habilitacao.',
      children: [
        {
          id: 'titulo-ii-cap-i',
          title: 'Capitulo I - Do Processo Licitatorio',
          level: 2,
          content:
            'Fases do processo licitatorio e fase preparatoria com estudo tecnico preliminar.',
          children: [
            {
              id: 'art-17',
              title: 'Art. 17 - Fases da licitacao',
              level: 3,
              content:
                sections.get('art17')?.content ||
                'O processo de licitacao observara as seguintes fases, em sequencia: preparatoria; de divulgacao do edital; de apresentacao de propostas e lances; de julgamento; de habilitacao; recursal; de homologacao.',
              children: [],
            },
            {
              id: 'art-18',
              title: 'Art. 18 - Fase preparatoria',
              level: 3,
              content:
                sections.get('art18')?.content ||
                'A fase preparatoria do processo licitatorio e caracterizada pelo planejamento e deve compatibilizar-se com o plano de contratacoes anual. Compreende descricao da necessidade fundamentada em estudo tecnico preliminar, definicao do objeto por meio de termo de referencia, orcamento estimado.',
              children: [],
            },
          ],
        },
        {
          id: 'titulo-ii-cap-ii',
          title: 'Capitulo II - Das Modalidades de Licitacao',
          level: 2,
          content:
            'Modalidades: pregao, concorrencia, concurso, leilao e dialogo competitivo.',
          children: [
            {
              id: 'art-28',
              title: 'Art. 28 - Modalidades',
              level: 3,
              content:
                sections.get('art28')?.content ||
                'Sao modalidades de licitacao: I - pregao; II - concorrencia; III - concurso; IV - leilao; V - dialogo competitivo.',
              children: [],
            },
            {
              id: 'art-29',
              title: 'Art. 29 - Pregao',
              level: 3,
              content:
                sections.get('art29')?.content ||
                'O pregao e a modalidade de licitacao obrigatoria para aquisicao de bens e servicos comuns, assim considerados aqueles cujos padroes de desempenho e qualidade podem ser objetivamente definidos pelo edital.',
              children: [],
            },
            {
              id: 'art-30',
              title: 'Art. 30 - Pregao eletronico',
              level: 3,
              content:
                sections.get('art30')?.content ||
                'O pregao sera realizado exclusivamente em forma eletronica, podendo ser admitida, em situacoes excepcionais, a forma presencial, desde que motivada.',
              children: [],
            },
            {
              id: 'art-31',
              title: 'Art. 31 - Concorrencia',
              level: 3,
              content:
                sections.get('art31')?.content ||
                'A concorrencia e a modalidade de licitacao para contratacao de bens e servicos especiais e de obras e servicos comuns e especiais de engenharia.',
              children: [],
            },
            {
              id: 'art-34',
              title: 'Art. 34 - Dialogo competitivo',
              level: 3,
              content:
                sections.get('art34')?.content ||
                'O dialogo competitivo e a modalidade de licitacao para contratacao de obras, servicos e compras em que a Administracao Publica realiza dialogos com licitantes previamente selecionados.',
              children: [],
            },
          ],
        },
        {
          id: 'titulo-ii-cap-iii',
          title: 'Capitulo III - Das Dispensas e Inexigibilidades',
          level: 2,
          content:
            'Hipoteses de dispensa de licitacao e casos de inexigibilidade quando inviavel a competicao.',
          children: [
            {
              id: 'art-74-dispensa',
              title: 'Art. 74 - Dispensa de licitacao',
              level: 3,
              content:
                sections.get('art74')?.content ||
                'E dispensavel a licitacao: I - para contratacao que envolva valores inferiores a R$ 100.000,00, no caso de obras e servicos de engenharia; II - para contratacao que envolva valores inferiores a R$ 50.000,00, no caso de outros servicos e compras.',
              children: [],
            },
            {
              id: 'art-74-inexigibilidade',
              title: 'Art. 74 - Inexigibilidade',
              level: 3,
              content:
                'E inexigivel a licitacao quando inviavel a competicao, em especial: I - aquisicao de materiais ou servicos que so possam ser fornecidos por produtor, empresa ou representante comercial exclusivos; II - contratacao de profissional do setor artistico consagrado; III - contratacao de servicos tecnicos especializados com profissionais de notoria especializacao.',
              children: [],
            },
          ],
        },
        {
          id: 'titulo-ii-cap-iv',
          title: 'Capitulo IV - Da Habilitacao',
          level: 2,
          content:
            'Requisitos de habilitacao: juridica, tecnica, fiscal, social, trabalhista e economico-financeira.',
          children: [
            {
              id: 'art-62',
              title: 'Art. 62 - Tipos de habilitacao',
              level: 3,
              content:
                sections.get('art62')?.content ||
                'A habilitacao e a fase da licitacao em que se verifica o conjunto de informacoes e documentos necessarios para demonstrar a capacidade do licitante, dividindo-se em: juridica; tecnica; fiscal, social e trabalhista; economico-financeira.',
              children: [],
            },
            {
              id: 'art-63',
              title: 'Art. 63 - Habilitacao juridica',
              level: 3,
              content:
                sections.get('art63')?.content ||
                'Sera exigida habilitacao juridica: cedula de identidade para pessoa fisica; requerimento de empresario para empresario individual; inscricao no registro publico para sociedades.',
              children: [],
            },
          ],
        },
      ],
    };
  }

  /**
   * Build Titulo III - Dos Contratos Administrativos
   */
  private buildTituloIII(
    sections: Map<string, { title: string; content: string }>,
  ): TreeNode {
    return {
      id: 'titulo-iii',
      title: 'Titulo III - Dos Contratos Administrativos',
      level: 1,
      content:
        'Normas sobre formalizacao, alteracoes, execucao e sancoes em contratos administrativos.',
      children: [
        {
          id: 'titulo-iii-cap-i',
          title: 'Capitulo I - Da Formalizacao dos Contratos',
          level: 2,
          content:
            'Clausulas obrigatorias e formalizacao dos contratos administrativos.',
          children: [
            {
              id: 'art-89',
              title: 'Art. 89 - Regime juridico',
              level: 3,
              content:
                sections.get('art89')?.content ||
                'Os contratos de que trata esta Lei regular-se-ao pelas suas clausulas e pelos preceitos de direito publico, aplicando-se supletivamente os principios da teoria geral dos contratos.',
              children: [],
            },
            {
              id: 'art-92',
              title: 'Art. 92 - Clausulas necessarias',
              level: 3,
              content:
                sections.get('art92')?.content ||
                'Sao necessarias em todo contrato clausulas que estabelecam: objeto e seus elementos; vinculacao ao edital; legislacao aplicavel; regime de execucao; preco e condicoes de pagamento; criterios de medicao; prazos; garantias; penalidades; casos de extincao; matriz de riscos.',
              children: [],
            },
          ],
        },
        {
          id: 'titulo-iii-cap-ii',
          title: 'Capitulo II - Das Alteracoes dos Contratos',
          level: 2,
          content:
            'Hipoteses de alteracao contratual unilateral e por acordo entre as partes.',
          children: [
            {
              id: 'art-124',
              title: 'Art. 124 - Hipoteses de alteracao',
              level: 3,
              content:
                sections.get('art124')?.content ||
                'Os contratos poderao ser alterados: I - unilateralmente pela Administracao (modificacao de projeto ou valor); II - por acordo entre as partes (substituicao de garantia, modificacao de regime, forma de pagamento, reequilibrio economico-financeiro).',
              children: [],
            },
            {
              id: 'art-125',
              title: 'Art. 125 - Limites de acrescimo',
              level: 3,
              content:
                sections.get('art125')?.content ||
                'Nas alteracoes unilaterais, o contratado sera obrigado a aceitar acrescimos ou supressoes de ate 25% do valor inicial. No caso de reforma de edificio ou equipamento, o limite para acrescimos sera de 50%.',
              children: [],
            },
          ],
        },
        {
          id: 'titulo-iii-cap-iii',
          title: 'Capitulo III - Da Execucao dos Contratos',
          level: 2,
          content: 'Regras sobre execucao fiel do contrato pelas partes.',
          children: [
            {
              id: 'art-115',
              title: 'Art. 115 - Execucao fiel',
              level: 3,
              content:
                sections.get('art115')?.content ||
                'O contrato devera ser executado fielmente pelas partes, de acordo com as clausulas avencadas e as normas desta Lei, e cada parte respondera pelas consequencias de sua inexecucao total ou parcial.',
              children: [],
            },
          ],
        },
        {
          id: 'titulo-iii-cap-iv',
          title: 'Capitulo IV - Das Sancoes Administrativas',
          level: 2,
          content:
            'Infracoes administrativas e sancoes aplicaveis a licitantes e contratados.',
          children: [
            {
              id: 'art-155',
              title: 'Art. 155 - Infracoes',
              level: 3,
              content:
                sections.get('art155')?.content ||
                'O licitante ou contratado sera responsabilizado pelas seguintes infracoes: inexecucao parcial ou total; nao entregar documentacao; nao manter proposta; apresentar declaracao falsa; fraudar licitacao; comportar-se de modo inidoneo.',
              children: [],
            },
            {
              id: 'art-156',
              title: 'Art. 156 - Sancoes',
              level: 3,
              content:
                sections.get('art156')?.content ||
                'Serao aplicadas as seguintes sancoes: I - advertencia; II - multa; III - impedimento de licitar e contratar; IV - declaracao de inidoneidade para licitar ou contratar.',
              children: [],
            },
          ],
        },
      ],
    };
  }

  /**
   * Build Titulo IV - Das Irregularidades
   */
  private buildTituloIV(
    sections: Map<string, { title: string; content: string }>,
  ): TreeNode {
    return {
      id: 'titulo-iv',
      title: 'Titulo IV - Das Irregularidades',
      level: 1,
      content:
        'Normas sobre etica e integridade administrativa em processos licitatorios.',
      children: [
        {
          id: 'art-158',
          title: 'Art. 158 - Padrao etico',
          level: 2,
          content:
            sections.get('art158')?.content ||
            'O licitante e o contratado deverao observar o mais alto padrao de etica durante todo o processo de licitacao, de contratacao e de execucao do objeto contratual.',
          children: [],
        },
        {
          id: 'art-160',
          title: 'Art. 160 - Gestao de integridade',
          level: 2,
          content:
            sections.get('art160')?.content ||
            'A Administracao Publica atuara no sentido de promover, valorizar e adotar praticas de gestao de integridade administrativa em seus procedimentos.',
          children: [],
        },
      ],
    };
  }

  /**
   * Build Titulo V - Disposicoes Gerais
   */
  private buildTituloV(
    sections: Map<string, { title: string; content: string }>,
  ): TreeNode {
    return {
      id: 'titulo-v',
      title: 'Titulo V - Disposicoes Gerais',
      level: 1,
      content:
        'Disposicoes gerais sobre prazos, vedacoes e controle de contratacoes.',
      children: [
        {
          id: 'art-173',
          title: 'Art. 173 - Contagem de prazos',
          level: 2,
          content:
            sections.get('art173')?.content ||
            'Os prazos serao contados com exclusao do dia do comeco e inclusao do dia do vencimento. Prazos em dias corridos sao computados de modo continuo; prazos em meses ou anos de data a data.',
          children: [],
        },
        {
          id: 'art-174',
          title: 'Art. 174 - Vedacoes',
          level: 2,
          content:
            sections.get('art174')?.content ||
            'E vedado a Administracao: admitir clausulas que comprometam o carater competitivo; estabelecer tratamento diferenciado entre empresas brasileiras e estrangeiras; opor resistencia injustificada ao andamento dos processos.',
          children: [],
        },
        {
          id: 'art-187',
          title: 'Art. 187 - Controle',
          level: 2,
          content:
            sections.get('art187')?.content ||
            'Os orgaos de controle interno e externo deverao realizar o controle das contratacoes, verificando cumprimento dos requisitos de economicidade e eficacia, avaliando eficiencia, eficacia e efetividade das contratacoes.',
          children: [],
        },
        {
          id: 'art-193',
          title: 'Art. 193 - Revogacoes',
          level: 2,
          content:
            sections.get('art193')?.content ||
            'Revogam-se: I - a Lei n. 8.666/1993; II - a Lei n. 10.520/2002; III - os arts. 1 a 47-A da Lei n. 12.462/2011.',
          children: [],
        },
      ],
    };
  }

  /**
   * Calculate tree metrics (node count and max depth).
   */
  private calculateTreeMetrics(node: TreeNode): {
    nodeCount: number;
    maxDepth: number;
  } {
    let nodeCount = 1;
    let maxDepth = node.level;

    if (node.children) {
      for (const child of node.children) {
        const childMetrics = this.calculateTreeMetrics(child);
        nodeCount += childMetrics.nodeCount;
        maxDepth = Math.max(maxDepth, childMetrics.maxDepth);
      }
    }

    return { nodeCount, maxDepth };
  }

  /**
   * Delete the seeded Lei 14.133/2021 tree (for cleanup).
   */
  async unseed(): Promise<void> {
    this.logger.log('Removing Lei 14.133/2021 seed...');

    const result = await this.documentTreeRepository.delete({
      documentName: 'Lei 14.133/2021 - Nova Lei de Licitacoes',
    });

    this.logger.log('Lei 14.133/2021 seed removed', {
      affected: result.affected,
    });
  }
}

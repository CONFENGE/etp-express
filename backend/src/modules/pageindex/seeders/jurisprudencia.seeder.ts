import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DocumentTree,
  DocumentTreeStatus,
} from '../../../entities/document-tree.entity';
import { DocumentType } from '../dto/index-document.dto';
import { TreeNode } from '../interfaces/tree-node.interface';
import {
  JurisprudenciaData,
  JurisprudenciaSeedResult,
  TEMAS_JURISPRUDENCIA,
} from '../interfaces/jurisprudencia.interface';

/**
 * Seeder for jurisprudence (sumulas and acordaos) from TCE-SP and TCU.
 *
 * This seeder creates a hierarchical tree structure for jurisprudence
 * organized by tribunal and theme, enabling reasoning-based retrieval
 * via PageIndex.
 *
 * Structure:
 * - Root: Jurisprudencia
 *   - TCE-SP
 *     - Licitacao
 *       - Modalidades
 *       - Habilitacao
 *       - Dispensas
 *       - Registro de Precos
 *     - Contratos
 *       - Formalizacao
 *       - Alteracoes
 *     - Terceiro Setor
 *   - TCU
 *     - Lei 14.133/2021
 *       - ETP
 *       - Pesquisa de Precos
 *       - Modalidades
 *     - Licitacao
 *       - Adjudicacao
 *       - Habilitacao
 *       - BDI e Composicao
 *       - Pregao
 *     - Contratos
 *       - Fiscalizacao
 *       - Alteracoes
 *
 * @see Issue #1578 - [JURIS-1540b] Criar JurisprudenciaSeeder com estrutura base
 * @see docs/jurisprudencia-sources.md
 */
@Injectable()
export class JurisprudenciaSeeder {
  private readonly logger = new Logger(JurisprudenciaSeeder.name);

  constructor(
    @InjectRepository(DocumentTree)
    private readonly documentTreeRepository: Repository<DocumentTree>,
  ) {}

  /**
   * Seed jurisprudence from provided data.
   *
   * @param data Array of jurisprudence items to seed
   * @returns Seed result with statistics
   */
  async seedFromData(
    data: JurisprudenciaData[],
  ): Promise<JurisprudenciaSeedResult> {
    const startTime = Date.now();
    this.logger.log('Starting jurisprudencia seeding...', {
      count: data.length,
    });

    // Check if already exists
    const existing = await this.documentTreeRepository.findOne({
      where: { documentName: 'Jurisprudencia TCE-SP e TCU' },
    });

    if (existing) {
      this.logger.log('Jurisprudencia already seeded, updating...', {
        id: existing.id,
      });
      await this.documentTreeRepository.remove(existing);
    }

    // Separate by tribunal
    const tcespData = data.filter((d) => d.tribunal === 'TCE-SP');
    const tcuData = data.filter((d) => d.tribunal === 'TCU');

    // Build the tree structure
    const treeStructure = this.buildTreeStructure(tcespData, tcuData);

    // Count nodes and calculate depth
    const { nodeCount, maxDepth } = this.calculateTreeMetrics(treeStructure);

    // Create the document tree
    const documentTree = this.documentTreeRepository.create({
      documentName: 'Jurisprudencia TCE-SP e TCU',
      documentPath: null,
      sourceUrl: 'https://www.tce.sp.gov.br/jurisprudencia',
      documentType: DocumentType.JURISPRUDENCIA,
      status: DocumentTreeStatus.INDEXED,
      treeStructure: treeStructure,
      nodeCount,
      maxDepth,
      indexedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    });

    const saved = await this.documentTreeRepository.save(documentTree);

    const result: JurisprudenciaSeedResult = {
      total: data.length,
      tcespCount: tcespData.length,
      tcuCount: tcuData.length,
      documentTreeId: saved.id,
      processingTimeMs: Date.now() - startTime,
    };

    this.logger.log('Jurisprudencia seeded successfully', result);

    return result;
  }

  /**
   * Build the hierarchical tree structure for jurisprudence.
   *
   * @param tcespData TCE-SP jurisprudence data
   * @param tcuData TCU jurisprudence data
   * @returns Root TreeNode with complete structure
   */
  buildTreeStructure(
    tcespData: JurisprudenciaData[],
    tcuData: JurisprudenciaData[],
  ): TreeNode {
    return {
      id: 'jurisprudencia-root',
      title: 'Jurisprudencia - Tribunais de Contas',
      level: 0,
      content:
        'Jurisprudencia consolidada do TCE-SP e TCU sobre licitacoes, contratos e gestao publica. ' +
        'Inclui sumulas, acordaos e decisoes normativas relevantes para conformidade.',
      children: [this.buildTceSPNode(tcespData), this.buildTcuNode(tcuData)],
    };
  }

  /**
   * Build TCE-SP tribunal node with themed children.
   */
  private buildTceSPNode(data: JurisprudenciaData[]): TreeNode {
    const themes = this.groupByTheme(data);

    return {
      id: 'tcesp',
      title: 'TCE-SP - Tribunal de Contas do Estado de Sao Paulo',
      level: 1,
      content:
        'Sumulas e decisoes do Tribunal de Contas do Estado de Sao Paulo. ' +
        'Fonte oficial: https://www.tce.sp.gov.br/jurisprudencia',
      children: [
        this.buildThemeNode(
          'tcesp-licitacao',
          'Licitacao',
          'Jurisprudencia sobre processos licitatorios, modalidades e procedimentos.',
          2,
          themes,
          [
            'Licitacao',
            'Licitacao > Modalidades',
            'Licitacao > Habilitacao',
            'Licitacao > Dispensas e Inexigibilidades',
            'Licitacao > Registro de Precos',
          ],
        ),
        this.buildThemeNode(
          'tcesp-contratos',
          'Contratos',
          'Jurisprudencia sobre contratos administrativos, formalizacao e alteracoes.',
          2,
          themes,
          ['Contratos', 'Contratos > Formalizacao', 'Contratos > Alteracoes'],
        ),
        this.buildThemeNode(
          'tcesp-terceiro-setor',
          'Terceiro Setor',
          'Jurisprudencia sobre repasses, convenios e organizacoes do terceiro setor.',
          2,
          themes,
          ['Terceiro Setor', 'Auxilios e Subvencoes'],
        ),
        this.buildThemeNode(
          'tcesp-outros',
          'Outros Temas',
          'Jurisprudencia sobre remuneracao, sancoes e demais temas.',
          2,
          themes,
          ['Remuneracao e Pessoal', 'Sancoes Administrativas'],
        ),
      ],
    };
  }

  /**
   * Build TCU tribunal node with themed children.
   */
  private buildTcuNode(data: JurisprudenciaData[]): TreeNode {
    const themes = this.groupByTheme(data);

    return {
      id: 'tcu',
      title: 'TCU - Tribunal de Contas da Uniao',
      level: 1,
      content:
        'Sumulas e acordaos do Tribunal de Contas da Uniao. ' +
        'Fonte oficial: https://portal.tcu.gov.br/jurisprudencia',
      children: [
        this.buildThemeNode(
          'tcu-lei-14133',
          'Lei 14.133/2021',
          'Jurisprudencia especifica sobre a Nova Lei de Licitacoes.',
          2,
          themes,
          [
            'Lei 14.133/2021',
            'Lei 14.133/2021 > ETP',
            'Lei 14.133/2021 > Pesquisa de Precos',
            'Lei 14.133/2021 > Modalidades',
          ],
        ),
        this.buildThemeNode(
          'tcu-licitacao',
          'Licitacao',
          'Jurisprudencia sobre processos licitatorios em geral.',
          2,
          themes,
          [
            'Licitacao',
            'Licitacao > Adjudicacao',
            'Licitacao > Habilitacao',
            'Licitacao > BDI e Composicao',
            'Licitacao > Pregao',
          ],
        ),
        this.buildThemeNode(
          'tcu-contratos',
          'Contratos',
          'Jurisprudencia sobre contratos administrativos.',
          2,
          themes,
          ['Contratos', 'Contratos > Fiscalizacao', 'Contratos > Alteracoes'],
        ),
        this.buildThemeNode(
          'tcu-ti',
          'Tecnologia da Informacao',
          'Jurisprudencia sobre contratacoes de TI.',
          2,
          themes,
          ['Tecnologia da Informacao'],
        ),
      ],
    };
  }

  /**
   * Build a theme node with jurisprudence items as children.
   */
  private buildThemeNode(
    id: string,
    title: string,
    description: string,
    level: number,
    themes: Map<string, JurisprudenciaData[]>,
    themeKeys: string[],
  ): TreeNode {
    const items: JurisprudenciaData[] = [];
    for (const key of themeKeys) {
      const themeItems = themes.get(key);
      if (themeItems) {
        items.push(...themeItems);
      }
    }

    // Remove duplicates by id
    const uniqueItems = Array.from(
      new Map(items.map((item) => [item.id, item])).values(),
    );

    return {
      id,
      title,
      level,
      content: description,
      children: uniqueItems.map((item) =>
        this.buildJurisprudenciaNode(item, level + 1),
      ),
    };
  }

  /**
   * Build a leaf node for a single jurisprudence item.
   */
  private buildJurisprudenciaNode(
    item: JurisprudenciaData,
    level: number,
  ): TreeNode {
    const tipoLabel = this.getTipoLabel(item.tipo);
    const statusLabel = item.status !== 'VIGENTE' ? ` [${item.status}]` : '';

    return {
      id: item.id,
      title: `${tipoLabel} ${item.numero}/${item.ano}${statusLabel}`,
      level,
      content: this.formatContent(item),
      children: [],
    };
  }

  /**
   * Format jurisprudence content for the tree node.
   */
  private formatContent(item: JurisprudenciaData): string {
    let content = `**${this.getTipoLabel(item.tipo)} ${item.numero}/${item.ano}**\n\n`;
    content += `**Tribunal:** ${item.tribunal}\n`;
    content += `**Status:** ${item.status}\n`;
    if (item.dataAprovacao) {
      content += `**Data:** ${item.dataAprovacao}\n`;
    }
    if (item.relator) {
      content += `**Relator:** ${item.relator}\n`;
    }
    content += `\n**Ementa:**\n${item.ementa}\n`;
    if (item.fundamentacao) {
      content += `\n**Fundamentacao:**\n${item.fundamentacao}\n`;
    }
    content += `\n**Fonte:** ${item.sourceUrl}`;
    return content;
  }

  /**
   * Get human-readable label for jurisprudence type.
   */
  private getTipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      SUMULA: 'Sumula',
      ACORDAO: 'Acordao',
      DECISAO_NORMATIVA: 'Decisao Normativa',
      PARECER: 'Parecer',
    };
    return labels[tipo] || tipo;
  }

  /**
   * Group jurisprudence data by theme.
   */
  private groupByTheme(
    data: JurisprudenciaData[],
  ): Map<string, JurisprudenciaData[]> {
    const themes = new Map<string, JurisprudenciaData[]>();

    for (const item of data) {
      for (const tema of item.temas) {
        const existing = themes.get(tema) || [];
        existing.push(item);
        themes.set(tema, existing);
      }
    }

    return themes;
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
   * Delete the seeded jurisprudence tree (for cleanup).
   */
  async unseed(): Promise<void> {
    this.logger.log('Removing jurisprudencia seed...');

    const result = await this.documentTreeRepository.delete({
      documentName: 'Jurisprudencia TCE-SP e TCU',
    });

    this.logger.log('Jurisprudencia seed removed', {
      affected: result.affected,
    });
  }

  /**
   * Get available theme constants for data preparation.
   */
  getThemeConstants(): typeof TEMAS_JURISPRUDENCIA {
    return TEMAS_JURISPRUDENCIA;
  }
}

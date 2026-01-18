import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentTree } from '../../../entities/document-tree.entity';
import { JurisprudenciaSeeder } from './jurisprudencia.seeder';
import { JurisprudenciaData } from '../interfaces/jurisprudencia.interface';
import * as tcuAcordaosData from '../data/tcu-acordaos.json';
import * as tcespSumulasData from '../data/tcesp-sumulas.json';

/**
 * Seeder for TCU jurisprudence (acordaos and sumulas).
 *
 * This seeder loads acordaos and sumulas from the JSON data file and uses the
 * JurisprudenciaSeeder to create the hierarchical tree structure
 * for PageIndex-based retrieval.
 *
 * The seeder combines TCU data with existing TCE-SP data to create
 * a unified jurisprudence tree.
 *
 * @see Issue #1580 - [JURIS-1540d] Coletar e indexar acordaos TCU sobre Lei 14.133 (minimo 50)
 * @see docs/jurisprudencia-sources.md
 */
@Injectable()
export class TcuSeeder implements OnModuleInit {
  private readonly logger = new Logger(TcuSeeder.name);

  constructor(
    @InjectRepository(DocumentTree)
    private readonly documentTreeRepository: Repository<DocumentTree>,
    private readonly jurisprudenciaSeeder: JurisprudenciaSeeder,
  ) {}

  /**
   * Seed TCU acordaos on module initialization.
   * This will combine TCU data with TCE-SP data for a unified tree.
   */
  async onModuleInit(): Promise<void> {
    // Check if TCU data is already in the tree by checking for TCU items
    const existing = await this.documentTreeRepository.findOne({
      where: { documentName: 'Jurisprudencia TCE-SP e TCU' },
    });

    if (existing) {
      // Check if TCU data is already included by inspecting the tree structure
      const treeStructure = existing.treeStructure as {
        children?: Array<{ id: string }>;
      };
      const hasTcuData = treeStructure?.children?.some(
        (child) => child.id === 'tcu',
      );

      if (hasTcuData) {
        // Check if we have the expected number of TCU items
        const tcuItems = this.loadTcuAcordaosFromJson();
        const tcuNode = treeStructure?.children?.find(
          (child) => child.id === 'tcu',
        ) as { children?: Array<{ children?: unknown[] }> } | undefined;
        const currentTcuCount =
          tcuNode?.children?.reduce(
            (sum, theme) => sum + (theme.children?.length || 0),
            0,
          ) || 0;

        if (currentTcuCount >= tcuItems.length) {
          this.logger.log(
            'TCU acordaos already seeded with expected count, skipping...',
            {
              documentTreeId: existing.id,
              tcuCount: currentTcuCount,
            },
          );
          return;
        }

        this.logger.log('TCU data incomplete, reseeding...', {
          currentCount: currentTcuCount,
          expectedCount: tcuItems.length,
        });
      }
    }

    await this.seed();
  }

  /**
   * Load and seed TCU acordaos from JSON data.
   * Combines with TCE-SP data for unified jurisprudence tree.
   *
   * @returns Seed result with statistics
   */
  async seed(): Promise<{
    total: number;
    acordaos: number;
    sumulas: number;
    documentTreeId: string;
  }> {
    this.logger.log('Starting TCU acordaos seeding...');

    // Load TCU data
    const tcuItems = this.loadTcuAcordaosFromJson();
    const acordaosCount = tcuItems.filter(
      (item) => item.tipo === 'ACORDAO',
    ).length;
    const sumulasCount = tcuItems.filter(
      (item) => item.tipo === 'SUMULA',
    ).length;

    this.logger.log('Loaded TCU acordaos', {
      total: tcuItems.length,
      acordaos: acordaosCount,
      sumulas: sumulasCount,
    });

    // Load TCE-SP data to combine
    const tcespItems = this.loadTcespSumulasFromJson();

    this.logger.log('Loaded TCE-SP sumulas for combination', {
      tcespCount: tcespItems.length,
    });

    // Combine all jurisprudence data
    const allItems = [...tcespItems, ...tcuItems];

    // Use JurisprudenciaSeeder to create the combined tree structure
    const result = await this.jurisprudenciaSeeder.seedFromData(allItems);

    this.logger.log('TCU acordaos seeded successfully', {
      documentTreeId: result.documentTreeId,
      tcuCount: result.tcuCount,
      tcespCount: result.tcespCount,
      processingTimeMs: result.processingTimeMs,
    });

    return {
      total: tcuItems.length,
      acordaos: acordaosCount,
      sumulas: sumulasCount,
      documentTreeId: result.documentTreeId,
    };
  }

  /**
   * Load acordaos from the JSON data file.
   *
   * @returns Array of JurisprudenciaData
   */
  private loadTcuAcordaosFromJson(): JurisprudenciaData[] {
    const data = tcuAcordaosData as {
      metadata: {
        source: string;
        url: string;
        sumulasUrl: string;
        collectedAt: string;
        totalItems: number;
        acordaos: number;
        sumulas: number;
        description: string;
      };
      acordaos: Array<{
        id: string;
        tribunal: 'TCE-SP' | 'TCU';
        tipo: 'SUMULA' | 'ACORDAO' | 'DECISAO_NORMATIVA' | 'PARECER';
        numero: number;
        ano: number;
        ementa: string;
        temas: string[];
        status: 'VIGENTE' | 'CANCELADA' | 'SUPERADA';
        fundamentacao?: string;
        sourceUrl: string;
        dataAprovacao?: string;
        relator?: string;
      }>;
    };

    return data.acordaos.map((acordao) => ({
      id: acordao.id,
      tribunal: acordao.tribunal,
      tipo: acordao.tipo,
      numero: acordao.numero,
      ano: acordao.ano,
      ementa: acordao.ementa,
      temas: acordao.temas,
      status: acordao.status,
      fundamentacao: acordao.fundamentacao,
      sourceUrl: acordao.sourceUrl,
      dataAprovacao: acordao.dataAprovacao,
      relator: acordao.relator,
    }));
  }

  /**
   * Load TCE-SP sumulas from the JSON data file.
   *
   * @returns Array of JurisprudenciaData
   */
  private loadTcespSumulasFromJson(): JurisprudenciaData[] {
    const data = tcespSumulasData as {
      metadata: {
        source: string;
        url: string;
        collectedAt: string;
        totalItems: number;
        activeItems: number;
        cancelledItems: number;
      };
      sumulas: Array<{
        id: string;
        tribunal: 'TCE-SP' | 'TCU';
        tipo: 'SUMULA' | 'ACORDAO' | 'DECISAO_NORMATIVA' | 'PARECER';
        numero: number;
        ano: number;
        ementa: string;
        temas: string[];
        status: 'VIGENTE' | 'CANCELADA' | 'SUPERADA';
        fundamentacao?: string;
        sourceUrl: string;
        dataAprovacao?: string;
        relator?: string;
      }>;
    };

    return data.sumulas.map((sumula) => ({
      id: sumula.id,
      tribunal: sumula.tribunal,
      tipo: sumula.tipo,
      numero: sumula.numero,
      ano: sumula.ano,
      ementa: sumula.ementa,
      temas: sumula.temas,
      status: sumula.status,
      fundamentacao: sumula.fundamentacao,
      sourceUrl: sumula.sourceUrl,
      dataAprovacao: sumula.dataAprovacao,
      relator: sumula.relator,
    }));
  }

  /**
   * Get statistics about the loaded acordaos.
   *
   * @returns Statistics object
   */
  getStatistics(): {
    total: number;
    acordaos: number;
    sumulas: number;
    byTheme: Record<string, number>;
    byYear: Record<number, number>;
  } {
    const items = this.loadTcuAcordaosFromJson();
    const byTheme: Record<string, number> = {};
    const byYear: Record<number, number> = {};

    for (const item of items) {
      // Count by theme
      for (const tema of item.temas) {
        byTheme[tema] = (byTheme[tema] || 0) + 1;
      }

      // Count by year
      byYear[item.ano] = (byYear[item.ano] || 0) + 1;
    }

    return {
      total: items.length,
      acordaos: items.filter((item) => item.tipo === 'ACORDAO').length,
      sumulas: items.filter((item) => item.tipo === 'SUMULA').length,
      byTheme,
      byYear,
    };
  }

  /**
   * Remove seeded TCU data (cleanup).
   * Note: This removes the entire combined jurisprudence tree.
   */
  async unseed(): Promise<void> {
    await this.jurisprudenciaSeeder.unseed();
    this.logger.log('TCU acordaos seed removed (combined tree)');
  }
}

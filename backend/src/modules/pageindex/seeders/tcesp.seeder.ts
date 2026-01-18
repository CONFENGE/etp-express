import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentTree } from '../../../entities/document-tree.entity';
import { JurisprudenciaSeeder } from './jurisprudencia.seeder';
import { JurisprudenciaData } from '../interfaces/jurisprudencia.interface';
import * as tcespSumulasData from '../data/tcesp-sumulas.json';

/**
 * Seeder for TCE-SP jurisprudence (sumulas).
 *
 * This seeder loads sumulas from the JSON data file and uses the
 * JurisprudenciaSeeder to create the hierarchical tree structure
 * for PageIndex-based retrieval.
 *
 * @see Issue #1579 - [JURIS-1540c] Coletar e indexar sumulas TCE-SP (minimo 50)
 * @see docs/jurisprudencia-sources.md
 */
@Injectable()
export class TceSPSeeder implements OnModuleInit {
  private readonly logger = new Logger(TceSPSeeder.name);

  constructor(
    @InjectRepository(DocumentTree)
    private readonly documentTreeRepository: Repository<DocumentTree>,
    private readonly jurisprudenciaSeeder: JurisprudenciaSeeder,
  ) {}

  /**
   * Seed TCE-SP sumulas on module initialization.
   */
  async onModuleInit(): Promise<void> {
    // Check if already seeded to avoid duplicate work
    const existing = await this.documentTreeRepository.findOne({
      where: { documentName: 'Jurisprudencia TCE-SP e TCU' },
    });

    if (existing) {
      this.logger.log('TCE-SP sumulas already seeded, skipping...', {
        documentTreeId: existing.id,
      });
      return;
    }

    await this.seed();
  }

  /**
   * Load and seed TCE-SP sumulas from JSON data.
   *
   * @returns Seed result with statistics
   */
  async seed(): Promise<{
    total: number;
    active: number;
    cancelled: number;
    documentTreeId: string;
  }> {
    this.logger.log('Starting TCE-SP sumulas seeding...');

    const sumulas = this.loadSumulasFromJson();
    const activeCount = sumulas.filter((s) => s.status === 'VIGENTE').length;
    const cancelledCount = sumulas.filter(
      (s) => s.status === 'CANCELADA',
    ).length;

    this.logger.log('Loaded TCE-SP sumulas', {
      total: sumulas.length,
      active: activeCount,
      cancelled: cancelledCount,
    });

    // Use JurisprudenciaSeeder to create the tree structure
    const result = await this.jurisprudenciaSeeder.seedFromData(sumulas);

    this.logger.log('TCE-SP sumulas seeded successfully', {
      documentTreeId: result.documentTreeId,
      processingTimeMs: result.processingTimeMs,
    });

    return {
      total: sumulas.length,
      active: activeCount,
      cancelled: cancelledCount,
      documentTreeId: result.documentTreeId,
    };
  }

  /**
   * Load sumulas from the JSON data file.
   *
   * @returns Array of JurisprudenciaData
   */
  private loadSumulasFromJson(): JurisprudenciaData[] {
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
   * Get statistics about the loaded sumulas.
   *
   * @returns Statistics object
   */
  getStatistics(): {
    total: number;
    active: number;
    cancelled: number;
    byTheme: Record<string, number>;
  } {
    const sumulas = this.loadSumulasFromJson();
    const byTheme: Record<string, number> = {};

    for (const sumula of sumulas) {
      for (const tema of sumula.temas) {
        byTheme[tema] = (byTheme[tema] || 0) + 1;
      }
    }

    return {
      total: sumulas.length,
      active: sumulas.filter((s) => s.status === 'VIGENTE').length,
      cancelled: sumulas.filter((s) => s.status === 'CANCELADA').length,
      byTheme,
    };
  }

  /**
   * Remove seeded TCE-SP data (cleanup).
   */
  async unseed(): Promise<void> {
    await this.jurisprudenciaSeeder.unseed();
    this.logger.log('TCE-SP sumulas seed removed');
  }
}

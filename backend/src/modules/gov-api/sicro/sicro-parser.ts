/**
 * SICRO Excel Parser
 *
 * Parses SICRO (Sistema de Custos Referenciais de Obras) Excel spreadsheets from DNIT.
 *
 * Supports parsing:
 * - Insumos (inputs/materials)
 * - Composicoes (compositions/services)
 *
 * @module modules/gov-api/sicro
 * @see https://github.com/CONFENGE/etp-express/issues/694
 */

import { Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  SicroInsumoRaw,
  SicroComposicaoRaw,
  SicroParseResult,
  SicroParseError,
  SicroItemType,
  SicroUF,
  SicroPriceReference,
  SicroExcelMetadata,
  SicroCategoria,
  SicroModoTransporte,
  transformInsumoToReference,
  transformComposicaoToReference,
} from './sicro.types';

/**
 * Expected column headers for SICRO Insumos spreadsheet
 */
const INSUMO_COLUMNS = {
  CODIGO: ['CODIGO', 'CÓDIGO', 'COD', 'CÓDIGO DO INSUMO', 'CODIGO DO INSUMO'],
  DESCRICAO: [
    'DESCRICAO',
    'DESCRIÇÃO',
    'DESC',
    'DESCRIÇÃO DO INSUMO',
    'DESCRICAO DO INSUMO',
  ],
  UNIDADE: ['UNIDADE', 'UN', 'UND', 'UNID'],
  PRECO_ONERADO: [
    'PRECO ONERADO',
    'PREÇO ONERADO',
    'VALOR ONERADO',
    'CUSTO ONERADO',
    'PRECO',
    'PREÇO',
  ],
  PRECO_DESONERADO: [
    'PRECO DESONERADO',
    'PREÇO DESONERADO',
    'VALOR DESONERADO',
    'CUSTO DESONERADO',
  ],
  CATEGORIA: ['CATEGORIA', 'CAT', 'CLASSE', 'GRUPO'],
  CATEGORIA_DESC: ['CATEGORIA_DESCRICAO', 'CATEGORIA DESCRIÇÃO', 'DESC_CAT'],
};

/**
 * Expected column headers for SICRO Composicoes spreadsheet
 */
const COMPOSICAO_COLUMNS = {
  CODIGO: [
    'CODIGO',
    'CÓDIGO',
    'COD',
    'CODIGO COMPOSICAO',
    'CÓDIGO DA COMPOSIÇÃO',
  ],
  DESCRICAO: [
    'DESCRICAO',
    'DESCRIÇÃO',
    'DESC',
    'DESCRICAO COMPOSICAO',
    'DESCRIÇÃO DO SERVIÇO',
  ],
  UNIDADE: ['UNIDADE', 'UN', 'UND', 'UNID'],
  PRECO_ONERADO: [
    'PRECO ONERADO',
    'PREÇO ONERADO',
    'VALOR ONERADO',
    'CUSTO TOTAL ONERADO',
    'CUSTO UNITARIO ONERADO',
  ],
  PRECO_DESONERADO: [
    'PRECO DESONERADO',
    'PREÇO DESONERADO',
    'VALOR DESONERADO',
    'CUSTO TOTAL DESONERADO',
    'CUSTO UNITARIO DESONERADO',
  ],
  CUSTO_MAO_DE_OBRA: ['CUSTO MAO DE OBRA', 'MÃO DE OBRA', 'MAO_OBRA', 'MO'],
  CUSTO_MATERIAL: ['CUSTO MATERIAL', 'MATERIAL', 'MAT'],
  CUSTO_EQUIPAMENTO: ['CUSTO EQUIPAMENTO', 'EQUIPAMENTO', 'EQUIP', 'EQ'],
  CUSTO_TRANSPORTE: ['CUSTO TRANSPORTE', 'TRANSPORTE', 'TRANSP'],
  CATEGORIA: ['CATEGORIA', 'CAT', 'CLASSE', 'GRUPO'],
};

/**
 * Parse options for SICRO Excel file
 */
export interface SicroParseOptions {
  /** State (UF) */
  uf: SicroUF;
  /** Reference month (YYYY-MM) */
  mesReferencia: string;
  /** Item type */
  tipo: SicroItemType;
  /** Transport mode */
  modoTransporte?: SicroModoTransporte;
}

/**
 * SICRO Excel Parser class
 */
export class SicroParser {
  private readonly logger = new Logger(SicroParser.name);

  /**
   * Parse SICRO Excel file from buffer
   *
   * @param buffer Excel file buffer
   * @param options Parse options (uf, mesReferencia, tipo)
   * @returns Parse result with items and any errors
   */
  async parseFromBuffer(
    buffer: Buffer,
    options: SicroParseOptions,
  ): Promise<SicroParseResult> {
    const startTime = Date.now();
    const errors: SicroParseError[] = [];

    try {
      // Read workbook from buffer
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Excel file contains no sheets');
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      // Convert to JSON array
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        {
          defval: '',
          raw: false,
        },
      );

      if (rows.length === 0) {
        return {
          items: [],
          count: 0,
          metadata: {
            ...options,
            url: '',
            filename: '',
          },
          errors: [{ message: 'Excel file contains no data rows' }],
          durationMs: Date.now() - startTime,
        };
      }

      // Detect column mapping from first row headers
      const headers = Object.keys(rows[0] || {});
      const columnMap =
        options.tipo === SicroItemType.INSUMO
          ? this.detectInsumoColumns(headers)
          : this.detectComposicaoColumns(headers);

      // Parse rows based on tipo
      const items: SicroPriceReference[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (options.tipo === SicroItemType.INSUMO) {
            const insumo = this.parseInsumoRow(row, columnMap, options);
            if (insumo && insumo.codigo && insumo.descricao) {
              // Create both onerado and desonerado versions
              items.push(
                transformInsumoToReference(
                  insumo,
                  options.uf,
                  options.mesReferencia,
                  false,
                ),
              );
              if (insumo.precoDesonerado) {
                items.push(
                  transformInsumoToReference(
                    insumo,
                    options.uf,
                    options.mesReferencia,
                    true,
                  ),
                );
              }
            }
          } else {
            const composicao = this.parseComposicaoRow(row, columnMap, options);
            if (composicao && composicao.codigo && composicao.descricao) {
              items.push(
                transformComposicaoToReference(
                  composicao,
                  options.uf,
                  options.mesReferencia,
                  false,
                ),
              );
              if (composicao.precoDesonerado) {
                items.push(
                  transformComposicaoToReference(
                    composicao,
                    options.uf,
                    options.mesReferencia,
                    true,
                  ),
                );
              }
            }
          }
        } catch (error) {
          errors.push({
            row: i + 2, // +2 for header row and 0-indexing
            message:
              error instanceof Error ? error.message : 'Unknown parse error',
          });
        }
      }

      const durationMs = Date.now() - startTime;
      this.logger.log(
        `Parsed ${items.length} SICRO items from ${rows.length} rows in ${durationMs}ms`,
      );

      return {
        items,
        count: items.length,
        metadata: {
          ...options,
          url: '',
          filename: '',
        },
        errors,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error(
        `Failed to parse SICRO Excel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        items: [],
        count: 0,
        metadata: {
          ...options,
          url: '',
          filename: '',
        },
        errors: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        durationMs,
      };
    }
  }

  /**
   * Parse SICRO Excel file from file path
   *
   * @param filePath Path to Excel file
   * @param options Parse options
   * @returns Parse result
   */
  async parseFromFile(
    filePath: string,
    options: SicroParseOptions,
  ): Promise<SicroParseResult> {
    const startTime = Date.now();

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Excel file contains no sheets');
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        worksheet,
        {
          defval: '',
          raw: false,
        },
      );

      // Reuse buffer parsing logic
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return this.parseFromBuffer(buffer, options);
    } catch (error) {
      return {
        items: [],
        count: 0,
        metadata: {
          ...options,
          url: '',
          filename: filePath,
        },
        errors: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Detect column mapping for Insumos spreadsheet
   */
  private detectInsumoColumns(
    headers: string[],
  ): Record<string, string | undefined> {
    const normalizedHeaders = headers.map((h) =>
      h
        .toUpperCase()
        .trim()
        .replace(/[^\w\s]/g, ''),
    );

    return {
      codigo: this.findColumn(
        normalizedHeaders,
        headers,
        INSUMO_COLUMNS.CODIGO,
      ),
      descricao: this.findColumn(
        normalizedHeaders,
        headers,
        INSUMO_COLUMNS.DESCRICAO,
      ),
      unidade: this.findColumn(
        normalizedHeaders,
        headers,
        INSUMO_COLUMNS.UNIDADE,
      ),
      precoOnerado: this.findColumn(
        normalizedHeaders,
        headers,
        INSUMO_COLUMNS.PRECO_ONERADO,
      ),
      precoDesonerado: this.findColumn(
        normalizedHeaders,
        headers,
        INSUMO_COLUMNS.PRECO_DESONERADO,
      ),
      categoria: this.findColumn(
        normalizedHeaders,
        headers,
        INSUMO_COLUMNS.CATEGORIA,
      ),
      categoriaDesc: this.findColumn(
        normalizedHeaders,
        headers,
        INSUMO_COLUMNS.CATEGORIA_DESC,
      ),
    };
  }

  /**
   * Detect column mapping for Composicoes spreadsheet
   */
  private detectComposicaoColumns(
    headers: string[],
  ): Record<string, string | undefined> {
    const normalizedHeaders = headers.map((h) =>
      h
        .toUpperCase()
        .trim()
        .replace(/[^\w\s]/g, ''),
    );

    return {
      codigo: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.CODIGO,
      ),
      descricao: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.DESCRICAO,
      ),
      unidade: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.UNIDADE,
      ),
      precoOnerado: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.PRECO_ONERADO,
      ),
      precoDesonerado: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.PRECO_DESONERADO,
      ),
      custoMaoDeObra: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.CUSTO_MAO_DE_OBRA,
      ),
      custoMaterial: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.CUSTO_MATERIAL,
      ),
      custoEquipamento: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.CUSTO_EQUIPAMENTO,
      ),
      custoTransporte: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.CUSTO_TRANSPORTE,
      ),
      categoria: this.findColumn(
        normalizedHeaders,
        headers,
        COMPOSICAO_COLUMNS.CATEGORIA,
      ),
    };
  }

  /**
   * Find column name from possible variants
   */
  private findColumn(
    normalizedHeaders: string[],
    originalHeaders: string[],
    variants: string[],
  ): string | undefined {
    for (const variant of variants) {
      const normalizedVariant = variant
        .toUpperCase()
        .trim()
        .replace(/[^\w\s]/g, '');
      const index = normalizedHeaders.findIndex(
        (h) => h === normalizedVariant || h.includes(normalizedVariant),
      );
      if (index !== -1) {
        return originalHeaders[index];
      }
    }
    return undefined;
  }

  /**
   * Parse a row into SicroInsumoRaw
   */
  private parseInsumoRow(
    row: Record<string, unknown>,
    columnMap: Record<string, string | undefined>,
    options: SicroParseOptions,
  ): SicroInsumoRaw | null {
    const codigo = this.getString(row, columnMap.codigo);
    const descricao = this.getString(row, columnMap.descricao);

    if (!codigo || !descricao) {
      return null;
    }

    return {
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      unidade: this.getString(row, columnMap.unidade) || 'UN',
      precoOnerado: this.getNumber(row, columnMap.precoOnerado),
      precoDesonerado: this.getNumber(row, columnMap.precoDesonerado),
      categoriaId: this.getString(row, columnMap.categoria),
      categoriaDescricao: this.getString(row, columnMap.categoriaDesc),
      modoTransporte: options.modoTransporte,
    };
  }

  /**
   * Parse a row into SicroComposicaoRaw
   */
  private parseComposicaoRow(
    row: Record<string, unknown>,
    columnMap: Record<string, string | undefined>,
    options: SicroParseOptions,
  ): SicroComposicaoRaw | null {
    const codigo = this.getString(row, columnMap.codigo);
    const descricao = this.getString(row, columnMap.descricao);

    if (!codigo || !descricao) {
      return null;
    }

    return {
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      unidade: this.getString(row, columnMap.unidade) || 'UN',
      precoOnerado: this.getNumber(row, columnMap.precoOnerado),
      precoDesonerado: this.getNumber(row, columnMap.precoDesonerado),
      custoMaoDeObra: this.getNumber(row, columnMap.custoMaoDeObra),
      custoMaterial: this.getNumber(row, columnMap.custoMaterial),
      custoEquipamento: this.getNumber(row, columnMap.custoEquipamento),
      custoTransporte: this.getNumber(row, columnMap.custoTransporte),
      categoria: this.parseCategoria(this.getString(row, columnMap.categoria)),
      modoTransporte: options.modoTransporte,
    };
  }

  /**
   * Get string value from row
   */
  private getString(
    row: Record<string, unknown>,
    column: string | undefined,
  ): string | undefined {
    if (!column) return undefined;
    const value = row[column];
    if (value === null || value === undefined) return undefined;
    return String(value).trim();
  }

  /**
   * Get number value from row
   */
  private getNumber(
    row: Record<string, unknown>,
    column: string | undefined,
  ): number | undefined {
    if (!column) return undefined;
    const value = row[column];
    if (value === null || value === undefined || value === '') return undefined;

    // Handle Brazilian number format (1.234,56 -> 1234.56)
    const strValue = String(value)
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const num = parseFloat(strValue);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse categoria string to enum
   */
  private parseCategoria(
    value: string | undefined,
  ): SicroCategoria | undefined {
    if (!value) return undefined;

    const upper = value.toUpperCase().trim();

    if (upper.includes('TERRAPLANAGEM')) return SicroCategoria.TERRAPLANAGEM;
    if (upper.includes('PAVIMENTACAO') || upper.includes('PAVIMENTAÇÃO'))
      return SicroCategoria.PAVIMENTACAO;
    if (upper.includes('DRENAGEM') || upper.includes('OAC'))
      return SicroCategoria.DRENAGEM_OAC;
    if (
      upper.includes('ARTE ESPECIAIS') ||
      upper.includes('PONTES') ||
      upper.includes('VIADUTOS')
    )
      return SicroCategoria.OBRAS_ARTE_ESPECIAIS;
    if (upper.includes('SINALIZACAO') || upper.includes('SINALIZAÇÃO'))
      return SicroCategoria.SINALIZACAO;
    if (upper.includes('COMPLEMENTAR'))
      return SicroCategoria.SERVICOS_COMPLEMENTARES;
    if (upper.includes('CONSERVACAO') || upper.includes('CONSERVAÇÃO'))
      return SicroCategoria.CONSERVACAO_RODOVIARIA;
    if (upper.includes('AMBIENTE')) return SicroCategoria.MEIO_AMBIENTE;
    if (upper.includes('EQUIPAMENTO')) return SicroCategoria.EQUIPAMENTOS;
    if (upper.includes('MAO DE OBRA') || upper.includes('MÃO DE OBRA'))
      return SicroCategoria.MAO_DE_OBRA;
    if (upper.includes('MATERIAL')) return SicroCategoria.MATERIAIS;
    if (upper.includes('TRANSPORTE')) return SicroCategoria.TRANSPORTES;

    return undefined;
  }
}

/**
 * Create a new SicroParser instance
 */
export function createSicroParser(): SicroParser {
  return new SicroParser();
}

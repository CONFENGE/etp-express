/**
 * SINAPI Excel Parser
 *
 * Parses SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da
 * Construção Civil) Excel spreadsheets from CAIXA.
 *
 * Supports parsing:
 * - Insumos (inputs/materials)
 * - Composições (compositions/assemblies)
 *
 * @module modules/gov-api/sinapi
 * @see https://github.com/CONFENGE/etp-express/issues/693
 */

import { Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import {
  SinapiInsumoRaw,
  SinapiComposicaoRaw,
  SinapiParseResult,
  SinapiParseError,
  SinapiItemType,
  SinapiPriceReference,
  transformInsumoToReference,
  transformComposicaoToReference,
  SinapiExcelMetadata,
} from './sinapi.types';

/**
 * Expected column headers for SINAPI Insumos spreadsheet
 */
const INSUMO_COLUMNS = {
  CODIGO: ['CODIGO', 'CÓDIGO', 'COD'],
  DESCRICAO: ['DESCRICAO', 'DESCRIÇÃO', 'DESC'],
  UNIDADE: ['UNIDADE', 'UN', 'UND'],
  PRECO_ONERADO: ['PRECO ONERADO', 'PREÇO ONERADO', 'VALOR ONERADO'],
  PRECO_DESONERADO: [
    'PRECO DESONERADO',
    'PREÇO DESONERADO',
    'VALOR DESONERADO',
  ],
  CLASSE: ['CLASSE', 'CLASSE_ID', 'COD_CLASSE'],
  CLASSE_DESC: ['CLASSE_DESCRICAO', 'CLASSE DESCRIÇÃO', 'DESC_CLASSE'],
};

/**
 * Expected column headers for SINAPI Composições spreadsheet
 */
const COMPOSICAO_COLUMNS = {
  CODIGO: ['CODIGO', 'CÓDIGO', 'COD', 'CODIGO COMPOSICAO'],
  DESCRICAO: ['DESCRICAO', 'DESCRIÇÃO', 'DESC', 'DESCRICAO COMPOSICAO'],
  UNIDADE: ['UNIDADE', 'UN', 'UND'],
  PRECO_ONERADO: [
    'PRECO ONERADO',
    'PREÇO ONERADO',
    'VALOR ONERADO',
    'CUSTO TOTAL ONERADO',
  ],
  PRECO_DESONERADO: [
    'PRECO DESONERADO',
    'PREÇO DESONERADO',
    'VALOR DESONERADO',
    'CUSTO TOTAL DESONERADO',
  ],
  CUSTO_MAO_DE_OBRA: ['CUSTO MAO DE OBRA', 'MÃO DE OBRA', 'MAO_OBRA'],
  CUSTO_MATERIAL: ['CUSTO MATERIAL', 'MATERIAL'],
  CUSTO_EQUIPAMENTO: ['CUSTO EQUIPAMENTO', 'EQUIPAMENTO', 'EQUIP'],
};

/**
 * SINAPI Excel Parser class
 */
export class SinapiParser {
  private readonly logger = new Logger(SinapiParser.name);

  /**
   * Parse SINAPI Excel file from buffer
   *
   * @param buffer Excel file buffer
   * @param metadata File metadata (uf, mesReferencia, tipo)
   * @returns Parse result with items and any errors
   */
  async parseFromBuffer(
    buffer: Buffer,
    metadata: Omit<SinapiExcelMetadata, 'url' | 'filename'>,
  ): Promise<SinapiParseResult> {
    const startTime = Date.now();
    const errors: SinapiParseError[] = [];

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
            ...metadata,
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
        metadata.tipo === SinapiItemType.INSUMO
          ? this.detectInsumoColumns(headers)
          : this.detectComposicaoColumns(headers);

      // Parse rows based on tipo
      const items: SinapiPriceReference[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (metadata.tipo === SinapiItemType.INSUMO) {
            const insumo = this.parseInsumoRow(row, columnMap);
            if (insumo && insumo.codigo && insumo.descricao) {
              // Create both onerado and desonerado versions
              items.push(
                transformInsumoToReference(
                  insumo,
                  metadata.uf,
                  metadata.mesReferencia,
                  false,
                ),
              );
              if (insumo.precoDesonerado) {
                items.push(
                  transformInsumoToReference(
                    insumo,
                    metadata.uf,
                    metadata.mesReferencia,
                    true,
                  ),
                );
              }
            }
          } else {
            const composicao = this.parseComposicaoRow(row, columnMap);
            if (composicao && composicao.codigo && composicao.descricao) {
              items.push(
                transformComposicaoToReference(
                  composicao,
                  metadata.uf,
                  metadata.mesReferencia,
                  false,
                ),
              );
              if (composicao.precoDesonerado) {
                items.push(
                  transformComposicaoToReference(
                    composicao,
                    metadata.uf,
                    metadata.mesReferencia,
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
        `Parsed ${items.length} SINAPI items from ${rows.length} rows in ${durationMs}ms`,
      );

      return {
        items,
        count: items.length,
        metadata: {
          ...metadata,
          url: '',
          filename: '',
        },
        errors,
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error(
        `Failed to parse SINAPI Excel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        items: [],
        count: 0,
        metadata: {
          ...metadata,
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
      codigo: this.findMatchingColumn(normalizedHeaders, INSUMO_COLUMNS.CODIGO),
      descricao: this.findMatchingColumn(
        normalizedHeaders,
        INSUMO_COLUMNS.DESCRICAO,
      ),
      unidade: this.findMatchingColumn(
        normalizedHeaders,
        INSUMO_COLUMNS.UNIDADE,
      ),
      precoOnerado: this.findMatchingColumn(
        normalizedHeaders,
        INSUMO_COLUMNS.PRECO_ONERADO,
      ),
      precoDesonerado: this.findMatchingColumn(
        normalizedHeaders,
        INSUMO_COLUMNS.PRECO_DESONERADO,
      ),
      classeId: this.findMatchingColumn(
        normalizedHeaders,
        INSUMO_COLUMNS.CLASSE,
      ),
      classeDescricao: this.findMatchingColumn(
        normalizedHeaders,
        INSUMO_COLUMNS.CLASSE_DESC,
      ),
    };
  }

  /**
   * Detect column mapping for Composições spreadsheet
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
      codigo: this.findMatchingColumn(
        normalizedHeaders,
        COMPOSICAO_COLUMNS.CODIGO,
      ),
      descricao: this.findMatchingColumn(
        normalizedHeaders,
        COMPOSICAO_COLUMNS.DESCRICAO,
      ),
      unidade: this.findMatchingColumn(
        normalizedHeaders,
        COMPOSICAO_COLUMNS.UNIDADE,
      ),
      precoOnerado: this.findMatchingColumn(
        normalizedHeaders,
        COMPOSICAO_COLUMNS.PRECO_ONERADO,
      ),
      precoDesonerado: this.findMatchingColumn(
        normalizedHeaders,
        COMPOSICAO_COLUMNS.PRECO_DESONERADO,
      ),
      custoMaoDeObra: this.findMatchingColumn(
        normalizedHeaders,
        COMPOSICAO_COLUMNS.CUSTO_MAO_DE_OBRA,
      ),
      custoMaterial: this.findMatchingColumn(
        normalizedHeaders,
        COMPOSICAO_COLUMNS.CUSTO_MATERIAL,
      ),
      custoEquipamento: this.findMatchingColumn(
        normalizedHeaders,
        COMPOSICAO_COLUMNS.CUSTO_EQUIPAMENTO,
      ),
    };
  }

  /**
   * Find a matching column from possible variations
   */
  private findMatchingColumn(
    headers: string[],
    variations: string[],
  ): string | undefined {
    for (const variation of variations) {
      const normalizedVariation = variation
        .toUpperCase()
        .trim()
        .replace(/[^\w\s]/g, '');
      const index = headers.findIndex(
        (h) =>
          h.includes(normalizedVariation) ||
          normalizedVariation.includes(h) ||
          h === normalizedVariation,
      );
      if (index !== -1) {
        return headers[index];
      }
    }
    return undefined;
  }

  /**
   * Parse a single row as Insumo
   */
  private parseInsumoRow(
    row: Record<string, unknown>,
    columnMap: Record<string, string | undefined>,
  ): SinapiInsumoRaw | null {
    const codigo = this.getStringValue(row, columnMap.codigo);
    const descricao = this.getStringValue(row, columnMap.descricao);

    if (!codigo || !descricao) {
      return null;
    }

    return {
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      unidade: this.getStringValue(row, columnMap.unidade) || 'UN',
      precoOnerado: this.parsePrice(row, columnMap.precoOnerado),
      precoDesonerado: this.parsePrice(row, columnMap.precoDesonerado),
      classeId: this.getStringValue(row, columnMap.classeId),
      classeDescricao: this.getStringValue(row, columnMap.classeDescricao),
    };
  }

  /**
   * Parse a single row as Composição
   */
  private parseComposicaoRow(
    row: Record<string, unknown>,
    columnMap: Record<string, string | undefined>,
  ): SinapiComposicaoRaw | null {
    const codigo = this.getStringValue(row, columnMap.codigo);
    const descricao = this.getStringValue(row, columnMap.descricao);

    if (!codigo || !descricao) {
      return null;
    }

    return {
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      unidade: this.getStringValue(row, columnMap.unidade) || 'UN',
      precoOnerado: this.parsePrice(row, columnMap.precoOnerado),
      precoDesonerado: this.parsePrice(row, columnMap.precoDesonerado),
      custoMaoDeObra: this.parsePrice(row, columnMap.custoMaoDeObra),
      custoMaterial: this.parsePrice(row, columnMap.custoMaterial),
      custoEquipamento: this.parsePrice(row, columnMap.custoEquipamento),
    };
  }

  /**
   * Get string value from row
   */
  private getStringValue(
    row: Record<string, unknown>,
    columnKey?: string,
  ): string | undefined {
    if (!columnKey) return undefined;

    // Try to find the value with different key variations
    for (const key of Object.keys(row)) {
      if (
        key
          .toUpperCase()
          .trim()
          .replace(/[^\w\s]/g, '') ===
        columnKey
          .toUpperCase()
          .trim()
          .replace(/[^\w\s]/g, '')
      ) {
        const value = row[key];
        if (value === null || value === undefined) return undefined;
        return String(value);
      }
    }

    const value = row[columnKey];
    if (value === null || value === undefined) return undefined;
    return String(value);
  }

  /**
   * Parse price value from row
   */
  private parsePrice(
    row: Record<string, unknown>,
    columnKey?: string,
  ): number | undefined {
    const stringValue = this.getStringValue(row, columnKey);
    if (!stringValue) return undefined;

    // Handle Brazilian number format (1.234,56 -> 1234.56)
    const normalized = stringValue
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? undefined : parsed;
  }
}

/**
 * Create a new SINAPI parser instance
 */
export function createSinapiParser(): SinapiParser {
  return new SinapiParser();
}

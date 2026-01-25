/**
 * Edital Extraction Service
 *
 * Service for extracting structured data from public bidding documents (editais)
 * using PageIndex tree search. This is part of M13: Market Intelligence module.
 *
 * Features:
 * - Extracts structured data from editais using LLM reasoning
 * - Templates for different edital types (Pregão, Concorrência)
 * - Validates extracted data with confidence scoring
 * - Flags for manual review when confidence < 80
 *
 * Algorithm:
 * 1. Use TreeSearchService to find relevant document sections
 * 2. Apply extraction template based on edital type
 * 3. Parse and structure data using LLM
 * 4. Validate completeness and confidence
 * 5. Return structured data with metadata
 *
 * @module modules/pageindex/services/edital-extraction
 * @see Issue #1695 - [INTEL-1545b] Implementar EditalExtractionService
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TreeSearchService } from './tree-search.service';
import {
  EditalExtractedData,
  EditalExtractionResult,
  EditalTipo,
  EditalValidationResult,
  EditalLote,
  EditalItem,
} from '../dto/edital-extracted-data.dto';
import {
  OpenAIService,
  LLMRequest,
} from '../../orchestrator/llm/openai.service';
import { TreeSearchResult } from '../interfaces/tree-node.interface';

/**
 * Template for extracting data from Pregão editais
 */
const PREGAO_EXTRACTION_TEMPLATE = `
You are analyzing a Pregão (competitive bidding) document from Brazilian government.

Your task is to extract the following information:
1. **objeto**: The procurement object/purpose (string)
2. **lotes**: Array of lots, each containing:
   - numero: Lot number (integer)
   - descricao: Lot description (string)
   - itens: Array of items, each containing:
     - codigo: Item code (string, may be CATMAT/CATSER)
     - descricao: Item description (string)
     - quantidade: Quantity (number)
     - unidade: Unit of measurement (string)
     - precoUnitario: Unit price (number, optional)
     - precoTotal: Total price (number, optional)
3. **valorTotal**: Total value of the procurement (number, optional)
4. **prazoExecucao**: Execution deadline in days (number, optional)
5. **numeroProcesso**: Process/bidding number (string, optional)
6. **codigoUasg**: UASG code (string, optional)
7. **nomeUasg**: UASG name (string, optional)
8. **dataAbertura**: Opening date (string YYYY-MM-DD, optional)
9. **dataHomologacao**: Homologation date (string YYYY-MM-DD, optional)

Return ONLY valid JSON with this exact structure:
{
  "tipo": "PREGAO",
  "objeto": "...",
  "lotes": [...],
  "valorTotal": 0,
  "prazoExecucao": 0,
  "numeroProcesso": "...",
  "codigoUasg": "...",
  "nomeUasg": "...",
  "dataAbertura": "YYYY-MM-DD",
  "dataHomologacao": "YYYY-MM-DD"
}

Include only fields that you can confidently extract from the text. Omit optional fields if not found.
`;

/**
 * Template for extracting data from Concorrência editais
 */
const CONCORRENCIA_EXTRACTION_TEMPLATE = `
You are analyzing a Concorrência (public tender) document from Brazilian government.

Your task is to extract the following information:
1. **objeto**: The procurement object/purpose (string)
2. **lotes**: Array of lots, each containing:
   - numero: Lot number (integer)
   - descricao: Lot description (string)
   - itens: Array of items, each containing:
     - codigo: Item code (string)
     - descricao: Item description (string)
     - quantidade: Quantity (number)
     - unidade: Unit of measurement (string)
     - precoUnitario: Unit price (number, optional)
     - precoTotal: Total price (number, optional)
3. **valorTotal**: Total value of the procurement (number, optional)
4. **prazoExecucao**: Execution deadline in days (number, optional)
5. **numeroProcesso**: Process/bidding number (string, optional)
6. **codigoUasg**: UASG code (string, optional)
7. **nomeUasg**: UASG name (string, optional)
8. **dataAbertura**: Opening date (string YYYY-MM-DD, optional)
9. **dataHomologacao**: Homologation date (string YYYY-MM-DD, optional)

Return ONLY valid JSON with this exact structure:
{
  "tipo": "CONCORRENCIA",
  "objeto": "...",
  "lotes": [...],
  "valorTotal": 0,
  "prazoExecucao": 0,
  "numeroProcesso": "...",
  "codigoUasg": "...",
  "nomeUasg": "...",
  "dataAbertura": "YYYY-MM-DD",
  "dataHomologacao": "YYYY-MM-DD"
}

Include only fields that you can confidently extract from the text. Omit optional fields if not found.
`;

/**
 * EditalExtractionService - Extract structured data from editais using PageIndex
 *
 * @example
 * ```typescript
 * const result = await editalExtractionService.extractStructuredData(
 *   'edital-tree-id',
 *   EditalTipo.PREGAO
 * );
 *
 * if (result.requiresManualReview) {
 *   console.log('Low confidence - manual review required');
 * }
 * ```
 */
@Injectable()
export class EditalExtractionService {
  private readonly logger = new Logger(EditalExtractionService.name);

  constructor(
    private readonly treeSearchService: TreeSearchService,
    private readonly openAIService: OpenAIService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('EditalExtractionService initialized');
  }

  /**
   * Extract structured data from an edital document.
   *
   * @param treeId - ID of the document tree to extract from
   * @param tipo - Type of edital (PREGAO, CONCORRENCIA, etc.)
   * @returns Extraction result with structured data and metadata
   *
   * @throws NotFoundException if tree not found
   */
  async extractStructuredData(
    treeId: string,
    tipo: EditalTipo = EditalTipo.UNKNOWN,
  ): Promise<EditalExtractionResult> {
    const startTime = Date.now();
    this.logger.log('Starting edital extraction', { treeId, tipo });

    try {
      // Step 1: Search for relevant sections in the tree
      const searchResult = await this.searchRelevantSections(treeId, tipo);

      // Step 2: Extract structured data using LLM
      const extractedData = await this.extractDataWithLLM(
        searchResult,
        tipo,
      );

      // Step 3: Validate extracted data
      const validation = this.validateExtractedData(extractedData);

      const extractionTimeMs = Date.now() - startTime;

      this.logger.log('Edital extraction completed', {
        treeId,
        tipo: extractedData.tipo,
        lotesCount: extractedData.lotes.length,
        confidence: validation.confidence,
        extractionTimeMs,
      });

      return {
        data: extractedData,
        confidence: validation.confidence,
        isValid: validation.isValid,
        errors: validation.errors,
        requiresManualReview: validation.requiresManualReview,
        reasoning: searchResult.reasoning,
        extractionTimeMs,
      };
    } catch (error) {
      this.logger.error('Failed to extract edital data', {
        treeId,
        tipo,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search for relevant sections in the document tree.
   *
   * @param treeId - Document tree ID
   * @param tipo - Edital type
   * @returns Tree search result with relevant nodes
   */
  private async searchRelevantSections(
    treeId: string,
    tipo: EditalTipo,
  ): Promise<TreeSearchResult> {
    // Build query based on edital type
    const query = this.buildSearchQuery(tipo);

    // Search with increased depth and results for comprehensive extraction
    const searchResult = await this.treeSearchService.search(treeId, query, {
      maxDepth: 5,
      maxResults: 10,
      minConfidence: 0.3,
      includeContent: true,
    });

    if (searchResult.relevantNodes.length === 0) {
      throw new Error(
        `No relevant sections found in document tree ${treeId} for query: ${query}`,
      );
    }

    return searchResult;
  }

  /**
   * Build search query based on edital type.
   *
   * @param tipo - Edital type
   * @returns Search query string
   */
  private buildSearchQuery(tipo: EditalTipo): string {
    const baseQuery =
      'Procure por seções que contenham: objeto da licitação, lotes, itens, quantidades, preços, prazos de execução';

    switch (tipo) {
      case EditalTipo.PREGAO:
        return `${baseQuery}, especificações de pregão eletrônico`;
      case EditalTipo.CONCORRENCIA:
        return `${baseQuery}, especificações de concorrência pública`;
      case EditalTipo.DISPENSA:
        return `${baseQuery}, justificativa de dispensa de licitação`;
      case EditalTipo.INEXIGIBILIDADE:
        return `${baseQuery}, justificativa de inexigibilidade`;
      default:
        return baseQuery;
    }
  }

  /**
   * Extract structured data from search results using LLM.
   *
   * @param searchResult - Tree search result
   * @param tipo - Edital type
   * @returns Extracted structured data
   */
  private async extractDataWithLLM(
    searchResult: TreeSearchResult,
    tipo: EditalTipo,
  ): Promise<EditalExtractedData> {
    // Select appropriate template
    const template = this.getExtractionTemplate(tipo);

    // Combine content from relevant nodes
    const combinedContent = searchResult.relevantNodes
      .map((node) => `## ${node.title}\n${node.content || ''}`)
      .join('\n\n');

    const userPrompt = `${template}\n\n## Document Content:\n${combinedContent}`;

    const llmRequest: LLMRequest = {
      systemPrompt:
        'You are a specialist in extracting structured data from Brazilian government bidding documents (editais). ' +
        'Return ONLY valid JSON with the requested structure. Do not include markdown code blocks or explanations.',
      userPrompt,
      temperature: 0.2, // Low temperature for deterministic extraction
      maxTokens: 2000,
    };

    try {
      const response = await this.openAIService.generateCompletion(llmRequest);
      const extracted = this.parseExtractionResponse(response.content, tipo);
      return extracted;
    } catch (error) {
      this.logger.error('Failed to extract data with LLM', { error });
      throw new Error(`LLM extraction failed: ${error.message}`);
    }
  }

  /**
   * Get extraction template based on edital type.
   *
   * @param tipo - Edital type
   * @returns Extraction template string
   */
  private getExtractionTemplate(tipo: EditalTipo): string {
    switch (tipo) {
      case EditalTipo.PREGAO:
        return PREGAO_EXTRACTION_TEMPLATE;
      case EditalTipo.CONCORRENCIA:
        return CONCORRENCIA_EXTRACTION_TEMPLATE;
      default:
        return PREGAO_EXTRACTION_TEMPLATE; // Default to Pregão template
    }
  }

  /**
   * Parse LLM response into EditalExtractedData.
   *
   * @param content - Raw LLM response content
   * @param expectedTipo - Expected edital type
   * @returns Parsed extracted data
   */
  private parseExtractionResponse(
    content: string,
    expectedTipo: EditalTipo,
  ): EditalExtractedData {
    try {
      // Extract JSON from response (may have markdown code blocks)
      let jsonContent = content.trim();

      // Remove markdown code blocks if present
      const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
      }

      // Parse JSON
      const parsed = JSON.parse(jsonContent);

      // Validate structure
      if (!parsed.objeto || !Array.isArray(parsed.lotes)) {
        throw new Error('Invalid structure: missing objeto or lotes');
      }

      // Ensure tipo is set correctly
      if (!parsed.tipo || !Object.values(EditalTipo).includes(parsed.tipo)) {
        parsed.tipo = expectedTipo;
      }

      // Validate lotes structure
      parsed.lotes = this.validateLotes(parsed.lotes);

      return parsed as EditalExtractedData;
    } catch (error) {
      this.logger.error('Failed to parse extraction response', {
        error,
        contentPreview: content.substring(0, 200),
      });
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
  }

  /**
   * Validate and normalize lotes structure.
   *
   * @param lotes - Raw lotes array
   * @returns Validated lotes array
   */
  private validateLotes(lotes: unknown[]): EditalLote[] {
    return lotes
      .filter((lote: unknown) => {
        return (
          typeof lote === 'object' &&
          lote !== null &&
          'numero' in lote &&
          'descricao' in lote &&
          'itens' in lote
        );
      })
      .map((lote: unknown) => {
        const l = lote as EditalLote;
        return {
          numero: Number(l.numero),
          descricao: String(l.descricao),
          itens: this.validateItens(l.itens),
        };
      });
  }

  /**
   * Validate and normalize itens structure.
   *
   * @param itens - Raw itens array
   * @returns Validated itens array
   */
  private validateItens(itens: unknown[]): EditalItem[] {
    if (!Array.isArray(itens)) {
      return [];
    }

    return itens
      .filter((item: unknown) => {
        return (
          typeof item === 'object' &&
          item !== null &&
          'codigo' in item &&
          'descricao' in item &&
          'quantidade' in item &&
          'unidade' in item
        );
      })
      .map((item: unknown) => {
        const i = item as EditalItem;
        return {
          codigo: String(i.codigo),
          descricao: String(i.descricao),
          quantidade: Number(i.quantidade),
          unidade: String(i.unidade),
          precoUnitario: i.precoUnitario ? Number(i.precoUnitario) : undefined,
          precoTotal: i.precoTotal ? Number(i.precoTotal) : undefined,
        };
      });
  }

  /**
   * Validate extracted data and compute confidence score.
   *
   * @param data - Extracted data
   * @returns Validation result with confidence and errors
   */
  private validateExtractedData(
    data: EditalExtractedData,
  ): EditalValidationResult {
    const errors: string[] = [];
    let confidence = 100;

    // Validate objeto
    if (!data.objeto || data.objeto.length < 10) {
      errors.push('Objeto is missing or too short');
      confidence -= 20;
    }

    // Validate lotes
    if (!data.lotes || data.lotes.length === 0) {
      errors.push('No lotes found');
      confidence -= 30;
    } else {
      // Validate each lote
      data.lotes.forEach((lote, idx) => {
        if (!lote.descricao || lote.descricao.length < 5) {
          errors.push(`Lote ${idx + 1}: description missing or too short`);
          confidence -= 5;
        }

        if (!lote.itens || lote.itens.length === 0) {
          errors.push(`Lote ${idx + 1}: no items found`);
          confidence -= 10;
        } else {
          // Validate each item
          lote.itens.forEach((item, itemIdx) => {
            if (!item.descricao || item.descricao.length < 5) {
              errors.push(
                `Lote ${idx + 1}, Item ${itemIdx + 1}: description missing`,
              );
              confidence -= 2;
            }

            if (!item.quantidade || item.quantidade <= 0) {
              errors.push(
                `Lote ${idx + 1}, Item ${itemIdx + 1}: invalid quantity`,
              );
              confidence -= 2;
            }
          });
        }
      });
    }

    // Optional fields reduce confidence if missing but are not errors
    if (!data.valorTotal) {
      confidence -= 5;
    }

    if (!data.prazoExecucao) {
      confidence -= 5;
    }

    if (!data.numeroProcesso) {
      confidence -= 5;
    }

    // Clamp confidence to [0, 100]
    confidence = Math.max(0, Math.min(100, confidence));

    const isValid = errors.length === 0 && confidence >= 60;
    const requiresManualReview = confidence < 80;

    return {
      isValid,
      confidence,
      errors,
      requiresManualReview,
    };
  }
}

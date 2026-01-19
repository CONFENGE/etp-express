import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  ItemCategory,
  ItemCategoryType,
} from '../../../entities/item-category.entity';
import { OpenAIService } from '../../orchestrator/llm/openai.service';
import {
  ContractItem,
  NormalizedItem,
  ItemFeatures,
  UNIT_NORMALIZATION_MAP,
} from '../dto/normalized-item.dto';

/**
 * Service for normalizing and classifying contract items using LLM.
 *
 * This service is part of the M13: Market Intelligence milestone and enables:
 * - Item classification into CATMAT/CATSER categories
 * - Unit of measurement normalization
 * - Feature extraction from descriptions
 * - Confidence scoring for classifications
 *
 * @see Issue #1603 - ItemNormalizationService with LLM classification
 * @see Issue #1270 - Price normalization and categorization (Parent)
 * @see Issue #1602 - ItemCategory entity (Dependency)
 */
@Injectable()
export class ItemNormalizationService {
  private readonly logger = new Logger(ItemNormalizationService.name);

  /**
   * Keywords that indicate a service (CATSER) item.
   */
  private readonly SERVICE_KEYWORDS = [
    'serviço',
    'servico',
    'manutenção',
    'manutencao',
    'consultoria',
    'assessoria',
    'suporte',
    'treinamento',
    'capacitação',
    'capacitacao',
    'instalação',
    'instalacao',
    'configuração',
    'configuracao',
    'limpeza',
    'vigilância',
    'vigilancia',
    'segurança',
    'seguranca',
    'transporte',
    'frete',
    'locação',
    'locacao',
    'aluguel',
    'mão de obra',
    'mao de obra',
    'terceirização',
    'terceirizacao',
    'hospedagem',
    'licenciamento',
    'assinatura',
  ];

  /**
   * Keywords that indicate a material (CATMAT) item.
   */
  private readonly MATERIAL_KEYWORDS = [
    'material',
    'equipamento',
    'aparelho',
    'dispositivo',
    'máquina',
    'maquina',
    'computador',
    'notebook',
    'impressora',
    'monitor',
    'teclado',
    'mouse',
    'cabo',
    'papel',
    'toner',
    'cartucho',
    'mobiliário',
    'mobiliario',
    'cadeira',
    'mesa',
    'armário',
    'armario',
    'ar condicionado',
    'veículo',
    'veiculo',
    'peça',
    'peca',
    'componente',
    'ferramenta',
    'insumo',
    'medicamento',
    'vacina',
    'alimento',
    'combustível',
    'combustivel',
  ];

  constructor(
    @InjectRepository(ItemCategory)
    private readonly categoryRepository: Repository<ItemCategory>,
    private readonly llmService: OpenAIService,
  ) {}

  /**
   * Normalizes a single contract item.
   *
   * The normalization process:
   * 1. Extracts features from the item description
   * 2. Normalizes the unit of measurement
   * 3. Checks for existing CATMAT/CATSER codes
   * 4. Classifies via LLM if no code exists
   * 5. Returns confidence score and requires review flag
   *
   * @param item - Contract item to normalize
   * @returns Normalized item with category and confidence
   */
  async normalizeItem(item: ContractItem): Promise<NormalizedItem> {
    this.logger.debug(`Normalizing item: ${item.id}`);
    const startTime = Date.now();

    try {
      // 1. Extract features from description
      const features = this.extractFeatures(item);

      // 2. Normalize unit
      const normalizedUnit = this.normalizeUnit(item.unit);

      // 3. Check if item already has CATMAT/CATSER code
      if (item.catmatCode || item.catserCode) {
        const code = item.catmatCode || item.catserCode;
        const category = await this.findCategoryByCode(code!);

        if (category) {
          this.logger.debug(
            `Item ${item.id} already classified: ${category.code}`,
          );
          return this.buildNormalizedItem(
            item,
            category,
            features,
            normalizedUnit,
            {
              confidence: 1.0,
              method: 'source',
            },
          );
        }
      }

      // 4. Classify via LLM
      const classification = await this.classifyWithLlm(features);

      // 5. Find category by code
      let category: ItemCategory | null = null;
      if (classification.categoryCode) {
        category = await this.findCategoryByCode(classification.categoryCode);

        // If not found by exact code, try fuzzy match
        if (!category) {
          category = await this.findCategoryByName(features.description);
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `Item ${item.id} normalized in ${processingTime}ms. Confidence: ${classification.confidence}`,
      );

      return this.buildNormalizedItem(
        item,
        category,
        features,
        normalizedUnit,
        {
          confidence: classification.confidence,
          method: 'llm',
        },
      );
    } catch (error) {
      this.logger.error(`Error normalizing item ${item.id}:`, error);

      // Return item with null category and low confidence
      const features = this.extractFeatures(item);
      const normalizedUnit = this.normalizeUnit(item.unit);

      return this.buildNormalizedItem(item, null, features, normalizedUnit, {
        confidence: 0,
        method: 'llm',
        reviewNotes: `Error during normalization: ${error.message}`,
      });
    }
  }

  /**
   * Extracts features from a contract item for classification.
   *
   * @param item - Contract item
   * @returns Extracted features
   */
  extractFeatures(item: ContractItem): ItemFeatures {
    const description = this.cleanDescription(item.description);
    const keywords = this.extractKeywords(description);
    const estimatedCategory = this.estimateCategory(description, keywords);

    return {
      description,
      keywords,
      unit: item.unit,
      estimatedCategory,
      quantity: item.quantity,
      price: item.unitPrice,
    };
  }

  /**
   * Cleans and normalizes an item description.
   *
   * @param description - Raw description
   * @returns Cleaned description
   */
  private cleanDescription(description: string): string {
    if (!description) return '';

    return description
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents for processing
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extracts keywords from a description.
   *
   * @param description - Cleaned description
   * @returns Array of keywords
   */
  private extractKeywords(description: string): string[] {
    const stopWords = new Set([
      'de',
      'da',
      'do',
      'das',
      'dos',
      'e',
      'ou',
      'para',
      'com',
      'sem',
      'por',
      'em',
      'a',
      'o',
      'as',
      'os',
      'um',
      'uma',
      'uns',
      'umas',
      'ao',
      'aos',
      'na',
      'nas',
      'no',
      'nos',
      'pelo',
      'pela',
      'pelos',
      'pelas',
      'que',
      'se',
      'como',
      'mais',
      'menos',
      'muito',
      'pouco',
      'todo',
      'toda',
      'todos',
      'todas',
      'este',
      'esta',
      'estes',
      'estas',
      'esse',
      'essa',
      'esses',
      'essas',
      'aquele',
      'aquela',
      'aqueles',
      'aquelas',
      'tipo',
      'conf',
      'conforme',
      'ref',
      'referencia',
      'marca',
      'modelo',
    ]);

    const words = description.split(' ');
    const keywords = words.filter(
      (word) => word.length > 2 && !stopWords.has(word),
    );

    // Return unique keywords, maintaining order
    return [...new Set(keywords)].slice(0, 20);
  }

  /**
   * Estimates whether an item is material (CATMAT) or service (CATSER).
   *
   * @param description - Cleaned description
   * @param keywords - Extracted keywords
   * @returns Estimated category type
   */
  private estimateCategory(
    description: string,
    keywords: string[],
  ): 'material' | 'servico' {
    const text = description + ' ' + keywords.join(' ');

    const serviceMatches = this.SERVICE_KEYWORDS.filter((kw) =>
      text.includes(
        kw
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      ),
    ).length;

    const materialMatches = this.MATERIAL_KEYWORDS.filter((kw) =>
      text.includes(
        kw
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      ),
    ).length;

    return serviceMatches > materialMatches ? 'servico' : 'material';
  }

  /**
   * Normalizes a unit of measurement to standard format.
   *
   * @param unit - Original unit
   * @returns Normalized unit
   */
  normalizeUnit(unit: string): string {
    if (!unit) return 'UN';

    const normalizedKey = unit.toUpperCase().trim();
    return UNIT_NORMALIZATION_MAP[normalizedKey] || normalizedKey;
  }

  /**
   * Classifies an item using LLM based on extracted features.
   *
   * @param features - Extracted item features
   * @returns Classification result with category code and confidence
   */
  private async classifyWithLlm(
    features: ItemFeatures,
  ): Promise<{ categoryCode: string | null; confidence: number }> {
    try {
      // Get available categories for the estimated type
      const categoryType =
        features.estimatedCategory === 'servico'
          ? ItemCategoryType.CATSER
          : ItemCategoryType.CATMAT;

      const categories = await this.categoryRepository.find({
        where: { type: categoryType, active: true },
        select: ['code', 'name', 'keywords'],
        take: 50, // Limit to top 50 categories for prompt size
      });

      if (categories.length === 0) {
        this.logger.warn('No categories found for classification');
        return { categoryCode: null, confidence: 0 };
      }

      const categoryList = categories
        .map((c) => `${c.code}: ${c.name}`)
        .join('\n');

      const systemPrompt = `Você é um especialista em classificação de itens de contratações públicas brasileiras.
Sua tarefa é classificar itens em categorias CATMAT (materiais) ou CATSER (serviços).

IMPORTANTE:
- Responda APENAS com o código da categoria mais adequada (ex: CATMAT-44122)
- Se não conseguir classificar com confiança, responda "UNKNOWN"
- Considere a descrição, palavras-chave e unidade de medida
- Materiais geralmente têm unidades como UN, KG, M², CX
- Serviços geralmente têm unidades como H, DIA, MES, SV`;

      const userPrompt = `Classifique o seguinte item:

Descrição: ${features.description}
Palavras-chave: ${features.keywords.join(', ')}
Unidade: ${features.unit}
Tipo estimado: ${features.estimatedCategory}

Categorias disponíveis (${categoryType}):
${categoryList}

Responda APENAS com o código da categoria (ex: CATMAT-44122) ou UNKNOWN:`;

      const response = await this.llmService.generateCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.1, // Low temperature for deterministic classification
        maxTokens: 50, // We only need the category code
      });

      const categoryCode = response.content.trim().toUpperCase();

      // Validate response
      if (
        categoryCode === 'UNKNOWN' ||
        !categoryCode.match(/^CAT(MAT|SER)-\d+$/)
      ) {
        return { categoryCode: null, confidence: 0.3 };
      }

      // Check if category exists
      const categoryExists = categories.some((c) => c.code === categoryCode);
      const confidence = categoryExists ? 0.85 : 0.5;

      return { categoryCode: categoryExists ? categoryCode : null, confidence };
    } catch (error) {
      this.logger.error('Error classifying with LLM:', error);
      return { categoryCode: null, confidence: 0 };
    }
  }

  /**
   * Finds a category by its exact code.
   *
   * @param code - Category code (e.g., CATMAT-44122)
   * @returns Category or null
   */
  private async findCategoryByCode(code: string): Promise<ItemCategory | null> {
    return this.categoryRepository.findOne({
      where: { code: code.toUpperCase(), active: true },
    });
  }

  /**
   * Finds a category by name/description similarity.
   *
   * @param description - Item description to match
   * @returns Best matching category or null
   */
  private async findCategoryByName(
    description: string,
  ): Promise<ItemCategory | null> {
    // Try to find a category by partial name match
    const keywords = this.extractKeywords(description).slice(0, 3);

    if (keywords.length === 0) {
      return null;
    }

    // Search for categories matching any of the main keywords
    const category = await this.categoryRepository.findOne({
      where: keywords.map((kw) => ({
        name: ILike(`%${kw}%`),
        active: true,
      })),
    });

    return category;
  }

  /**
   * Builds the normalized item result.
   *
   * @param item - Original item
   * @param category - Assigned category (or null)
   * @param features - Extracted features
   * @param normalizedUnit - Normalized unit
   * @param classification - Classification metadata
   * @returns Normalized item
   */
  private buildNormalizedItem(
    item: ContractItem,
    category: ItemCategory | null,
    features: ItemFeatures,
    normalizedUnit: string,
    classification: {
      confidence: number;
      method: 'source' | 'llm' | 'similarity' | 'manual';
      reviewNotes?: string;
    },
  ): NormalizedItem {
    const requiresReview = classification.confidence < 0.5 || category === null;

    return {
      ...item,
      category: category
        ? {
            id: category.id,
            code: category.code,
            name: category.name,
            type: category.type,
          }
        : null,
      normalizedUnit,
      features,
      confidence: classification.confidence,
      classificationMethod: classification.method,
      normalizedAt: new Date(),
      requiresReview,
      reviewNotes: requiresReview
        ? classification.reviewNotes ||
          'Low confidence classification. Manual review recommended.'
        : undefined,
    };
  }

  /**
   * Gets available categories for a given type.
   *
   * @param type - Category type (CATMAT or CATSER)
   * @returns List of active categories
   */
  async getCategories(type?: ItemCategoryType): Promise<ItemCategory[]> {
    const where: { active: boolean; type?: ItemCategoryType } = {
      active: true,
    };
    if (type) {
      where.type = type;
    }

    return this.categoryRepository.find({
      where,
      order: { code: 'ASC' },
    });
  }

  /**
   * Gets category suggestions for an item description.
   *
   * @param description - Item description
   * @param limit - Maximum suggestions to return
   * @returns List of suggested categories with relevance scores
   */
  async suggestCategories(
    description: string,
    limit = 5,
  ): Promise<Array<{ category: ItemCategory; relevance: number }>> {
    const features = this.extractFeatures({
      id: 'suggest',
      description,
      unit: 'UN',
      source: 'manual',
    });

    const categoryType =
      features.estimatedCategory === 'servico'
        ? ItemCategoryType.CATSER
        : ItemCategoryType.CATMAT;

    // Get categories matching keywords
    const keywords = features.keywords.slice(0, 5);
    const suggestions: Array<{ category: ItemCategory; relevance: number }> =
      [];

    for (const keyword of keywords) {
      const matches = await this.categoryRepository.find({
        where: [
          { name: ILike(`%${keyword}%`), type: categoryType, active: true },
          { keywords: ILike(`%${keyword}%`), type: categoryType, active: true },
        ],
        take: limit,
      });

      for (const match of matches) {
        const existing = suggestions.find((s) => s.category.id === match.id);
        if (existing) {
          existing.relevance += 0.2; // Boost for multiple keyword matches
        } else {
          suggestions.push({ category: match, relevance: 0.5 });
        }
      }
    }

    // Sort by relevance and return top results
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }
}

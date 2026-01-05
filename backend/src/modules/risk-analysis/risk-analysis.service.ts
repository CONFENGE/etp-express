/**
 * Risk Analysis Service
 *
 * Provides risk calculation and management for ETP risk analysis sections.
 * Implements probability x impact matrix for risk level determination
 * and global score calculation.
 *
 * @module modules/risk-analysis
 * @see https://github.com/CONFENGE/etp-express/issues/1160
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateRiskItemDto,
  DefaultMitigationSuggestions,
  RiskCategory,
  RiskDistribution,
  RiskImpact,
  RiskItem,
  RiskLevel,
  RiskMatrix,
  RiskProbability,
  RISK_LEVEL_MATRIX,
  RISK_LEVEL_WEIGHTS,
  RISK_MATRIX_VERSION,
  UpdateRiskItemDto,
} from './risk-analysis.types';

@Injectable()
export class RiskAnalysisService {
  private readonly logger = new Logger(RiskAnalysisService.name);

  /**
   * Calculate risk level based on probability and impact
   *
   * Uses the standard 3x3 risk matrix:
   * - LOW x LOW = LOW
   * - LOW x MEDIUM = LOW
   * - LOW x HIGH = MEDIUM
   * - MEDIUM x LOW = LOW
   * - MEDIUM x MEDIUM = MEDIUM
   * - MEDIUM x HIGH = HIGH
   * - HIGH x LOW = MEDIUM
   * - HIGH x MEDIUM = HIGH
   * - HIGH x HIGH = CRITICAL
   *
   * @param probability - Probability level (LOW, MEDIUM, HIGH)
   * @param impact - Impact level (LOW, MEDIUM, HIGH)
   * @returns Calculated risk level
   */
  calculateRiskLevel(
    probability: RiskProbability,
    impact: RiskImpact,
  ): RiskLevel {
    return RISK_LEVEL_MATRIX[probability][impact];
  }

  /**
   * Create a new risk item with calculated level
   *
   * @param dto - Risk item data
   * @param order - Order in the list (optional, defaults to 0)
   * @returns Complete risk item with calculated level
   */
  createRiskItem(dto: CreateRiskItemDto, order = 0): RiskItem {
    const level = this.calculateRiskLevel(dto.probability, dto.impact);

    return {
      id: uuidv4(),
      category: dto.category,
      description: dto.description,
      probability: dto.probability,
      impact: dto.impact,
      level,
      mitigation: dto.mitigation,
      responsible: dto.responsible,
      order,
    };
  }

  /**
   * Update an existing risk item
   *
   * @param existingItem - Current risk item
   * @param updates - Partial updates
   * @returns Updated risk item with recalculated level
   */
  updateRiskItem(existingItem: RiskItem, updates: UpdateRiskItemDto): RiskItem {
    const probability = updates.probability ?? existingItem.probability;
    const impact = updates.impact ?? existingItem.impact;
    const level = this.calculateRiskLevel(probability, impact);

    return {
      ...existingItem,
      ...updates,
      probability,
      impact,
      level,
    };
  }

  /**
   * Calculate global risk score from a list of risk items
   *
   * Score calculation:
   * 1. Assign weights: LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4
   * 2. Sum all weights
   * 3. Calculate max possible (items * 4)
   * 4. Score = (sum / max) * 100
   *
   * @param risks - List of risk items
   * @returns Global score (0-100)
   */
  calculateGlobalScore(risks: RiskItem[]): number {
    if (risks.length === 0) {
      return 0;
    }

    const totalWeight = risks.reduce(
      (sum, risk) => sum + RISK_LEVEL_WEIGHTS[risk.level],
      0,
    );

    const maxPossible = risks.length * RISK_LEVEL_WEIGHTS.CRITICAL;
    const score = (totalWeight / maxPossible) * 100;

    return Math.round(score);
  }

  /**
   * Determine global risk level based on score
   *
   * Thresholds:
   * - 0-25: LOW
   * - 26-50: MEDIUM
   * - 51-75: HIGH
   * - 76-100: CRITICAL
   *
   * @param score - Global score (0-100)
   * @returns Global risk level
   */
  getGlobalLevelFromScore(score: number): RiskLevel {
    if (score <= 25) return 'LOW';
    if (score <= 50) return 'MEDIUM';
    if (score <= 75) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Calculate risk distribution by level
   *
   * @param risks - List of risk items
   * @returns Distribution counts
   */
  calculateDistribution(risks: RiskItem[]): RiskDistribution {
    const distribution: RiskDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      total: risks.length,
    };

    for (const risk of risks) {
      switch (risk.level) {
        case 'LOW':
          distribution.low++;
          break;
        case 'MEDIUM':
          distribution.medium++;
          break;
        case 'HIGH':
          distribution.high++;
          break;
        case 'CRITICAL':
          distribution.critical++;
          break;
      }
    }

    return distribution;
  }

  /**
   * Create a complete risk matrix from a list of risk items
   *
   * @param risks - List of risk items
   * @returns Complete risk matrix with score and distribution
   */
  createRiskMatrix(risks: RiskItem[]): RiskMatrix {
    const globalScore = this.calculateGlobalScore(risks);
    const globalLevel = this.getGlobalLevelFromScore(globalScore);
    const distribution = this.calculateDistribution(risks);

    return {
      risks: [...risks].sort((a, b) => a.order - b.order),
      globalScore,
      globalLevel,
      distribution,
      calculatedAt: new Date(),
      version: RISK_MATRIX_VERSION,
    };
  }

  /**
   * Add a risk item to an existing matrix
   *
   * @param matrix - Existing risk matrix
   * @param dto - New risk item data
   * @returns Updated risk matrix
   */
  addRiskToMatrix(matrix: RiskMatrix, dto: CreateRiskItemDto): RiskMatrix {
    const order = matrix.risks.length;
    const newRisk = this.createRiskItem(dto, order);
    const updatedRisks = [...matrix.risks, newRisk];

    return this.createRiskMatrix(updatedRisks);
  }

  /**
   * Update a risk item in an existing matrix
   *
   * @param matrix - Existing risk matrix
   * @param updates - Risk item updates (must include id)
   * @returns Updated risk matrix
   */
  updateRiskInMatrix(
    matrix: RiskMatrix,
    updates: UpdateRiskItemDto,
  ): RiskMatrix {
    const updatedRisks = matrix.risks.map((risk) => {
      if (risk.id === updates.id) {
        return this.updateRiskItem(risk, updates);
      }
      return risk;
    });

    return this.createRiskMatrix(updatedRisks);
  }

  /**
   * Remove a risk item from an existing matrix
   *
   * @param matrix - Existing risk matrix
   * @param riskId - ID of risk to remove
   * @returns Updated risk matrix
   */
  removeRiskFromMatrix(matrix: RiskMatrix, riskId: string): RiskMatrix {
    const updatedRisks = matrix.risks
      .filter((risk) => risk.id !== riskId)
      .map((risk, index) => ({ ...risk, order: index }));

    return this.createRiskMatrix(updatedRisks);
  }

  /**
   * Reorder risks in the matrix
   *
   * @param matrix - Existing risk matrix
   * @param riskIds - Array of risk IDs in new order
   * @returns Updated risk matrix
   */
  reorderRisks(matrix: RiskMatrix, riskIds: string[]): RiskMatrix {
    const riskMap = new Map(matrix.risks.map((r) => [r.id, r]));
    const reorderedRisks = riskIds
      .map((id, index) => {
        const risk = riskMap.get(id);
        if (risk) {
          return { ...risk, order: index };
        }
        return null;
      })
      .filter((r): r is RiskItem => r !== null);

    return this.createRiskMatrix(reorderedRisks);
  }

  /**
   * Get mitigation suggestions for a risk category
   *
   * @param category - Risk category
   * @returns Array of suggested mitigations
   */
  getMitigationSuggestions(category: RiskCategory): string[] {
    return DefaultMitigationSuggestions[category] || [];
  }

  /**
   * Initialize an empty risk matrix
   *
   * @returns Empty risk matrix
   */
  initializeEmptyMatrix(): RiskMatrix {
    return this.createRiskMatrix([]);
  }

  /**
   * Validate a risk matrix structure
   *
   * @param matrix - Matrix to validate
   * @returns True if valid, throws error otherwise
   */
  validateMatrix(matrix: unknown): matrix is RiskMatrix {
    if (!matrix || typeof matrix !== 'object') {
      return false;
    }

    const m = matrix as Record<string, unknown>;

    return (
      Array.isArray(m.risks) &&
      typeof m.globalScore === 'number' &&
      typeof m.globalLevel === 'string' &&
      typeof m.distribution === 'object' &&
      typeof m.version === 'number'
    );
  }

  /**
   * Migrate an old matrix version to current version
   *
   * @param matrix - Matrix data (possibly old version)
   * @returns Migrated matrix
   */
  migrateMatrix(matrix: RiskMatrix): RiskMatrix {
    if (matrix.version === RISK_MATRIX_VERSION) {
      return matrix;
    }

    this.logger.log(
      `Migrating risk matrix from version ${matrix.version} to ${RISK_MATRIX_VERSION}`,
    );

    // Recalculate all levels and scores to ensure consistency
    const updatedRisks = matrix.risks.map((risk) => ({
      ...risk,
      level: this.calculateRiskLevel(risk.probability, risk.impact),
    }));

    return this.createRiskMatrix(updatedRisks);
  }
}

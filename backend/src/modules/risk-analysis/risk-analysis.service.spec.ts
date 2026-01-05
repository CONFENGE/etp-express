/**
 * Risk Analysis Service Tests
 *
 * @module modules/risk-analysis
 * @see https://github.com/CONFENGE/etp-express/issues/1160
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RiskAnalysisService } from './risk-analysis.service';
import {
  CreateRiskItemDto,
  RiskCategory,
  RiskImpact,
  RiskItem,
  RiskLevel,
  RiskMatrix,
  RiskProbability,
  RISK_MATRIX_VERSION,
} from './risk-analysis.types';

describe('RiskAnalysisService', () => {
  let service: RiskAnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RiskAnalysisService],
    }).compile();

    service = module.get<RiskAnalysisService>(RiskAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRiskLevel', () => {
    it.each([
      // LOW probability combinations
      ['LOW', 'LOW', 'LOW'],
      ['LOW', 'MEDIUM', 'LOW'],
      ['LOW', 'HIGH', 'MEDIUM'],
      // MEDIUM probability combinations
      ['MEDIUM', 'LOW', 'LOW'],
      ['MEDIUM', 'MEDIUM', 'MEDIUM'],
      ['MEDIUM', 'HIGH', 'HIGH'],
      // HIGH probability combinations
      ['HIGH', 'LOW', 'MEDIUM'],
      ['HIGH', 'MEDIUM', 'HIGH'],
      ['HIGH', 'HIGH', 'CRITICAL'],
    ] as [RiskProbability, RiskImpact, RiskLevel][])(
      'should calculate %s probability x %s impact = %s level',
      (probability, impact, expectedLevel) => {
        const level = service.calculateRiskLevel(probability, impact);
        expect(level).toBe(expectedLevel);
      },
    );
  });

  describe('createRiskItem', () => {
    it('should create a risk item with calculated level', () => {
      const dto: CreateRiskItemDto = {
        category: RiskCategory.TECHNICAL,
        description: 'Technical risk description',
        probability: 'HIGH',
        impact: 'HIGH',
        mitigation: 'Mitigation strategy',
        responsible: 'Project Manager',
      };

      const riskItem = service.createRiskItem(dto, 0);

      expect(riskItem).toMatchObject({
        category: RiskCategory.TECHNICAL,
        description: 'Technical risk description',
        probability: 'HIGH',
        impact: 'HIGH',
        level: 'CRITICAL',
        mitigation: 'Mitigation strategy',
        responsible: 'Project Manager',
        order: 0,
      });
      expect(riskItem.id).toBeDefined();
    });

    it('should use default order 0 when not provided', () => {
      const dto: CreateRiskItemDto = {
        category: RiskCategory.COST,
        description: 'Cost risk',
        probability: 'LOW',
        impact: 'LOW',
        mitigation: 'Budget monitoring',
        responsible: 'Finance Team',
      };

      const riskItem = service.createRiskItem(dto);
      expect(riskItem.order).toBe(0);
    });
  });

  describe('updateRiskItem', () => {
    it('should update risk item and recalculate level', () => {
      const existingItem: RiskItem = {
        id: 'test-id',
        category: RiskCategory.TECHNICAL,
        description: 'Original description',
        probability: 'LOW',
        impact: 'LOW',
        level: 'LOW',
        mitigation: 'Original mitigation',
        responsible: 'Original responsible',
        order: 0,
      };

      const updated = service.updateRiskItem(existingItem, {
        id: 'test-id',
        probability: 'HIGH',
        impact: 'HIGH',
      });

      expect(updated.probability).toBe('HIGH');
      expect(updated.impact).toBe('HIGH');
      expect(updated.level).toBe('CRITICAL');
      expect(updated.description).toBe('Original description');
    });

    it('should preserve unchanged fields', () => {
      const existingItem: RiskItem = {
        id: 'test-id',
        category: RiskCategory.LEGAL,
        description: 'Legal risk',
        probability: 'MEDIUM',
        impact: 'MEDIUM',
        level: 'MEDIUM',
        mitigation: 'Legal review',
        responsible: 'Legal Team',
        order: 5,
      };

      const updated = service.updateRiskItem(existingItem, {
        id: 'test-id',
        description: 'Updated legal risk',
      });

      expect(updated.category).toBe(RiskCategory.LEGAL);
      expect(updated.probability).toBe('MEDIUM');
      expect(updated.impact).toBe('MEDIUM');
      expect(updated.level).toBe('MEDIUM');
      expect(updated.description).toBe('Updated legal risk');
      expect(updated.order).toBe(5);
    });
  });

  describe('calculateGlobalScore', () => {
    it('should return 0 for empty risks array', () => {
      const score = service.calculateGlobalScore([]);
      expect(score).toBe(0);
    });

    it('should calculate score correctly for single LOW risk', () => {
      const risks: RiskItem[] = [createTestRisk({ level: 'LOW' })];
      const score = service.calculateGlobalScore(risks);
      expect(score).toBe(25); // 1/4 * 100
    });

    it('should calculate score correctly for single CRITICAL risk', () => {
      const risks: RiskItem[] = [createTestRisk({ level: 'CRITICAL' })];
      const score = service.calculateGlobalScore(risks);
      expect(score).toBe(100); // 4/4 * 100
    });

    it('should calculate score correctly for mixed risks', () => {
      const risks: RiskItem[] = [
        createTestRisk({ level: 'LOW' }), // weight 1
        createTestRisk({ level: 'MEDIUM' }), // weight 2
        createTestRisk({ level: 'HIGH' }), // weight 3
        createTestRisk({ level: 'CRITICAL' }), // weight 4
      ];
      // Total: 1+2+3+4 = 10, Max: 4*4 = 16, Score: 10/16 * 100 = 62.5 -> 63
      const score = service.calculateGlobalScore(risks);
      expect(score).toBe(63);
    });
  });

  describe('getGlobalLevelFromScore', () => {
    it.each([
      [0, 'LOW'],
      [25, 'LOW'],
      [26, 'MEDIUM'],
      [50, 'MEDIUM'],
      [51, 'HIGH'],
      [75, 'HIGH'],
      [76, 'CRITICAL'],
      [100, 'CRITICAL'],
    ] as [number, RiskLevel][])(
      'should return %s level for score %d',
      (score, expectedLevel) => {
        const level = service.getGlobalLevelFromScore(score);
        expect(level).toBe(expectedLevel);
      },
    );
  });

  describe('calculateDistribution', () => {
    it('should calculate correct distribution', () => {
      const risks: RiskItem[] = [
        createTestRisk({ level: 'LOW' }),
        createTestRisk({ level: 'LOW' }),
        createTestRisk({ level: 'MEDIUM' }),
        createTestRisk({ level: 'HIGH' }),
        createTestRisk({ level: 'CRITICAL' }),
      ];

      const distribution = service.calculateDistribution(risks);

      expect(distribution).toEqual({
        low: 2,
        medium: 1,
        high: 1,
        critical: 1,
        total: 5,
      });
    });

    it('should handle empty array', () => {
      const distribution = service.calculateDistribution([]);

      expect(distribution).toEqual({
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
        total: 0,
      });
    });
  });

  describe('createRiskMatrix', () => {
    it('should create complete risk matrix', () => {
      const risks: RiskItem[] = [
        createTestRisk({ level: 'LOW', order: 1 }),
        createTestRisk({ level: 'MEDIUM', order: 0 }),
      ];

      const matrix = service.createRiskMatrix(risks);

      expect(matrix.risks).toHaveLength(2);
      expect(matrix.risks[0].order).toBe(0); // Sorted by order
      expect(matrix.globalScore).toBeDefined();
      expect(matrix.globalLevel).toBeDefined();
      expect(matrix.distribution.total).toBe(2);
      expect(matrix.calculatedAt).toBeInstanceOf(Date);
      expect(matrix.version).toBe(RISK_MATRIX_VERSION);
    });

    it('should sort risks by order', () => {
      const risks: RiskItem[] = [
        createTestRisk({ level: 'LOW', order: 2 }),
        createTestRisk({ level: 'MEDIUM', order: 0 }),
        createTestRisk({ level: 'HIGH', order: 1 }),
      ];

      const matrix = service.createRiskMatrix(risks);

      expect(matrix.risks[0].order).toBe(0);
      expect(matrix.risks[1].order).toBe(1);
      expect(matrix.risks[2].order).toBe(2);
    });
  });

  describe('addRiskToMatrix', () => {
    it('should add risk and recalculate matrix', () => {
      const initialMatrix = service.initializeEmptyMatrix();
      const dto: CreateRiskItemDto = {
        category: RiskCategory.SCHEDULE,
        description: 'Schedule risk',
        probability: 'MEDIUM',
        impact: 'HIGH',
        mitigation: 'Weekly reviews',
        responsible: 'PM',
      };

      const updatedMatrix = service.addRiskToMatrix(initialMatrix, dto);

      expect(updatedMatrix.risks).toHaveLength(1);
      expect(updatedMatrix.risks[0].level).toBe('HIGH');
      expect(updatedMatrix.globalScore).toBeGreaterThan(0);
    });
  });

  describe('updateRiskInMatrix', () => {
    it('should update specific risk and recalculate', () => {
      const risks: RiskItem[] = [
        createTestRisk({ level: 'LOW', order: 0 }),
        createTestRisk({ level: 'MEDIUM', order: 1 }),
      ];
      const matrix = service.createRiskMatrix(risks);
      const riskId = matrix.risks[0].id;

      const updatedMatrix = service.updateRiskInMatrix(matrix, {
        id: riskId,
        probability: 'HIGH',
        impact: 'HIGH',
      });

      expect(updatedMatrix.risks.find((r) => r.id === riskId)?.level).toBe(
        'CRITICAL',
      );
      expect(updatedMatrix.globalScore).toBeGreaterThan(matrix.globalScore);
    });
  });

  describe('removeRiskFromMatrix', () => {
    it('should remove risk and reorder remaining', () => {
      const risks: RiskItem[] = [
        createTestRisk({ level: 'LOW', order: 0 }),
        createTestRisk({ level: 'MEDIUM', order: 1 }),
        createTestRisk({ level: 'HIGH', order: 2 }),
      ];
      const matrix = service.createRiskMatrix(risks);
      const riskIdToRemove = matrix.risks[1].id;

      const updatedMatrix = service.removeRiskFromMatrix(
        matrix,
        riskIdToRemove,
      );

      expect(updatedMatrix.risks).toHaveLength(2);
      expect(updatedMatrix.risks.map((r) => r.order)).toEqual([0, 1]);
    });
  });

  describe('reorderRisks', () => {
    it('should reorder risks correctly', () => {
      const risks: RiskItem[] = [
        createTestRisk({ level: 'LOW', order: 0 }),
        createTestRisk({ level: 'MEDIUM', order: 1 }),
        createTestRisk({ level: 'HIGH', order: 2 }),
      ];
      const matrix = service.createRiskMatrix(risks);
      const [first, second, third] = matrix.risks;

      const newOrder = [third.id, first.id, second.id];
      const reorderedMatrix = service.reorderRisks(matrix, newOrder);

      expect(reorderedMatrix.risks[0].id).toBe(third.id);
      expect(reorderedMatrix.risks[1].id).toBe(first.id);
      expect(reorderedMatrix.risks[2].id).toBe(second.id);
    });
  });

  describe('getMitigationSuggestions', () => {
    it('should return suggestions for each category', () => {
      const categories = Object.values(RiskCategory);

      for (const category of categories) {
        const suggestions = service.getMitigationSuggestions(category);
        expect(suggestions).toBeInstanceOf(Array);
        expect(suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('initializeEmptyMatrix', () => {
    it('should create empty matrix with zero values', () => {
      const matrix = service.initializeEmptyMatrix();

      expect(matrix.risks).toHaveLength(0);
      expect(matrix.globalScore).toBe(0);
      expect(matrix.globalLevel).toBe('LOW');
      expect(matrix.distribution.total).toBe(0);
      expect(matrix.version).toBe(RISK_MATRIX_VERSION);
    });
  });

  describe('validateMatrix', () => {
    it('should return true for valid matrix', () => {
      const matrix = service.initializeEmptyMatrix();
      expect(service.validateMatrix(matrix)).toBe(true);
    });

    it('should return false for invalid input', () => {
      expect(service.validateMatrix(null)).toBe(false);
      expect(service.validateMatrix(undefined)).toBe(false);
      expect(service.validateMatrix({})).toBe(false);
      expect(service.validateMatrix({ risks: [] })).toBe(false);
    });
  });

  describe('migrateMatrix', () => {
    it('should return same matrix if version matches', () => {
      const matrix = service.initializeEmptyMatrix();
      const migrated = service.migrateMatrix(matrix);

      expect(migrated.version).toBe(RISK_MATRIX_VERSION);
    });

    it('should recalculate levels on migration', () => {
      const oldMatrix: RiskMatrix = {
        risks: [
          {
            id: 'test-1',
            category: RiskCategory.TECHNICAL,
            description: 'Test risk',
            probability: 'HIGH',
            impact: 'HIGH',
            level: 'HIGH', // Incorrect level for HIGH x HIGH
            mitigation: 'Test',
            responsible: 'Test',
            order: 0,
          },
        ],
        globalScore: 50,
        globalLevel: 'MEDIUM',
        distribution: { low: 0, medium: 0, high: 1, critical: 0, total: 1 },
        calculatedAt: new Date(),
        version: 0, // Old version
      };

      const migrated = service.migrateMatrix(oldMatrix);

      expect(migrated.version).toBe(RISK_MATRIX_VERSION);
      expect(migrated.risks[0].level).toBe('CRITICAL'); // Corrected
    });
  });
});

// Helper function to create test risk items
function createTestRisk(overrides: Partial<RiskItem> = {}): RiskItem {
  return {
    id: `test-${Math.random().toString(36).substr(2, 9)}`,
    category: RiskCategory.TECHNICAL,
    description: 'Test risk',
    probability: 'MEDIUM',
    impact: 'MEDIUM',
    level: 'MEDIUM',
    mitigation: 'Test mitigation',
    responsible: 'Test responsible',
    order: 0,
    ...overrides,
  };
}

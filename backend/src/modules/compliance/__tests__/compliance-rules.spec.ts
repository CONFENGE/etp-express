import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests for compliance-rules.json structure and content.
 *
 * Issue #1262 - [Compliance-a] Mapear criterios de auditoria TCU/TCE
 * Epic: #1261 - [Compliance] Validacao TCE
 *
 * These tests validate:
 * 1. JSON file is parseable and valid
 * 2. Schema structure is correct
 * 3. Minimum 50 rules exist
 * 4. All rules have required fields
 * 5. IDs are unique
 * 6. Categories are properly distributed
 */
describe('Compliance Rules JSON', () => {
  let rulesData: ComplianceRulesFile;
  const rulesPath = path.join(__dirname, '../data/compliance-rules.json');

  interface LegalReference {
    id: string;
    name: string;
    description: string;
    url?: string;
  }

  interface SeverityLevel {
    weight: number;
    description: string;
    color: string;
  }

  interface Category {
    name: string;
    description: string;
    order: number;
  }

  interface RuleExample {
    bad: string | null;
    good: string | null;
  }

  interface ComplianceRule {
    id: string;
    code: string | null;
    requirement: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    legalReference: string;
    referenceIds: string[];
    applicableTypes: ('OBRAS' | 'TI' | 'SERVICOS' | 'MATERIAIS')[];
    etpFieldsRequired: string[];
    sectionRequired: string | null;
    keywords: string[];
    minLength: number | null;
    validationRegex: string | null;
    fixSuggestion: string;
    examples?: RuleExample;
  }

  interface ComplianceRulesFile {
    $schema?: string;
    version: string;
    lastUpdated: string;
    description: string;
    references: LegalReference[];
    severityLevels: Record<string, SeverityLevel>;
    categories: Record<string, Category>;
    rules: ComplianceRule[];
  }

  beforeAll(() => {
    const fileContent = fs.readFileSync(rulesPath, 'utf-8');
    rulesData = JSON.parse(fileContent) as ComplianceRulesFile;
  });

  describe('File Structure', () => {
    it('should be valid JSON', () => {
      expect(rulesData).toBeDefined();
      expect(typeof rulesData).toBe('object');
    });

    it('should have required top-level fields', () => {
      expect(rulesData).toHaveProperty('version');
      expect(rulesData).toHaveProperty('lastUpdated');
      expect(rulesData).toHaveProperty('description');
      expect(rulesData).toHaveProperty('references');
      expect(rulesData).toHaveProperty('severityLevels');
      expect(rulesData).toHaveProperty('categories');
      expect(rulesData).toHaveProperty('rules');
    });

    it('should have valid semantic version', () => {
      expect(rulesData.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have valid date format', () => {
      expect(rulesData.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('References', () => {
    it('should have at least one reference', () => {
      expect(rulesData.references.length).toBeGreaterThan(0);
    });

    it('should have valid reference structure', () => {
      rulesData.references.forEach((ref) => {
        expect(ref).toHaveProperty('id');
        expect(ref).toHaveProperty('name');
        expect(ref).toHaveProperty('description');
        expect(ref.id).toMatch(/^[A-Z][A-Z0-9_]*$/);
      });
    });

    it('should have unique reference IDs', () => {
      const ids = rulesData.references.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Severity Levels', () => {
    it('should have all required severity levels', () => {
      expect(rulesData.severityLevels).toHaveProperty('CRITICAL');
      expect(rulesData.severityLevels).toHaveProperty('HIGH');
      expect(rulesData.severityLevels).toHaveProperty('MEDIUM');
      expect(rulesData.severityLevels).toHaveProperty('LOW');
    });

    it('should have valid severity level structure', () => {
      Object.values(rulesData.severityLevels).forEach((level) => {
        expect(level).toHaveProperty('weight');
        expect(level).toHaveProperty('description');
        expect(level).toHaveProperty('color');
        expect(typeof level.weight).toBe('number');
        expect(level.weight).toBeGreaterThanOrEqual(0);
        expect(level.weight).toBeLessThanOrEqual(1);
        expect(level.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });

    it('should have decreasing weights from CRITICAL to LOW', () => {
      const { CRITICAL, HIGH, MEDIUM, LOW } = rulesData.severityLevels;
      expect(CRITICAL.weight).toBeGreaterThan(HIGH.weight);
      expect(HIGH.weight).toBeGreaterThan(MEDIUM.weight);
      expect(MEDIUM.weight).toBeGreaterThan(LOW.weight);
    });
  });

  describe('Categories', () => {
    it('should have at least 7 categories', () => {
      expect(Object.keys(rulesData.categories).length).toBeGreaterThanOrEqual(
        7,
      );
    });

    it('should have valid category structure', () => {
      Object.values(rulesData.categories).forEach((cat) => {
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('description');
        expect(cat).toHaveProperty('order');
        expect(typeof cat.order).toBe('number');
        expect(cat.order).toBeGreaterThan(0);
      });
    });

    it('should have unique order values', () => {
      const orders = Object.values(rulesData.categories).map((c) => c.order);
      const uniqueOrders = new Set(orders);
      expect(uniqueOrders.size).toBe(orders.length);
    });
  });

  describe('Rules', () => {
    it('should have at least 50 rules', () => {
      expect(rulesData.rules.length).toBeGreaterThanOrEqual(50);
    });

    it('should have unique rule IDs', () => {
      const ids = rulesData.rules.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid rule ID format', () => {
      rulesData.rules.forEach((rule) => {
        expect(rule.id).toMatch(/^TCU-\d{3}$/);
      });
    });

    it('should have valid rejection code format when present', () => {
      rulesData.rules.forEach((rule) => {
        if (rule.code !== null) {
          expect(rule.code).toMatch(/^REJ-\d{3}$/);
        }
      });
    });

    it('should have all required fields for each rule', () => {
      rulesData.rules.forEach((rule) => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('requirement');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('severity');
        expect(rule).toHaveProperty('category');
        expect(rule).toHaveProperty('legalReference');
        expect(rule).toHaveProperty('applicableTypes');
        expect(rule).toHaveProperty('etpFieldsRequired');
        expect(rule).toHaveProperty('keywords');
        expect(rule).toHaveProperty('fixSuggestion');
      });
    });

    it('should have valid severity values', () => {
      const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      rulesData.rules.forEach((rule) => {
        expect(validSeverities).toContain(rule.severity);
      });
    });

    it('should have valid category values', () => {
      const validCategories = Object.keys(rulesData.categories);
      rulesData.rules.forEach((rule) => {
        expect(validCategories).toContain(rule.category);
      });
    });

    it('should have valid applicableTypes', () => {
      const validTypes = ['OBRAS', 'TI', 'SERVICOS', 'MATERIAIS'];
      rulesData.rules.forEach((rule) => {
        expect(rule.applicableTypes.length).toBeGreaterThan(0);
        rule.applicableTypes.forEach((type) => {
          expect(validTypes).toContain(type);
        });
      });
    });

    it('should have non-empty requirement', () => {
      rulesData.rules.forEach((rule) => {
        expect(rule.requirement.length).toBeGreaterThan(5);
      });
    });

    it('should have non-empty description', () => {
      rulesData.rules.forEach((rule) => {
        expect(rule.description.length).toBeGreaterThan(20);
      });
    });

    it('should have non-empty fixSuggestion', () => {
      rulesData.rules.forEach((rule) => {
        expect(rule.fixSuggestion.length).toBeGreaterThan(10);
      });
    });

    it('should have valid keywords array', () => {
      rulesData.rules.forEach((rule) => {
        expect(Array.isArray(rule.keywords)).toBe(true);
      });
    });
  });

  describe('Rule Distribution', () => {
    it('should have rules for all ETP types', () => {
      const types = ['OBRAS', 'TI', 'SERVICOS', 'MATERIAIS'];
      types.forEach((type) => {
        const rulesForType = rulesData.rules.filter((r) =>
          r.applicableTypes.includes(
            type as 'OBRAS' | 'TI' | 'SERVICOS' | 'MATERIAIS',
          ),
        );
        expect(rulesForType.length).toBeGreaterThan(10);
      });
    });

    it('should have CRITICAL rules covering mandatory ETP elements', () => {
      const criticalRules = rulesData.rules.filter(
        (r) => r.severity === 'CRITICAL',
      );
      expect(criticalRules.length).toBeGreaterThanOrEqual(7);
    });

    it('should have rules for all categories', () => {
      const categoriesWithRules = new Set(
        rulesData.rules.map((r) => r.category),
      );
      expect(categoriesWithRules.size).toBeGreaterThanOrEqual(6);
    });

    it('should have balanced distribution of severity levels', () => {
      const severityCounts = rulesData.rules.reduce(
        (acc, rule) => {
          acc[rule.severity] = (acc[rule.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Should have at least some rules of each severity
      expect(severityCounts['CRITICAL']).toBeGreaterThanOrEqual(5);
      expect(severityCounts['HIGH']).toBeGreaterThanOrEqual(5);
      expect(severityCounts['MEDIUM']).toBeGreaterThanOrEqual(5);
      expect(severityCounts['LOW']).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Legal References Consistency', () => {
    it('should have referenceIds that exist in references', () => {
      const validRefIds = rulesData.references.map((r) => r.id);
      rulesData.rules.forEach((rule) => {
        if (rule.referenceIds && rule.referenceIds.length > 0) {
          rule.referenceIds.forEach((refId) => {
            expect(validRefIds).toContain(refId);
          });
        }
      });
    });

    it('should have non-empty legalReference', () => {
      rulesData.rules.forEach((rule) => {
        expect(rule.legalReference.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Validation Rules', () => {
    it('should have valid regex patterns when specified', () => {
      rulesData.rules.forEach((rule) => {
        if (rule.validationRegex) {
          expect(
            () => new RegExp(rule.validationRegex as string),
          ).not.toThrow();
        }
      });
    });

    it('should have positive minLength when specified', () => {
      rulesData.rules.forEach((rule) => {
        if (rule.minLength !== null) {
          expect(rule.minLength).toBeGreaterThan(0);
        }
      });
    });
  });
});

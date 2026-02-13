---
task: "Install @axe-core/playwright and create test helpers"
responsavel: "@a11y-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: FE-10
story_ref: TD-009.4
front: F4
Entrada: |
  - Current e2e test setup (Playwright config)
  - package.json
Saida: |
  - @axe-core/playwright installed
  - e2e/accessibility/helpers.ts with checkA11y() helper
  - e2e/accessibility/config.ts with WCAG rules config
Checklist:
  - "[ ] Install: npm install -D @axe-core/playwright"
  - "[ ] Create e2e/accessibility/ directory"
  - "[ ] Create helpers.ts with checkA11y(page, options) function"
  - "[ ] Create config.ts with WCAG 2.1 AA rule configuration"
  - "[ ] Configure threshold (initially: warnings only, no failures)"
  - "[ ] Add axe-core to Playwright config as a test project"
  - "[ ] Create smoke test to verify setup works"
  - "[ ] Run smoke test: npx playwright test e2e/accessibility/"
---

# F4 Setup: @axe-core/playwright

## Helper Pattern
```typescript
// e2e/accessibility/helpers.ts
import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

export async function checkA11y(
  page: Page,
  options?: { disableRules?: string[]; threshold?: number }
) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(options?.disableRules ?? [])
    .analyze();

  const violations = results.violations;
  if (violations.length > 0) {
    console.warn(`A11y violations on ${page.url()}:`, violations.map(v => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
    })));
  }

  const threshold = options?.threshold ?? Infinity; // warning mode
  expect(violations.length).toBeLessThanOrEqual(threshold);
}
```

## Risk
- MINIMAL: New dependency, new test files only

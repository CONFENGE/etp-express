---
task: "Create accessibility tests for ~30 pages"
responsavel: "@a11y-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: FE-10
story_ref: TD-009.4
front: F4
blocked_by: f4-setup-axe-core
Entrada: |
  - e2e/accessibility/helpers.ts (from setup task)
  - Full list of application pages
Saida: |
  - e2e/accessibility/pages.spec.ts with tests for all pages
Checklist:
  - "[ ] Create pages.spec.ts with test.describe blocks"
  - "[ ] Add public page tests (login, register, forgot-password)"
  - "[ ] Add authenticated page tests with login fixture"
  - "[ ] Add admin page tests with admin login fixture"
  - "[ ] Handle pages that require specific data (ETP editor, contract detail)"
  - "[ ] Add test.slow() for pages with heavy content"
  - "[ ] Run all accessibility tests"
  - "[ ] Document violation counts per page in test output"
---

# F4: Accessibility Tests for All Pages

## Test Structure
```typescript
test.describe('Accessibility - Public Pages', () => {
  test('login page', async ({ page }) => {
    await page.goto('/login');
    await checkA11y(page);
  });
  // ... more public pages
});

test.describe('Accessibility - Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });
  // ... authenticated pages
});

test.describe('Accessibility - Admin Pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });
  // ... admin pages
});
```

## Page List (~30 pages)
See a11y-dev agent for complete page inventory.

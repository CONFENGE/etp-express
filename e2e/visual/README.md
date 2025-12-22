# Visual Regression Testing

This directory contains visual regression tests for the ETP Express application.

## Overview

Visual regression testing captures screenshots of critical pages and compares them against baseline images to detect unintended visual changes. This helps ensure UI consistency during refactoring and feature development.

## Running Tests

### Prerequisites

1. Backend and frontend running locally
2. Playwright installed (`npm install`)

### Run visual tests locally

```bash
# Run all visual tests
npx playwright test --project=visual

# Run in headed mode (see browser)
npx playwright test --project=visual --headed

# Run specific test file
npx playwright test --project=visual e2e/visual/pages.visual.spec.ts
```

### Update baselines

When you make intentional visual changes, update the baseline screenshots:

```bash
# Update all baselines
npx playwright test --project=visual --update-snapshots

# Commit updated baselines
git add e2e/visual/*.png
git commit -m "chore: update visual regression baselines"
```

## Test Coverage

The following pages are covered by visual regression tests:

| Page               | Test                    | Description                       |
| ------------------ | ----------------------- | --------------------------------- |
| Login              | `login-page.png`        | Initial login form state          |
| Login (errors)     | `login-page-errors.png` | Login form with validation errors |
| Dashboard          | `dashboard.png`         | Main dashboard view               |
| ETPs List          | `etps-list.png`         | List of ETPs                      |
| ETP Editor         | `etp-editor-new.png`    | New ETP creation form             |
| Login (mobile)     | `login-page-mobile.png` | Responsive mobile layout          |
| Dashboard (tablet) | `dashboard-tablet.png`  | Responsive tablet layout          |

## Configuration

### Threshold

Visual tests use a 1% pixel difference threshold to account for minor anti-aliasing variations:

```typescript
const threshold = 0.01; // 1% tolerance
```

### Viewport

Standard tests use 1280x720 viewport. Responsive tests use:

- Mobile: 375x667
- Tablet: 768x1024

## CI Integration

Visual tests run automatically on PRs that modify frontend code. See `.github/workflows/visual-regression.yml`.

### Handling CI Failures

1. Download the `visual-regression-diff` artifact
2. Review the `*-diff.png` files to see differences
3. If changes are intentional:
   - Update baselines locally
   - Commit and push the new baseline images
4. If changes are unintentional:
   - Fix the visual regression in your code
   - Re-run the CI

## Best Practices

1. **Avoid dynamic content**: Tests hide timestamps and animated elements
2. **Wait for stability**: Tests wait for network idle and animations
3. **Consistent environment**: Use consistent viewport sizes
4. **Minimal baselines**: Only add baselines for critical pages
5. **Review diffs carefully**: Small diffs might indicate real issues

## Troubleshooting

### Tests are flaky

- Increase `animationWaitMs` in test config
- Add more specific element waits
- Check for dynamic content not being hidden

### Baselines don't match on CI

- Ensure you're using the same Playwright version
- CI runs on Ubuntu; baselines should be generated on Linux or use consistent fonts
- Consider using Docker for consistent environment

### Cannot generate baselines

1. Start the backend: `cd backend && npm run start:dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Run with update flag: `npx playwright test --project=visual --update-snapshots`

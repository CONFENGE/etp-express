---
task: "Integrate accessibility tests into CI pipeline"
responsavel: "@a11y-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: FE-10
story_ref: TD-009.4
front: F4
blocked_by: f4-implement-a11y-tests
Entrada: |
  - CI/CD configuration (GitHub Actions or Railway)
  - e2e/accessibility/ test suite
Saida: |
  - CI step running accessibility tests
  - Warning mode (non-blocking) initially
Checklist:
  - "[ ] Check current CI configuration"
  - "[ ] Add accessibility test step (after e2e tests)"
  - "[ ] Configure as non-blocking (continue-on-error: true) initially"
  - "[ ] Add test results as CI artifact"
  - "[ ] Add npm script: 'test:a11y': 'playwright test e2e/accessibility/'"
  - "[ ] Document threshold plan for gradual enforcement"
  - "[ ] Run CI pipeline to verify integration"
---

# F4: CI Integration

## GitHub Actions Step
```yaml
- name: Accessibility Tests
  run: npm run test:a11y
  continue-on-error: true  # Warning mode initially

- name: Upload A11y Results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: a11y-results
    path: e2e/accessibility/results/
```

## Enforcement Roadmap
1. Week 1: Warning mode (no CI failures)
2. Week 2: Threshold = 50 violations max
3. Week 4: Threshold = 20 violations max
4. Month 2: Zero tolerance for new violations

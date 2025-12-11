# Story: [Título da Story]

**Issue:** #XXX
**PRD:** [Link]
**Tech Spec:** [Link]
**Esforço:** X horas
**Sprint:** [Nome do Sprint]
**Assignee:** [Nome]
**Data:** YYYY-MM-DD

---

## Context

### Problema

<!-- Descreva o problema que esta story resolve -->

### Solução Proposta

<!-- Resumo da solução técnica -->

### Impacto

- **Usuários afetados:**
- **Componentes afetados:**
- **Riscos:**

---

## Files to Modify

### Backend

```
📁 backend/src/
  ├── 📄 path/to/controller.ts (MODIFY)
  ├── 📄 path/to/service.ts (MODIFY)
  ├── 📄 path/to/repository.ts (MODIFY)
  ├── 📄 path/__tests__/service.spec.ts (CREATE)
  └── 📄 migrations/YYYYMMDDHHMMSS-Name.ts (CREATE)
```

### Frontend

```
📁 frontend/src/
  ├── 📄 path/to/component.tsx (MODIFY)
  ├── 📄 path/to/hook.ts (CREATE)
  ├── 📄 path/__tests__/component.test.tsx (MODIFY)
  └── 📄 path/__tests__/hook.test.ts (CREATE)
```

### Documentation

```
📁 docs/
  ├── 📄 ROADMAP.md (UPDATE)
  ├── 📄 architecture/ADR-XXX.md (CREATE - se decisão arquitetural)
  └── 📄 CHANGELOG.md (UPDATE)
```

---

## Implementation Steps

### Phase 1: Setup & Preparation (X min)

#### Step 1.1: Create Feature Branch

```bash
git checkout -b feat/XXX-short-description
```

#### Step 1.2: Install Dependencies (se necessário)

```bash
cd backend && npm install <package-name>
cd frontend && npm install <package-name>
```

#### Step 1.3: Review Related Code

- [ ] Read current implementation in affected files
- [ ] Understand existing patterns
- [ ] Identify integration points

---

### Phase 2: Backend Implementation (X min)

#### Step 2.1: Create/Update Service Layer

**File:** `backend/src/path/to/service.ts`

```typescript
// Pseudocode / Implementation guidance
export class ServiceName {
  async methodName(params: ParamsType): Promise<ReturnType> {
    // TODO: Implement logic
    // 1. Validate input
    // 2. Apply business rules
    // 3. Call repository
    // 4. Return result
  }
}
```

**Key considerations:**

- Error handling: Use custom exceptions
- Validation: Use DTOs with class-validator
- Logging: Use Logger service

#### Step 2.2: Create/Update Controller Layer

**File:** `backend/src/path/to/controller.ts`

```typescript
@Controller('resource')
export class ControllerName {
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDto) {
    // TODO: Implement endpoint
    // 1. Extract params
    // 2. Call service
    // 3. Return response
  }
}
```

**Key considerations:**

- Authentication: Use @UseGuards(JwtAuthGuard)
- Authorization: Use @UseGuards(RolesGuard)
- Validation: DTOs auto-validate

#### Step 2.3: Create/Update Repository Layer (se necessário)

**File:** `backend/src/path/to/repository.ts`

```typescript
@EntityRepository(EntityName)
export class RepositoryName extends Repository<EntityName> {
  async findWithRelations(id: string): Promise<EntityName> {
    // TODO: Implement query
    // Use QueryBuilder for complex queries
    // Use relations: [] for simple eager loading
  }
}
```

#### Step 2.4: Create Migration (se database changes)

```bash
npm run migration:generate -- NomeDaMigration
```

**File:** `backend/migrations/YYYYMMDDHHMMSS-NomeDaMigration.ts`

```typescript
export class NomeDaMigration1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // TODO: Implement UP migration
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // TODO: Implement DOWN migration (rollback)
  }
}
```

---

### Phase 3: Frontend Implementation (X min)

#### Step 3.1: Create/Update Custom Hook (se necessário)

**File:** `frontend/src/hooks/useCustomHook.ts`

```typescript
export const useCustomHook = (params: Params) => {
  const [state, setState] = useState<StateType>(initialState);

  useEffect(() => {
    // TODO: Implement effect logic
    // 1. Setup
    // 2. Side effects
    // 3. Cleanup return function
    return () => {
      // Cleanup (IMPORTANT for unmount scenarios)
    };
  }, [dependencies]);

  return { state, actions };
};
```

**Key considerations:**

- Cleanup: Always return cleanup function
- Dependencies: List all dependencies
- AbortController: Use for cancelable requests

#### Step 3.2: Create/Update Component

**File:** `frontend/src/components/path/Component.tsx`

```typescript
export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // TODO: Implement component
  // 1. State management (useState, useStore)
  // 2. Effects (useEffect)
  // 3. Event handlers
  // 4. Render JSX

  return (
    <div>
      {/* TODO: Implement UI */}
    </div>
  );
};
```

**Key considerations:**

- Accessibility: aria-labels, roles, keyboard nav
- Error states: Handle loading, error, empty
- Responsive: Mobile-first design

#### Step 3.3: Update Zustand Store (se state management changes)

**File:** `frontend/src/store/storeName.ts`

```typescript
interface StoreState {
  // TODO: Define state shape
}

export const useStoreName = create<StoreState>((set, get) => ({
  // TODO: Implement store
  // 1. Initial state
  // 2. Actions (mutations)
  // 3. Selectors (if complex)
}));
```

---

### Phase 4: Testing (X min)

#### Step 4.1: Backend Unit Tests

**File:** `backend/src/path/__tests__/service.spec.ts`

```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    // Setup test dependencies
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = ...;
      const expected = ...;

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual(expected);
    });

    it('should handle error case', async () => {
      // Test error scenario
    });

    it('should handle edge case', async () => {
      // Test edge case
    });
  });
});
```

**Coverage target:** 100% for new code

#### Step 4.2: Frontend Unit Tests

**File:** `frontend/src/components/__tests__/Component.test.tsx`

```typescript
describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName {...props} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName {...props} />);

    await user.click(screen.getByRole('button'));

    expect(mockCallback).toHaveBeenCalled();
  });

  it('should handle loading state', () => {
    render(<ComponentName {...props} isLoading={true} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
```

**Coverage target:** 100% for new code

#### Step 4.3: Integration Tests (se aplicável)

**File:** `backend/test/e2e/endpoint.e2e-spec.ts`

```typescript
describe('Endpoint E2E', () => {
  it('should complete full flow', async () => {
    // Full integration test
  });
});
```

#### Step 4.4: E2E Tests (se UI changes significativas)

**File:** `e2e/tests/feature.spec.ts`

```typescript
test.describe('Feature Name', () => {
  test('should complete user flow', async ({ page }) => {
    // Navigate
    await page.goto('/path');

    // Interact
    await page.click('button');

    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

#### Step 4.5: Accessibility Tests

```typescript
test('should pass axe accessibility tests', async ({ page }) => {
  await page.goto('/path');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

### Phase 5: Quality Checks (X min)

#### Step 5.1: Lint & Format

```bash
npm run lint
npm run format
```

#### Step 5.2: Type Check

```bash
npx tsc --noEmit
```

#### Step 5.3: Run Tests

```bash
# Backend
cd backend && npm run test:cov

# Frontend
cd frontend && npm run test:coverage
```

**Verify:**

- [ ] Coverage >= 78% backend
- [ ] Coverage >= 76% frontend
- [ ] All tests passing

#### Step 5.4: Build Validation

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

---

### Phase 6: Documentation (X min)

#### Step 6.1: Update ROADMAP.md

```markdown
## Changelog Recente

### 2025-MM-DD

**PR #XXX - [Título] (Issue #YYY)** ✅

- Feature: [Descrição]
- Components: [Lista]
- Tests: +N novos testes
- Coverage: X%/Y%
```

#### Step 6.2: Create ADR (se decisão arquitetural)

**File:** `docs/architecture/ADR-XXX-decision-title.md`

Use template: `.bmad/templates/adr-template.md`

#### Step 6.3: Update API Docs (se endpoint changes)

- [ ] Swagger annotations updated
- [ ] Endpoint documented in OpenAPI

---

### Phase 7: Commit & PR (X min)

#### Step 7.1: Stage Changes

```bash
git add .
```

#### Step 7.2: Commit (Conventional Commits)

```bash
git commit -m "feat(module): implement feature X (#XXX)

- Add service method for X
- Create component for Y
- Implement tests (coverage 100%)
- Update ROADMAP.md

Closes #XXX"
```

#### Step 7.3: Push Branch

```bash
git push origin feat/XXX-short-description
```

#### Step 7.4: Create PR

```bash
gh pr create --title "feat(module): Implement Feature X" --body "$(cat <<'EOF'
## 🎯 Objetivo
[Descrição]

## 📋 Contexto
Closes #XXX

## 🔧 Mudanças
- Change 1
- Change 2

## ✅ Testing
- [x] Unit tests (coverage 100%)
- [x] E2E tests
- [x] Accessibility tests

## 📊 Métricas
- Coverage: 78%/76%
- Build: ✅ Passing
EOF
)"
```

---

## Test Cases

### Test Case 1: [Cenário de Sucesso]

**Given:** [Condição inicial]
**When:** [Ação]
**Then:** [Resultado esperado]

### Test Case 2: [Cenário de Erro]

**Given:** [Condição inicial]
**When:** [Ação]
**Then:** [Resultado esperado]

### Test Case 3: [Edge Case]

**Given:** [Condição inicial]
**When:** [Ação]
**Then:** [Resultado esperado]

---

## Definition of Done

### Code Quality

- [ ] TypeScript: Zero errors
- [ ] ESLint: Zero warnings
- [ ] Prettier: Formatted
- [ ] Code review: Approved

### Testing

- [ ] Unit tests: 100% coverage (new code)
- [ ] Integration tests: Passing (se aplicável)
- [ ] E2E tests: Passing (se UI changes)
- [ ] Accessibility tests: Passing (axe-core)

### Documentation

- [ ] ROADMAP.md: Updated
- [ ] ADR: Created (se decisão arquitetural)
- [ ] API docs: Updated (se endpoint changes)
- [ ] Code comments: Added (onde necessário)

### Security & Compliance

- [ ] OWASP: No new vulnerabilities
- [ ] LGPD: Compliance validated (se dados pessoais)
- [ ] WCAG 2.1 AA: Compliance validated (se UI changes)

### Deployment

- [ ] Build: Passing
- [ ] Migrations: Tested (se database changes)
- [ ] Railway: Health checks passing
- [ ] Sentry: No new errors (24h post-deploy)

---

## Rollback Plan

### Trigger Conditions

- [ ] Critical bug in production
- [ ] Performance regression >20%
- [ ] Security vulnerability P0

### Rollback Procedure

```bash
# 1. Revert commit
git revert <COMMIT_HASH>

# 2. Redeploy
railway redeploy

# 3. Rollback migration (se necessário)
npm run migration:revert

# 4. Notify team
# Post in Slack/Team channel
```

---

## Notes & Learnings

<!-- Adicione notas durante a implementação -->

- Note 1: [Aprendizado ou observação]
- Note 2: [Decisão tomada e por quê]

---

## References

- PRD: [Link]
- Tech Spec: [Link]
- ADR: [Link]
- Related Issues: #XXX, #YYY

---

**Story Version:** 1.0
**BMAD Method:** v6.0.0-alpha
**Projeto:** ETP Express

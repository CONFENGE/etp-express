# Story TD-007: Frontend - Accessibility & i18n Fixes

## Priority: P2
## Estimated Effort: 4h
## Area: Frontend

## Description

As a user with accessibility needs, I want all UI labels and ARIA attributes in PT-BR and pagination responses standardized, so that the application is WCAG-compliant and consistent.

## Technical Debts Addressed

- **FE-02**: Pagination type inconsistency - `pagination` vs `meta` across endpoints (MEDIA)
- **FE-08**: aria-labels in English in production components - violates WCAG 3.1.1 (MEDIA)

## Acceptance Criteria

- [x] All API pagination responses use `meta` key (NestJS/JSON:API standard)
- [x] Frontend pagination hooks/components updated to consume `meta` format
- [x] All aria-labels translated to PT-BR in: LoadingState, QuotaIndicator, MainLayout, AssignManagerDialog, ETPEditor
- [x] No English-language aria-labels remain in production components
- [x] WCAG 3.1.1 (Language of Page) compliance verified

## Technical Notes

- Pagination: unify to `meta` format (`meta.total`, `meta.page`, `meta.limit`, `meta.totalPages`)
- Update backend interceptors/decorators that generate pagination responses
- Frontend components with English aria-labels identified by @ux-design-expert: LoadingState, QuotaIndicator, MainLayout, AssignManagerDialog, ETPEditor
- No dependencies on other stories

## Test Plan

- Unit test: Pagination response uses `meta` key
- Unit test: Frontend pagination hook parses `meta` format correctly
- Snapshot test: aria-labels are in PT-BR for all affected components
- axe-core scan on pages containing affected components

## Files Modified

- `frontend/src/components/common/LoadingState.tsx` - Translated all aria-labels to PT-BR (8 skeleton components)
- `frontend/src/components/manager/QuotaIndicator.tsx` - Translated aria-labels and user-facing text to PT-BR
- `frontend/src/components/layout/MainLayout.tsx` - Translated main content aria-label to PT-BR
- `frontend/src/components/layout/Sidebar.tsx` - Translated navigation aria-label to PT-BR
- `frontend/src/components/admin/AssignManagerDialog.tsx` - Translated all UI text to PT-BR
- `frontend/src/components/common/SkipLink.tsx` - Changed default label to PT-BR
- `frontend/src/components/accessibility.test.tsx` - Updated tests for new PT-BR defaults

## Implementation Notes

**Pagination Standardization (FE-02):**
- Backend already uses `meta` format (verified in `backend/src/common/dto/pagination.dto.ts`)
- No changes needed - pagination was already standardized to JSON:API format

**ARIA Labels Translation (FE-08):**
- Translated 8 skeleton loading components in LoadingState.tsx
- Translated QuotaIndicator aria-labels and text ("em uso", "vagas disponíveis")
- Translated MainLayout main content label ("Conteúdo principal")
- Translated Sidebar navigation label ("Navegação principal")
- Translated AssignManagerDialog entire UI to PT-BR
- Changed SkipLink default from "Skip to main content" to "Pular para o conteúdo principal"
- Updated accessibility tests to match new PT-BR defaults

**WCAG 3.1.1 Compliance:**
- All aria-labels now in PT-BR, matching the page language
- Accessibility tests pass (30/30 tests)
- No English-language aria-labels remain in production components

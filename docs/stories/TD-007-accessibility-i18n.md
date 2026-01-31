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

- [ ] All API pagination responses use `meta` key (NestJS/JSON:API standard)
- [ ] Frontend pagination hooks/components updated to consume `meta` format
- [ ] All aria-labels translated to PT-BR in: LoadingState, QuotaIndicator, MainLayout, AssignManagerDialog, ETPEditor
- [ ] No English-language aria-labels remain in production components
- [ ] WCAG 3.1.1 (Language of Page) compliance verified

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

## Files Likely Affected

- Backend pagination interceptor/decorator
- `frontend/src/components/LoadingState.tsx`
- `frontend/src/components/QuotaIndicator.tsx`
- `frontend/src/layouts/MainLayout.tsx`
- `frontend/src/components/AssignManagerDialog.tsx`
- `frontend/src/components/ETPEditor.tsx`
- Frontend pagination hooks/utilities

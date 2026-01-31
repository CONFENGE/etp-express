# Story TD-006: Frontend - Password Validation Alignment

## Priority: P1
## Estimated Effort: 3h
## Area: Frontend

## Description

As a user, I want consistent password requirements across all forms (login, register, password change), so that I am not confused by different validation rules and my account is protected by the same security standards everywhere.

## Technical Debts Addressed

- **FE-01**: Password validation inconsistency - Login/Register accept min 6 chars, backend requires 8 (ALTA)
- **FE-09**: Password validation inconsistency between forms - PasswordChangeModal has strength indicator + complexity, Login/Register do not (MEDIA)

## Acceptance Criteria

- [ ] `PasswordStrengthInput` component extracted from PasswordChangeModal
- [ ] Login.tsx uses minimum 8 characters validation (matching backend)
- [ ] Register.tsx uses minimum 8 characters validation (matching backend)
- [ ] Register.tsx includes password strength indicator (reusing PasswordStrengthInput)
- [ ] All password forms enforce same complexity rules as backend
- [ ] Error messages are clear and in PT-BR
- [ ] Existing users are not impacted (only new registrations/logins affected)

## Technical Notes

- PasswordChangeModal.tsx already has the correct implementation with `minLength: 8` + strength indicator
- Extract the strength indicator and validation logic into a reusable `PasswordStrengthInput` component
- Login.tsx line 29 and Register.tsx line 30 currently use `min(6)` - change to `min(8)`
- No dependencies on other stories

## Test Plan

- Unit test: PasswordStrengthInput component renders and validates correctly
- E2E test: Registration with 6 chars rejected at frontend (never reaches backend)
- E2E test: Registration with 8+ chars with complexity passes
- E2E test: Login form shows correct validation message for short passwords
- Visual test: Strength indicator displays correctly in Register form

## Files Likely Affected

- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Register.tsx`
- `frontend/src/components/PasswordChangeModal.tsx` (extract component)
- `frontend/src/components/PasswordStrengthInput.tsx` (new shared component)

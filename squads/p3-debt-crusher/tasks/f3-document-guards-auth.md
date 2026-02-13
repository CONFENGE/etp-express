---
task: "Document guards and authentication flow"
responsavel: "@hygiene-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: SYS-07
story_ref: TD-009.3
front: F3
Entrada: |
  - backend/src/modules/auth/guards/
  - All guard implementations
  - @Public() decorator usage
Saida: |
  - docs/architecture/guards-and-auth.md (comprehensive documentation)
Checklist:
  - "[ ] Read all guard files in auth/guards/"
  - "[ ] Read @Public() decorator implementation"
  - "[ ] Map guard execution order (NestJS guard chain)"
  - "[ ] Document JwtAuthGuard behavior and token validation"
  - "[ ] Document TenantGuard behavior and organizationId injection"
  - "[ ] Document RolesGuard behavior and RBAC checks"
  - "[ ] Document @Public() bypass mechanism"
  - "[ ] Document any route-specific guard overrides"
  - "[ ] Create flow diagram (text-based)"
  - "[ ] Add examples for common patterns"
  - "[ ] Review document for accuracy"
---

# SYS-07: Guards & Auth Documentation

## Context
The global guard chain (JwtAuthGuard → TenantGuard → RolesGuard) is undocumented.
New developers struggle to understand the authentication flow and how @Public()
bypasses the guard chain.

## Document Structure
```markdown
# Guards & Authentication Flow

## Overview
## Guard Chain (execution order)
## JwtAuthGuard
## TenantGuard
## RolesGuard
## @Public() Decorator
## Common Patterns
## Troubleshooting
```

## Risk
- NONE: Documentation only, no code changes

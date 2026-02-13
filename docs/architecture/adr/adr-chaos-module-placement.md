# ADR: Chaos Module Placement

## Status

**Accepted** - 2026-02-12

## Context

The ETP Express codebase contains chaos engineering test files at `backend/src/chaos/`.
Currently, this directory contains one spec file:

- `backend/src/chaos/inbound-payload.chaos.spec.ts` - Tests system behavior when clients
  send large payloads, validating body parser size limits, memory safety, and event loop health.

This is a test-only module (no runtime module registered in `app.module.ts`). The chaos
tests import `body-parser` directly for simulation purposes and use Jest for assertions.

### Key Observations

1. **Not a NestJS module**: There is no `ChaosModule` class registered in `app.module.ts`.
   The `backend/src/chaos/` directory only contains `.spec.ts` test files.

2. **No environment guard needed**: Since there is no runtime module being loaded, there is
   no risk of chaos functionality running in production. The tests only execute when
   explicitly run via the Jest test runner.

3. **Test placement**: The chaos tests live inside `backend/src/chaos/` rather than in a
   dedicated test directory (e.g., `backend/test/chaos/` or `backend/src/__tests__/chaos/`).

## Decision

**Keep the current placement** of chaos engineering tests at `backend/src/chaos/`.

### Rationale

1. **No runtime risk**: Since there is no NestJS module, no controllers, no services, and
   no import in `app.module.ts`, the chaos code never executes in production. The files are
   `.spec.ts` only, which are excluded from production builds by TypeScript configuration
   and are only executed by the Jest test runner.

2. **Clear naming convention**: The `.chaos.spec.ts` suffix clearly identifies these as
   chaos engineering tests, distinguishing them from unit tests (`.spec.ts`) and integration
   tests (`.integration.spec.ts`).

3. **Colocated with source**: Keeping chaos tests inside `backend/src/` allows them to
   directly import and test internal modules without path gymnastics, which is consistent
   with NestJS testing conventions.

4. **No environment guard required**: An environment guard (e.g., `if NODE_ENV !== 'production'`)
   would only be needed if there were a runtime `ChaosModule` that could be accidentally
   imported. Since the chaos directory is test-only, this is unnecessary.

## Consequences

### Positive

- No production risk from chaos test code.
- Clear separation via file naming convention (`.chaos.spec.ts`).
- Consistent with existing project test patterns.

### Negative

- The `backend/src/chaos/` directory may give the impression of a runtime module to new
  developers. This ADR serves as documentation to clarify.

### Future Considerations

- If runtime chaos capabilities are ever needed (e.g., fault injection endpoints for staging),
  they MUST be implemented as a proper NestJS module with an environment guard:
  ```typescript
  @Module({})
  export class ChaosModule {
    static register(): DynamicModule {
      if (process.env.NODE_ENV === 'production') {
        return { module: ChaosModule }; // Empty module, no providers
      }
      return {
        module: ChaosModule,
        controllers: [ChaosController],
        providers: [ChaosService],
      };
    }
  }
  ```
- If additional chaos test files are added, they should follow the `.chaos.spec.ts` naming
  convention and be placed in `backend/src/chaos/`.

## References

- `backend/src/chaos/inbound-payload.chaos.spec.ts` - Existing chaos test
- Issue #1637 - Large Payload Chaos Test
- Issue #1074 - Chaos Engineering implementation
- TD-009.3 SYS-09 - Technical debt evaluation

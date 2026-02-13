---
task: "Refactor body parser to native NestJS API"
responsavel: "@hygiene-dev"
responsavel_type: agent
atomic_layer: task
elicit: false
debt_id: SYS-06
story_ref: TD-009.3
front: F3
Entrada: |
  - backend/src/main.ts
  - Current body-parser configuration
Saida: |
  - main.ts using NestJS native body parser options
  - body-parser dependency removed (if unused elsewhere)
Checklist:
  - "[ ] Read backend/src/main.ts to find current body-parser usage"
  - "[ ] Identify all content-type configurations (json, urlencoded, raw, text)"
  - "[ ] Identify any custom body-parser middleware for specific routes"
  - "[ ] Replace with NestFactory.create(AppModule, { bodyParser: true }) + app.useBodyParser()"
  - "[ ] Or use rawBody option if raw body access is needed"
  - "[ ] Check if body-parser is used in any other file"
  - "[ ] If not, remove from package.json: npm uninstall body-parser @types/body-parser"
  - "[ ] Test file upload endpoints still work"
  - "[ ] Test webhook endpoints (may need raw body)"
  - "[ ] Run full test suite"
---

# SYS-06: Native NestJS Body Parser

## Context
The application uses raw `body-parser` middleware instead of NestJS's built-in body parsing.
NestJS 10+ has native support for body parser configuration.

## NestJS Pattern
```typescript
const app = await NestFactory.create(AppModule, {
  rawBody: true, // if raw body access needed
});

// Configure limits
app.useBodyParser('json', { limit: '10mb' });
app.useBodyParser('urlencoded', { extended: true, limit: '10mb' });
```

## Risk
- MEDIUM: Must preserve all existing content-type handling
- Test file uploads, webhooks, and large payload endpoints

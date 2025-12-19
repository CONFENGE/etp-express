# JSDoc Documentation Standards - ETP Express Backend

## Purpose
This document defines JSDoc documentation standards for the ETP Express NestJS backend to ensure consistent, comprehensive, and maintainable API documentation.

## Core Principles
1. **Document WHY, not just WHAT** - Types tell us what, JSDoc tells us why and how
2. **Public APIs first** - All exported classes and methods must be documented
3. **Examples for complexity** - Complex business logic needs usage examples
4. **Keep it current** - Update docs when code changes

## Documentation Levels

### 1. Class-Level Documentation

All services, controllers, and DTOs must have class-level JSDoc.

**Template:**
```typescript
/**
 * [One-line summary of class purpose].
 *
 * @remarks
 * [Detailed explanation of how this class works, architectural notes,
 * design decisions, or important context. Optional but recommended for
 * complex services.]
 *
 * @example
 * ```ts
 * // Usage example (optional, for complex classes)
 * const result = await service.method(params);
 * ```
 *
 * @see [RelatedClass] - [Why this is related]
 */
```

**Example - Service:**
```typescript
/**
 * Service responsible for ETP (Estudos Técnicos Preliminares) management.
 *
 * @remarks
 * This service handles CRUD operations for ETPs and coordinates with
 * SectionsService for content generation. It uses TypeORM repositories
 * for database operations and integrates with the AI orchestrator.
 *
 * @see SectionsService
 * @see OrchestratorService
 */
@Injectable()
export class ETPsService {
 // ...
}
```

**Example - Controller:**
```typescript
/**
 * Controller handling ETP (Estudos Técnicos Preliminares) HTTP endpoints.
 *
 * @remarks
 * All endpoints require JWT authentication via JwtAuthGuard.
 * Endpoints return standard HTTP status codes:
 * - 200: Success
 * - 201: Created
 * - 400: Validation error
 * - 404: ETP not found
 * - 403: User not authorized to access this ETP
 */
@Controller('etps')
@UseGuards(JwtAuthGuard)
export class ETPsController {
 // ...
}
```

**Example - DTO:**
```typescript
/**
 * Data Transfer Object for creating a new ETP.
 *
 * @remarks
 * All fields are validated via class-validator decorators.
 * The title must be unique per user.
 */
export class CreateETPDto {
 // ...
}
```

### 2. Method-Level Documentation

All public methods must have JSDoc with `@param`, `@returns`, and `@throws` tags.

**Template:**
```typescript
/**
 * [One-line summary of what the method does].
 *
 * @remarks
 * [Optional: Detailed explanation of how the method works, edge cases,
 * performance notes, or important implementation details.]
 *
 * @param paramName - [Description of parameter, including constraints]
 * @param options - [For object params, describe structure or key fields]
 * @returns [Description of return value, including important properties]
 * @throws {ExceptionType} [When and why this exception is thrown]
 *
 * @example
 * ```ts
 * // Example usage (optional, for complex methods)
 * const etp = await service.create(createDto, userId);
 * ```
 */
```

**Example - Simple Method:**
```typescript
/**
 * Retrieves an ETP by its ID.
 *
 * @param id - ETP unique identifier
 * @param userId - Current user ID (for authorization check)
 * @returns The ETP entity with all sections
 * @throws {NotFoundException} If ETP not found
 * @throws {ForbiddenException} If user doesn't own this ETP
 */
async findOne(id: string, userId: string): Promise<ETP> {
 // ...
}
```

**Example - Complex Method with @example:**
```typescript
/**
 * Generates ETP section content using AI orchestration.
 *
 * @remarks
 * This method coordinates multiple AI agents (Researcher, Writer, Reviewer)
 * via OrchestratorService. Generation can take 30-60 seconds depending on
 * section complexity and API response times.
 *
 * @param etpId - ETP unique identifier
 * @param sectionKey - Section identifier (e.g., "1-introducao")
 * @param userId - Current user ID (for authorization)
 * @returns Generated section entity with content and metadata
 * @throws {NotFoundException} If ETP or section template not found
 * @throws {ForbiddenException} If user doesn't own this ETP
 * @throws {BadRequestException} If section already generated and not stale
 * @throws {InternalServerErrorException} If AI generation fails
 *
 * @example
 * ```ts
 * const section = await sectionsService.generate(
 * 'etp-uuid',
 * '1-introducao',
 * 'user-uuid'
 * );
 * console.log(section.content); // AI-generated markdown content
 * ```
 */
async generate(
 etpId: string,
 sectionKey: string,
 userId: string
): Promise<Section> {
 // ...
}
```

**Example - Method with Multiple Throws:**
```typescript
/**
 * Authenticates user credentials and returns JWT token.
 *
 * @param credentials - User email and password
 * @returns Authentication response with JWT token and user data
 * @throws {UnauthorizedException} If credentials are invalid
 * @throws {UnauthorizedException} If account is locked
 * @throws {BadRequestException} If email format is invalid
 */
async login(credentials: LoginDto): Promise<AuthResponse> {
 // ...
}
```

### 3. Property/Field Documentation

Document non-obvious fields in DTOs and entities.

**Example:**
```typescript
export class CreateETPDto {
 /**
 * ETP title (must be unique per user).
 * @example "Aquisição de 50 Notebooks Dell Latitude 5420"
 */
 @IsNotEmpty()
 @MaxLength(200)
 title: string;

 /**
 * Fiscal year for procurement planning.
 * @example 2025
 */
 @IsInt()
 @Min(2020)
 @Max(2050)
 fiscalYear: number;

 /**
 * Estimated procurement budget in BRL cents (to avoid floating-point errors).
 * @example 10000000 // R$ 100,000.00
 */
 @IsInt()
 @Min(0)
 estimatedValue: number;
}
```

## JSDoc Tags Reference

### Required Tags

| Tag | When to Use | Example |
|-----|-------------|---------|
| `@param` | Every method parameter | `@param id - User unique identifier` |
| `@returns` | Every method with return value | `@returns User entity with hashed password` |
| `@throws` | Every exception the method can throw | `@throws {NotFoundException} If user not found` |

### Recommended Tags

| Tag | When to Use | Example |
|-----|-------------|---------|
| `@remarks` | Additional context, architecture notes | `@remarks Uses bcrypt for password hashing` |
| `@example` | Complex methods, non-obvious usage | See examples above |
| `@see` | Related classes/methods | `@see AuthService` |
| `@deprecated` | Deprecated APIs | `@deprecated Use newMethod() instead` |

### Optional Tags

| Tag | When to Use | Example |
|-----|-------------|---------|
| `@since` | Track when API was added | `@since v1.2.0` |
| `@todo` | Track planned improvements | `@todo Add caching for performance` |
| `@internal` | Mark internal-only APIs | `@internal Do not use outside this module` |

## When to Include @example

Include `@example` when:
- Method has complex parameters or return types
- Usage is not immediately obvious from the signature
- Method involves multiple steps or coordination
- Method is frequently used and benefits from quick reference

**Do NOT include @example for:**
- Simple CRUD operations with obvious signatures
- Self-explanatory getters/setters
- One-parameter methods with clear names

## Documentation Checklist

Before considering documentation complete, verify:

- [ ] All exported classes have class-level JSDoc
- [ ] All public methods have method-level JSDoc
- [ ] All `@param` tags match actual parameters
- [ ] All `@returns` tags describe return value
- [ ] All `@throws` tags list possible exceptions
- [ ] Complex methods include `@example`
- [ ] No placeholder or TODO comments left in JSDoc
- [ ] TypeDoc generates documentation without warnings (if configured)

## Tools Integration

### TypeDoc (Optional)

Generate HTML documentation from JSDoc:

```bash
npm install --save-dev typedoc
npm run docs:generate # Generates docs/api/
npm run docs:serve # Serves on http://localhost:3000
```

### ESLint JSDoc Plugin (Optional)

Enforce JSDoc standards via linting:

```bash
npm install --save-dev eslint-plugin-jsdoc
```

Add to `.eslintrc.js`:
```javascript
{
 "plugins": ["jsdoc"],
 "rules": {
 "jsdoc/require-jsdoc": ["warn", {
 "require": {
 "ClassDeclaration": true,
 "MethodDefinition": true
 }
 }],
 "jsdoc/require-param": "warn",
 "jsdoc/require-returns": "warn",
 "jsdoc/check-param-names": "error",
 "jsdoc/check-tag-names": "error"
 }
}
```

## Anti-Patterns to Avoid

### ❌ BAD: Restating the obvious
```typescript
/**
 * Gets a user.
 * @param id - The id
 * @returns A user
 */
async getUser(id: string): Promise<User> {}
```

### ✅ GOOD: Adding value beyond the signature
```typescript
/**
 * Retrieves user by ID with related ETPs preloaded.
 *
 * @param id - User unique identifier (UUID v4)
 * @returns User entity with eager-loaded ETPs relationship
 * @throws {NotFoundException} If user not found
 */
async getUser(id: string): Promise<User> {}
```

### ❌ BAD: Outdated documentation
```typescript
/**
 * Creates a new ETP.
 * @param dto - CreateETPDto
 * @param userId - User ID
 */
// Method signature changed but docs didn't!
async create(dto: CreateETPDto): Promise<ETP> {}
```

### ✅ GOOD: Keep docs in sync with code
```typescript
/**
 * Creates a new ETP for the authenticated user.
 *
 * @remarks
 * User ID is extracted from JWT token via @CurrentUser() decorator.
 *
 * @param dto - ETP creation data
 * @returns Created ETP entity with generated UUID
 */
async create(dto: CreateETPDto, @CurrentUser() user: User): Promise<ETP> {}
```

## Maintenance

**When to update JSDoc:**
- Method signature changes (params, return type)
- New exceptions added
- Business logic changes significantly
- Deprecating an API

**Code Review Checklist:**
- [ ] New classes have JSDoc
- [ ] New methods have JSDoc
- [ ] Modified methods have updated JSDoc
- [ ] No JSDoc warnings from ESLint

---

**Last Updated:** 2025-11-11
**Maintainer:** ETP Express Team
**Questions?** Open an issue with label `docs`

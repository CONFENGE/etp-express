# Guards and Authentication Architecture

## Overview

ETP Express uses a layered guard architecture built on NestJS's guard system and Passport.js
for authentication. Guards execute in a defined order and use decorators for metadata-driven
access control. The system supports JWT-based authentication (via httpOnly cookies),
API Key authentication for public endpoints, multi-tenancy isolation, role-based access
control (RBAC), and feature flag gating.

## Authentication Flow

```
HTTP Request
  |
  v
[Middleware Layer]
  SecurityMiddleware -> RequestIdMiddleware -> RequestMetricsMiddleware
  |
  v
[Guard Layer - Global (APP_GUARD)]
  1. JwtAuthGuard (via AuthModule / @UseGuards per-route)
  2. TenantGuard (global APP_GUARD)
  3. RolesGuard (global APP_GUARD)
  |
  v
[Guard Layer - Per-Route (via @UseGuards)]
  4. ResourceOwnershipGuard (optional, per-endpoint)
  5. FeatureFlagGuard (optional, per-endpoint)
  6. DemoUserEtpLimitGuard (optional, per-endpoint)
  7. UserThrottlerGuard / ApiKeyThrottlerGuard (optional, per-endpoint)
  |
  v
[Controller Handler]
```

## Guard Execution Order

### Global Guards (registered in `app.module.ts` via `APP_GUARD`)

| Order | Guard | Purpose |
|-------|-------|---------|
| 1 | **JwtAuthGuard** | Authenticates user via JWT (cookie or Bearer header). Applied per-route via `@UseGuards(JwtAuthGuard)`, not globally via APP_GUARD. |
| 2 | **TenantGuard** | Checks if the user's organization is active (kill switch for suspended orgs). |
| 3 | **RolesGuard** | Checks if the user has one of the required roles defined by `@Roles()`. |

**Important:** JwtAuthGuard is NOT registered as a global APP_GUARD. It is applied
per-controller or per-route using `@UseGuards(JwtAuthGuard)`. TenantGuard and RolesGuard
are registered globally.

### Per-Route Guards (applied via `@UseGuards()`)

| Guard | Purpose | Decorator |
|-------|---------|-----------|
| **ResourceOwnershipGuard** | Validates resource ownership and multi-tenancy isolation (IDOR prevention). | `@RequireOwnership()` |
| **FeatureFlagGuard** | Gates endpoints behind feature flags. | `@RequireFeatureFlag()` |
| **DemoUserEtpLimitGuard** | Blocks demo users who reached their ETP creation limit. | Direct `@UseGuards()` |
| **UserThrottlerGuard** | Rate-limits by user ID (for AI generation endpoints). | Direct `@UseGuards()` |
| **ApiKeyGuard** | Authenticates via X-API-Key header for public API. | `@ApiKey()` |
| **ApiKeyThrottlerGuard** | Rate-limits public API by plan quota (FREE/PRO/ENTERPRISE). | Direct `@UseGuards()` |

## Guard Details

### JwtAuthGuard

**File:** `backend/src/common/guards/jwt-auth.guard.ts`

- Extends Passport's `AuthGuard('jwt')`.
- Checks the `@Public()` decorator metadata. If the route is public, bypasses authentication.
- JWT is extracted from an httpOnly cookie named `jwt` (primary) or the `Authorization: Bearer` header (fallback for Swagger/API testing).
- Supports dual-key secret rotation: validates against both `JWT_SECRET` and `JWT_SECRET_OLD` for zero-downtime rotation.
- On success, populates `request.user` with the authenticated user data including `organizationId` and `organization` relation.

**JWT Strategy** (`backend/src/modules/auth/strategies/jwt.strategy.ts`):
- Uses `cookieExtractor` to read JWT from httpOnly cookie first, Bearer header second.
- Uses `secretOrKeyProvider` for dual-key rotation support.
- Calls `usersService.findOneWithOrganization()` to load the full user with organization relation.
- Handles demo user management: blocked demo users (`isDemoBlocked=true`) can still authenticate for read-only access.

### TenantGuard

**File:** `backend/src/common/guards/tenant.guard.ts`

- Implements the organization suspension kill switch (MT-04).
- Skips check for `@Public()` routes.
- If `user.organization.isActive === false`, blocks access with 403 Forbidden.
- Logs all blocked access attempts via `AuditService.logTenantBlocked()` for audit trail.
- Requires the user entity to have the organization relation eagerly loaded.

### RolesGuard

**File:** `backend/src/common/guards/roles.guard.ts`

- Reads required roles from `@Roles()` decorator metadata.
- If no `@Roles()` decorator is present, allows access (default allow).
- If roles are specified, checks that `user.role` matches at least one required role.
- Role hierarchy: `SYSTEM_ADMIN > DOMAIN_MANAGER > ADMIN > USER > VIEWER > DEMO`.

### ResourceOwnershipGuard

**File:** `backend/src/common/guards/resource-ownership.guard.ts`

- Activated by `@RequireOwnership({ resourceType, idParam?, validateOwnership? })`.
- Fetches the resource (ETP, Section, or Version) from the database.
- Validates `organizationId` matches user's organization (multi-tenancy isolation).
- Optionally validates `createdById` matches the authenticated user (ownership).
- Injects the validated resource into `request.resource` for downstream controller use.
- Prevents IDOR (Insecure Direct Object Reference) vulnerabilities.

### FeatureFlagGuard

**File:** `backend/src/modules/feature-flags/guards/feature-flag.guard.ts`

- Activated by `@RequireFeatureFlag(FeatureFlag.SOME_FLAG)`.
- Evaluates the flag using `FeatureFlagsService.isEnabled()` with user/org context.
- Returns 403 if the flag is not enabled for the requesting user.

### ApiKeyGuard

**File:** `backend/src/common/guards/api-key.guard.ts`

- Used for public API endpoints (e.g., `/api/v1/prices`).
- Validates the `X-API-Key` header.
- Dual-read strategy: tries plaintext match first (legacy), then bcrypt hash comparison.
- Attaches the user and API plan to the request for downstream rate limiting.

### DemoUserEtpLimitGuard

**File:** `backend/src/common/guards/demo-user-etp-limit.guard.ts`

- Only applies to users with `UserRole.DEMO`.
- Counts the user's existing ETPs and compares against `etpLimitCount` (default: 3).
- If the limit is reached, deactivates the user account and throws 403 with code `DEMO_ETP_LIMIT_REACHED`.

### UserThrottlerGuard

**File:** `backend/src/common/guards/user-throttler.guard.ts`

- Extends NestJS `ThrottlerGuard`.
- Uses `user.id` as the throttling key instead of IP address.
- Falls back to IP if user is not authenticated.
- Configured per-endpoint via `@Throttle()` decorator.

### ApiKeyThrottlerGuard

**File:** `backend/src/common/guards/api-key-throttler.guard.ts`

- Extends `ThrottlerGuard` for public API rate limiting.
- Dynamically adjusts rate limits based on user's API plan (FREE: 100/month, PRO: 5000/month, ENTERPRISE: unlimited).
- Uses a 30-day TTL for monthly quota tracking.

## Decorators

### @Public()

**File:** `backend/src/common/decorators/public.decorator.ts`

Sets metadata key `isPublic` to `true`. When present on a route or controller:
- `JwtAuthGuard` skips JWT validation (allows unauthenticated access).
- `TenantGuard` skips organization check.
- `ApiKeyGuard` skips API key validation.

```typescript
@Public()
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

### @Roles()

**File:** `backend/src/common/decorators/roles.decorator.ts`

Sets metadata key `roles` to the specified `UserRole[]` array. Used by `RolesGuard`.

```typescript
@Roles(UserRole.SYSTEM_ADMIN)
@Get('admin/dashboard')
async getAdminDashboard() { ... }
```

### @RequireOwnership()

**File:** `backend/src/common/decorators/require-ownership.decorator.ts`

Configures `ResourceOwnershipGuard` with resource type, ID parameter name, and ownership validation toggle.

```typescript
@RequireOwnership({ resourceType: ResourceType.ETP })
@UseGuards(ResourceOwnershipGuard)
@Get(':id')
async getEtp(@Param('id') id: string) { ... }
```

### @RequireFeatureFlag()

**File:** `backend/src/modules/feature-flags/decorators/feature-flag.decorator.ts`

Marks an endpoint as requiring a specific feature flag to be enabled.

```typescript
@RequireFeatureFlag(FeatureFlag.NEW_DASHBOARD)
@UseGuards(FeatureFlagGuard)
@Get('dashboard/v2')
async getNewDashboard() { ... }
```

### @ApiKey()

**File:** `backend/src/common/decorators/api-key.decorator.ts`

Marks a controller or endpoint as requiring API Key authentication instead of JWT.

```typescript
@Controller('api/v1/prices')
@ApiKey()
export class PublicPricesController { ... }
```

### @CurrentUser()

**File:** `backend/src/common/decorators/current-user.decorator.ts`

Extracts the authenticated user from `request.user` (populated by JwtAuthGuard).

```typescript
@Get('me')
async getProfile(@CurrentUser() user: UserPayload) { ... }
```

## Common Patterns

### Public Endpoint (no auth required)

```typescript
@Public()
@Get('health')
async healthCheck() {
  return { status: 'ok' };
}
```

### Standard Authenticated Endpoint

```typescript
@UseGuards(JwtAuthGuard)
@Get('etps')
async listEtps(@CurrentUser() user: UserPayload) {
  // user.organizationId is available for data isolation
}
```

### Admin-Only Endpoint

```typescript
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SYSTEM_ADMIN)
@Post('system/settings')
async updateSettings(@Body() dto: SettingsDto) { ... }
```

### Endpoint with Ownership Validation

```typescript
@UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
@RequireOwnership({ resourceType: ResourceType.ETP })
@Put(':id')
async updateEtp(@Param('id') id: string, @Body() dto: UpdateEtpDto) {
  // request.resource contains the validated ETP
}
```

### Feature-Gated Endpoint

```typescript
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@RequireFeatureFlag(FeatureFlag.EXPORT_V2)
@Post('export/v2')
async exportV2(@Body() dto: ExportDto) { ... }
```

### Rate-Limited AI Endpoint

```typescript
@UseGuards(JwtAuthGuard, UserThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('generate')
async generate(@CurrentUser() user: UserPayload) { ... }
```

### Public API with API Key

```typescript
@Controller('api/v1/prices')
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
export class PublicPricesController {
  @Get('benchmark')
  async getBenchmark() { ... }
}
```

## Security Considerations

1. **JWT in httpOnly cookies**: Prevents XSS-based token theft. Bearer header is only a fallback for API testing.
2. **Dual-key rotation**: Supports zero-downtime JWT secret rotation via `JWT_SECRET` + `JWT_SECRET_OLD`.
3. **Multi-tenancy isolation**: TenantGuard + ResourceOwnershipGuard ensure cross-tenant data access is impossible.
4. **IDOR prevention**: ResourceOwnershipGuard validates both organization and ownership before allowing resource access.
5. **Rate limiting**: Both per-user (UserThrottlerGuard) and per-plan (ApiKeyThrottlerGuard) rate limiting protect against abuse.
6. **Audit trail**: TenantGuard logs all blocked access attempts for compliance and forensics.

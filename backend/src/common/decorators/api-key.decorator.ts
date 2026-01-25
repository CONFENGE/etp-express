import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for API Key authentication
 *
 * Used by ApiKeyGuard to identify endpoints that require API Key auth.
 * Part of M13: Market Intelligence - Public API (#1686)
 */
export const API_KEY_AUTH = 'apiKeyAuth';

/**
 * @ApiKey() decorator
 *
 * Marks a controller or endpoint as requiring API Key authentication.
 * Use this on public API endpoints (/api/v1/prices/*) to enforce API Key validation.
 *
 * When applied:
 * - Requires X-API-Key header
 * - Bypasses JWT authentication
 * - Enforces rate limiting based on API plan
 *
 * Usage:
 * ```typescript
 * @Controller('api/v1/prices')
 * @ApiKey()
 * export class PublicPricesController {
 *   @Get('benchmark')
 *   async getBenchmark() { ... }
 * }
 * ```
 *
 * Part of M13: Market Intelligence - Public API (#1686)
 *
 * @see ApiKeyGuard
 * @see Issue #1686
 */
export const ApiKey = () => SetMetadata(API_KEY_AUTH, true);

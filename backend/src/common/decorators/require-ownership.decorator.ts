import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ResourceOwnershipGuard } from '../guards/resource-ownership.guard';

/**
 * Supported resource types for ownership validation.
 * Each type maps to a specific entity and repository.
 */
export enum ResourceType {
 ETP = 'etp',
 SECTION = 'section',
}

/**
 * Configuration options for ownership validation.
 */
export interface OwnershipConfig {
 /**
 * Type of resource to validate ownership for.
 */
 resourceType: ResourceType;

 /**
 * Parameter name containing the resource ID.
 * @default 'id'
 */
 idParam?: string;

 /**
 * Whether to validate that the user owns the resource (createdById).
 * When false, only organizationId is validated.
 * @default true
 */
 validateOwnership?: boolean;
}

export const OWNERSHIP_KEY = 'ownership_config';

/**
 * Decorator that enforces resource ownership validation at the controller level.
 *
 * @remarks
 * This decorator centralizes the tenancy (organizationId) and ownership (createdById)
 * validation that was previously duplicated in service methods. It:
 *
 * 1. Extracts resourceId from request params (default: 'id')
 * 2. Fetches the resource from database
 * 3. Validates organizationId matches user's organization
 * 4. Optionally validates createdById matches user (ownership)
 * 5. Injects the validated resource into request.resource
 *
 * Benefits:
 * - Eliminates duplicated validation code in services
 * - Prevents IDOR (Insecure Direct Object References) vulnerabilities
 * - Reduces database queries (resource already fetched for validation)
 * - Consistent error messages and logging
 *
 * @param config - Ownership validation configuration
 * @returns Combined decorator with metadata and guard
 *
 * @example
 * ```typescript
 * // Validate ETP ownership (organizationId + createdById)
 * @RequireOwnership({ resourceType: ResourceType.ETP })
 * @Patch(':id')
 * async update(@Param('id') id: string, @Resource() etp: Etp) {
 * // etp is already validated and loaded
 * return this.etpsService.updateDirect(etp, updateDto);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Validate only organizationId (for read-only operations)
 * @RequireOwnership({ resourceType: ResourceType.ETP, validateOwnership: false })
 * @Get(':id')
 * async findOne(@Resource() etp: Etp) {
 * return { data: etp };
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Custom ID parameter
 * @RequireOwnership({ resourceType: ResourceType.ETP, idParam: 'etpId' })
 * @Post(':etpId/sections')
 * async createSection(@Param('etpId') etpId: string, @Resource() etp: Etp) {
 * // ...
 * }
 * ```
 */
export function RequireOwnership(config: OwnershipConfig) {
 const normalizedConfig: Required<OwnershipConfig> = {
 resourceType: config.resourceType,
 idParam: config.idParam ?? 'id',
 validateOwnership: config.validateOwnership ?? true,
 };

 return applyDecorators(
 SetMetadata(OWNERSHIP_KEY, normalizedConfig),
 UseGuards(ResourceOwnershipGuard),
 );
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator to extract the validated resource from request.
 *
 * @remarks
 * Used in conjunction with @RequireOwnership() decorator. The ResourceOwnershipGuard
 * fetches and validates the resource, then injects it into request.resource.
 *
 * This decorator provides type-safe access to the pre-validated resource,
 * eliminating the need to fetch it again in the controller/service.
 *
 * @returns The validated resource or null if not present
 *
 * @example
 * ```typescript
 * @RequireOwnership({ resourceType: ResourceType.ETP })
 * @Patch(':id')
 * async update(
 * @Param('id') id: string,
 * @Body() updateDto: UpdateEtpDto,
 * @Resource() etp: Etp, // Already validated and loaded
 * ) {
 * // No need to fetch ETP again or validate ownership
 * Object.assign(etp, updateDto);
 * return this.etpsRepository.save(etp);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Access specific property
 * @RequireOwnership({ resourceType: ResourceType.ETP })
 * @Get(':id')
 * async findOne(@Resource('id') etpId: string) {
 * // Returns just the 'id' property of the resource
 * }
 * ```
 */
export const Resource = createParamDecorator(
 (data: string | undefined, ctx: ExecutionContext) => {
 const request = ctx.switchToHttp().getRequest();
 const resource = request.resource;

 if (!resource) {
 return null;
 }

 return data ? resource?.[data] : resource;
 },
);

import {
 Controller,
 Get,
 Post,
 Body,
 Patch,
 Param,
 Delete,
 UseGuards,
 ParseUUIDPipe,
} from '@nestjs/common';
import {
 ApiTags,
 ApiOperation,
 ApiResponse,
 ApiBearerAuth,
 ApiParam,
} from '@nestjs/swagger';
import {
 DomainManagerService,
 DomainUserResponse,
 QuotaInfo,
} from './domain-manager.service';
import { CreateDomainUserDto, UpdateDomainUserDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DomainManagerGuard } from './guards/domain-manager.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

/**
 * Controller for Domain Manager operations (M8: Gestao de Dominios Institucionais).
 *
 * Features:
 * - CRUD operations for users within a domain
 * - User quota management (max 10 per domain)
 * - Password reset for domain users
 *
 * @remarks
 * All endpoints require DOMAIN_MANAGER role (enforced by DomainManagerGuard).
 * Domain Managers can only manage users within their assigned domain.
 *
 * Standard HTTP status codes:
 * - 200: Success
 * - 201: Created
 * - 400: Validation error or business rule violation
 * - 401: Unauthorized (missing or invalid JWT)
 * - 403: Forbidden (not a DOMAIN_MANAGER or wrong domain)
 * - 404: Resource not found
 * - 409: Conflict (email already exists)
 */
@ApiTags('domain-manager')
@Controller('domain-manager')
@UseGuards(JwtAuthGuard, DomainManagerGuard)
@ApiBearerAuth()
export class DomainManagerController {
 constructor(private readonly domainManagerService: DomainManagerService) {}

 // ============================================
 // USER CRUD OPERATIONS
 // ============================================

 /**
 * Lists all users in the Domain Manager's domain.
 *
 * @param user - Current authenticated user (Domain Manager)
 * @returns Array of users in the domain
 */
 @Get('users')
 @ApiOperation({
 summary: 'List all users in my domain',
 description:
 "Returns all users assigned to the Domain Manager's authorized domain.",
 })
 @ApiResponse({
 status: 200,
 description: 'Users retrieved successfully',
 schema: {
 type: 'array',
 items: {
 type: 'object',
 properties: {
 id: { type: 'string', format: 'uuid' },
 email: { type: 'string', example: 'joao@lages.sc.gov.br' },
 name: { type: 'string', example: 'Joao Silva' },
 cargo: { type: 'string', example: 'Tecnico Administrativo' },
 isActive: { type: 'boolean', example: true },
 mustChangePassword: { type: 'boolean', example: false },
 createdAt: { type: 'string', format: 'date-time' },
 lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
 },
 },
 },
 })
 @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
 @ApiResponse({
 status: 403,
 description: 'Forbidden - DOMAIN_MANAGER role required',
 })
 async findAllUsers(@CurrentUser() user: User): Promise<DomainUserResponse[]> {
 return this.domainManagerService.findAllUsers(user.id);
 }

 /**
 * Creates a new user within the Domain Manager's domain.
 *
 * @param user - Current authenticated user (Domain Manager)
 * @param createUserDto - User creation data
 * @returns Created user
 * @throws BadRequestException 400 - If quota exceeded or email domain mismatch
 * @throws ConflictException 409 - If email already exists
 */
 @Post('users')
 @ApiOperation({
 summary: 'Create a new user in my domain',
 description:
 "Creates a new user with the default password 'mudar123'. " +
 'User must change password on first login. ' +
 "Email must match the Domain Manager's domain.",
 })
 @ApiResponse({
 status: 201,
 description: 'User created successfully',
 schema: {
 type: 'object',
 properties: {
 id: { type: 'string', format: 'uuid' },
 email: { type: 'string', example: 'joao@lages.sc.gov.br' },
 name: { type: 'string', example: 'Joao Silva' },
 cargo: { type: 'string', example: 'Tecnico Administrativo' },
 isActive: { type: 'boolean', example: true },
 mustChangePassword: { type: 'boolean', example: true },
 createdAt: { type: 'string', format: 'date-time' },
 lastLoginAt: { type: 'string', nullable: true },
 },
 },
 })
 @ApiResponse({
 status: 400,
 description: 'Quota exceeded or email domain mismatch',
 })
 @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
 @ApiResponse({
 status: 403,
 description: 'Forbidden - DOMAIN_MANAGER role required',
 })
 @ApiResponse({ status: 409, description: 'Email already exists' })
 async createUser(
 @CurrentUser() user: User,
 @Body() createUserDto: CreateDomainUserDto,
 ): Promise<DomainUserResponse> {
 return this.domainManagerService.createUser(user.id, createUserDto);
 }

 /**
 * Updates a user within the Domain Manager's domain.
 *
 * @param user - Current authenticated user (Domain Manager)
 * @param id - User UUID to update
 * @param updateUserDto - Fields to update
 * @returns Updated user
 * @throws NotFoundException 404 - If user not found
 * @throws BadRequestException 400 - If user not in domain
 */
 @Patch('users/:id')
 @ApiOperation({
 summary: 'Update a user in my domain',
 description:
 'Updates user details. Only name, cargo, and isActive can be modified. ' +
 'Cannot update administrators.',
 })
 @ApiParam({
 name: 'id',
 description: 'User UUID',
 type: 'string',
 })
 @ApiResponse({
 status: 200,
 description: 'User updated successfully',
 })
 @ApiResponse({
 status: 400,
 description: 'User not in domain or cannot modify admin',
 })
 @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
 @ApiResponse({
 status: 403,
 description: 'Forbidden - DOMAIN_MANAGER role required',
 })
 @ApiResponse({ status: 404, description: 'User not found' })
 async updateUser(
 @CurrentUser() user: User,
 @Param('id', ParseUUIDPipe) id: string,
 @Body() updateUserDto: UpdateDomainUserDto,
 ): Promise<DomainUserResponse> {
 return this.domainManagerService.updateUser(user.id, id, updateUserDto);
 }

 /**
 * Deactivates a user within the Domain Manager's domain.
 *
 * @param user - Current authenticated user (Domain Manager)
 * @param id - User UUID to deactivate
 * @throws NotFoundException 404 - If user not found
 * @throws BadRequestException 400 - If user not in domain or is admin
 */
 @Delete('users/:id')
 @ApiOperation({
 summary: 'Deactivate a user in my domain',
 description:
 'Soft-deletes a user by setting isActive=false. ' +
 'Cannot deactivate administrators.',
 })
 @ApiParam({
 name: 'id',
 description: 'User UUID',
 type: 'string',
 })
 @ApiResponse({
 status: 200,
 description: 'User deactivated successfully',
 })
 @ApiResponse({
 status: 400,
 description: 'User not in domain or cannot deactivate admin',
 })
 @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
 @ApiResponse({
 status: 403,
 description: 'Forbidden - DOMAIN_MANAGER role required',
 })
 @ApiResponse({ status: 404, description: 'User not found' })
 async deactivateUser(
 @CurrentUser() user: User,
 @Param('id', ParseUUIDPipe) id: string,
 ): Promise<{ message: string }> {
 await this.domainManagerService.deactivateUser(user.id, id);
 return { message: 'User deactivated successfully' };
 }

 // ============================================
 // QUOTA MANAGEMENT
 // ============================================

 /**
 * Retrieves quota information for the Domain Manager's domain.
 *
 * @param user - Current authenticated user (Domain Manager)
 * @returns Quota information (current/max users, available slots)
 */
 @Get('quota')
 @ApiOperation({
 summary: 'Get user quota for my domain',
 description:
 'Returns the current user count, maximum allowed users, ' +
 'available slots, and percentage used.',
 })
 @ApiResponse({
 status: 200,
 description: 'Quota information retrieved successfully',
 schema: {
 type: 'object',
 properties: {
 currentUsers: { type: 'number', example: 7 },
 maxUsers: { type: 'number', example: 10 },
 available: { type: 'number', example: 3 },
 percentUsed: { type: 'number', example: 70 },
 },
 },
 })
 @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
 @ApiResponse({
 status: 403,
 description: 'Forbidden - DOMAIN_MANAGER role required',
 })
 async getQuota(@CurrentUser() user: User): Promise<QuotaInfo> {
 return this.domainManagerService.getQuota(user.id);
 }

 // ============================================
 // PASSWORD MANAGEMENT
 // ============================================

 /**
 * Resets a user's password to the default.
 *
 * @param user - Current authenticated user (Domain Manager)
 * @param id - User UUID
 * @throws NotFoundException 404 - If user not found
 * @throws BadRequestException 400 - If user not in domain or is admin
 */
 @Post('users/:id/reset-password')
 @ApiOperation({
 summary: 'Reset user password',
 description:
 "Resets the user's password to 'mudar123' and sets mustChangePassword=true. " +
 'Cannot reset passwords for administrators.',
 })
 @ApiParam({
 name: 'id',
 description: 'User UUID',
 type: 'string',
 })
 @ApiResponse({
 status: 200,
 description: 'Password reset successfully',
 })
 @ApiResponse({
 status: 400,
 description: 'User not in domain or cannot reset admin password',
 })
 @ApiResponse({ status: 401, description: 'Unauthorized - Invalid JWT' })
 @ApiResponse({
 status: 403,
 description: 'Forbidden - DOMAIN_MANAGER role required',
 })
 @ApiResponse({ status: 404, description: 'User not found' })
 async resetUserPassword(
 @CurrentUser() user: User,
 @Param('id', ParseUUIDPipe) id: string,
 ): Promise<{ message: string }> {
 await this.domainManagerService.resetUserPassword(user.id, id);
 return { message: 'Password reset successfully. New password: mudar123' };
 }
}

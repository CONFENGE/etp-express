import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag, FeatureFlagContext } from './feature-flags.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolloutMetricsService } from './rollout-metrics.service';

/**
 * Feature Flags Controller
 *
 * REST API for managing and querying feature flags.
 * Includes rollout management endpoints for staged deployments.
 * Requires SYSTEM_ADMIN role for write operations.
 *
 * @see #865 - Feature Flags: Escolha e setup de provider
 * @see #867 - Staged Rollout: Estrategia Alpha/Beta/GA
 */
@ApiTags('Feature Flags')
@Controller('api/feature-flags')
export class FeatureFlagsController {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly rolloutMetricsService: RolloutMetricsService,
  ) {}

  /**
   * Get all feature flags for current user context
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all feature flags',
    description:
      'Returns all feature flags with their current state for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flags retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: { type: 'boolean' },
      example: {
        staged_rollout_alpha: false,
        staged_rollout_beta: true,
        new_dashboard: false,
      },
    },
  })
  async getAllFlags(
    @CurrentUser() user: { userId: string; organizationId: string },
  ): Promise<Record<string, boolean>> {
    const context: FeatureFlagContext = {
      userId: user.userId,
      organizationId: user.organizationId,
    };
    return this.featureFlagsService.getAllFlags(context);
  }

  /**
   * Get all flag configurations (admin only)
   */
  @Get('configurations')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get feature flag configurations',
    description: 'Returns all feature flag configurations (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Configurations retrieved successfully',
  })
  getConfigurations() {
    return this.featureFlagsService.getConfigurations();
  }

  /**
   * Check a specific feature flag
   */
  @Get(':flag')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check feature flag status',
    description:
      'Check if a specific feature flag is enabled for the current user',
  })
  @ApiParam({
    name: 'flag',
    description: 'Feature flag key',
    enum: FeatureFlag,
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag status',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        enabled: { type: 'boolean' },
        reason: { type: 'string' },
        evaluatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async checkFlag(
    @Param('flag') flag: string,
    @CurrentUser() user: { userId: string; organizationId: string },
  ) {
    const context: FeatureFlagContext = {
      userId: user.userId,
      organizationId: user.organizationId,
    };
    return this.featureFlagsService.evaluate(flag, context);
  }

  /**
   * Set a feature flag (admin only)
   */
  @Post(':flag')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set feature flag',
    description: 'Enable or disable a feature flag (admin only)',
  })
  @ApiParam({
    name: 'flag',
    description: 'Feature flag key',
    enum: FeatureFlag,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Whether to enable the flag' },
        userId: {
          type: 'string',
          description: 'Target specific user (optional)',
        },
        organizationId: {
          type: 'string',
          description: 'Target specific organization (optional)',
        },
        percentage: {
          type: 'number',
          description: 'Percentage rollout 0-100 (optional)',
        },
      },
      required: ['enabled'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
  })
  async setFlag(
    @Param('flag') flag: string,
    @Body()
    body: {
      enabled: boolean;
      userId?: string;
      organizationId?: string;
      percentage?: number;
    },
  ) {
    await this.featureFlagsService.setFlag(flag, body.enabled, {
      userId: body.userId,
      organizationId: body.organizationId,
      percentage: body.percentage,
    });
    return { success: true, flag, enabled: body.enabled };
  }

  /**
   * Delete a feature flag override (admin only)
   */
  @Delete(':flag')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete feature flag override',
    description:
      'Remove a feature flag override, reverting to default (admin only)',
  })
  @ApiParam({
    name: 'flag',
    description: 'Feature flag key',
    enum: FeatureFlag,
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Delete user-specific override',
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    description: 'Delete organization-specific override',
  })
  @ApiResponse({
    status: 204,
    description: 'Feature flag override deleted',
  })
  async deleteFlag(
    @Param('flag') flag: string,
    @Query('userId') userId?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    await this.featureFlagsService.deleteFlag(flag, { userId, organizationId });
  }

  /**
   * Get service health status
   */
  @Get('health/status')
  @ApiOperation({
    summary: 'Feature flags health check',
    description: 'Check if the feature flags service is operational',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded'] },
        redisConnected: { type: 'boolean' },
      },
    },
  })
  getHealth() {
    const redisConnected = this.featureFlagsService.isRedisAvailable();
    return {
      status: redisConnected ? 'healthy' : 'degraded',
      redisConnected,
      message: redisConnected
        ? 'Feature flags service is fully operational'
        : 'Feature flags service is running with defaults only (Redis unavailable)',
    };
  }

  // ==========================================
  // Rollout Management Endpoints
  // @see #867 - Staged Rollout: Estrategia Alpha/Beta/GA
  // ==========================================

  /**
   * Get rollout configuration
   */
  @Get('rollout/configuration')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get rollout configuration',
    description:
      'Returns the staged rollout configuration (Alpha/Beta/GA phases)',
  })
  @ApiResponse({
    status: 200,
    description: 'Rollout configuration',
  })
  getRolloutConfiguration() {
    return this.rolloutMetricsService.getRolloutConfiguration();
  }

  /**
   * Get rollout status for a feature
   */
  @Get('rollout/:featureKey/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get rollout status',
    description: 'Returns the current rollout status for a feature',
  })
  @ApiParam({
    name: 'featureKey',
    description: 'Feature key to check',
    example: 'new_dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Rollout status',
    schema: {
      type: 'object',
      properties: {
        featureKey: { type: 'string' },
        currentPhase: { type: 'string', enum: ['alpha', 'beta', 'ga'] },
        phaseStartedAt: { type: 'string', format: 'date-time' },
        phaseDurationHours: { type: 'number' },
        canAdvance: { type: 'boolean' },
        canRollback: { type: 'boolean' },
        nextPhase: { type: 'string', nullable: true },
        previousPhase: { type: 'string', nullable: true },
      },
    },
  })
  async getRolloutStatus(@Param('featureKey') featureKey: string) {
    return this.rolloutMetricsService.getStatus(featureKey);
  }

  /**
   * Initialize a new feature rollout
   */
  @Post('rollout/:featureKey/initialize')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initialize feature rollout',
    description: 'Start a new rollout at Alpha phase for a feature',
  })
  @ApiParam({
    name: 'featureKey',
    description: 'Feature key to initialize',
    example: 'new_dashboard',
  })
  @ApiResponse({
    status: 201,
    description: 'Rollout initialized',
  })
  async initializeRollout(@Param('featureKey') featureKey: string) {
    return this.rolloutMetricsService.initializeRollout(featureKey);
  }

  /**
   * Advance rollout to next phase
   */
  @Post('rollout/:featureKey/advance')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Advance rollout phase',
    description:
      'Advance the feature to the next rollout phase (Alpha -> Beta -> GA)',
  })
  @ApiParam({
    name: 'featureKey',
    description: 'Feature key to advance',
    example: 'new_dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Rollout advanced to next phase',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot advance - metrics not met or already at GA',
  })
  async advanceRollout(@Param('featureKey') featureKey: string) {
    try {
      return await this.rolloutMetricsService.advancePhase(featureKey);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Cannot advance rollout',
      );
    }
  }

  /**
   * Rollback to previous phase
   */
  @Post('rollout/:featureKey/rollback')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rollback rollout phase',
    description:
      'Rollback the feature to the previous rollout phase (GA -> Beta -> Alpha)',
  })
  @ApiParam({
    name: 'featureKey',
    description: 'Feature key to rollback',
    example: 'new_dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Rollout rolled back to previous phase',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot rollback - already at Alpha',
  })
  async rollbackRollout(@Param('featureKey') featureKey: string) {
    try {
      return await this.rolloutMetricsService.rollbackPhase(featureKey);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Cannot rollback rollout',
      );
    }
  }
}

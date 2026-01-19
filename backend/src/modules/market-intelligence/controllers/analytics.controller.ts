import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../entities/user.entity';
import { OverpriceAlertService } from '../services/overprice-alert.service';
import {
  CheckPriceDto,
  CheckPriceResponseDto,
  AcknowledgeAlertDto,
  ListAlertsQueryDto,
  AlertResponseDto,
  AlertListResponseDto,
  AlertSummaryDto,
  AlertThresholdsDto,
} from '../dto/overprice-alert.dto';

/**
 * AnalyticsController - Overprice detection and alert management.
 *
 * This controller provides endpoints for (#1272):
 * - POST /analytics/check-price - Check price against benchmark
 * - GET /analytics/alerts/:etpId - Get alerts for an ETP
 * - GET /analytics/alerts - List all alerts with filters
 * - PATCH /analytics/alerts/:id/acknowledge - Acknowledge an alert
 * - GET /analytics/alerts/summary - Get alert statistics
 * - GET /analytics/thresholds - Get alert threshold configuration
 *
 * All endpoints require authentication via JWT.
 *
 * @see OverpriceAlertService for business logic
 * @see Issue #1272 for implementation
 * @see Issue #1268 for parent epic (M13: Market Intelligence)
 */
@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly overpriceAlertService: OverpriceAlertService) {}

  /**
   * Check a price against regional benchmarks.
   *
   * This endpoint compares the informed price against the median benchmark
   * for the identified category and region. Returns alert level and suggestions.
   *
   * Alert Levels:
   * - OK: 0-20% above median
   * - ATTENTION: 20-40% above median
   * - WARNING: 40-60% above median (TCE may notice)
   * - CRITICAL: >60% above median (high risk)
   */
  @Post('check-price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check price against benchmark',
    description:
      'Compares an informed price against regional market benchmarks. Returns alert level, deviation percentage, and suggestions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Price check completed',
    type: CheckPriceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async checkPrice(@Body() dto: CheckPriceDto): Promise<CheckPriceResponseDto> {
    return this.overpriceAlertService.checkPrice(dto);
  }

  /**
   * Get alerts for a specific ETP.
   */
  @Get('alerts/etp/:etpId')
  @ApiOperation({
    summary: 'Get alerts for an ETP',
    description: 'Returns all overprice alerts associated with a specific ETP.',
  })
  @ApiParam({
    name: 'etpId',
    description: 'ETP ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved',
    type: [AlertResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getAlertsByEtp(
    @Param('etpId', ParseUUIDPipe) etpId: string,
  ): Promise<AlertResponseDto[]> {
    return this.overpriceAlertService.getAlertsByEtp(etpId);
  }

  /**
   * Get alert summary statistics.
   */
  @Get('alerts/summary')
  @ApiOperation({
    summary: 'Get alert summary statistics',
    description:
      'Returns aggregated statistics about overprice alerts including counts by level and acknowledgment status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary retrieved',
    type: AlertSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getAlertSummary(
    @Query('etpId') etpId?: string,
  ): Promise<AlertSummaryDto> {
    return this.overpriceAlertService.getAlertSummary(etpId);
  }

  /**
   * Get current threshold configuration.
   */
  @Get('thresholds')
  @ApiOperation({
    summary: 'Get alert threshold configuration',
    description:
      'Returns the current percentage thresholds for each alert level.',
  })
  @ApiResponse({
    status: 200,
    description: 'Thresholds retrieved',
    type: AlertThresholdsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getThresholds(): AlertThresholdsDto {
    return this.overpriceAlertService.getThresholds();
  }

  /**
   * List alerts with filters.
   */
  @Get('alerts')
  @ApiOperation({
    summary: 'List alerts with filters',
    description:
      'Returns paginated list of overprice alerts with optional filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerts retrieved',
    type: AlertListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async listAlerts(
    @Query() query: ListAlertsQueryDto,
  ): Promise<AlertListResponseDto> {
    return this.overpriceAlertService.listAlerts(query);
  }

  /**
   * Get a specific alert by ID.
   */
  @Get('alerts/:id')
  @ApiOperation({
    summary: 'Get alert by ID',
    description: 'Returns details of a specific overprice alert.',
  })
  @ApiParam({
    name: 'id',
    description: 'Alert ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert retrieved',
    type: AlertResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Alert not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getAlertById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AlertResponseDto> {
    return this.overpriceAlertService.getAlertById(id);
  }

  /**
   * Acknowledge an alert.
   *
   * When a user decides to proceed with a price despite the alert,
   * they should acknowledge it with an optional justification note.
   * This creates an audit trail.
   */
  @Patch('alerts/:id/acknowledge')
  @ApiOperation({
    summary: 'Acknowledge an alert',
    description:
      'Marks an overprice alert as acknowledged by the user. Optionally includes a justification note.',
  })
  @ApiParam({
    name: 'id',
    description: 'Alert ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert acknowledged',
    type: AlertResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Alert already acknowledged',
  })
  @ApiResponse({
    status: 404,
    description: 'Alert not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeAlertDto,
    @CurrentUser() user: User,
  ): Promise<AlertResponseDto> {
    return this.overpriceAlertService.acknowledgeAlert(id, user.id, dto);
  }
}

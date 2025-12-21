import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
  DefaultValuePipe,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { SecretAccessStatus } from '../../entities/secret-access-log.entity';
import { AuditAction } from '../../entities/audit-log.entity';
import { ExportAuditLogsDto, ExportFormat } from './dto/export-audit-logs.dto';
import { Parser } from '@json2csv/plainjs';

/**
 * Audit Controller for Secret Access Logs
 *
 * @remarks
 * All endpoints require JWT authentication and ADMIN role.
 * These endpoints are for security monitoring and compliance.
 */
@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Verify user is admin
   */
  private ensureAdmin(user: User): void {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Access denied. Admin role required to view audit logs.',
      );
    }
  }

  /**
   * Get recent access logs for a specific secret
   */
  @Get('secrets/:secretName')
  @ApiOperation({
    summary: 'Get secret access logs',
    description:
      'Retrieve recent access logs for a specific secret. Requires admin role.',
  })
  @ApiParam({
    name: 'secretName',
    description: 'Name of the secret (e.g., JWT_SECRET, OPENAI_API_KEY)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of logs to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Secret access logs retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getSecretAccessLogs(
    @CurrentUser() user: User,
    @Param('secretName') secretName: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    this.ensureAdmin(user);
    return this.auditService.getRecentAccess(secretName, limit);
  }

  /**
   * Check for anomalies in secret access
   */
  @Get('secrets/:secretName/anomalies')
  @ApiOperation({
    summary: 'Check secret access anomalies',
    description:
      'Check if there are anomalous access patterns for a secret. Requires admin role.',
  })
  @ApiParam({
    name: 'secretName',
    description: 'Name of the secret to check',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description: 'Number of accesses that triggers anomaly (default: 100)',
  })
  @ApiQuery({
    name: 'windowSeconds',
    required: false,
    description: 'Time window in seconds (default: 60)',
  })
  @ApiResponse({
    status: 200,
    description: 'Anomaly status retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async checkAnomalies(
    @CurrentUser() user: User,
    @Param('secretName') secretName: string,
    @Query('threshold', new DefaultValuePipe(100), ParseIntPipe)
    threshold: number,
    @Query('windowSeconds', new DefaultValuePipe(60), ParseIntPipe)
    windowSeconds: number,
  ) {
    this.ensureAdmin(user);
    return this.auditService.getAnomalyStatus(
      secretName,
      threshold,
      windowSeconds * 1000,
    );
  }

  /**
   * Get all access logs with filtering
   */
  @Get('secrets')
  @ApiOperation({
    summary: 'Get all secret access logs',
    description:
      'Retrieve all secret access logs with optional filtering. Requires admin role.',
  })
  @ApiQuery({
    name: 'secretName',
    required: false,
    description: 'Filter by secret name',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SecretAccessStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of logs to return (default: 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset for pagination (default: 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Access logs retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getAllAccessLogs(
    @CurrentUser() user: User,
    @Query('secretName') secretName?: string,
    @Query('status') status?: SecretAccessStatus,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    this.ensureAdmin(user);
    return this.auditService.getAccessLogs({
      secretName,
      status,
      limit,
      offset,
    });
  }

  /**
   * Get statistics for secret access
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get secret access statistics',
    description:
      'Get aggregated statistics for secret access. Requires admin role.',
  })
  @ApiQuery({
    name: 'secretName',
    required: false,
    description: 'Filter stats by secret name',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getAccessStats(
    @CurrentUser() user: User,
    @Query('secretName') secretName?: string,
  ) {
    this.ensureAdmin(user);
    return this.auditService.getAccessStats(secretName);
  }

  /**
   * Get LGPD operations logs (data exports, account deletions)
   */
  @Get('lgpd-operations')
  @ApiOperation({
    summary: 'List LGPD operations (exports, deletions)',
    description:
      'Retrieve audit logs for LGPD compliance operations: data exports, account deletions, and cancellations. Requires admin role.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filtering (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filtering (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: AuditAction,
    description: 'Filter by specific action type',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of logs to return (default: 1000)',
  })
  @ApiResponse({
    status: 200,
    description: 'LGPD operation logs retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async getLGPDOperations(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: AuditAction,
    @Query('limit', new DefaultValuePipe(1000), ParseIntPipe) limit?: number,
  ) {
    this.ensureAdmin(user);

    return this.auditService.getLGPDOperations({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      action,
      limit,
    });
  }

  /**
   * Export audit logs to CSV or JSON file
   * For LGPD compliance reporting (Art. 37)
   */
  @Get('export')
  @ApiOperation({
    summary: 'Export audit logs',
    description:
      'Export audit logs in CSV or JSON format for LGPD compliance. Supports filtering by date range, user, and action type. Requires admin role.',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ExportFormat,
    description: 'Export format (csv or json, default: json)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for filtering (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for filtering (ISO 8601 format)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID (UUID)',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: AuditAction,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description:
      'Maximum number of records to export (default: 10000, max: 50000)',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs exported successfully as file download',
  })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  async exportAuditLogs(
    @CurrentUser() user: User,
    @Query() query: ExportAuditLogsDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | { logs: unknown[]; metadata: unknown }> {
    this.ensureAdmin(user);

    const { format, startDate, endDate, userId, action, limit } = query;

    const result = await this.auditService.exportAuditLogs({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      userId,
      action,
      limit,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `audit-logs-${timestamp}`;

    if (format === ExportFormat.CSV) {
      const csvData = this.auditService.formatLogsForCsv(result.logs);

      const parser = new Parser({
        fields: [
          'id',
          'action',
          'entityType',
          'entityId',
          'userId',
          'userEmail',
          'userName',
          'ipAddress',
          'userAgent',
          'description',
          'createdAt',
          'etpId',
          'etpTitle',
        ],
      });

      const csv = parser.parse(csvData);

      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      });

      return new StreamableFile(Buffer.from(csv, 'utf-8'));
    }

    // JSON format (default)
    const jsonContent = JSON.stringify(
      {
        logs: this.auditService.formatLogsForCsv(result.logs),
        metadata: result.metadata,
      },
      null,
      2,
    );

    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.json"`,
    });

    return new StreamableFile(Buffer.from(jsonContent, 'utf-8'));
  }
}

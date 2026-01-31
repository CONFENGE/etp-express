import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TceService } from './tce.service';
import {
  TceExportRequestDto,
  TceConnectionCheckDto,
} from './dto/tce-export.dto';
import { TceState } from './interfaces/tce-api.interface';

/**
 * TCE Integration Controller
 *
 * REST API endpoints for TCE (Tribunal de Contas Estadual) integration.
 * Provides contract export functionality for state audit court systems.
 *
 * @module modules/gov-api/tce
 * @see Issue #1293 - [Integração] Conectar com sistemas estaduais TCE
 */
@ApiTags('TCE Integration')
@Controller('api/tce')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TceController {
  constructor(private readonly tceService: TceService) {}

  /**
   * Get list of supported states
   */
  @Get('states')
  @ApiOperation({
    summary: 'Get supported states',
    description:
      'Returns list of states with available TCE integration support',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported states',
    schema: {
      type: 'object',
      properties: {
        states: {
          type: 'array',
          items: { type: 'string', enum: Object.values(TceState) },
        },
      },
    },
  })
  getSupportedStates() {
    return {
      states: this.tceService.getSupportedStates(),
    };
  }

  /**
   * Get supported export formats for a state
   */
  @Get('formats')
  @ApiOperation({
    summary: 'Get supported export formats',
    description: 'Returns list of export formats supported for a given state',
  })
  @ApiQuery({ name: 'state', enum: TceState })
  @ApiResponse({
    status: 200,
    description: 'List of supported formats',
  })
  getSupportedFormats(@Query('state') state: TceState) {
    return {
      state,
      formats: this.tceService.getSupportedFormats(state),
    };
  }

  /**
   * Check connection status for a state TCE
   */
  @Post('connection/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check TCE connection status',
    description: 'Verifies connectivity with a specific state TCE system',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection status',
    schema: {
      type: 'object',
      properties: {
        state: { type: 'string' },
        system: { type: 'string' },
        available: { type: 'boolean' },
        authenticated: { type: 'boolean' },
        lastChecked: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        endpoint: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  async checkConnection(@Body() dto: TceConnectionCheckDto) {
    return this.tceService.checkConnection(dto.state);
  }

  /**
   * Check all TCE connections
   */
  @Get('connection/check-all')
  @ApiOperation({
    summary: 'Check all TCE connections',
    description:
      'Verifies connectivity with all supported state TCE systems',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection status for all states',
  })
  async checkAllConnections() {
    const results = await this.tceService.checkAllConnections();
    return {
      totalStates: results.length,
      connected: results.filter((r) => r.available && r.authenticated).length,
      connections: results,
    };
  }

  /**
   * Export contracts to TCE format
   */
  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export contracts to TCE',
    description:
      'Generates export file for contract data in TCE-compatible format. Returns base64-encoded file content ready for download or manual upload to TCE system.',
  })
  @ApiResponse({
    status: 200,
    description: 'Export result with file content',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        format: { type: 'string' },
        state: { type: 'string' },
        exportedAt: { type: 'string', format: 'date-time' },
        contractCount: { type: 'number' },
        fileName: { type: 'string' },
        fileContent: {
          type: 'string',
          description: 'Base64-encoded file content',
        },
        validationErrors: { type: 'array', items: { type: 'string' } },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or validation failed',
  })
  async exportContracts(@Body() dto: TceExportRequestDto) {
    return this.tceService.exportContracts(dto);
  }

  /**
   * Get TCE integration statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get TCE integration statistics',
    description:
      'Returns statistics about available TCE integrations and their status',
  })
  @ApiResponse({
    status: 200,
    description: 'TCE integration statistics',
  })
  async getStatistics() {
    return this.tceService.getStatistics();
  }
}

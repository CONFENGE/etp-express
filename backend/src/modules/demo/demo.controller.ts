import { Controller, Post, Get, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DemoService, DemoResetResult } from './demo.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

/**
 * Demo Controller - Endpoints para gestão de dados demo (#474)
 *
 * Endpoints disponíveis:
 * - POST /demo/reset - Reset manual (SYSTEM_ADMIN only)
 * - GET /demo/statistics - Estatísticas da organização demo
 *
 * Todos os endpoints requerem autenticação e role SYSTEM_ADMIN.
 */
@ApiTags('demo')
@ApiBearerAuth()
@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  private readonly logger = new Logger(DemoController.name);

  constructor(private readonly demoService: DemoService) {}

  /**
   * Executa reset manual dos dados demo.
   *
   * Apenas SYSTEM_ADMIN pode executar este endpoint.
   * Útil para testes ou quando é necessário resetar antes do cron diário.
   *
   * @returns DemoResetResult com estatísticas da operação
   */
  @Post('reset')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Reset demo data',
    description:
      'Manually resets all demo organization data and recreates sample ETPs. Only accessible by SYSTEM_ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo data reset completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        timestamp: { type: 'string', format: 'date-time' },
        deletedEtps: { type: 'number', example: 5 },
        deletedSections: { type: 'number', example: 25 },
        deletedVersions: { type: 'number', example: 10 },
        deletedAuditLogs: { type: 'number', example: 50 },
        createdEtps: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires SYSTEM_ADMIN role',
  })
  async resetDemoData(): Promise<DemoResetResult> {
    this.logger.log('Manual demo data reset requested');
    const result = await this.demoService.resetDemoData();
    this.logger.log('Manual demo data reset completed', { result });
    return result;
  }

  /**
   * Retorna estatísticas da organização demo.
   *
   * Disponível para SYSTEM_ADMIN para monitoramento.
   *
   * @returns Estatísticas da organização demo
   */
  @Get('statistics')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: 'Get demo statistics',
    description:
      'Returns statistics about the demo organization including ETP count and user count.',
  })
  @ApiResponse({
    status: 200,
    description: 'Demo organization statistics',
    schema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', format: 'uuid', nullable: true },
        organizationName: { type: 'string', nullable: true },
        etpCount: { type: 'number', example: 3 },
        userCount: { type: 'number', example: 1 },
        lastResetInfo: { type: 'string', example: 'Resets daily at 00:00 UTC' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires SYSTEM_ADMIN role',
  })
  async getDemoStatistics() {
    return this.demoService.getDemoStatistics();
  }
}

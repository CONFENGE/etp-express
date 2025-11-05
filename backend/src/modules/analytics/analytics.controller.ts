import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('track')
  @ApiOperation({
    summary: 'Rastrear evento',
    description: 'Registra um evento de analytics',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        eventType: { type: 'string', example: 'user_action' },
        eventName: { type: 'string', example: 'etp_created' },
        properties: { type: 'object', example: { status: 'draft' } },
        etpId: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Evento registrado' })
  async trackEvent(
    @Body() body: any,
    @CurrentUser('id') userId: string,
    @Req() request: Request,
  ) {
    await this.analyticsService.trackEvent(
      body.eventType,
      body.eventName,
      body.properties,
      userId,
      body.etpId,
      request,
    );

    return { success: true, message: 'Evento registrado' };
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard de analytics',
    description: 'Estatísticas gerais de uso do sistema',
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Período em dias' })
  @ApiResponse({ status: 200, description: 'Estatísticas do dashboard' })
  async getDashboard(
    @Query('days') days: number = 30,
    @CurrentUser('id') userId: string,
  ) {
    const stats = await this.analyticsService.getDashboardStats(userId, days);
    return {
      data: stats,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Get('user/activity')
  @ApiOperation({
    summary: 'Atividade do usuário',
    description: 'Histórico de atividades do usuário atual',
  })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Período em dias' })
  @ApiResponse({ status: 200, description: 'Atividade do usuário' })
  async getUserActivity(
    @Query('days') days: number = 30,
    @CurrentUser('id') userId: string,
  ) {
    const activity = await this.analyticsService.getUserActivity(userId, days);
    return {
      data: activity,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Get('events/type/:type')
  @ApiOperation({ summary: 'Obter eventos por tipo' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
  async getEventsByType(
    @Query('type') type: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const events = await this.analyticsService.getEventsByType(
      type,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );

    return {
      data: events,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Saúde do sistema',
    description: 'Métricas de saúde e performance (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Status de saúde do sistema' })
  async getSystemHealth() {
    const health = await this.analyticsService.getSystemHealth();
    return {
      data: health,
      disclaimer:
        'O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.',
    };
  }
}

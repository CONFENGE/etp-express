import {
 Controller,
 Get,
 Post,
 Body,
 Query,
 UseGuards,
 Req,
 Param,
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
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';
import { DISCLAIMER } from '../../common/constants/messages';

interface TrackEventDto {
 eventType: string;
 eventName: string;
 properties?: Record<string, unknown>;
 etpId?: string;
}

/**
 * AnalyticsController - Multi-tenant analytics endpoints.
 *
 * Security Hardening (#648):
 * All endpoints now require organizationId from JWT for multi-tenancy isolation.
 * This prevents cross-organization data leakage in analytics.
 */
@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
 constructor(private readonly analyticsService: AnalyticsService) {}

 @Post('track')
 @ApiOperation({
 summary: 'Rastrear evento',
 description: 'Registra um evento de analytics com isolamento multi-tenant',
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
 @Body() body: TrackEventDto,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 @Req() request: Request,
 ) {
 await this.analyticsService.trackEvent(
 body.eventType,
 body.eventName,
 body.properties,
 userId,
 body.etpId,
 request,
 organizationId,
 );

 return { success: true, message: 'Evento registrado' };
 }

 @Get('dashboard')
 @ApiOperation({
 summary: 'Dashboard de analytics',
 description:
 'Estatísticas gerais de uso do sistema (filtrado por organização)',
 })
 @ApiQuery({
 name: 'days',
 required: false,
 type: Number,
 description: 'Período em dias',
 })
 @ApiResponse({ status: 200, description: 'Estatísticas do dashboard' })
 async getDashboard(
 @Query('days') days: number = 30,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ) {
 const stats = await this.analyticsService.getDashboardStats(
 organizationId,
 userId,
 days,
 );
 return {
 data: stats,
 disclaimer: DISCLAIMER,
 };
 }

 @Get('user/activity')
 @ApiOperation({
 summary: 'Atividade do usuário',
 description:
 'Histórico de atividades do usuário atual (filtrado por organização)',
 })
 @ApiQuery({
 name: 'days',
 required: false,
 type: Number,
 description: 'Período em dias',
 })
 @ApiResponse({ status: 200, description: 'Atividade do usuário' })
 async getUserActivity(
 @Query('days') days: number = 30,
 @CurrentUser('id') userId: string,
 @CurrentUser('organizationId') organizationId: string,
 ) {
 const activity = await this.analyticsService.getUserActivity(
 userId,
 organizationId,
 days,
 );
 return {
 data: activity,
 disclaimer: DISCLAIMER,
 };
 }

 @Get('events/type/:type')
 @ApiOperation({
 summary: 'Obter eventos por tipo',
 description: 'Lista eventos por tipo (filtrado por organização)',
 })
 @ApiParam({ name: 'type', description: 'Tipo de evento', type: String })
 @ApiQuery({ name: 'startDate', required: false, type: String })
 @ApiQuery({ name: 'endDate', required: false, type: String })
 @ApiResponse({ status: 200, description: 'Lista de eventos' })
 async getEventsByType(
 @Param('type') type: string,
 @CurrentUser('organizationId') organizationId: string,
 @Query('startDate') startDate?: string,
 @Query('endDate') endDate?: string,
 ) {
 const events = await this.analyticsService.getEventsByType(
 type,
 organizationId,
 startDate ? new Date(startDate) : undefined,
 endDate ? new Date(endDate) : undefined,
 );

 return {
 data: events,
 disclaimer: DISCLAIMER,
 };
 }

 @Get('health')
 @ApiOperation({
 summary: 'Saúde do sistema',
 description:
 'Métricas de saúde e performance (filtrado por organização do usuário)',
 })
 @ApiResponse({ status: 200, description: 'Status de saúde do sistema' })
 async getSystemHealth(@CurrentUser('organizationId') organizationId: string) {
 const health = await this.analyticsService.getSystemHealth(organizationId);
 return {
 data: health,
 disclaimer: DISCLAIMER,
 };
 }
}

import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

/**
 * Controller handling application health and system information endpoints.
 *
 * @remarks
 * These endpoints are public and do not require authentication.
 * They are used for monitoring, health checks, and system diagnostics.
 *
 * Standard HTTP status codes:
 * - 200: Success
 *
 * @public All endpoints in this controller are public (no authentication required)
 * @see https://github.com/CONFENGE/etp-express/issues/777
 */
@Public()
@ApiTags('health')
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
 constructor(private readonly appService: AppService) {}

 /**
 * Health check endpoint for monitoring and load balancers.
 *
 * @returns Health status object with timestamp and status
 */
 @Get()
 @ApiOperation({ summary: 'Health check endpoint' })
 getHealth() {
 return this.appService.getHealth();
 }

 /**
 * System information endpoint for diagnostics.
 *
 * @returns System information including version, environment, and uptime
 */
 @Get('info')
 @ApiOperation({ summary: 'System information' })
 getInfo() {
 return this.appService.getInfo();
 }
}

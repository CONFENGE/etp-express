import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiValidationService } from './ai-validation.service';
import {
  ValidateDocumentDto,
  AcknowledgeValidationDto,
  ValidationResultResponseDto,
  ValidationSummaryDto,
  ListValidationsQueryDto,
  ValidationListResponseDto,
} from './dto/ai-validation.dto';

/**
 * Controller para validação AI similar ao ALICE do TCU
 *
 * Issue #1291 - [IA] Validação automática similar ao ALICE/TCU
 *
 * Endpoints:
 * - POST /ai-validation/validate - Valida ETP ou Edital
 * - GET /ai-validation - Lista validações
 * - GET /ai-validation/summary - Sumário de validações
 * - GET /ai-validation/:id - Detalhes de validação
 * - PATCH /ai-validation/:id/acknowledge - Reconhecer/resolver validação
 */
@Controller('ai-validation')
@UseGuards(JwtAuthGuard)
export class AiValidationController {
  constructor(private readonly aiValidationService: AiValidationService) {}

  /**
   * POST /ai-validation/validate
   * Valida um documento (ETP ou Edital) e detecta irregularidades
   */
  @Post('validate')
  async validateDocument(
    @Body() dto: ValidateDocumentDto,
  ): Promise<ValidationResultResponseDto[]> {
    return this.aiValidationService.validateDocument(dto);
  }

  /**
   * GET /ai-validation
   * Lista validações com filtros
   */
  @Get()
  async listValidations(
    @Query() query: ListValidationsQueryDto,
  ): Promise<ValidationListResponseDto> {
    return this.aiValidationService.listValidations(query);
  }

  /**
   * GET /ai-validation/summary
   * Retorna sumário de validações (por documento ou geral)
   */
  @Get('summary')
  async getValidationSummary(
    @Query('etpId') etpId?: string,
    @Query('editalId') editalId?: string,
  ): Promise<ValidationSummaryDto> {
    return this.aiValidationService.getValidationSummary(etpId, editalId);
  }

  /**
   * PATCH /ai-validation/:id/acknowledge
   * Reconhece/resolve uma validação
   */
  @Patch(':id/acknowledge')
  async acknowledgeValidation(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: AcknowledgeValidationDto,
  ): Promise<ValidationResultResponseDto> {
    const userId = req.user?.sub || req.user?.userId;
    return this.aiValidationService.acknowledgeValidation(id, userId, dto);
  }
}

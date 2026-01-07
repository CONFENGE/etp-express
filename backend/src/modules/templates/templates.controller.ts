import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import {
  EtpTemplate,
  EtpTemplateType,
} from '../../entities/etp-template.entity';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Controller para gerenciamento de templates de ETP.
 * Issue #1161 - [Templates] Criar modelos pré-configurados por tipo
 */
@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  /**
   * Lista todos os templates ativos.
   * Endpoint público para permitir seleção antes de login.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Lista todos os templates ativos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de templates retornada com sucesso',
  })
  async findAll(): Promise<EtpTemplate[]> {
    return this.templatesService.findAll();
  }

  /**
   * Busca um template específico por ID.
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Busca um template por ID' })
  @ApiParam({ name: 'id', description: 'UUID do template' })
  @ApiResponse({
    status: 200,
    description: 'Template retornado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Template não encontrado',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EtpTemplate> {
    return this.templatesService.findOne(id);
  }

  /**
   * Lista templates por tipo de contratação.
   */
  @Get('type/:type')
  @Public()
  @ApiOperation({ summary: 'Lista templates por tipo de contratação' })
  @ApiParam({
    name: 'type',
    enum: EtpTemplateType,
    description: 'Tipo de contratação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de templates do tipo especificado',
  })
  async findByType(
    @Param('type') type: EtpTemplateType,
  ): Promise<EtpTemplate[]> {
    return this.templatesService.findByType(type);
  }

  /**
   * Cria um novo template.
   * Apenas administradores podem criar templates.
   */
  @Post()
  @ApiOperation({ summary: 'Cria um novo template' })
  @ApiResponse({
    status: 201,
    description: 'Template criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  async create(
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<EtpTemplate> {
    return this.templatesService.create(createTemplateDto);
  }

  /**
   * Atualiza um template existente.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Atualiza um template' })
  @ApiParam({ name: 'id', description: 'UUID do template' })
  @ApiResponse({
    status: 200,
    description: 'Template atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Template não encontrado',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<EtpTemplate> {
    return this.templatesService.update(id, updateTemplateDto);
  }

  /**
   * Remove (desativa) um template.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove (desativa) um template' })
  @ApiParam({ name: 'id', description: 'UUID do template' })
  @ApiResponse({
    status: 204,
    description: 'Template removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Template não encontrado',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.templatesService.remove(id);
  }
}

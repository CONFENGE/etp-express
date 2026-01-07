import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtpTemplate } from '../../entities/etp-template.entity';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';

/**
 * Module para gerenciamento de templates de ETP.
 * Issue #1161 - [Templates] Criar modelos pré-configurados por tipo
 */
@Module({
  imports: [TypeOrmModule.forFeature([EtpTemplate])],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EtpTemplate } from '../../entities/etp-template.entity';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplatesSeederService } from './templates-seeder.service';

/**
 * Module para gerenciamento de templates de ETP.
 * Issue #1161 - [Templates] Criar modelos pré-configurados por tipo
 * Issue #1343 - Auto-seed templates on startup
 */
@Module({
  imports: [TypeOrmModule.forFeature([EtpTemplate])],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplatesSeederService],
  exports: [TemplatesService],
})
export class TemplatesModule {}

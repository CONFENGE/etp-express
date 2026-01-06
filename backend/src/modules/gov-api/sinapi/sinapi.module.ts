/**
 * SINAPI Module
 *
 * NestJS module for SINAPI (Sistema Nacional de Pesquisa de Custos e Índices
 * da Construção Civil) integration.
 *
 * Now with database persistence via TypeORM (#1165).
 *
 * @module modules/gov-api/sinapi
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SinapiService } from './sinapi.service';
import { GovApiCache } from '../utils/gov-api-cache';
import { SinapiItem } from '../../../entities/sinapi-item.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SinapiItem])],
  providers: [SinapiService, GovApiCache],
  exports: [SinapiService],
})
export class SinapiModule {}

/**
 * SINAPI Module
 *
 * NestJS module for SINAPI (Sistema Nacional de Pesquisa de Custos e Índices
 * da Construção Civil) integration.
 *
 * Now with database persistence via TypeORM (#1165).
 * API client via Orcamentador (#1565).
 *
 * @module modules/gov-api/sinapi
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SinapiService } from './sinapi.service';
import { SinapiApiClientService } from './sinapi-api-client.service';
import { GovApiCache } from '../utils/gov-api-cache';
import { SinapiItem } from '../../../entities/sinapi-item.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([SinapiItem]),
  ],
  providers: [SinapiService, SinapiApiClientService, GovApiCache],
  exports: [SinapiService, SinapiApiClientService],
})
export class SinapiModule {}

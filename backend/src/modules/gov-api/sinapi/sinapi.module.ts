/**
 * SINAPI Module
 *
 * NestJS module for SINAPI (Sistema Nacional de Pesquisa de Custos e Índices
 * da Construção Civil) integration.
 *
 * Features:
 * - Database persistence via TypeORM (#1165)
 * - API client via Orcamentador (#1565)
 * - Scheduled sync job with cache warmup (#1569)
 * - Webhook endpoint for real-time updates (#1569)
 *
 * @module modules/gov-api/sinapi
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SinapiService } from './sinapi.service';
import { SinapiApiClientService } from './sinapi-api-client.service';
import { SinapiSyncJob } from './sinapi-sync.job';
import { SinapiWebhookController } from './sinapi-webhook.controller';
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
  controllers: [SinapiWebhookController],
  providers: [
    SinapiService,
    SinapiApiClientService,
    SinapiSyncJob,
    GovApiCache,
  ],
  exports: [SinapiService, SinapiApiClientService, SinapiSyncJob],
})
export class SinapiModule {}

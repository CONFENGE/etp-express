/**
 * SINAPI Module
 *
 * NestJS module for SINAPI (Sistema Nacional de Pesquisa de Custos e Índices
 * da Construção Civil) integration.
 *
 * @module modules/gov-api/sinapi
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SinapiService } from './sinapi.service';
import { GovApiCache } from '../utils/gov-api-cache';

@Module({
 imports: [ConfigModule],
 providers: [SinapiService, GovApiCache],
 exports: [SinapiService],
})
export class SinapiModule {}

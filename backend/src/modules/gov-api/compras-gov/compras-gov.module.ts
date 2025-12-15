/**
 * Compras.gov.br Module
 *
 * NestJS module for Compras.gov.br (SIASG) API integration.
 *
 * @module modules/gov-api/compras-gov
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GovApiModule } from '../gov-api.module';
import { ComprasGovService } from './compras-gov.service';

@Module({
  imports: [ConfigModule, GovApiModule],
  providers: [ComprasGovService],
  exports: [ComprasGovService],
})
export class ComprasGovModule {}

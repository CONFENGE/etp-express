import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TceService } from './tce.service';
import { TceController } from './tce.controller';
import { AudespAdapter } from './adapters/audesp.adapter';

/**
 * TCE Integration Module
 *
 * Provides integration with Brazilian State Audit Courts (TCE) systems.
 * Enables export of contract data for accountability reporting.
 *
 * Supported TCE systems:
 * - Audesp (TCE-SP): São Paulo State Audit Court
 * - Future: LicitaCon (TCE-RS), SICAP (TCE-PE), and others
 *
 * Features:
 * - Contract data validation
 * - Export to TCE-specific formats (XML, CSV, JSON)
 * - Connection status monitoring
 * - File generation for manual upload
 * - API submission (when credentials available)
 *
 * @module modules/gov-api/tce
 * @see Issue #1293 - [Integração] Conectar com sistemas estaduais TCE
 */
@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [TceController],
  providers: [TceService, AudespAdapter],
  exports: [TceService],
})
export class TceModule {}

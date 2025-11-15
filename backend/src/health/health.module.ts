import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { User } from '../entities/user.entity';

/**
 * Health Check Module
 *
 * Fornece endpoint de health check para validação de prontidão do serviço.
 * Essencial para zero-downtime deployment no Railway.
 *
 * @module HealthModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

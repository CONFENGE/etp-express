import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceOwnershipGuard } from './resource-ownership.guard';
import { Etp } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { EtpVersion } from '../../entities/etp-version.entity';

/**
 * Module providing centralized resource ownership validation.
 *
 * @remarks
 * This module encapsulates the ResourceOwnershipGuard and its repository dependencies.
 * Import this module in any feature module that needs to use @RequireOwnership() decorator.
 *
 * The guard validates:
 * - Multi-tenancy isolation (organizationId)
 * - Resource ownership (createdById)
 *
 * @example
 * ```typescript
 * @Module({
 * imports: [
 * ResourceOwnershipModule, // Enable @RequireOwnership() decorator
 * TypeOrmModule.forFeature([MyEntity]),
 * ],
 * controllers: [MyController],
 * providers: [MyService],
 * })
 * export class MyModule {}
 * ```
 */
@Module({
  imports: [TypeOrmModule.forFeature([Etp, EtpSection, EtpVersion])],
  providers: [ResourceOwnershipGuard],
  exports: [
    ResourceOwnershipGuard,
    // Export TypeOrmModule to make repositories available to importing modules
    TypeOrmModule,
  ],
})
export class ResourceOwnershipModule {}

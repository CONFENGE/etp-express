import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization } from '../../entities/organization.entity';

/**
 * Module for managing organizations in Multi-Tenancy B2G architecture.
 *
 * @remarks
 * Exports OrganizationsService for use in other modules (e.g., AuthModule, UsersModule).
 * Key usage: AuthService.register uses OrganizationsService.findByDomain to auto-assign users.
 */
@Module({
 imports: [TypeOrmModule.forFeature([Organization])],
 controllers: [OrganizationsController],
 providers: [OrganizationsService],
 exports: [OrganizationsService],
})
export class OrganizationsModule {}

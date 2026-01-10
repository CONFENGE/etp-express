import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemAdminService } from './system-admin.service';
import { SystemAdminController } from './system-admin.controller';
import { AuthorizedDomain } from '../../entities/authorized-domain.entity';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Etp } from '../../entities/etp.entity';

/**
 * Module for System Administrator operations (M8: Gestão de Domínios Institucionais).
 *
 * Features:
 * - CRUD operations for authorized domains
 * - Domain manager assignment
 * - Global statistics for system administrators
 * - Productivity ranking metrics (#1367)
 *
 * @remarks
 * All endpoints in this module require SYSTEM_ADMIN role.
 * This is enforced by the @Roles decorator on the controller.
 *
 * @see SystemAdminController
 * @see SystemAdminService
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuthorizedDomain, User, Organization, Etp]),
  ],
  controllers: [SystemAdminController],
  providers: [SystemAdminService],
  exports: [SystemAdminService],
})
export class SystemAdminModule {}

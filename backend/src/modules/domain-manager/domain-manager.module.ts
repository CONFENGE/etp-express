import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainManagerService } from './domain-manager.service';
import { DomainManagerController } from './domain-manager.controller';
import { User } from '../../entities/user.entity';
import { AuthorizedDomain } from '../../entities/authorized-domain.entity';

/**
 * Module for Domain Manager operations (M8: Gestao de Dominios Institucionais).
 *
 * Features:
 * - CRUD operations for users within a domain
 * - User quota management (max 10 per domain)
 * - Password reset for domain users
 *
 * @remarks
 * All endpoints in this module require DOMAIN_MANAGER role.
 * This is enforced by the DomainManagerGuard on the controller.
 *
 * @see DomainManagerController
 * @see DomainManagerService
 */
@Module({
 imports: [TypeOrmModule.forFeature([User, AuthorizedDomain])],
 controllers: [DomainManagerController],
 providers: [DomainManagerService],
 exports: [DomainManagerService],
})
export class DomainManagerModule {}

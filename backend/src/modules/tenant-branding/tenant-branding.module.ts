import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantBranding } from '../../entities/tenant-branding.entity';
import { TenantBrandingService } from './tenant-branding.service';
import { TenantBrandingController } from './tenant-branding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TenantBranding])],
  controllers: [TenantBrandingController],
  providers: [TenantBrandingService],
  exports: [TenantBrandingService],
})
export class TenantBrandingModule {}

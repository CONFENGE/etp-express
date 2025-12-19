import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { Etp } from '../../entities/etp.entity';
import { AnalyticsEvent } from '../../entities/analytics-event.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { EmailModule } from '../email/email.module';

@Module({
 imports: [
 TypeOrmModule.forFeature([User, Etp, AnalyticsEvent, AuditLog]),
 EmailModule,
 JwtModule.registerAsync({
 imports: [ConfigModule],
 inject: [ConfigService],
 useFactory: async (configService: ConfigService) => ({
 secret: configService.get<string>('JWT_SECRET'),
 signOptions: {
 expiresIn: configService.get<string>('JWT_EXPIRATION', '7d'),
 },
 }),
 }),
 ],
 controllers: [UsersController],
 providers: [UsersService],
 exports: [UsersService],
})
export class UsersModule {}

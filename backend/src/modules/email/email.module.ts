import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

@Module({
 imports: [
 ConfigModule,
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
 providers: [EmailService],
 exports: [EmailService],
})
export class EmailModule {}

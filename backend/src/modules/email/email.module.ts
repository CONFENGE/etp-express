import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import type { StringValue } from 'ms';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EMAIL_QUEUE } from './email.types';

@Module({
  imports: [
    ConfigModule,
    // Register BullMQ queue for email delivery with retry
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000, // 1 minute base delay
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 604800, // 7 days (keep for debugging)
        },
      },
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_EXPIRATION',
            '7d',
          ) as StringValue,
        },
      }),
    }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}

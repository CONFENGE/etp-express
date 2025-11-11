import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: configService.get('DB_LOGGING', false),
  ssl:
    configService.get('NODE_ENV') === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

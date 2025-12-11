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
  // SSL Configuration (#598)
  // Railway PostgreSQL supports SSL with managed certificates
  // Use ssl: true to enable SSL with certificate validation
  ssl: configService.get('NODE_ENV') === 'production' ? true : false,
});

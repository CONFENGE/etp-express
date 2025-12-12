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
  // Railway internal PostgreSQL doesn't require SSL (pgvector.railway.internal)
  // PGSSLMODE=disable is set in Railway environment variables
  ssl:
    configService.get('PGSSLMODE') === 'disable'
      ? false
      : configService.get('NODE_ENV') === 'production',
});

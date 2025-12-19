import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { join } from 'path';

config();

const configService = new ConfigService();

// In production, __dirname points to dist/config, so we use relative paths from there
// In development with ts-node, __dirname points to src/config
const isCompiled = __dirname.includes('dist');
const entitiesPath = isCompiled
 ? join(__dirname, '..', '**', '*.entity.js')
 : join(__dirname, '..', '**', '*.entity.ts');
const migrationsPath = isCompiled
 ? join(__dirname, '..', 'migrations', '*.js')
 : join(__dirname, '..', 'migrations', '*.ts');

export default new DataSource({
 type: 'postgres',
 url: configService.get('DATABASE_URL'),
 entities: [entitiesPath],
 migrations: [migrationsPath],
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

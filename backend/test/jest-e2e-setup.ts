/**
 * Jest E2E Setup File
 *
 * Loads environment variables from .env.test before running E2E tests.
 * This ensures that the NestJS ConfigModule validation passes during test initialization.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test file
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

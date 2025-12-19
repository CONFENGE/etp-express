import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Extend UserRole enum with new roles for M8 (Gestão de Domínios Institucionais).
 *
 * Adds:
 * - SYSTEM_ADMIN: Global master administrator
 * - DOMAIN_MANAGER: Local domain manager (up to 10 users)
 * - DEMO: Demonstration user with isolated data
 * - mustChangePassword column for password change enforcement
 *
 * Issue: #464
 */
export class ExtendUserRoleEnum1763800000000 implements MigrationInterface {
 name = 'ExtendUserRoleEnum1763800000000';

 public async up(queryRunner: QueryRunner): Promise<void> {
 // Add new enum values to user_role_enum
 // PostgreSQL requires ALTER TYPE ... ADD VALUE for each new value
 await queryRunner.query(`
 DO $$
 BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'system_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')) THEN
 ALTER TYPE "users_role_enum" ADD VALUE 'system_admin';
 END IF;
 END
 $$;
 `);

 await queryRunner.query(`
 DO $$
 BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'domain_manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')) THEN
 ALTER TYPE "users_role_enum" ADD VALUE 'domain_manager';
 END IF;
 END
 $$;
 `);

 await queryRunner.query(`
 DO $$
 BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'demo' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')) THEN
 ALTER TYPE "users_role_enum" ADD VALUE 'demo';
 END IF;
 END
 $$;
 `);

 // Add mustChangePassword column with default false
 await queryRunner.query(`
 ALTER TABLE "users"
 ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false
 `);
 }

 public async down(queryRunner: QueryRunner): Promise<void> {
 // Remove mustChangePassword column
 await queryRunner.query(`
 ALTER TABLE "users" DROP COLUMN IF EXISTS "mustChangePassword"
 `);

 // Note: PostgreSQL does not support removing enum values directly.
 // To fully rollback, you would need to:
 // 1. Create a new enum without the values
 // 2. Update the column to use the new enum
 // 3. Drop the old enum
 // This is complex and potentially destructive, so we leave a warning.
 console.warn(
 'Warning: Enum values (system_admin, domain_manager, demo) cannot be removed from PostgreSQL enum. ' +
 'Manual intervention required if full rollback is needed.',
 );
 }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to create the password_resets table for "Forgot Password" feature.
 *
 * Features:
 * - UUID primary key
 * - Foreign key to users table with CASCADE delete
 * - Indexed token column for efficient lookup
 * - Indexed expiresAt for cleanup queries
 * - used flag to prevent token reuse
 *
 * @remarks
 * Part of issue #587 - [P0] Implementar funcionalidade 'Esqueceu sua senha?'
 */
export class CreatePasswordResets1765600000000 implements MigrationInterface {
  name = 'CreatePasswordResets1765600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.query(`
 SELECT EXISTS (
 SELECT FROM information_schema.tables
 WHERE table_schema = 'public'
 AND table_name = 'password_resets'
 );
 `);

    if (!tableExists[0].exists) {
      // Create password_resets table
      await queryRunner.query(`
 CREATE TABLE "password_resets" (
 "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
 "userId" uuid NOT NULL,
 "token" character varying(255) NOT NULL,
 "expiresAt" TIMESTAMP NOT NULL,
 "used" boolean NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
 CONSTRAINT "PK_password_resets" PRIMARY KEY ("id"),
 CONSTRAINT "FK_password_resets_userId" FOREIGN KEY ("userId")
 REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
 );
 `);

      // Create index on userId for efficient user lookup
      await queryRunner.query(`
 CREATE INDEX "IDX_password_resets_userId"
 ON "password_resets" ("userId");
 `);

      // Create index on token for efficient token lookup
      await queryRunner.query(`
 CREATE INDEX "IDX_password_resets_token"
 ON "password_resets" ("token");
 `);

      // Create index on expiresAt for cleanup queries (expired tokens)
      await queryRunner.query(`
 CREATE INDEX "IDX_password_resets_expiresAt"
 ON "password_resets" ("expiresAt");
 `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_password_resets_expiresAt";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_password_resets_token";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_password_resets_userId";`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "password_resets";`);
  }
}

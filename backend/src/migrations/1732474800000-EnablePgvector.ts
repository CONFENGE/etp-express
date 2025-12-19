import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgvector1732474800000 implements MigrationInterface {
 name = 'EnablePgvector1732474800000';

 public async up(queryRunner: QueryRunner): Promise<void> {
 // Enable pgvector extension
 await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
 }

 public async down(_queryRunner: QueryRunner): Promise<void> {
 // Note: We don't drop the extension on rollback to avoid breaking existing data
 // If you need to drop it, uncomment the line below
 // await _queryRunner.query(`DROP EXTENSION IF EXISTS vector;`);
 }
}

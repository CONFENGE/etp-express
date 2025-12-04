import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateLegislationTable1732474900000 implements MigrationInterface {
  name = 'CreateLegislationTable1732474900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create legislation table
    await queryRunner.createTable(
      new Table({
        name: 'legislation',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['lei', 'decreto', 'portaria', 'in', 'resolucao', 'mp'],
          },
          {
            name: 'number',
            type: 'varchar',
          },
          {
            name: 'year',
            type: 'int',
          },
          {
            name: 'title',
            type: 'text',
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'embedding',
            type: 'vector(1536)',
            isNullable: true,
          },
          {
            name: 'articles',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'sourceUrl',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create indexes for common queries
    await queryRunner.createIndex(
      'legislation',
      new TableIndex({
        name: 'IDX_legislation_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'legislation',
      new TableIndex({
        name: 'IDX_legislation_number',
        columnNames: ['number'],
      }),
    );

    await queryRunner.createIndex(
      'legislation',
      new TableIndex({
        name: 'IDX_legislation_year',
        columnNames: ['year'],
      }),
    );

    // Create unique index for type + number + year combination
    await queryRunner.createIndex(
      'legislation',
      new TableIndex({
        name: 'IDX_legislation_unique_reference',
        columnNames: ['type', 'number', 'year'],
        isUnique: true,
      }),
    );

    // Create vector similarity search index (IVFFlat for performance)
    // Using cosine distance (<=>). Use L2 (<->) or inner product (<#>) if needed.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_legislation_embedding
      ON legislation
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('legislation');
  }
}

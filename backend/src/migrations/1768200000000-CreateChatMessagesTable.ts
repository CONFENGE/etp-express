import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Migration to create chat_messages table for ETP chatbot functionality.
 *
 * @description
 * Creates table for storing chatbot conversations:
 * - chat_messages: Messages between users and the AI assistant
 *
 * Features:
 * - Messages scoped to specific ETP for context-aware responses
 * - Role-based message tracking (user/assistant)
 * - Metadata storage for analytics (tokens, latency, model)
 * - Cascade deletes when ETP or User is deleted
 *
 * @see Issue #1392 - [CHAT-1167a] Create ChatMessage entity and backend module structure
 * @see Issue #1167 - [Assistente] Implementar chatbot para duvidas
 */
export class CreateChatMessagesTable1768200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for chat message roles
    await queryRunner.query(`
      CREATE TYPE "chat_message_role_enum" AS ENUM ('user', 'assistant')
    `);

    // Create chat_messages table
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'etpId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'chat_message_role_enum',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create foreign key for ETP relationship
    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        name: 'FK_chat_messages_etp',
        columnNames: ['etpId'],
        referencedTableName: 'etps',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key for User relationship
    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        name: 'FK_chat_messages_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create composite index for efficient history queries
    // Most common query: SELECT * FROM chat_messages WHERE etpId = ? AND userId = ? ORDER BY createdAt
    await queryRunner.createIndex(
      'chat_messages',
      new TableIndex({
        name: 'IDX_chat_messages_etp_user_created',
        columnNames: ['etpId', 'userId', 'createdAt'],
      }),
    );

    // Create index for conversation replay by ETP
    await queryRunner.createIndex(
      'chat_messages',
      new TableIndex({
        name: 'IDX_chat_messages_etp_created',
        columnNames: ['etpId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'chat_messages',
      'IDX_chat_messages_etp_created',
    );
    await queryRunner.dropIndex(
      'chat_messages',
      'IDX_chat_messages_etp_user_created',
    );

    // Drop foreign keys
    await queryRunner.dropForeignKey('chat_messages', 'FK_chat_messages_user');
    await queryRunner.dropForeignKey('chat_messages', 'FK_chat_messages_etp');

    // Drop table
    await queryRunner.dropTable('chat_messages');

    // Drop enum type
    await queryRunner.query('DROP TYPE "chat_message_role_enum"');
  }
}

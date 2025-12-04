import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SecretAccessStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  UNAUTHORIZED = 'unauthorized',
}

@Entity('secret_access_logs')
@Index('idx_secret_access_logs_name_accessed', ['secretName', 'accessedAt'])
@Index('idx_secret_access_logs_status', ['status'])
export class SecretAccessLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  secretName: string; // Ex: JWT_SECRET, OPENAI_API_KEY

  @Column()
  accessedBy: string; // Service/context that accessed

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  accessedAt: Date;

  @Column({
    type: 'enum',
    enum: SecretAccessStatus,
    default: SecretAccessStatus.SUCCESS,
  })
  status: SecretAccessStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;
}

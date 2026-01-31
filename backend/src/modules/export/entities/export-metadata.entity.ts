import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Etp } from '../../../entities/etp.entity';
import { User } from '../../../entities/user.entity';
import { Organization } from '../../../entities/organization.entity';

/**
 * ExportMetadata Entity
 *
 * Tracks export history for ETPs stored in S3.
 * Each export record stores the S3 location, format, version,
 * and usage metrics for audit and sharing purposes.
 *
 * @see Issue #1704 - Automatic S3 upload after export generation
 */
@Entity('export_metadata')
export class ExportMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('IDX_export_metadata_organizationId')
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  etpId: string;

  @ManyToOne(() => Etp, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'etpId' })
  etp: Etp;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: ['pdf', 'docx', 'json'] })
  format: string;

  @Column()
  version: string; // ETP version at export time

  @Column()
  s3Key: string; // S3 object key

  @Column({ nullable: true })
  s3Uri: string; // Full S3 URI (s3://bucket/key)

  @Column({ type: 'int', default: 0 })
  downloadCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

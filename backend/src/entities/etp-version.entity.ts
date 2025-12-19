import {
 Entity,
 PrimaryGeneratedColumn,
 Column,
 CreateDateColumn,
 ManyToOne,
 JoinColumn,
} from 'typeorm';
import { Etp } from './etp.entity';

@Entity('etp_versions')
export class EtpVersion {
 @PrimaryGeneratedColumn('uuid')
 id: string;

 @Column()
 versionNumber: number;

 @Column({ type: 'jsonb' })
 snapshot: {
 title: string;
 description: string;
 objeto: string;
 status: string;
 sections: unknown[];
 metadata: unknown;
 };

 @Column({ type: 'text', nullable: true })
 changeLog: string;

 @Column({ type: 'varchar', nullable: true })
 createdByName: string;

 @ManyToOne(() => Etp, (etp) => etp.versions, { onDelete: 'CASCADE' })
 @JoinColumn({ name: 'etp_id' })
 etp: Etp;

 @Column({ name: 'etp_id' })
 etpId: string;

 @CreateDateColumn()
 createdAt: Date;
}

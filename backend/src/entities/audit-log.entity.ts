import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Etp } from "./etp.entity";

export enum AuditAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  GENERATE = "generate",
  EXPORT = "export",
  VERSION = "version",
  STATUS_CHANGE = "status_change",
}

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: AuditAction,
  })
  action: AuditAction;

  @Column()
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: "jsonb", nullable: true })
  changes: {
    before?: any;
    after?: any;
    metadata?: any;
  };

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @ManyToOne(() => User, (user) => user.auditLogs, { eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => Etp, (etp) => etp.auditLogs, { nullable: true })
  @JoinColumn({ name: "etp_id" })
  etp: Etp;

  @Column({ name: "etp_id", nullable: true })
  etpId: string;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

export enum ChangeRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DEPLOYED = 'deployed',
}

export enum ChangeRequestType {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ChangeRequestPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('change_requests')
export class ChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column('text')
  description: string

  @Column({
    type: 'enum',
    enum: ChangeRequestType,
    default: ChangeRequestType.LOW,
  })
  type: ChangeRequestType

  @Column({
    type: 'enum',
    enum: ChangeRequestPriority,
    default: ChangeRequestPriority.MEDIUM,
  })
  priority: ChangeRequestPriority

  @Column({
    type: 'enum',
    enum: ChangeRequestStatus,
    default: ChangeRequestStatus.PENDING,
  })
  status: ChangeRequestStatus

  @Column({ nullable: true })
  approvalNote: string

  @Column({ nullable: true })
  approvedBy: string

  @Column({ nullable: true })
  approvedAt: Date

  @Column({ nullable: true })
  gitCommitHash: string

  @Column({ nullable: true })
  deploymentId: string

  @Column({ nullable: true })
  deploymentUrl: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorId' })
  creator: User

  @Column()
  creatorId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
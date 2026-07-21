import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

export enum NotificationType {
  WEEKLY_REPORT = 'weekly_report',
  SIMILAR_QUESTION = 'similar_question',
  SYSTEM = 'system',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType

  @Column()
  title: string

  @Column('text')
  content: string

  @Column({ default: false })
  isRead: boolean

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  userId: string

  @CreateDateColumn()
  createdAt: Date
}
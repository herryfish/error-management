import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

@Entity('weekly_reports')
export class WeeklyReport {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  weekStart: Date

  @Column()
  weekEnd: Date

  @Column('json', { nullable: true })
  weakPoints: string[]

  @Column({ type: 'int', default: 0 })
  totalQuestions: number

  @Column({ type: 'int', default: 0 })
  masteredQuestions: number

  @Column({ type: 'int', default: 0 })
  similarQuestionsGenerated: number

  @Column({ type: 'int', default: 0 })
  totalRedos: number

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  masteryRate: number

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  userId: string

  @CreateDateColumn()
  createdAt: Date
}
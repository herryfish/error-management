import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm'

export enum MonitorLogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum MonitorLogType {
  HEALTH_CHECK = 'health_check',
  DEPLOYMENT = 'deployment',
  LLM_USAGE = 'llm_usage',
  SYSTEM_ERROR = 'system_error',
  SECURITY = 'security',
}

@Entity('monitor_logs')
export class MonitorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: MonitorLogLevel,
    default: MonitorLogLevel.INFO,
  })
  level: MonitorLogLevel

  @Column({
    type: 'enum',
    enum: MonitorLogType,
  })
  type: MonitorLogType

  @Column()
  message: string

  @Column('text', { nullable: true })
  details: string

  @Column({ nullable: true })
  source: string

  @Column({ nullable: true })
  userId: string

  @Column({ nullable: true })
  ipAddress: string

  @Column({ default: false })
  acknowledged: boolean

  @Column({ nullable: true })
  acknowledgedBy: string

  @Column({ nullable: true })
  acknowledgedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
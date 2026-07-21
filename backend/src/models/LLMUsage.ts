import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

export enum LLMScene {
  RECOGNITION = 'recognition',
  GRADING = 'grading',
  GUIDANCE = 'guidance',
  SIMILAR = 'similar',
  OTHER = 'other',
}

@Entity('llm_usage')
export class LLMUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: LLMScene,
  })
  scene: LLMScene

  @Column()
  provider: string

  @Column()
  model: string

  @Column({ default: false })
  isFallback: boolean

  @Column({ type: 'int', default: 0 })
  tokensInput: number

  @Column({ type: 'int', default: 0 })
  tokensOutput: number

  @Column({ type: 'int', default: 0 })
  tokensTotal: number

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost: number

  @Column({ type: 'int', default: 0 })
  latencyMs: number

  @Column({ default: true })
  success: boolean

  @Column({ nullable: true })
  error: string

  @Column({ nullable: true })
  businessId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column()
  userId: string

  @CreateDateColumn()
  createdAt: Date
}
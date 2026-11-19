import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Question } from './Question'
import { Student } from './Student'

export enum MasteryStatus {
  NEW = 'new',
  LEARNING = 'learning',
  MASTERED = 'mastered',
}

@Entity('mastery')
export class Mastery {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: MasteryStatus,
    default: MasteryStatus.NEW,
  })
  status: MasteryStatus

  @Column({ type: 'int', default: 0 })
  correctCount: number

  @Column({ type: 'int', default: 0 })
  incorrectCount: number

  @Column({ nullable: true })
  lastCorrectDate: Date

  @Column({ nullable: true })
  lastIncorrectDate: Date

  @Column({ nullable: true })
  nextReviewDate: Date

  @Column({ type: 'int', default: 0 })
  intervalLevel: number

  @Column({ nullable: true })
  lastReviewDate: Date

  /** FSRS 记忆稳定性（DSR 模型 S 值）：记忆可提取性从 100% 衰减至 90% 的天数；静态艾宾浩斯模式下为空 */
  @Column({ type: 'double', nullable: true })
  stability: number

  /** FSRS 记忆难度（DSR 模型 D 值，标度约 1~10）：反映稳定性增长的难易程度；静态艾宾浩斯模式下为空 */
  @Column({ type: 'double', nullable: true })
  difficulty: number

  /** 本次复习后 FSRS 安排的间隔天数（做错回落、做对增长）；静态艾宾浩斯模式下为空 */
  @Column({ type: 'int', nullable: true })
  scheduledDays: number

  /** 顽固薄弱点标记：累计做错 ≥ 阈值（默认 3 次）且未掌握时自动打标（学生首页置顶 + 家长周报提示） */
  @Column({ type: 'boolean', default: false })
  isStubborn: boolean

  /** 首次打上顽固薄弱点标记的时间 */
  @Column({ nullable: true })
  stubbornMarkedAt: Date

  @ManyToOne(() => Question, (question) => question.masteryRecords)
  @JoinColumn({ name: 'questionId' })
  question: Question

  @Column()
  questionId: string

  @ManyToOne(() => Student, (student) => student.masteryRecords)
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column()
  studentId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
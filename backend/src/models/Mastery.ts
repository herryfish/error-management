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
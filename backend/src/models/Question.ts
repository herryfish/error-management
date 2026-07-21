import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { Student } from './Student'
import { RedoRecord } from './RedoRecord'
import { Mastery } from './Mastery'
import { SimilarQuestion } from './SimilarQuestion'

export enum Subject {
  MATH = 'math',
  PHYSICS = 'physics',
  CHEMISTRY = 'chemistry',
}

export enum QuestionType {
  CHOICE = 'choice',
  FILL = 'fill',
  ANSWER = 'answer',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column('text')
  content: string

  @Column({
    type: 'enum',
    enum: Subject,
  })
  subject: Subject

  @Column({
    type: 'enum',
    enum: QuestionType,
  })
  type: QuestionType

  @Column({ type: 'int', default: 1 })
  difficulty: number

  @Column('json', { nullable: true })
  knowledgePoints: string[]

  @Column({ nullable: true })
  imageUrl: string

  @Column({ nullable: true })
  originalImageUrl: string

  @Column({ nullable: true })
  answer: string

  @Column({ nullable: true })
  explanation: string

  @Column({ default: false })
  isIdentified: boolean

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence: number

  @ManyToOne(() => Student, (student) => student.questions)
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column()
  studentId: string

  @OneToMany(() => RedoRecord, (redo) => redo.question)
  redoRecords: RedoRecord[]

  @OneToMany(() => Mastery, (mastery) => mastery.question)
  masteryRecords: Mastery[]

  @OneToMany(() => SimilarQuestion, (similar) => similar.originalQuestion)
  similarQuestions: SimilarQuestion[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
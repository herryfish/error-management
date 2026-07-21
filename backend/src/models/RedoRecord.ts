import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Question } from './Question'
import { Student } from './Student'

export enum RedoType {
  ONLINE = 'online',
  PHOTO = 'photo',
}

@Entity('redo_records')
export class RedoRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({
    type: 'enum',
    enum: RedoType,
  })
  type: RedoType

  @Column('text')
  answer: string

  @Column({ default: false })
  isCorrect: boolean

  @Column({ nullable: true })
  gradeResult: string

  @Column({ nullable: true })
  modelUsed: string

  @Column({ nullable: true })
  feedback: string

  @ManyToOne(() => Question, (question) => question.redoRecords)
  @JoinColumn({ name: 'questionId' })
  question: Question

  @Column()
  questionId: string

  @ManyToOne(() => Student, (student) => student.redoRecords)
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column()
  studentId: string

  @CreateDateColumn()
  createdAt: Date
}
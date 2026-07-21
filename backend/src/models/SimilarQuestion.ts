import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Question } from './Question'

@Entity('similar_questions')
export class SimilarQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column('text')
  content: string

  @Column({ default: true })
  isApplicable: boolean

  @Column({ nullable: true })
  reason: string

  @ManyToOne(() => Question, (question) => question.similarQuestions)
  @JoinColumn({ name: 'originalQuestionId' })
  originalQuestion: Question

  @Column()
  originalQuestionId: string

  @Column({ nullable: true })
  generatedBy: string

  @CreateDateColumn()
  createdAt: Date
}
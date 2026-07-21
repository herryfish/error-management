import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm'
import { User } from './User'
import { Parent } from './Parent'
import { Question } from './Question'
import { RedoRecord } from './RedoRecord'
import { Mastery } from './Mastery'

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  grade: string

  @Column({ nullable: true })
  school: string

  @OneToOne(() => User, (user) => user.student)
  user: User

  @OneToOne(() => Parent, (parent) => parent.student)
  parent: Parent

  @OneToMany(() => Question, (question) => question.student)
  questions: Question[]

  @OneToMany(() => RedoRecord, (redo) => redo.student)
  redoRecords: RedoRecord[]

  @OneToMany(() => Mastery, (mastery) => mastery.student)
  masteryRecords: Mastery[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
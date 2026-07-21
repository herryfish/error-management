import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { Parent } from './Parent'
import { Student } from './Student'

export enum UserRole {
  STUDENT = 'student',
  PARENT = 'parent',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  username: string

  @Column()
  password: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole

  @Column({ nullable: true })
  studentId: string

  @Column({ nullable: true })
  parentId: string

  @OneToOne(() => Student, (student) => student.user)
  @JoinColumn({ name: 'studentId' })
  student: Student

  @OneToOne(() => Parent, (parent) => parent.user)
  @JoinColumn({ name: 'parentId' })
  parent: Parent

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
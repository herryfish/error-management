import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './User'
import { Student } from './Student'

@Entity('parents')
export class Parent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  phone: string

  @Column({ nullable: true })
  email: string

  @OneToOne(() => User, (user) => user.parent)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ nullable: true })
  userId: string

  @OneToOne(() => Student, (student) => student.parent)
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column({ nullable: true })
  studentId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
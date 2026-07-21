import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('sys_config')
export class SysConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  key: string

  @Column('text')
  value: string

  @Column({ nullable: true })
  description: string

  @Column({ default: 'system' })
  category: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
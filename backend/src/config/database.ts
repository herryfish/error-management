import { DataSource } from 'typeorm'
import dotenv from 'dotenv'

dotenv.config()

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'error_management',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ['dist/models/**/*.js'],
  migrations: ['dist/migrations/**/*.js'],
  subscribers: ['dist/subscribers/**/*.js'],
})

export const connectDatabase = async () => {
  try {
    await AppDataSource.initialize()
    console.log('Database connected successfully')
  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}
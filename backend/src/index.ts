import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

import { connectDatabase } from './config/database'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'

// Routes
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import questionRoutes from './routes/questions'
import redoRoutes from './routes/redos'
import masteryRoutes from './routes/mastery'
import similarRoutes from './routes/similar'
import reportRoutes from './routes/reports'
import llmRoutes from './routes/llm'
import adminRoutes from './routes/admin'
import changeRequestRoutes from './routes/changeRequests'
import monitorRoutes from './routes/monitor'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
})
app.use(limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
app.use(morgan('combined'))

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/redos', redoRoutes)
app.use('/api/mastery', masteryRoutes)
app.use('/api/similar', similarRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/llm', llmRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/change-requests', changeRequestRoutes)
app.use('/api/monitor', monitorRoutes)

// Error handling
app.use(notFound)
app.use(errorHandler)

// Start server
const startServer = async () => {
  try {
    await connectDatabase()
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app
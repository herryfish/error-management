import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { User } from '../models/User'
import { Question } from '../models/Question'
import { RedoRecord } from '../models/RedoRecord'
import { Mastery } from '../models/Mastery'
import { LLMUsage } from '../models/LLMUsage'
import { SysConfig } from '../models/SysConfig'

export class AdminController {
  private userRepository = AppDataSource.getRepository(User)
  private questionRepository = AppDataSource.getRepository(Question)
  private redoRepository = AppDataSource.getRepository(RedoRecord)
  private masteryRepository = AppDataSource.getRepository(Mastery)
  private llmUsageRepository = AppDataSource.getRepository(LLMUsage)
  private sysConfigRepository = AppDataSource.getRepository(SysConfig)

  getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userRepository.find({
        select: ['id', 'username', 'role', 'createdAt'],
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: users,
      })
    } catch (error) {
      next(error)
    }
  }

  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const user = await this.userRepository.findOne({
        where: { id },
        select: ['id', 'username', 'role', 'studentId', 'parentId', 'createdAt'],
      })

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        })
      }

      res.json({
        status: 'success',
        data: user,
      })
    } catch (error) {
      next(error)
    }
  }

  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const updateData = req.body

      const user = await this.userRepository.findOne({
        where: { id },
      })

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        })
      }

      // Update user
      Object.assign(user, updateData)
      await this.userRepository.save(user)

      res.json({
        status: 'success',
        data: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const user = await this.userRepository.findOne({
        where: { id },
      })

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        })
      }

      await this.userRepository.remove(user)

      res.json({
        status: 'success',
        message: 'User deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  getAllQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const questions = await this.questionRepository.find({
        relations: ['student'],
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: questions,
      })
    } catch (error) {
      next(error)
    }
  }

  getQuestionById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params

      const question = await this.questionRepository.findOne({
        where: { id },
        relations: ['student', 'redoRecords', 'masteryRecords', 'similarQuestions'],
      })

      if (!question) {
        return res.status(404).json({
          status: 'error',
          message: 'Question not found',
        })
      }

      res.json({
        status: 'success',
        data: question,
      })
    } catch (error) {
      next(error)
    }
  }

  getSystemStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const totalUsers = await this.userRepository.count()
      const totalStudents = await this.userRepository.count({
        where: { role: 'student' as any },
      })
      const totalParents = await this.userRepository.count({
        where: { role: 'parent' as any },
      })
      const totalAdmins = await this.userRepository.count({
        where: { role: 'admin' as any },
      })

      const totalQuestions = await this.questionRepository.count()
      const totalRedos = await this.redoRepository.count()
      const totalMastery = await this.masteryRepository.count()

      const totalLLMCalls = await this.llmUsageRepository.count()
      const successfulLLMCalls = await this.llmUsageRepository.count({
        where: { success: true },
      })

      res.json({
        status: 'success',
        data: {
          users: {
            total: totalUsers,
            students: totalStudents,
            parents: totalParents,
            admins: totalAdmins,
          },
          questions: {
            total: totalQuestions,
          },
          redos: {
            total: totalRedos,
          },
          mastery: {
            total: totalMastery,
          },
          llm: {
            totalCalls: totalLLMCalls,
            successfulCalls: successfulLLMCalls,
            failedCalls: totalLLMCalls - successfulLLMCalls,
            successRate:
              totalLLMCalls > 0
                ? Math.round((successfulLLMCalls / totalLLMCalls) * 100)
                : 0,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getSystemHealth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Check database connection
      const dbConnected = AppDataSource.isInitialized

      // Check disk space (simplified)
      const diskSpace = {
        total: 0,
        used: 0,
        free: 0,
      }

      // Check memory usage
      const memoryUsage = process.memoryUsage()

      res.json({
        status: 'success',
        data: {
          database: {
            connected: dbConnected,
          },
          disk: diskSpace,
          memory: {
            rss: memoryUsage.rss,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
          },
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getSystemConfig = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const configs = await this.sysConfigRepository.find({
        order: { category: 'ASC', key: 'ASC' },
      })

      res.json({
        status: 'success',
        data: configs,
      })
    } catch (error) {
      next(error)
    }
  }

  updateSystemConfig = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { key, value, description, category } = req.body

      let config = await this.sysConfigRepository.findOne({
        where: { key },
      })

      if (config) {
        config.value = value
        if (description) config.description = description
        if (category) config.category = category
      } else {
        config = this.sysConfigRepository.create({
          key,
          value,
          description,
          category,
        })
      }

      await this.sysConfigRepository.save(config)

      res.json({
        status: 'success',
        data: config,
      })
    } catch (error) {
      next(error)
    }
  }
}
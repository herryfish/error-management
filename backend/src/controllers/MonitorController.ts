import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { MonitorLog, MonitorLogLevel, MonitorLogType } from '../models/MonitorLog'

export class MonitorController {
  private monitorLogRepository = AppDataSource.getRepository(MonitorLog)

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { level, type, acknowledged } = req.query

      const where: any = {}
      if (level) where.level = level
      if (type) where.type = type
      if (acknowledged !== undefined) where.acknowledged = acknowledged === 'true'

      const logs = await this.monitorLogRepository.find({
        where,
        order: { createdAt: 'DESC' },
        take: 100,
      })

      res.json({
        status: 'success',
        data: logs,
      })
    } catch (error) {
      next(error)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const log = await this.monitorLogRepository.findOne({
        where: { id },
      })

      if (!log) {
        return res.status(404).json({
          status: 'error',
          message: 'Monitor log not found',
        })
      }

      res.json({
        status: 'success',
        data: log,
      })
    } catch (error) {
      next(error)
    }
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { level, type, message, details, source, userId, ipAddress } = req.body

      const log = this.monitorLogRepository.create({
        level,
        type,
        message,
        details,
        source,
        userId,
        ipAddress,
      })

      await this.monitorLogRepository.save(log)

      res.status(201).json({
        status: 'success',
        data: log,
      })
    } catch (error) {
      next(error)
    }
  }

  acknowledge = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const userId = (req as any).user.id

      const log = await this.monitorLogRepository.findOne({
        where: { id },
      })

      if (!log) {
        return res.status(404).json({
          status: 'error',
          message: 'Monitor log not found',
        })
      }

      log.acknowledged = true
      log.acknowledgedBy = userId
      log.acknowledgedAt = new Date()

      await this.monitorLogRepository.save(log)

      res.json({
        status: 'success',
        data: log,
      })
    } catch (error) {
      next(error)
    }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const total = await this.monitorLogRepository.count()

      const byLevel = await this.monitorLogRepository
        .createQueryBuilder('log')
        .select('log.level', 'level')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.level')
        .getRawMany()

      const byType = await this.monitorLogRepository
        .createQueryBuilder('log')
        .select('log.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.type')
        .getRawMany()

      const recentErrors = await this.monitorLogRepository.find({
        where: { level: MonitorLogLevel.ERROR },
        order: { createdAt: 'DESC' },
        take: 10,
      })

      res.json({
        status: 'success',
        data: {
          total,
          byLevel,
          byType,
          recentErrors,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getHealth = async (req: Request, res: Response, next: NextFunction) => {
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

      // Check uptime
      const uptime = process.uptime()

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
          uptime,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
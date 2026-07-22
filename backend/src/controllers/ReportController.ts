/**
 * 报告控制器
 * 
 * 处理报告相关功能，包括：
 * - 获取周报
 * - 获取日报
 * - 获取统计信息
 * - 生成周报
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { WeeklyReport } from '../models/WeeklyReport'
import { Question } from '../models/Question'
import { RedoRecord } from '../models/RedoRecord'
import { Mastery, MasteryStatus } from '../models/Mastery'
import { SimilarQuestion } from '../models/SimilarQuestion'

/**
 * 报告控制器类
 * 
 * 提供报告相关的API接口
 */
export class ReportController {
  private weeklyReportRepository = AppDataSource.getRepository(WeeklyReport)
  private questionRepository = AppDataSource.getRepository(Question)
  private redoRepository = AppDataSource.getRepository(RedoRecord)
  private masteryRepository = AppDataSource.getRepository(Mastery)
  private similarRepository = AppDataSource.getRepository(SimilarQuestion)

  /**
   * 获取周报
   * 
   * @param {Request} req - 请求对象
   * @param {Response} res - 响应对象
   * @param {NextFunction} next - 下一个中间件
   * @returns {Promise<void>}
   */
  getWeeklyReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id

      // Get current week's report
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      let report = await this.weeklyReportRepository.findOne({
        where: {
          userId,
          weekStart,
          weekEnd,
        },
      })

      if (!report) {
        // Generate report if not exists
        report = await this.generateWeeklyReport(userId, weekStart, weekEnd)
      }

      res.json({
        status: 'success',
        data: report,
      })
    } catch (error) {
      next(error)
    }
  }

  getWeeklyReportByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params

      const reports = await this.weeklyReportRepository.find({
        where: { userId },
        order: { weekStart: 'DESC' },
        take: 10, // Last 10 weeks
      })

      res.json({
        status: 'success',
        data: reports,
      })
    } catch (error) {
      next(error)
    }
  }

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id

      const stats = await this.calculateStats(userId)

      res.json({
        status: 'success',
        data: stats,
      })
    } catch (error) {
      next(error)
    }
  }

  getStatsByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params

      const stats = await this.calculateStats(userId)

      res.json({
        status: 'success',
        data: stats,
      })
    } catch (error) {
      next(error)
    }
  }

  getDailyReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)

      // Get today's questions
      const questions = await this.questionRepository.find({
        where: {
          studentId,
          createdAt: {
            $gte: today,
            $lt: tomorrow,
          } as any,
        },
      })

      // Get today's redos
      const redos = await this.redoRepository.find({
        where: {
          studentId,
          createdAt: {
            $gte: today,
            $lt: tomorrow,
          } as any,
        },
      })

      // Get mastery stats
      const masteryStats = await this.masteryRepository
        .createQueryBuilder('mastery')
        .where('mastery.studentId = :studentId', { studentId })
        .getMany()

      const masteredCount = masteryStats.filter(
        (m) => m.status === MasteryStatus.MASTERED
      ).length
      const learningCount = masteryStats.filter(
        (m) => m.status === MasteryStatus.LEARNING
      ).length

      res.json({
        status: 'success',
        data: {
          date: today,
          questionsAdded: questions.length,
          redosCompleted: redos.length,
          correctRedos: redos.filter((r) => r.isCorrect).length,
          masteryStats: {
            total: masteryStats.length,
            mastered: masteredCount,
            learning: learningCount,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getWeeklyReportByStudent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params

      // Get student's user ID
      const student = await AppDataSource.getRepository('Student').findOne({
        where: { id: studentId },
        relations: ['user'],
      })

      if (!student || !student.user) {
        return res.status(404).json({
          status: 'error',
          message: 'Student not found',
        })
      }

      const userId = student.user.id

      // Get current week's report
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      let report = await this.weeklyReportRepository.findOne({
        where: {
          userId,
          weekStart,
          weekEnd,
        },
      })

      if (!report) {
        report = await this.generateWeeklyReport(userId, weekStart, weekEnd)
      }

      res.json({
        status: 'success',
        data: report,
      })
    } catch (error) {
      next(error)
    }
  }

  getChildReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { parentId } = req.params

      // Get parent's student
      const parent = await AppDataSource.getRepository('Parent').findOne({
        where: { id: parentId },
        relations: ['student', 'student.user'],
      })

      if (!parent || !parent.student || !parent.student.user) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent or child not found',
        })
      }

      const userId = parent.student.user.id

      // Get current week's report
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      let report = await this.weeklyReportRepository.findOne({
        where: {
          userId,
          weekStart,
          weekEnd,
        },
      })

      if (!report) {
        report = await this.generateWeeklyReport(userId, weekStart, weekEnd)
      }

      res.json({
        status: 'success',
        data: report,
      })
    } catch (error) {
      next(error)
    }
  }

  private async generateWeeklyReport(
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<WeeklyReport> {
    // Get questions added this week
    const questions = await this.questionRepository.find({
      where: {
        studentId: userId,
        createdAt: {
          $gte: weekStart,
          $lte: weekEnd,
        } as any,
      },
    })

    // Get redos this week
    const redos = await this.redoRepository.find({
      where: {
        studentId: userId,
        createdAt: {
          $gte: weekStart,
          $lte: weekEnd,
        } as any,
      },
    })

    // Get mastery stats
    const masteryRecords = await this.masteryRepository.find({
      where: { studentId: userId },
    })

    const masteredCount = masteryRecords.filter(
      (m) => m.status === MasteryStatus.MASTERED
    ).length

    // Get similar questions generated this week
    const similarQuestions = await this.similarRepository
      .createQueryBuilder('similar')
      .innerJoin('similar.originalQuestion', 'question')
      .where('question.studentId = :userId', { userId })
      .andWhere('similar.createdAt >= :weekStart', { weekStart })
      .andWhere('similar.createdAt <= :weekEnd', { weekEnd })
      .getMany()

    // Calculate weak points (knowledge points with low mastery)
    const weakPoints = this.calculateWeakPoints(masteryRecords)

    // Create report
    const report = this.weeklyReportRepository.create({
      userId,
      weekStart,
      weekEnd,
      weakPoints,
      totalQuestions: questions.length,
      masteredQuestions: masteredCount,
      similarQuestionsGenerated: similarQuestions.length,
      totalRedos: redos.length,
      masteryRate:
        masteryRecords.length > 0
          ? Math.round((masteredCount / masteryRecords.length) * 100)
          : 0,
    })

    await this.weeklyReportRepository.save(report)

    return report
  }

  private calculateWeakPoints(masteryRecords: Mastery[]): string[] {
    // Group by knowledge points and calculate mastery rate
    const knowledgePointStats: { [key: string]: { total: number; mastered: number } } = {}

    masteryRecords.forEach((record) => {
      // Assuming knowledge points are stored in question relation
      // For simplicity, we'll return empty array for now
    })

    // Return knowledge points with low mastery rate
    return Object.entries(knowledgePointStats)
      .filter(([_, stats]) => stats.mastered / stats.total < 0.5)
      .map(([point]) => point)
  }

  private async calculateStats(userId: string) {
    const totalQuestions = await this.questionRepository.count({
      where: { studentId: userId },
    })

    const totalRedos = await this.redoRepository.count({
      where: { studentId: userId },
    })

    const correctRedos = await this.redoRepository.count({
      where: {
        studentId: userId,
        isCorrect: true,
      },
    })

    const masteryRecords = await this.masteryRepository.find({
      where: { studentId: userId },
    })

    const masteredCount = masteryRecords.filter(
      (m) => m.status === MasteryStatus.MASTERED
    ).length

    return {
      totalQuestions,
      totalRedos,
      correctRedos,
      accuracyRate: totalRedos > 0 ? Math.round((correctRedos / totalRedos) * 100) : 0,
      masteryStats: {
        total: masteryRecords.length,
        mastered: masteredCount,
        learning: masteryRecords.filter((m) => m.status === MasteryStatus.LEARNING).length,
        new: masteryRecords.filter((m) => m.status === MasteryStatus.NEW).length,
      },
      masteryRate: masteryRecords.length > 0 ? Math.round((masteredCount / masteryRecords.length) * 100) : 0,
    }
  }
}
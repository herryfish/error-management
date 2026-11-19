/**
 * 掌握状态控制器
 * 
 * 处理掌握状态相关功能，包括：
 * - 获取掌握列表
 * - 创建掌握记录
 * - 复习掌握记录
 * - 获取复习队列
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { Mastery, MasteryStatus } from '../models/Mastery'
import { resolveStudentUserId } from '../utils/resolveStudentUserId'
import { applyReviewResult, startOfToday, endOfToday } from '../services/ReviewScheduler'

/**
 * 掌握状态控制器类
 * 
 * 提供掌握状态相关的API接口
 */
export class MasteryController {
  private masteryRepository = AppDataSource.getRepository(Mastery)

  /**
   * 获取所有掌握记录
   * 
   * @param {Request} req - 请求对象
   * @param {Response} res - 响应对象
   * @param {NextFunction} next - 下一个中间件
   * @returns {Promise<void>}
   */
  getAllMastery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const masteryRecords = await this.masteryRepository.find({
        relations: ['question', 'student'],
        order: { updatedAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: masteryRecords,
      })
    } catch (error) {
      next(error)
    }
  }

  getMasteryById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const mastery = await this.masteryRepository.findOne({
        where: { id },
        relations: ['question', 'student'],
      })

      if (!mastery) {
        return res.status(404).json({
          status: 'error',
          message: 'Mastery record not found',
        })
      }

      res.json({
        status: 'success',
        data: mastery,
      })
    } catch (error) {
      next(error)
    }
  }

  createMastery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionId, studentId } = req.body

      // Check if mastery record already exists
      const existingMastery = await this.masteryRepository.findOne({
        where: { questionId, studentId },
      })

      if (existingMastery) {
        return res.status(400).json({
          status: 'error',
          message: 'Mastery record already exists',
        })
      }

      const mastery = this.masteryRepository.create({
        questionId,
        studentId,
        status: MasteryStatus.NEW,
        correctCount: 0,
        incorrectCount: 0,
        intervalLevel: 0,
      })

      await this.masteryRepository.save(mastery)

      res.status(201).json({
        status: 'success',
        data: mastery,
      })
    } catch (error) {
      next(error)
    }
  }

  updateMastery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const updateData = req.body

      const mastery = await this.masteryRepository.findOne({
        where: { id },
      })

      if (!mastery) {
        return res.status(404).json({
          status: 'error',
          message: 'Mastery record not found',
        })
      }

      // Update mastery record
      Object.assign(mastery, updateData)
      await this.masteryRepository.save(mastery)

      res.json({
        status: 'success',
        data: mastery,
      })
    } catch (error) {
      next(error)
    }
  }

  reviewMastery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { isCorrect } = req.body

      const mastery = await this.masteryRepository.findOne({
        where: { id },
      })

      if (!mastery) {
        return res.status(404).json({
          status: 'error',
          message: 'Mastery record not found',
        })
      }

      // Update mastery based on review result (艾宾浩斯间隔调度：第 1/2/4/7/15 天)
      applyReviewResult(mastery, isCorrect)

      await this.masteryRepository.save(mastery)

      res.json({
        status: 'success',
        data: mastery,
      })
    } catch (error) {
      next(error)
    }
  }

  getMasteryByStudent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params
      // 口径归一：接受 students.id 或 users.id（评审 C1）
      const resolvedStudentId = await resolveStudentUserId(studentId)

      const masteryRecords = await this.masteryRepository.find({
        where: { studentId: resolvedStudentId },
        relations: ['question'],
        order: { updatedAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: masteryRecords,
      })
    } catch (error) {
      next(error)
    }
  }

  getReviewQueue = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params
      const resolvedStudentId = await resolveStudentUserId(studentId)

      const masteryRecords = await this.masteryRepository
        .createQueryBuilder('mastery')
        .leftJoinAndSelect('mastery.question', 'question')
        .where('mastery.studentId = :studentId', { studentId: resolvedStudentId })
        .andWhere('mastery.status != :status', { status: MasteryStatus.MASTERED })
        .andWhere(
          '((mastery.nextReviewDate IS NOT NULL AND mastery.nextReviewDate <= :endOfToday) OR (mastery.nextReviewDate IS NULL AND mastery.createdAt < :startOfToday))',
          {
            endOfToday: endOfToday(),
            startOfToday: startOfToday(),
          }
        )
        .orderBy('mastery.nextReviewDate', 'ASC')
        .getMany()

      res.json({
        status: 'success',
        data: masteryRecords,
      })
    } catch (error) {
      next(error)
    }
  }

  getMasteryStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params
      const resolvedStudentId = await resolveStudentUserId(studentId)

      const totalQuestions = await this.masteryRepository.count({
        where: { studentId: resolvedStudentId },
      })

      const masteredQuestions = await this.masteryRepository.count({
        where: {
          studentId: resolvedStudentId,
          status: MasteryStatus.MASTERED,
        },
      })

      const learningQuestions = await this.masteryRepository.count({
        where: {
          studentId: resolvedStudentId,
          status: MasteryStatus.LEARNING,
        },
      })

      const newQuestions = await this.masteryRepository.count({
        where: {
          studentId: resolvedStudentId,
          status: MasteryStatus.NEW,
        },
      })

      // 今日待复习：按艾宾浩斯间隔到期的复习数
      const todayDueQuestions = await this.masteryRepository
        .createQueryBuilder('mastery')
        .where('mastery.studentId = :studentId', { studentId: resolvedStudentId })
        .andWhere('mastery.status != :status', { status: MasteryStatus.MASTERED })
        .andWhere(
          '((mastery.nextReviewDate IS NOT NULL AND mastery.nextReviewDate <= :endOfToday) OR (mastery.nextReviewDate IS NULL AND mastery.createdAt < :startOfToday))',
          {
            endOfToday: endOfToday(),
            startOfToday: startOfToday(),
          }
        )
        .getCount()

      res.json({
        status: 'success',
        data: {
          totalQuestions,
          masteredQuestions,
          learningQuestions,
          newQuestions,
          todayDueQuestions,
          masteryRate:
            totalQuestions > 0
              ? Math.round((masteredQuestions / totalQuestions) * 100)
              : 0,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getMasteryByQuestion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { questionId } = req.params

      const masteryRecords = await this.masteryRepository.find({
        where: { questionId },
        relations: ['student'],
        order: { updatedAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: masteryRecords,
      })
    } catch (error) {
      next(error)
    }
  }
}
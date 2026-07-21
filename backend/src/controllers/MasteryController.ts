import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { Mastery, MasteryStatus } from '../models/Mastery'

export class MasteryController {
  private masteryRepository = AppDataSource.getRepository(Mastery)

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

      // Update mastery based on review result
      if (isCorrect) {
        mastery.correctCount += 1
        mastery.lastCorrectDate = new Date()

        // Check if mastery condition is met (3 correct in a row with intervals)
        if (mastery.correctCount >= 3) {
          mastery.status = MasteryStatus.MASTERED
        } else {
          mastery.status = MasteryStatus.LEARNING
          mastery.intervalLevel = Math.min(mastery.correctCount, 3)
        }
      } else {
        mastery.incorrectCount += 1
        mastery.lastIncorrectDate = new Date()
        mastery.status = MasteryStatus.LEARNING
        mastery.correctCount = 0
        mastery.intervalLevel = 0
      }

      // Calculate next review date based on interval level
      const intervals = [1, 7, 30] // days
      if (mastery.intervalLevel > 0 && mastery.intervalLevel <= intervals.length) {
        const daysToAdd = intervals[mastery.intervalLevel - 1]
        mastery.nextReviewDate = new Date()
        mastery.nextReviewDate.setDate(mastery.nextReviewDate.getDate() + daysToAdd)
      }

      mastery.lastReviewDate = new Date()
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

      const masteryRecords = await this.masteryRepository.find({
        where: { studentId },
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

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const masteryRecords = await this.masteryRepository
        .createQueryBuilder('mastery')
        .leftJoinAndSelect('mastery.question', 'question')
        .where('mastery.studentId = :studentId', { studentId })
        .andWhere('mastery.status != :status', { status: MasteryStatus.MASTERED })
        .andWhere(
          '(mastery.nextReviewDate IS NULL OR mastery.nextReviewDate <= :today)',
          { today }
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

      const totalQuestions = await this.masteryRepository.count({
        where: { studentId },
      })

      const masteredQuestions = await this.masteryRepository.count({
        where: {
          studentId,
          status: MasteryStatus.MASTERED,
        },
      })

      const learningQuestions = await this.masteryRepository.count({
        where: {
          studentId,
          status: MasteryStatus.LEARNING,
        },
      })

      const newQuestions = await this.masteryRepository.count({
        where: {
          studentId,
          status: MasteryStatus.NEW,
        },
      })

      res.json({
        status: 'success',
        data: {
          totalQuestions,
          masteredQuestions,
          learningQuestions,
          newQuestions,
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
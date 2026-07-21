import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { User } from '../models/User'
import { Student } from '../models/Student'
import { Parent } from '../models/Parent'
import { Question } from '../models/Question'
import { Mastery } from '../models/Mastery'
import { RedoRecord } from '../models/RedoRecord'

export class UserController {
  private userRepository = AppDataSource.getRepository(User)
  private studentRepository = AppDataSource.getRepository(Student)
  private parentRepository = AppDataSource.getRepository(Parent)
  private questionRepository = AppDataSource.getRepository(Question)
  private masteryRepository = AppDataSource.getRepository(Mastery)
  private redoRepository = AppDataSource.getRepository(RedoRecord)

  getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userRepository.find({
        select: ['id', 'username', 'role', 'createdAt'],
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

  getStudentQuestions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params

      const questions = await this.questionRepository.find({
        where: { studentId },
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

  getStudentStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params

      const totalQuestions = await this.questionRepository.count({
        where: { studentId },
      })

      const masteredQuestions = await this.masteryRepository.count({
        where: {
          studentId,
          status: 'mastered' as any,
        },
      })

      const totalRedos = await this.redoRepository.count({
        where: { studentId },
      })

      const correctRedos = await this.redoRepository.count({
        where: {
          studentId,
          isCorrect: true,
        },
      })

      res.json({
        status: 'success',
        data: {
          totalQuestions,
          masteredQuestions,
          masteryRate:
            totalQuestions > 0
              ? Math.round((masteredQuestions / totalQuestions) * 100)
              : 0,
          totalRedos,
          correctRedos,
          accuracyRate:
            totalRedos > 0
              ? Math.round((correctRedos / totalRedos) * 100)
              : 0,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getParentChild = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { parentId } = req.params

      const parent = await this.parentRepository.findOne({
        where: { id: parentId },
        relations: ['student'],
      })

      if (!parent || !parent.student) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent or child not found',
        })
      }

      res.json({
        status: 'success',
        data: parent.student,
      })
    } catch (error) {
      next(error)
    }
  }
}
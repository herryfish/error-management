import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { RedoRecord, RedoType } from '../models/RedoRecord'
import { LLMService } from '../services/LLMService'

export class RedoController {
  private redoRepository = AppDataSource.getRepository(RedoRecord)
  private llmService = new LLMService()

  getAllRedos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redos = await this.redoRepository.find({
        relations: ['question', 'student'],
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: redos,
      })
    } catch (error) {
      next(error)
    }
  }

  getRedoById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const redo = await this.redoRepository.findOne({
        where: { id },
        relations: ['question', 'student'],
      })

      if (!redo) {
        return res.status(404).json({
          status: 'error',
          message: 'Redo record not found',
        })
      }

      res.json({
        status: 'success',
        data: redo,
      })
    } catch (error) {
      next(error)
    }
  }

  createRedo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionId, answer } = req.body
      const userId = (req as any).user.id

      const redo = this.redoRepository.create({
        type: RedoType.ONLINE,
        answer,
        questionId,
        studentId: userId,
      })

      await this.redoRepository.save(redo)

      res.status(201).json({
        status: 'success',
        data: redo,
      })
    } catch (error) {
      next(error)
    }
  }

  createPhotoRedo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No image file provided',
        })
      }

      const { questionId } = req.body
      const userId = (req as any).user.id
      const imageUrl = `/uploads/${req.file.filename}`

      // Get question details for grading
      const questionRepository = AppDataSource.getRepository('Question')
      const question = await questionRepository.findOne({
        where: { id: questionId },
      })

      if (!question) {
        return res.status(404).json({
          status: 'error',
          message: 'Question not found',
        })
      }

      // Call LLM to grade the handwriting
      const gradingResult = await this.llmService.gradeHandwriting(
        question.content,
        req.file.path,
        question.answer || '',
        userId
      )

      const redo = this.redoRepository.create({
        type: RedoType.PHOTO,
        answer: gradingResult.feedback || '',
        questionId,
        studentId: userId,
        isCorrect: gradingResult.isCorrect,
        gradeResult: JSON.stringify(gradingResult),
        feedback: gradingResult.feedback,
        modelUsed: 'llm',
      })

      await this.redoRepository.save(redo)

      res.status(201).json({
        status: 'success',
        data: {
          redo,
          grading: gradingResult,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  gradeRedo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { isCorrect, feedback } = req.body

      const redo = await this.redoRepository.findOne({
        where: { id },
      })

      if (!redo) {
        return res.status(404).json({
          status: 'error',
          message: 'Redo record not found',
        })
      }

      // Update redo record
      redo.isCorrect = isCorrect
      redo.feedback = feedback
      await this.redoRepository.save(redo)

      res.json({
        status: 'success',
        data: redo,
      })
    } catch (error) {
      next(error)
    }
  }

  remarkRedo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { isCorrect } = req.body

      const redo = await this.redoRepository.findOne({
        where: { id },
      })

      if (!redo) {
        return res.status(404).json({
          status: 'error',
          message: 'Redo record not found',
        })
      }

      // Update redo record (student remark)
      redo.isCorrect = isCorrect
      await this.redoRepository.save(redo)

      res.json({
        status: 'success',
        data: redo,
      })
    } catch (error) {
      next(error)
    }
  }

  getRedosByStudent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params

      const redos = await this.redoRepository.find({
        where: { studentId },
        relations: ['question'],
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: redos,
      })
    } catch (error) {
      next(error)
    }
  }

  getRedosByQuestion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { questionId } = req.params

      const redos = await this.redoRepository.find({
        where: { questionId },
        relations: ['student'],
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: redos,
      })
    } catch (error) {
      next(error)
    }
  }
}
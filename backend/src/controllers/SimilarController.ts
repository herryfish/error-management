import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { SimilarQuestion } from '../models/SimilarQuestion'
import { Question } from '../models/Question'
import { LLMService } from '../services/LLMService'

export class SimilarController {
  private similarRepository = AppDataSource.getRepository(SimilarQuestion)
  private questionRepository = AppDataSource.getRepository(Question)
  private llmService = new LLMService()

  getAllSimilar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const similarQuestions = await this.similarRepository.find({
        relations: ['originalQuestion'],
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: similarQuestions,
      })
    } catch (error) {
      next(error)
    }
  }

  getSimilarById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const similar = await this.similarRepository.findOne({
        where: { id },
        relations: ['originalQuestion'],
      })

      if (!similar) {
        return res.status(404).json({
          status: 'error',
          message: 'Similar question not found',
        })
      }

      res.json({
        status: 'success',
        data: similar,
      })
    } catch (error) {
      next(error)
    }
  }

  generateSimilar = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { questionId } = req.body
      const userId = (req as any).user.id

      // Get original question
      const question = await this.questionRepository.findOne({
        where: { id: questionId },
      })

      if (!question) {
        return res.status(404).json({
          status: 'error',
          message: 'Question not found',
        })
      }

      // Generate similar question using LLM
      const similarContent = await this.llmService.generateSimilarQuestion(
        question.content,
        question.knowledgePoints,
        userId
      )

      // Create similar question record
      const similar = this.similarRepository.create({
        content: similarContent,
        originalQuestionId: questionId,
        isApplicable: true,
        generatedBy: 'llm',
      })

      await this.similarRepository.save(similar)

      res.status(201).json({
        status: 'success',
        data: similar,
      })
    } catch (error) {
      next(error)
    }
  }

  markAsApplicable = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params

      const similar = await this.similarRepository.findOne({
        where: { id },
      })

      if (!similar) {
        return res.status(404).json({
          status: 'error',
          message: 'Similar question not found',
        })
      }

      similar.isApplicable = true
      await this.similarRepository.save(similar)

      res.json({
        status: 'success',
        data: similar,
      })
    } catch (error) {
      next(error)
    }
  }

  markAsNotApplicable = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params
      const { reason } = req.body

      const similar = await this.similarRepository.findOne({
        where: { id },
      })

      if (!similar) {
        return res.status(404).json({
          status: 'error',
          message: 'Similar question not found',
        })
      }

      similar.isApplicable = false
      similar.reason = reason
      await this.similarRepository.save(similar)

      res.json({
        status: 'success',
        data: similar,
      })
    } catch (error) {
      next(error)
    }
  }

  getSimilarByQuestion = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { questionId } = req.params

      const similarQuestions = await this.similarRepository.find({
        where: { originalQuestionId: questionId },
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: similarQuestions,
      })
    } catch (error) {
      next(error)
    }
  }

  getSimilarByStudent = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { studentId } = req.params

      const similarQuestions = await this.similarRepository
        .createQueryBuilder('similar')
        .innerJoinAndSelect('similar.originalQuestion', 'question')
        .where('question.studentId = :studentId', { studentId })
        .orderBy('similar.createdAt', 'DESC')
        .getMany()

      res.json({
        status: 'success',
        data: similarQuestions,
      })
    } catch (error) {
      next(error)
    }
  }
}
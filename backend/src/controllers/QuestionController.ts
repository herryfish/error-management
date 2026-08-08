/**
 * 错题控制器
 * 
 * 处理错题相关功能，包括：
 * - 获取错题列表
 * - 创建错题
 * - 更新错题
 * - 删除错题
 * - AI识别错题
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { Question, Subject, QuestionType } from '../models/Question'
import { Mastery, MasteryStatus } from '../models/Mastery'
import { LLMService } from '../services/LLMService'
import { v4 as uuidv4 } from 'uuid'

/**
 * 错题控制器类
 * 
 * 提供错题相关的API接口
 */
export class QuestionController {
  private async ensureMasteryRecord(questionId: string, studentId: string) {
    const masteryRepository = AppDataSource.getRepository(Mastery)
    const existing = await masteryRepository.findOne({ where: { questionId } })
    if (!existing) {
      const mastery = masteryRepository.create({
        questionId,
        studentId,
        status: MasteryStatus.NEW,
        correctCount: 0,
        incorrectCount: 0,
        intervalLevel: 0,
      })
      await masteryRepository.save(mastery)
    }
  }

  private questionRepository = AppDataSource.getRepository(Question)
  private llmService = new LLMService()

  /**
   * 获取所有错题
   * 
   * @param {Request} req - 请求对象
   * @param {Response} res - 响应对象
   * @param {NextFunction} next - 下一个中间件
   * @returns {Promise<void>}
   */
  getAllQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const questions = await this.questionRepository.find({
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

  getQuestionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const question = await this.questionRepository.findOne({
        where: { id },
        relations: ['redoRecords', 'masteryRecords', 'similarQuestions'],
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

  createQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        content,
        subject,
        type,
        difficulty,
        knowledgePoints,
        answer,
        explanation,
      } = req.body

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null
      const userId = (req as any).user.id

      let parsedKnowledgePoints: string[] = []
      if (knowledgePoints) {
        if (typeof knowledgePoints === 'string') {
          try {
            parsedKnowledgePoints = JSON.parse(knowledgePoints)
          } catch (e) {
            parsedKnowledgePoints = knowledgePoints.split(',').map(s => s.trim()).filter(Boolean)
          }
        } else if (Array.isArray(knowledgePoints)) {
          parsedKnowledgePoints = knowledgePoints
        }
      }

      
      // 错题防重排查：根据 studentId + subject + title/content 校验
      const cleanContent = (content || title || '').replace(/[^一-龥a-zA-Z0-9]/g, '');
      if (cleanContent) {
        const existing = await this.questionRepository.find({ where: { studentId: userId, subject } });
        const duplicate = existing.find(q => {
          const targetClean = ((q.content || '') + (q.title || '')).replace(/[^一-龥a-zA-Z0-9]/g, '');
          return targetClean.length > 5 && (targetClean === cleanContent || targetClean.includes(cleanContent) || cleanContent.includes(targetClean));
        });

        if (duplicate && !(req.body.forceSave === true || req.body.forceSave === 'true')) {
          res.status(409).json({
            status: 'error',
            code: 'DUPLICATE_QUESTION',
            message: '该题目已存在于你的错题本中',
            data: { existingQuestionId: duplicate.id, existingTitle: duplicate.title }
          });
          return;
        }
      }

      const question = this.questionRepository.create({
        title,
        content,
        subject,
        type,
        difficulty: parseInt(difficulty) || 1,
        knowledgePoints: parsedKnowledgePoints,
        imageUrl,
        answer,
        explanation,
        studentId: userId,
        isIdentified: false,
      })

      await this.questionRepository.save(question)
      await this.ensureMasteryRecord((question as any).id, userId)

      res.status(201).json({
        status: 'success',
        data: question,
      })
    } catch (error) {
      next(error)
    }
  }

  updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const updateData = req.body

      const question = await this.questionRepository.findOne({
        where: { id },
      })

      if (!question) {
        return res.status(404).json({
          status: 'error',
          message: 'Question not found',
        })
      }

      // Update question
      Object.assign(question, updateData)
      await this.questionRepository.save(question)

      res.json({
        status: 'success',
        data: question,
      })
    } catch (error) {
      next(error)
    }
  }

  deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params

      const question = await this.questionRepository.findOne({
        where: { id },
      })

      if (!question) {
        return res.status(404).json({
          status: 'error',
          message: 'Question not found',
        })
      }

      await this.questionRepository.remove(question)

      res.json({
        status: 'success',
        message: 'Question deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  identifyQuestion = async (
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

      const imageUrl = `/uploads/${req.file.filename}`
      const userId = (req as any).user.id

      // Call LLM to identify the question
      const identificationResult = await this.llmService.identifyQuestion(
        req.file.path,
        userId
      )

      // Create question with identification results
      const question = this.questionRepository.create({
        title: identificationResult.title || 'Identified Question',
        content: identificationResult.content || '',
        subject: identificationResult.subject || Subject.MATH,
        type: identificationResult.type || QuestionType.ANSWER,
        difficulty: identificationResult.difficulty || 1,
        knowledgePoints: identificationResult.knowledgePoints || [],
        imageUrl: imageUrl || undefined,
        originalImageUrl: imageUrl || undefined,
        answer: identificationResult.answer,
        explanation: identificationResult.explanation,
        studentId: userId,
        isIdentified: true,
        confidence: identificationResult.confidence,
      } as any)

      await this.questionRepository.save(question)
      await this.ensureMasteryRecord((question as any).id, userId)

      res.status(201).json({
        status: 'success',
        data: {
          question,
          identification: identificationResult,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getQuestionsByStudent = async (
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

  searchQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, subject, type, difficulty, knowledgePoint, keyword } = req.query

      const queryBuilder = this.questionRepository.createQueryBuilder('question')

      if (studentId) {
        queryBuilder.where('question.studentId = :studentId', { studentId })
      }

      if (subject) {
        queryBuilder.andWhere('question.subject = :subject', { subject })
      }

      if (type) {
        queryBuilder.andWhere('question.type = :type', { type })
      }

      if (difficulty) {
        queryBuilder.andWhere('question.difficulty = :difficulty', { difficulty: parseInt(difficulty as string) })
      }

      if (knowledgePoint) {
        queryBuilder.andWhere('JSON_CONTAINS(question.knowledgePoints, :kp)', { kp: JSON.stringify(knowledgePoint) })
      }

      if (keyword) {
        queryBuilder.andWhere('(question.title LIKE :keyword OR question.content LIKE :keyword)', { keyword: `%${keyword}%` })
      }

      const questions = await queryBuilder.orderBy('question.createdAt', 'DESC').getMany()

      res.json({
        status: 'success',
        data: questions,
      })
    } catch (error) {
      next(error)
    }
  }

  getQuestionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params

      const total = await this.questionRepository.count({
        where: { studentId },
      })

      const bySubject = await this.questionRepository
        .createQueryBuilder('question')
        .select('question.subject', 'subject')
        .addSelect('COUNT(*)', 'count')
        .where('question.studentId = :studentId', { studentId })
        .groupBy('question.subject')
        .getRawMany()

      const byDifficulty = await this.questionRepository
        .createQueryBuilder('question')
        .select('question.difficulty', 'difficulty')
        .addSelect('COUNT(*)', 'count')
        .where('question.studentId = :studentId', { studentId })
        .groupBy('question.difficulty')
        .getRawMany()

      res.json({
        status: 'success',
        data: {
          total,
          bySubject,
          byDifficulty,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
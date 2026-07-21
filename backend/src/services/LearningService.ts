import { AppDataSource } from '../config/database'
import { Question } from '../models/Question'
import { Mastery, MasteryStatus } from '../models/Mastery'
import { RedoRecord } from '../models/RedoRecord'
import { SimilarQuestion } from '../models/SimilarQuestion'

export class LearningService {
  private questionRepository = AppDataSource.getRepository(Question)
  private masteryRepository = AppDataSource.getRepository(Mastery)
  private redoRepository = AppDataSource.getRepository(RedoRecord)
  private similarRepository = AppDataSource.getRepository(SimilarQuestion)

  async getTodayTasks(studentId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    // Get new questions that need to be reviewed
    const newQuestions = await this.masteryRepository
      .createQueryBuilder('mastery')
      .leftJoinAndSelect('mastery.question', 'question')
      .where('mastery.studentId = :studentId', { studentId })
      .andWhere('mastery.status = :status', { status: MasteryStatus.NEW })
      .andWhere('mastery.createdAt >= :today', { today })
      .andWhere('mastery.createdAt < :tomorrow', { tomorrow })
      .getMany()

    // Get questions that need review (due for review)
    const reviewQuestions = await this.masteryRepository
      .createQueryBuilder('mastery')
      .leftJoinAndSelect('mastery.question', 'question')
      .where('mastery.studentId = :studentId', { studentId })
      .andWhere('mastery.status != :status', { status: MasteryStatus.MASTERED })
      .andWhere('(mastery.nextReviewDate IS NULL OR mastery.nextReviewDate <= :today)', { today })
      .orderBy('mastery.nextReviewDate', 'ASC')
      .getMany()

    // Get weak questions (incorrect count > correct count)
    const weakQuestions = await this.masteryRepository
      .createQueryBuilder('mastery')
      .leftJoinAndSelect('mastery.question', 'question')
      .where('mastery.studentId = :studentId', { studentId })
      .andWhere('mastery.incorrectCount > mastery.correctCount')
      .andWhere('mastery.status != :status', { status: MasteryStatus.MASTERED })
      .getMany()

    // Get similar questions that are applicable
    const similarQuestions = await this.similarRepository
      .createQueryBuilder('similar')
      .innerJoinAndSelect('similar.originalQuestion', 'question')
      .where('question.studentId = :studentId', { studentId })
      .andWhere('similar.isApplicable = :isApplicable', { isApplicable: true })
      .getMany()

    return {
      newQuestions: newQuestions.map(m => m.question),
      reviewQuestions: reviewQuestions.map(m => m.question),
      weakQuestions: weakQuestions.map(m => m.question),
      similarQuestions: similarQuestions.map(s => ({
        original: s.originalQuestion,
        similar: s,
      })),
    }
  }

  async getWeeklyGoalProgress(studentId: string) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    // Get questions added this week
    const questionsAdded = await this.questionRepository.count({
      where: {
        studentId,
        createdAt: {
          $gte: weekStart,
          $lte: weekEnd,
        } as any,
      },
    })

    // Get redos completed this week
    const redosCompleted = await this.redoRepository.count({
      where: {
        studentId,
        createdAt: {
          $gte: weekStart,
          $lte: weekEnd,
        } as any,
      },
    })

    // Get mastery progress
    const masteryStats = await this.masteryRepository
      .createQueryBuilder('mastery')
      .where('mastery.studentId = :studentId', { studentId })
      .getMany()

    const masteredCount = masteryStats.filter(m => m.status === MasteryStatus.MASTERED).length
    const learningCount = masteryStats.filter(m => m.status === MasteryStatus.LEARNING).length

    return {
      questionsAdded,
      redosCompleted,
      masteryStats: {
        total: masteryStats.length,
        mastered: masteredCount,
        learning: learningCount,
      },
      weeklyGoal: {
        questionsTarget: 20,
        redosTarget: 15,
        questionsProgress: Math.min(100, Math.round((questionsAdded / 20) * 100)),
        redosProgress: Math.min(100, Math.round((redosCompleted / 15) * 100)),
      },
    }
  }

  async getRecommendedQuestions(studentId: string, limit: number = 5) {
    // Get questions with lowest mastery rate
    const questions = await this.masteryRepository
      .createQueryBuilder('mastery')
      .leftJoinAndSelect('mastery.question', 'question')
      .where('mastery.studentId = :studentId', { studentId })
      .andWhere('mastery.status != :status', { status: MasteryStatus.MASTERED })
      .orderBy('mastery.correctCount', 'ASC')
      .addOrderBy('mastery.incorrectCount', 'DESC')
      .limit(limit)
      .getMany()

    return questions.map(m => m.question)
  }
}
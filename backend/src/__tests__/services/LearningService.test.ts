const createMockQueryBuilder = (data: any[] = []) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(data),
})

const mockQuestionRepo = {
  count: jest.fn().mockResolvedValue(5),
  createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
}
const mockMasteryRepo = {
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
}
const mockRedoRepo = { count: jest.fn().mockResolvedValue(3) }
const mockSimilarRepo = { createQueryBuilder: jest.fn(() => createMockQueryBuilder()) }

jest.mock('../../config/database', () => {
  const repos = [mockQuestionRepo, mockMasteryRepo, mockRedoRepo, mockSimilarRepo]
  let idx = 0
  return {
    AppDataSource: {
      getRepository: jest.fn(() => repos[idx++] || mockQuestionRepo),
    },
  }
})

import { LearningService } from '../../services/LearningService'

describe('LearningService', () => {
  let service: LearningService

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset index for getRepository calls
    const repos = [mockQuestionRepo, mockMasteryRepo, mockRedoRepo, mockSimilarRepo]
    let idx = 0
    ;(require('../../config/database').AppDataSource.getRepository as jest.Mock).mockImplementation(() => repos[idx++] || mockQuestionRepo)
    service = new LearningService()
  })

  describe('getTodayTasks', () => {
    it('应该返回今日任务结构', async () => {
      const result = await service.getTodayTasks('student1')
      expect(result).toEqual(
        expect.objectContaining({
          newQuestions: expect.any(Array),
          reviewQuestions: expect.any(Array),
          weakQuestions: expect.any(Array),
          similarQuestions: expect.any(Array),
        })
      )
    })
  })

  describe('getWeeklyGoalProgress', () => {
    it('应该返回周目标进度', async () => {
      mockQuestionRepo.count.mockResolvedValue(5)
      mockRedoRepo.count.mockResolvedValue(3)
      mockMasteryRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([
          { status: 'mastered' },
          { status: 'learning' },
          { status: 'new' },
        ])
      )

      const result = await service.getWeeklyGoalProgress('student1')
      expect(result).toEqual(
        expect.objectContaining({
          questionsAdded: expect.any(Number),
          redosCompleted: expect.any(Number),
          masteryStats: expect.objectContaining({ total: 3, mastered: 1, learning: 1 }),
          weeklyGoal: expect.objectContaining({ questionsTarget: 20, redosTarget: 15 }),
        })
      )
    })
  })

  describe('getRecommendedQuestions', () => {
    it('应该返回推荐题目列表', async () => {
      mockMasteryRepo.createQueryBuilder.mockReturnValue(createMockQueryBuilder([]))
      const result = await service.getRecommendedQuestions('student1', 5)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})

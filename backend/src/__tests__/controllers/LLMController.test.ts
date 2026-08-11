import { LLMController } from '../../controllers/LLMController'

jest.mock('../../config/database', () => {
  const mockRepo = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    })),
  }
  return { AppDataSource: { getRepository: jest.fn(() => mockRepo) } }
})

const mockReq = (body: any = {}, params: any = {}): any => ({
  body, params,
  user: { id: 'admin1', role: 'admin' },
  headers: {},
})
const mockRes = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}
const mockNext = jest.fn()

describe('LLMController', () => {
  let controller: LLMController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new LLMController()
  })

  describe('getUsage', () => {
    it('应该返回LLM用量记录', async () => {
      const mockUsage = (controller as any).llmUsageRepository
      mockUsage.find.mockResolvedValue([
        { id: 'u1', provider: 'openai', model: 'gpt-4', tokensTotal: 100 },
      ])
      const res = mockRes()
      await controller.getUsage(mockReq(), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', data: expect.any(Array) })
      )
    })
  })

  describe('getConfig', () => {
    it('应该返回当前LLM配置', async () => {
      const res = mockRes()
      await controller.getConfig(mockReq(), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            primary: expect.objectContaining({ provider: expect.any(String) }),
            strategy: expect.objectContaining({ enabled: expect.any(Boolean) }),
          }),
        })
      )
    })
  })

  describe('getUsageSummary TDD Test', () => {
    it('应该正确计算总调用次数、成功次数、成功率，并返回数值类型的场景与模型统计', async () => {
      const mockUsageRepo = (controller as any).llmUsageRepository
      mockUsageRepo.count.mockResolvedValue(30)

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      }

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { scene: 'recognition', count: '24', totalTokens: '72000', totalCost: '0', avgLatency: '500' },
          { scene: 'grading', count: '6', totalTokens: '8000', totalCost: '0', avgLatency: '300' }
        ])
        .mockResolvedValueOnce([
          { provider: 'openai', model: 'gpt-4-vision-preview', isFallback: false, count: '30', totalTokens: '80000', totalCost: '0' }
        ])
        .mockResolvedValueOnce([
          { date: '2026-08-11', count: '30', totalTokens: '80000', totalCost: '0' }
        ])

      mockUsageRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const res = mockRes()
      await controller.getUsageSummary(mockReq(), res, mockNext)

      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          totalCalls: 30,
          successfulCalls: 30,
          failedCalls: 0,
          successRate: 100,
          totalTokens: 80000,
          totalCost: 0,
          sceneSummary: expect.arrayContaining([
            expect.objectContaining({ scene: 'recognition', count: 24, totalTokens: 72000 }),
            expect.objectContaining({ scene: 'grading', count: 6, totalTokens: 8000 })
          ]),
          modelSummary: expect.arrayContaining([
            expect.objectContaining({ model: 'gpt-4-vision-preview', count: 30, totalTokens: 80000 })
          ])
        })
      })
    })
  })
})

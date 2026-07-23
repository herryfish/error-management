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
})

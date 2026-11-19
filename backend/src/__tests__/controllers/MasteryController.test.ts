import { MasteryController } from '../../controllers/MasteryController'

jest.mock('../../config/database', () => {
  const mockRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
    })),
  }
  return { AppDataSource: { getRepository: jest.fn(() => mockRepo) } }
})

const mockReq = (body: any = {}, params: any = {}): any => ({
  body, params,
  user: { id: 'student1', role: 'student' },
  headers: {},
})
const mockRes = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}
const mockNext = jest.fn()

describe('MasteryController', () => {
  let controller: MasteryController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new MasteryController()
  })

  describe('getStats', () => {
    it('应该返回掌握统计数据', async () => {
      const mockMastery = (controller as any).masteryRepository
      mockMastery.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([
          { status: 'mastered', correctCount: 5, incorrectCount: 0 },
          { status: 'learning', correctCount: 2, incorrectCount: 3 },
          { status: 'new', correctCount: 0, incorrectCount: 0 },
        ]),
      })
      const res = mockRes()
      await controller.getMasteryStats(mockReq({}, { studentId: 's1' }), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )
    })
  })

  describe('getReviewQueue', () => {
    it('应该返回复习队列', async () => {
      const mockMastery = (controller as any).masteryRepository
      mockMastery.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })
      const res = mockRes()
      await controller.getReviewQueue(mockReq({}, { studentId: 's1' }), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', data: expect.any(Array) })
      )
    })
  })

  describe('createMastery', () => {
    it('应该成功创建掌握记录', async () => {
      const mockMastery = (controller as any).masteryRepository
      mockMastery.findOne.mockResolvedValue(null)
      mockMastery.create.mockImplementation((data: any) => ({ id: 'm1', ...data }))
      mockMastery.save.mockImplementation(async (data: any) => data)
      const res = mockRes()
      await controller.createMastery(mockReq({ questionId: 'q1', studentId: 's1' }), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('getStubbornQuestions（顽固薄弱点）', () => {
    it('应返回顽固题列表并过滤已掌握记录', async () => {
      const mockMastery = (controller as any).masteryRepository
      mockMastery.find.mockResolvedValue([
        { id: 'm1', status: 'learning', isStubborn: true, incorrectCount: 5, question: { id: 'q1' } },
        { id: 'm2', status: 'mastered', isStubborn: true, incorrectCount: 3, question: { id: 'q2' } },
      ])
      const res = mockRes()
      await controller.getStubbornQuestions(mockReq({}, { studentId: 's1' }), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: [expect.objectContaining({ id: 'm1' })],
        })
      )
      const payload = res.json.mock.calls[0][0]
      expect(payload.data).toHaveLength(1)
    })

    it('查询出错时走错误中间件', async () => {
      const mockMastery = (controller as any).masteryRepository
      mockMastery.find.mockRejectedValue(new Error('db error'))
      const res = mockRes()
      await controller.getStubbornQuestions(mockReq({}, { studentId: 's1' }), res, mockNext)
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('getSchedulerConfig（S3 轮次总数接口下发）', () => {
    it('返回调度器模式、展示口径总轮次与间隔表', async () => {
      const res = mockRes()
      await controller.getSchedulerConfig(mockReq(), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: {
            scheduler: 'ebbinghaus',
            totalRungs: 5,
            intervals: [1, 2, 4, 7, 15],
          },
        })
      )
    })
  })

  describe('getMasteryStats 顽固薄弱点计数', () => {
    it('统计结果应包含 stubbornQuestions 字段', async () => {
      const mockMastery = (controller as any).masteryRepository
      mockMastery.count.mockResolvedValue(2)
      mockMastery.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      })
      const res = mockRes()
      await controller.getMasteryStats(mockReq({}, { studentId: 's1' }), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ stubbornQuestions: 2 }),
        })
      )
    })
  })
})

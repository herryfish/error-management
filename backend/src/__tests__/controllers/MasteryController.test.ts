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
})

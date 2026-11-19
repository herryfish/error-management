import { RedoController } from '../../controllers/RedoController'

jest.mock('../../config/database', () => {
  const mockRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
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

describe('RedoController', () => {
  let controller: RedoController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new RedoController()
  })

  describe('createRedo', () => {
    it('应该成功创建重做记录', async () => {
      const mockRedo = (controller as any).redoRepository
      mockRedo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })
      mockRedo.create.mockImplementation((data: any) => ({ id: 'r1', ...data }))
      mockRedo.save.mockImplementation(async (data: any) => data)
      const res = mockRes()
      await controller.createRedo(
        mockReq({ questionId: 'q1', answer: 'x=1' }),
        res, mockNext
      )
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('查看完整解析兑底（assisted）且做对：本轮不推进掌握轮次、次日同轮重试', async () => {
      const mockRedo = (controller as any).redoRepository
      mockRedo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })
      mockRedo.create.mockImplementation((data: any) => ({ id: 'r2', ...data }))
      mockRedo.save.mockImplementation(async (data: any) => data)

      // 同一 mock 仓库对象既服务 redo 又服务 question/mastery：按调用顺序返回
      const question = { id: 'q1', type: 'choice', answer: 'A' }
      const mastery: any = {
        status: 'learning', correctCount: 1, incorrectCount: 0, intervalLevel: 1,
      }
      mockRedo.findOne
        .mockResolvedValueOnce(question)   // Question
        .mockResolvedValueOnce(mastery)    // Mastery
      mockRedo.save.mockResolvedValueOnce(mastery)

      const res = mockRes()
      await controller.createRedo(
        mockReq({ questionId: 'q1', answer: 'A', assisted: true }),
        res, mockNext
      )
      expect(res.status).toHaveBeenCalledWith(201)
      // 重做记录带 assisted 标记
      expect(mockRedo.create).toHaveBeenCalledWith(
        expect.objectContaining({ assisted: true, isCorrect: true })
      )
      // 未独立掌握：轮次不推进、不计连对、次日同轮重试
      expect(mastery.intervalLevel).toBe(1)
      expect(mastery.correctCount).toBe(1)
      expect(mastery.nextReviewDate!.getTime()).toBe(
        mastery.lastReviewDate.getTime() + 24 * 3600 * 1000
      )
    })
  })

  describe('gradeRedo', () => {
    it('应该成功批改重做记录', async () => {
      const mockRedo = (controller as any).redoRepository
      mockRedo.findOne.mockResolvedValue({ id: 'r1', isCorrect: false })
      mockRedo.save.mockImplementation(async (data: any) => data)
      const res = mockRes()
      await controller.gradeRedo(
        mockReq({ isCorrect: true, feedback: '正确' }, { id: 'r1' }),
        res, mockNext
      )
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )
    })

    it('应该在记录不存在时返回 404', async () => {
      const mockRedo = (controller as any).redoRepository
      mockRedo.findOne.mockResolvedValue(null)
      const res = mockRes()
      await controller.gradeRedo(mockReq({}, { id: 'nonexistent' }), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})

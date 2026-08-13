import { QuestionController } from '../../controllers/QuestionController'

jest.mock('../../config/database', () => {
  const mockRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      limit: jest.fn().mockReturnThis(),
    })),
  }
  return { AppDataSource: { getRepository: jest.fn(() => mockRepo) } }
})

jest.mock('../../services/LLMService', () => ({
  LLMService: jest.fn().mockImplementation(() => ({
    identifyQuestion: jest.fn().mockResolvedValue({
      title: '测试题',
      content: '求解 x+1=0',
      subject: 'math',
      type: 'answer',
      difficulty: 1,
      knowledgePoints: ['代数'],
      confidence: 0.95,
    }),
  })),
}))

const mockReq = (body: any = {}, params: any = {}, query: any = {}, file: any = null): any => ({
  body, params, query, file,
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

describe('QuestionController', () => {
  let controller: QuestionController
  let mockRepo: any

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new QuestionController()
    mockRepo = (controller as any).questionRepository
  })

  describe('getAllQuestions', () => {
    it('应该返回所有题目', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 'q1', title: '题目1' },
        { id: 'q2', title: '题目2' },
      ])
      const res = mockRes()
      await controller.getAllQuestions(mockReq(), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', data: expect.any(Array) })
      )
    })
  })

  describe('getQuestionById', () => {
    it('应该返回指定题目', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'q1', title: '测试题' })
      const res = mockRes()
      await controller.getQuestionById(mockReq({}, { id: 'q1' }), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )
    })

    it('应该在题目不存在时返回 404', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const res = mockRes()
      await controller.getQuestionById(mockReq({}, { id: 'nonexistent' }), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createQuestion', () => {
    it('应该成功创建题目', async () => {
      mockRepo.create.mockImplementation((data: any) => ({ id: 'new-q', ...data }))
      mockRepo.save.mockImplementation(async (data: any) => data)
      const res = mockRes()
      const req = mockReq({
        title: '新题目',
        content: '计算 1+1',
        subject: 'math',
        type: 'answer',
        difficulty: '1',
        knowledgePoints: '["算术"]',
      })
      await controller.createQuestion(req, res, mockNext)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success' })
      )
    })

    it('应该在有文件时保存图片路径', async () => {
      mockRepo.create.mockImplementation((data: any) => data)
      mockRepo.save.mockImplementation(async (data: any) => data)
      const res = mockRes()
      const req = mockReq(
        { title: '有图题目', content: '见图', subject: 'math', type: 'answer', difficulty: '1' },
        {},
        {},
        { filename: 'img-123.jpg' }
      )
      await controller.createQuestion(req, res, mockNext)
      const savedData = mockRepo.create.mock.calls[0][0]
      expect(savedData.imageUrl).toBe('/uploads/img-123.jpg')
    })
  })

  describe('deleteQuestion', () => {
    it('应该成功删除题目', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'q1' })
      mockRepo.remove.mockResolvedValue(undefined)
      const res = mockRes()
      await controller.deleteQuestion(mockReq({}, { id: 'q1' }), res, mockNext)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', message: expect.stringContaining('deleted') })
      )
    })

    it('应该在题目不存在时返回 404', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const res = mockRes()
      await controller.deleteQuestion(mockReq({}, { id: 'nonexistent' }), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('identifyQuestion', () => {
    it('应该在没有文件时返回 400', async () => {
      const res = mockRes()
      await controller.identifyQuestion(mockReq({}, {}, {}, null), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('应该在有文件时成功识别并保存题目', async () => {
      const fs = require('fs')
      jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('fake-image'))
      const res = mockRes()
      mockRepo.create.mockImplementation((data: any) => data)
      mockRepo.save.mockImplementation(async (data: any) => data)
      const req = mockReq({}, {}, {}, { filename: 'test.jpg', path: '/tmp/test.jpg' })
      await controller.identifyQuestion(req, res, mockNext)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ question: expect.any(Object) }),
        })
      )
      fs.readFileSync.mockRestore()
    })
  })

  describe('identifyMultiQuestions', () => {
    it('应该在没有上传文件时返回 400 错误', async () => {
      const res = mockRes()
      await controller.identifyMultiQuestions(mockReq({}, {}, {}, null), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('createBatchQuestions', () => {
    it('应该在请求体缺少 items 数组时返回 400 错误', async () => {
      const res = mockRes()
      await controller.createBatchQuestions(mockReq({}, {}, {}), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })
})

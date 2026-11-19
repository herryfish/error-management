import { GuidanceController } from '../../controllers/GuidanceController'

jest.mock('../../config/database', () => {
  const mockRepo = {
    findOne: jest.fn(),
  }
  return { AppDataSource: { getRepository: jest.fn(() => mockRepo) } }
})

jest.mock('../../services/LLMService', () => ({
  LLMService: jest.fn().mockImplementation(() => ({
    generateGuidanceHint: jest.fn(),
  })),
}))

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

const question = {
  id: 'q1',
  content: '求函数 f(x)=x² 在 [0,2] 的最小值',
  subject: 'math',
  type: 'answer',
  knowledgePoints: ['二次函数'],
}

describe('GuidanceController（评审 S3：错误口径收窄）', () => {
  let controller: GuidanceController
  let mockRepo: any
  let hintMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new GuidanceController()
    mockRepo = (controller as any).questionRepository
    hintMock = (controller as any).llmService.generateGuidanceHint
  })

  it('非法级别返回 400', async () => {
    const res = mockRes()
    await controller.askGuidance(mockReq({ questionId: 'q1', level: 5 }), res, mockNext)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(hintMock).not.toHaveBeenCalled()
  })

  it('题目不存在返回 404', async () => {
    mockRepo.findOne.mockResolvedValue(null)
    const res = mockRes()
    await controller.askGuidance(mockReq({ questionId: 'nope', level: 1 }), res, mockNext)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('LLM 生成失败才返回 502', async () => {
    mockRepo.findOne.mockResolvedValue(question)
    hintMock.mockRejectedValue(new Error('LLM timeout'))
    const res = mockRes()
    await controller.askGuidance(mockReq({ questionId: 'q1', level: 2 }), res, mockNext)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error' })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('DB 查询异常走 next(error) 而非 502', async () => {
    mockRepo.findOne.mockRejectedValue(new Error('db down'))
    const res = mockRes()
    await controller.askGuidance(mockReq({ questionId: 'q1', level: 1 }), res, mockNext)
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'db down' }))
    expect(res.status).not.toHaveBeenCalled()
  })

  it('成功返回提示与下一级别', async () => {
    mockRepo.findOne.mockResolvedValue(question)
    hintMock.mockResolvedValue('本题考查二次函数最值')
    const res = mockRes()
    await controller.askGuidance(mockReq({ questionId: 'q1', level: 3 }), res, mockNext)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({ level: 3, nextLevel: null }),
      })
    )
  })
})

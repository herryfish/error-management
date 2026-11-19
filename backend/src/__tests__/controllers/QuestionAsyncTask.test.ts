jest.mock('../../config/database', () => ({
  AppDataSource: { getRepository: jest.fn(() => null) },
}))
jest.mock('../../services/tasks/IdentificationTaskManager', () => ({
  identificationTaskManager: {
    submit: jest.fn(),
    getStatus: jest.fn(),
    init: jest.fn(),
    close: jest.fn(),
  },
}))

import { QuestionController } from '../../controllers/QuestionController'
import { identificationTaskManager } from '../../services/tasks/IdentificationTaskManager'

const submitMock = identificationTaskManager.submit as jest.Mock
const getStatusMock = identificationTaskManager.getStatus as jest.Mock

const mockReq = (body: any = {}, params: any = {}, file: any = null): any => ({
  body, params, file,
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

describe('QuestionController 异步整页识别端点', () => {
  let controller: QuestionController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new QuestionController()
  })

  describe('submitIdentifyMultiTask', () => {
    it('缺少文件返回 400', async () => {
      const res = mockRes()
      await controller.submitIdentifyMultiTask(mockReq(), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('提交成功返回 202 + taskId + statusUrl', async () => {
      submitMock.mockResolvedValue('task-123')
      const res = mockRes()
      await controller.submitIdentifyMultiTask(
        mockReq({ subject: 'math' }, {}, { path: '/uploads/img.jpg' }),
        res,
        mockNext
      )
      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          taskId: 'task-123',
          statusUrl: '/api/questions/identify-multi/tasks/task-123',
        },
      })
      expect(submitMock).toHaveBeenCalledWith({
        imagePath: '/uploads/img.jpg',
        userId: 'student1',
        subject: 'math',
      })
    })
  })

  describe('getIdentifyMultiTaskStatus', () => {
    it('任务不存在返回 404', async () => {
      getStatusMock.mockResolvedValue(null)
      const res = mockRes()
      await controller.getIdentifyMultiTaskStatus(mockReq({}, { taskId: 'gone' }), res, mockNext)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('返回任务状态数据', async () => {
      getStatusMock.mockResolvedValue({
        taskId: 't1',
        state: 'processing',
        progress: 55,
      })
      const res = mockRes()
      await controller.getIdentifyMultiTaskStatus(mockReq({}, { taskId: 't1' }), res, mockNext)
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { taskId: 't1', state: 'processing', progress: 55 },
      })
    })
  })
})

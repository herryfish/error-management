import { errorHandler } from '../../middleware/errorHandler'

const mockReq = {} as any
const mockRes = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}
const mockNext = jest.fn()

describe('errorHandler middleware', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

  afterEach(() => jest.clearAllMocks())
  afterAll(() => consoleSpy.mockRestore())

  it('应该返回 500 状态码和默认错误消息', () => {
    const err = new Error('Something went wrong')
    const res = mockRes()
    errorHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        statusCode: 500,
        message: 'Something went wrong',
      })
    )
  })

  it('应该使用自定义 statusCode', () => {
    const err: any = new Error('Not Found')
    err.statusCode = 404
    const res = mockRes()
    errorHandler(err, mockReq, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Not Found' })
    )
  })

  it('应该在 development 环境下返回 stack', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const err = new Error('Dev error')
    const res = mockRes()
    errorHandler(err, mockReq, res, mockNext)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ stack: expect.any(String) })
    )
    process.env.NODE_ENV = originalEnv
  })

  it('应该在 production 环境下不返回 stack', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const err = new Error('Prod error')
    const res = mockRes()
    errorHandler(err, mockReq, res, mockNext)
    const call = res.json.mock.calls[0][0]
    expect(call.stack).toBeUndefined()
    process.env.NODE_ENV = originalEnv
  })

  it('应该处理没有 message 的错误', () => {
    const err = { statusCode: 400 } as any
    const res = mockRes()
    errorHandler(err, mockReq, res, mockNext)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal Server Error' })
    )
  })
})

import { notFound } from '../../middleware/notFound'

describe('notFound middleware', () => {
  it('应该返回 404 状态码', () => {
    const req = { originalUrl: '/api/unknown' } as any
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    notFound(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('应该返回包含路径的错误消息', () => {
    const req = { originalUrl: '/api/nonexistent' } as any
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    notFound(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        statusCode: 404,
        message: expect.stringContaining('/api/nonexistent'),
      })
    )
  })

  it('应该处理根路径', () => {
    const req = { originalUrl: '/' } as any
    const res: any = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    notFound(req, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('/') })
    )
  })
})

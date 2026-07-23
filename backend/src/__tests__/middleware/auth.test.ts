import jwt from 'jsonwebtoken'
import { authenticate, authorize, AuthRequest } from '../../middleware/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'

const mockReq = (headers: Record<string, string> = {}): AuthRequest => ({
  headers,
} as any)

const mockRes = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockNext = jest.fn()

describe('authenticate middleware', () => {
  beforeEach(() => jest.clearAllMocks())

  it('应该在没有 Authorization header 时返回 401', () => {
    const req = mockReq()
    const res = mockRes()
    authenticate(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: expect.stringContaining('No token') })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('应该在 Authorization header 不以 Bearer 开头时返回 401', () => {
    const req = mockReq({ authorization: 'Basic abc123' })
    const res = mockRes()
    authenticate(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('应该在 Token 无效时返回 401', () => {
    const req = mockReq({ authorization: 'Bearer invalid-token' })
    const res = mockRes()
    authenticate(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid token' })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('应该在 Token 过期时返回 401', () => {
    const token = jwt.sign({ id: 'u1', role: 'student' }, JWT_SECRET, { expiresIn: '-1s' })
    const req = mockReq({ authorization: `Bearer ${token}` })
    const res = mockRes()
    authenticate(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('应该在 Token 有效时调用 next() 并设置 req.user', () => {
    const token = jwt.sign({ id: 'u1', role: 'student' }, JWT_SECRET)
    const req = mockReq({ authorization: `Bearer ${token}` })
    const res = mockRes()
    authenticate(req, res, mockNext)
    expect(mockNext).toHaveBeenCalled()
    expect(req.user).toEqual({ id: 'u1', role: 'student' })
  })

  it('应该正确解析 admin 角色的 Token', () => {
    const token = jwt.sign({ id: 'admin1', role: 'admin' }, JWT_SECRET)
    const req = mockReq({ authorization: `Bearer ${token}` })
    const res = mockRes()
    authenticate(req, res, mockNext)
    expect(req.user).toEqual({ id: 'admin1', role: 'admin' })
    expect(mockNext).toHaveBeenCalled()
  })
})

describe('authorize middleware', () => {
  beforeEach(() => jest.clearAllMocks())

  it('应该在 req.user 不存在时返回 401', () => {
    const req = mockReq() as AuthRequest
    req.user = undefined
    const res = mockRes()
    const middleware = authorize('student')
    middleware(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('应该在角色不匹配时返回 403', () => {
    const req = mockReq() as AuthRequest
    req.user = { id: 'u1', role: 'student' }
    const res = mockRes()
    const middleware = authorize('admin')
    middleware(req, res, mockNext)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Insufficient permissions') })
    )
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('应该在角色匹配时调用 next()', () => {
    const req = mockReq() as AuthRequest
    req.user = { id: 'u1', role: 'student' }
    const res = mockRes()
    const middleware = authorize('student', 'admin')
    middleware(req, res, mockNext)
    expect(mockNext).toHaveBeenCalled()
  })

  it('应该支持多个允许的角色', () => {
    const req = mockReq() as AuthRequest
    req.user = { id: 'u1', role: 'admin' }
    const res = mockRes()
    const middleware = authorize('student', 'admin')
    middleware(req, res, mockNext)
    expect(mockNext).toHaveBeenCalled()
  })
})

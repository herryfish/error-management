import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthController } from '../../controllers/AuthController'

jest.mock('../../config/database', () => {
  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }
  return {
    AppDataSource: {
      getRepository: jest.fn(() => mockRepo),
    },
  }
})

const mockReq = (body: any = {}, params: any = {}): any => ({ body, params, headers: {} })
const mockRes = () => {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}
const mockNext = jest.fn()

describe('AuthController', () => {
  let controller: AuthController
  let mockRepo: any

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new AuthController()
    mockRepo = (controller as any).userRepository
  })

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      mockRepo.create.mockImplementation((data: any) => ({ id: 'new-id', ...data }))
      mockRepo.save.mockImplementation(async (data: any) => data)

      const req = mockReq({
        username: 'newuser',
        password: 'password123',
        role: 'student',
        name: '测试学生',
      })
      const res = mockRes()

      await controller.register(req, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.objectContaining({ username: 'newuser', role: 'student' }),
            token: expect.any(String),
          }),
        })
      )
    })

    it('应该在用户名已存在时返回 400', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'existing', username: 'existinguser' })
      const req = mockReq({ username: 'existinguser', password: 'pass123' })
      const res = mockRes()

      await controller.register(req, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Username already exists' })
      )
    })

    it('应该在数据库错误时调用 next(error)', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('DB error'))
      const req = mockReq({ username: 'u', password: 'p' })
      const res = mockRes()

      await controller.register(req, res, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('login', () => {
    it('应该在用户名不存在时返回 401', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const req = mockReq({ username: 'nonexistent', password: 'pass' })
      const res = mockRes()

      await controller.login(req, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid credentials' })
      )
    })

    it('应该在密码错误时返回 401', async () => {
      const hashedPassword = await bcrypt.hash('correctpass', 10)
      mockRepo.findOne.mockResolvedValue({ id: 'u1', username: 'user1', password: hashedPassword, role: 'student' })
      const req = mockReq({ username: 'user1', password: 'wrongpass' })
      const res = mockRes()

      await controller.login(req, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('应该在登录成功时返回 token', async () => {
      const hashedPassword = await bcrypt.hash('pass123', 10)
      mockRepo.findOne.mockResolvedValue({ id: 'u1', username: 'user1', password: hashedPassword, role: 'student' })
      const req = mockReq({ username: 'user1', password: 'pass123' })
      const res = mockRes()

      await controller.login(req, res, mockNext)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({
            user: expect.objectContaining({ username: 'user1' }),
            token: expect.any(String),
          }),
        })
      )
    })
  })

  describe('me', () => {
    it('应该在用户不存在时返回 404', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const req = { user: { id: 'nonexistent' } } as any
      const res = mockRes()

      await controller.me(req, res, mockNext)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})

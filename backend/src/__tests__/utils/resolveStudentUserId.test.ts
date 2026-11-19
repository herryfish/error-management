jest.mock('../../config/database', () => {
  const mockStudentRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  }
  return {
    AppDataSource: {
      getRepository: jest.fn(() => mockStudentRepo),
      __mockStudentRepo: mockStudentRepo,
    },
  }
})

import { resolveStudentUserId } from '../../utils/resolveStudentUserId'

const { AppDataSource } = require('../../config/database')

const studentRepo = AppDataSource.__mockStudentRepo

beforeEach(() => {
  jest.clearAllMocks()
  studentRepo.findOne.mockReset().mockResolvedValue(null)
})

describe('resolveStudentUserId（studentId 口径归一，评审 C1）', () => {
  it('入参是学生档案 id（students.id）→ 解析为其登录用户 id（users.id）', async () => {
    studentRepo.findOne.mockResolvedValue({
      id: 'student-row-id',
      user: { id: 'user-login-id' },
    })

    expect(await resolveStudentUserId('student-row-id')).toBe('user-login-id')
    expect(studentRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'student-row-id' },
      relations: ['user'],
    })
  })

  it('入参不是学生档案 id（未命中 students 表）→ 原样返回（视为 users.id）', async () => {
    expect(await resolveStudentUserId('user-login-id')).toBe('user-login-id')
  })

  it('学生档案存在但缺 user 关联 → 原样返回，不抛错', async () => {
    studentRepo.findOne.mockResolvedValue({ id: 'student-row-id', user: null })
    expect(await resolveStudentUserId('student-row-id')).toBe('student-row-id')
  })

  it('空值原样返回', async () => {
    expect(await resolveStudentUserId('')).toBe('')
    expect(await resolveStudentUserId(null as any)).toBeNull()
    expect(studentRepo.findOne).not.toHaveBeenCalled()
  })
})

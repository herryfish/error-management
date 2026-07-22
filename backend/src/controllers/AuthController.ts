/**
 * 认证控制器
 * 
 * 处理用户认证相关功能，包括：
 * - 用户注册
 * - 用户登录
 * - 令牌刷新
 * - 用户登出
 * - 学生-家长绑定
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppDataSource } from '../config/database'
import { User, UserRole } from '../models/User'
import { Student } from '../models/Student'
import { Parent } from '../models/Parent'

/**
 * 认证控制器类
 * 
 * 提供用户认证相关的API接口
 */
export class AuthController {
  private userRepository = AppDataSource.getRepository(User)
  private studentRepository = AppDataSource.getRepository(Student)
  private parentRepository = AppDataSource.getRepository(Parent)

  /**
   * 用户注册
   * 
   * @param {Request} req - 请求对象，包含用户名、密码、角色等信息
   * @param {Response} res - 响应对象
   * @param {NextFunction} next - 下一个中间件
   * @returns {Promise<void>}
   * 
   * @example
   * // 注册学生
   * POST /api/auth/register
   * {
   *   "username": "student1",
   *   "password": "password123",
   *   "role": "student",
   *   "name": "张三"
   * }
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, role, name, grade, school, phone, email } = req.body

      // 检查用户是否已存在
      const existingUser = await this.userRepository.findOne({
        where: { username },
      })

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Username already exists',
        })
      }

      // 密码加密
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      // 创建用户
      const user = this.userRepository.create({
        username,
        password: hashedPassword,
        role: role || UserRole.STUDENT,
      })

      await this.userRepository.save(user)

      // 根据角色创建学生或家长档案
      if (user.role === UserRole.STUDENT) {
        const student = this.studentRepository.create({
          name: name || username,
          grade,
          school,
          user,
        })
        await this.studentRepository.save(student)
        user.studentId = student.id
        await this.userRepository.save(user)
      } else if (user.role === UserRole.PARENT) {
        const parent = this.parentRepository.create({
          name: name || username,
          phone,
          email,
          user,
        })
        await this.parentRepository.save(parent)
        user.parentId = parent.id
        await this.userRepository.save(user)
      }

      // 生成JWT令牌
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
      )

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
          token,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 用户登录
   * 
   * @param {Request} req - 请求对象，包含用户名和密码
   * @param {Response} res - 响应对象
   * @param {NextFunction} next - 下一个中间件
   * @returns {Promise<void>}
   * 
   * @example
   * // 登录
   * POST /api/auth/login
   * {
   *   "username": "student1",
   *   "password": "password123"
   * }
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body

      // Find user
      const user = await this.userRepository.findOne({
        where: { username },
      })

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        })
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        })
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
      )

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
          token,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body

      if (!token) {
        return res.status(400).json({
          status: 'error',
          message: 'Token is required',
        })
      }

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret'
      ) as any

      // Generate new token
      const newToken = jwt.sign(
        { id: decoded.id, role: decoded.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
      )

      res.json({
        status: 'success',
        data: {
          token: newToken,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // In a real app, you might want to invalidate the token
      res.json({
        status: 'success',
        message: 'Logged out successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id

      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'username', 'role', 'studentId', 'parentId'],
      })

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        })
      }

      res.json({
        status: 'success',
        data: user,
      })
    } catch (error) {
      next(error)
    }
  }

  bindParentStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.body
      const userId = (req as any).user.id

      // Check if the requesting user is the parent
      const parentUser = await this.userRepository.findOne({
        where: { id: userId },
      })

      if (!parentUser || parentUser.role !== UserRole.PARENT) {
        return res.status(403).json({
          status: 'error',
          message: 'Only parents can bind with students',
        })
      }

      // Check if parent exists
      const parent = await this.parentRepository.findOne({
        where: { id: parentUser.parentId },
      })

      if (!parent) {
        return res.status(404).json({
          status: 'error',
          message: 'Parent not found',
        })
      }

      // Check if student exists
      const student = await this.studentRepository.findOne({
        where: { id: studentId },
      })

      if (!student) {
        return res.status(404).json({
          status: 'error',
          message: 'Student not found',
        })
      }

      // Check if parent already has a student
      if (parent.student) {
        return res.status(400).json({
          status: 'error',
          message: 'Parent already has a student bound',
        })
      }

      // Check if student already has a parent
      if (student.parent) {
        return res.status(400).json({
          status: 'error',
          message: 'Student already has a parent bound',
        })
      }

      // Bind parent and student
      parent.student = student
      student.parent = parent

      await this.parentRepository.save(parent)
      await this.studentRepository.save(student)

      res.json({
        status: 'success',
        message: 'Parent and student bound successfully',
        data: {
          parentId: parent.id,
          studentId: student.id,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  unlinkParentStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id
      const user = await this.userRepository.findOne({
        where: { id: userId },
      })

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        })
      }

      if (user.role === UserRole.PARENT && user.parentId) {
        const parent = await this.parentRepository.findOne({
          where: { id: user.parentId },
          relations: ['student'],
        })

        if (parent && parent.student) {
          const student = parent.student
          student.parent = null as any
          await this.studentRepository.save(student)

          parent.student = null as any
          await this.parentRepository.save(parent)
        }
      } else if (user.role === UserRole.STUDENT && user.studentId) {
        const student = await this.studentRepository.findOne({
          where: { id: user.studentId },
          relations: ['parent'],
        })

        if (student && student.parent) {
          const parent = student.parent
          parent.student = null as any
          await this.parentRepository.save(parent)

          student.parent = null as any
          await this.studentRepository.save(student)
        }
      }

      res.json({
        status: 'success',
        message: 'Unlinked successfully',
      })
    } catch (error) {
      next(error)
    }
  }
}
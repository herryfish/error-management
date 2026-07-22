/**
 * 认证服务
 * 
 * 提供用户认证相关API，包括：
 * - 用户登录
 * - 用户注册
 * - 获取当前用户信息
 * - 用户登出
 * - 学生-家长绑定
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import api from '@/utils/api'

/**
 * 登录请求接口
 */
export interface LoginRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
}

/**
 * 注册请求接口
 */
export interface RegisterRequest {
  /** 用户名 */
  username: string
  /** 密码 */
  password: string
  /** 角色（student/parent/admin） */
  role: 'student' | 'parent' | 'admin'
  /** 姓名（可选） */
  name?: string
  /** 年级（可选，仅学生） */
  grade?: string
  /** 学校（可选，仅学生） */
  school?: string
  /** 手机号（可选，仅家长） */
  phone?: string
  /** 邮箱（可选，仅家长） */
  email?: string
}

/**
 * 认证响应接口
 */
export interface AuthResponse {
  /** 响应状态 */
  status: string
  /** 响应数据 */
  data: {
    /** 用户信息 */
    user: {
      /** 用户ID */
      id: string
      /** 用户名 */
      username: string
      /** 角色 */
      role: string
    }
    /** JWT令牌 */
    token: string
  }
}

/**
 * 认证服务
 * 
 * 提供用户认证相关的API接口
 */
export const authService = {
  /**
   * 用户登录
   * 
   * @param {LoginRequest} data - 登录请求数据
   * @returns {Promise<AuthResponse>} 认证响应
   * 
   * @example
   * const response = await authService.login({
   *   username: 'student1',
   *   password: 'password123'
   * })
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    return api.post('/auth/login', data)
  },

  /**
   * 用户注册
   * 
   * @param {RegisterRequest} data - 注册请求数据
   * @returns {Promise<AuthResponse>} 认证响应
   * 
   * @example
   * const response = await authService.register({
   *   username: 'student1',
   *   password: 'password123',
   *   role: 'student',
   *   name: '张三'
   * })
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return api.post('/auth/register', data)
  },

  /**
   * 获取当前用户信息
   * 
   * @returns {Promise<any>} 用户信息
   */
  async getMe() {
    return api.get('/auth/me')
  },

  /**
   * 用户登出
   * 
   * @returns {Promise<any>} 响应结果
   */
  async logout() {
    return api.post('/auth/logout')
  },

  /**
   * 绑定学生-家长关系
   * 
   * @param {string} studentId - 学生ID
   * @returns {Promise<any>} 响应结果
   */
  async bindParentStudent(studentId: string) {
    return api.post('/auth/bind', { studentId })
  },

  async unlinkParentStudent() {
    return api.post('/auth/unlink')
  },
}
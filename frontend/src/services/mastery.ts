/**
 * 掌握状态服务
 * 
 * 提供掌握状态相关API，包括：
 * - 获取掌握列表
 * - 创建掌握记录
 * - 复习掌握记录
 * - 获取复习队列
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import api from '@/utils/api'

/**
 * 掌握状态接口
 */
export interface Mastery {
  /** 掌握记录ID */
  id: string
  /** 状态（new/learning/mastered） */
  status: 'new' | 'learning' | 'mastered'
  /** 正确次数 */
  correctCount: number
  /** 错误次数 */
  incorrectCount: number
  /** 最后正确日期 */
  lastCorrectDate?: string
  /** 最后错误日期 */
  lastIncorrectDate?: string
  /** 下次复习日期 */
  nextReviewDate?: string
  /** 间隔等级 */
  intervalLevel: number
  /** 最后复习日期 */
  lastReviewDate?: string
  /** 题目ID */
  questionId: string
  /** 学生ID */
  studentId: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 掌握统计接口
 */
export interface MasteryStats {
  /** 总题目数 */
  totalQuestions: number
  /** 已掌握题目数 */
  masteredQuestions: number
  /** 学习中题目数 */
  learningQuestions: number
  /** 新题目数 */
  newQuestions: number
  /** 掌握率 */
  masteryRate: number
}

/**
 * 掌握状态服务
 * 
 * 提供掌握状态相关的API接口
 */
export const masteryService = {
  /**
   * 获取所有掌握记录
   * 
   * @returns {Promise<Mastery[]>} 掌握记录列表
   */
  async getAll(): Promise<Mastery[]> {
    const response = await api.get('/mastery')
    return response.data
  },

  async getById(id: string): Promise<Mastery> {
    const response = await api.get(`/mastery/${id}`)
    return response.data
  },

  async create(questionId: string, studentId: string): Promise<Mastery> {
    const response = await api.post('/mastery', { questionId, studentId })
    return response.data
  },

  async update(id: string, data: Partial<Mastery>): Promise<Mastery> {
    const response = await api.put(`/mastery/${id}`, data)
    return response.data
  },

  async review(id: string, isCorrect: boolean): Promise<Mastery> {
    const response = await api.put(`/mastery/${id}/review`, { isCorrect })
    return response.data
  },

  async getByStudent(studentId: string): Promise<Mastery[]> {
    const response = await api.get(`/mastery/student/${studentId}`)
    return response.data
  },

  async getReviewQueue(studentId: string): Promise<Mastery[]> {
    const response = await api.get(`/mastery/student/${studentId}/queue`)
    return response.data
  },

  async getStats(studentId: string): Promise<MasteryStats> {
    const response = await api.get(`/mastery/student/${studentId}/stats`)
    return response.data
  },

  async getByQuestion(questionId: string): Promise<Mastery[]> {
    const response = await api.get(`/mastery/question/${questionId}`)
    return response.data
  },
}
/**
 * 重做服务
 * 
 * 提供重做相关API，包括：
 * - 获取重做列表
 * - 创建重做记录
 * - 批改重做记录
 * - 学生改判
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import api from '@/utils/api'

/**
 * 重做记录接口
 */
export interface RedoRecord {
  /** 重做记录ID */
  id: string
  /** 类型（online/photo） */
  type: 'online' | 'photo'
  /** 答案 */
  answer: string
  /** 是否正确 */
  isCorrect: boolean
  /** 批改结果 */
  gradeResult?: string
  /** 使用的模型 */
  modelUsed?: string
  /** 批改反馈 */
  feedback?: string
  /** 题目ID */
  questionId: string
  /** 学生ID */
  studentId: string
  /** 创建时间 */
  createdAt: string
}

/**
 * 创建重做请求接口
 */
export interface CreateRedoRequest {
  /** 题目ID */
  questionId: string
  /** 答案 */
  answer: string
}

/**
 * 批改重做请求接口
 */
export interface GradeRedoRequest {
  /** 是否正确 */
  isCorrect: boolean
  /** 批改反馈 */
  feedback?: string
}

/**
 * 重做服务
 * 
 * 提供重做相关的API接口
 */
export const redoService = {
  /**
   * 获取所有重做记录
   * 
   * @returns {Promise<RedoRecord[]>} 重做记录列表
   */
  async getAll(): Promise<RedoRecord[]> {
    const response = await api.get('/redos')
    return response.data
  },

  async getById(id: string): Promise<RedoRecord> {
    const response = await api.get(`/redos/${id}`)
    return response.data
  },

  async create(data: CreateRedoRequest): Promise<RedoRecord> {
    const response = await api.post('/redos', data)
    return response.data
  },

  async createPhotoRedo(questionId: string, image: File): Promise<RedoRecord> {
    const formData = new FormData()
    formData.append('questionId', questionId)
    formData.append('image', image)
    const response = await api.post('/redos/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async grade(id: string, data: GradeRedoRequest): Promise<RedoRecord> {
    const response = await api.put(`/redos/${id}/grade`, data)
    return response.data
  },

  async remark(id: string, isCorrect: boolean): Promise<RedoRecord> {
    const response = await api.put(`/redos/${id}/remark`, { isCorrect })
    return response.data
  },

  async getByStudent(studentId: string): Promise<RedoRecord[]> {
    const response = await api.get(`/redos/student/${studentId}`)
    return response.data
  },

  async getByQuestion(questionId: string): Promise<RedoRecord[]> {
    const response = await api.get(`/redos/question/${questionId}`)
    return response.data
  },
}
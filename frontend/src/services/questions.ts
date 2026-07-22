/**
 * 错题服务
 * 
 * 提供错题相关API，包括：
 * - 获取错题列表
 * - 创建错题
 * - 更新错题
 * - 删除错题
 * - AI识别错题
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import api from '@/utils/api'

/**
 * 错题接口
 */
export interface Question {
  /** 题目ID */
  id: string
  /** 题目标题 */
  title: string
  /** 题目内容 */
  content: string
  /** 科目（math/physics/chemistry） */
  subject: 'math' | 'physics' | 'chemistry'
  /** 题目类型（choice/fill/answer） */
  type: 'choice' | 'fill' | 'answer'
  /** 难度等级（1-5） */
  difficulty: number
  /** 知识点标签 */
  knowledgePoints: string[]
  /** 图片URL */
  imageUrl?: string
  /** 原始图片URL */
  originalImageUrl?: string
  /** 参考答案 */
  answer?: string
  /** 解析说明 */
  explanation?: string
  /** 是否AI识别 */
  isIdentified: boolean
  /** 识别置信度 */
  confidence?: number
  /** 学生ID */
  studentId: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 创建错题请求接口
 */
export interface CreateQuestionRequest {
  /** 题目标题 */
  title: string
  /** 题目内容 */
  content: string
  /** 科目 */
  subject: string
  /** 题目类型 */
  type: string
  /** 难度等级 */
  difficulty: number
  /** 知识点标签 */
  knowledgePoints: string[]
  /** 参考答案 */
  answer?: string
  /** 解析说明 */
  explanation?: string
}

export interface SearchParams {
  studentId?: string
  subject?: string
  type?: string
  difficulty?: number
  knowledgePoint?: string
  keyword?: string
}

export const questionService = {
  async getAll(): Promise<Question[]> {
    const response = await api.get('/questions')
    return response.data
  },

  async getById(id: string): Promise<Question> {
    const response = await api.get(`/questions/${id}`)
    return response.data
  },

  async create(data: CreateQuestionRequest, image?: File): Promise<Question> {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'knowledgePoints') {
        formData.append(key, JSON.stringify(value))
      } else {
        formData.append(key, String(value))
      }
    })
    if (image) {
      formData.append('image', image)
    }
    const response = await api.post('/questions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async update(id: string, data: Partial<CreateQuestionRequest>): Promise<Question> {
    const response = await api.put(`/questions/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/questions/${id}`)
  },

  async identify(image: File): Promise<{ question: Question; identification: any }> {
    const formData = new FormData()
    formData.append('image', image)
    const response = await api.post('/questions/identify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async getByStudent(studentId: string): Promise<Question[]> {
    const response = await api.get(`/questions/student/${studentId}`)
    return response.data
  },

  async search(params: SearchParams): Promise<Question[]> {
    const response = await api.get('/questions/search', { params })
    return response.data
  },

  async getStats(studentId: string) {
    const response = await api.get(`/questions/stats/${studentId}`)
    return response.data
  },
}
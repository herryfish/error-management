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
  masteryLevel?: number
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
    console.log('[create] data:', data)
    console.log('[create] image:', image ? `${image.name} (${image.size}B)` : 'none')
    
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'knowledgePoints') {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, String(value))
        }
      }
    })
    if (image && image instanceof File) {
      formData.append('image', image, image.name || 'photo.jpg')
    }
    
    for (const [key, value] of formData.entries()) {
      console.log('[create] formData:', key, value instanceof File ? `File(${value.name})` : value)
    }
    
    const token = localStorage.getItem('token')
    console.log('[create] sending request to /api/questions...')
    
    const response = await fetch('/api/questions', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    
    console.log('[create] response status:', response.status)
    const result = await response.json()
    console.log('[create] result:', result)
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`)
    }
    
    return result
  },

  async update(id: string, data: Partial<CreateQuestionRequest>): Promise<Question> {
    const response = await api.put(`/questions/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/questions/${id}`)
  },

  async identify(image: File): Promise<any> {
    console.log('[identify] image type:', typeof image, image?.constructor?.name)
    console.log('[identify] image instanceof File:', image instanceof File)
    console.log('[identify] image.name:', image?.name, 'size:', image?.size, 'type:', image?.type)
    
    const formData = new FormData()
    formData.append('image', image, image.name || 'photo.jpg')
    
    const token = localStorage.getItem('token')
    const response = await fetch('/api/questions/identify', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    
    const result = await response.json()
    console.log('[identify] response:', response.status, result)
    
    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}`)
    }
    
    return result
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
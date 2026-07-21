import api from '@/utils/api'

export interface Question {
  id: string
  title: string
  content: string
  subject: 'math' | 'physics' | 'chemistry'
  type: 'choice' | 'fill' | 'answer'
  difficulty: number
  knowledgePoints: string[]
  imageUrl?: string
  originalImageUrl?: string
  answer?: string
  explanation?: string
  isIdentified: boolean
  confidence?: number
  studentId: string
  createdAt: string
  updatedAt: string
}

export interface CreateQuestionRequest {
  title: string
  content: string
  subject: string
  type: string
  difficulty: number
  knowledgePoints: string[]
  answer?: string
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
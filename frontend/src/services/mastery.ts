import api from '@/utils/api'

export interface Mastery {
  id: string
  status: 'new' | 'learning' | 'mastered'
  correctCount: number
  incorrectCount: number
  lastCorrectDate?: string
  lastIncorrectDate?: string
  nextReviewDate?: string
  intervalLevel: number
  lastReviewDate?: string
  questionId: string
  studentId: string
  createdAt: string
  updatedAt: string
}

export interface MasteryStats {
  totalQuestions: number
  masteredQuestions: number
  learningQuestions: number
  newQuestions: number
  masteryRate: number
}

export const masteryService = {
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
import api from '@/utils/api'

export interface RedoRecord {
  id: string
  type: 'online' | 'photo'
  answer: string
  isCorrect: boolean
  gradeResult?: string
  modelUsed?: string
  feedback?: string
  questionId: string
  studentId: string
  createdAt: string
}

export interface CreateRedoRequest {
  questionId: string
  answer: string
}

export interface GradeRedoRequest {
  isCorrect: boolean
  feedback?: string
}

export const redoService = {
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
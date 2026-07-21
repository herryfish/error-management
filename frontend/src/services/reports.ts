import api from '@/utils/api'

export interface WeeklyReport {
  id: string
  weekStart: string
  weekEnd: string
  weakPoints: string[]
  totalQuestions: number
  masteredQuestions: number
  similarQuestionsGenerated: number
  totalRedos: number
  masteryRate: number
  userId: string
  createdAt: string
}

export interface DailyReport {
  date: string
  questionsAdded: number
  redosCompleted: number
  correctRedos: number
  masteryStats: {
    total: number
    mastered: number
    learning: number
  }
}

export interface Stats {
  totalQuestions: number
  totalRedos: number
  correctRedos: number
  accuracyRate: number
  masteryStats: {
    total: number
    mastered: number
    learning: number
    new: number
  }
  masteryRate: number
}

export const reportService = {
  async getWeeklyReport(): Promise<WeeklyReport> {
    const response = await api.get('/reports/weekly')
    return response.data
  },

  async getWeeklyReportByUser(userId: string): Promise<WeeklyReport[]> {
    const response = await api.get(`/reports/weekly/${userId}`)
    return response.data
  },

  async getStats(): Promise<Stats> {
    const response = await api.get('/reports/stats')
    return response.data
  },

  async getStatsByUser(userId: string): Promise<Stats> {
    const response = await api.get(`/reports/stats/${userId}`)
    return response.data
  },

  async getDailyReport(studentId: string): Promise<DailyReport> {
    const response = await api.get(`/reports/student/${studentId}/daily`)
    return response.data
  },

  async getWeeklyReportByStudent(studentId: string): Promise<WeeklyReport> {
    const response = await api.get(`/reports/student/${studentId}/weekly`)
    return response.data
  },

  async getChildReport(parentId: string): Promise<WeeklyReport> {
    const response = await api.get(`/reports/parent/${parentId}/child`)
    return response.data
  },
}
/**
 * 报告服务
 * 
 * 提供报告相关API，包括：
 * - 获取周报
 * - 获取日报
 * - 获取统计信息
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import api from '@/utils/api'

/**
 * 周报接口
 */
export interface WeeklyReport {
  /** 周报ID */
  id: string
  /** 周开始日期 */
  weekStart: string
  /** 周结束日期 */
  weekEnd: string
  /** 薄弱知识点 */
  weakPoints: string[]
  /** 总题目数 */
  totalQuestions: number
  /** 已掌握题目数 */
  masteredQuestions: number
  /** 生成的相似题数 */
  similarQuestionsGenerated: number
  /** 总重做次数 */
  totalRedos: number
  /** 掌握率 */
  masteryRate: number
  /** 用户ID */
  userId: string
  /** 创建时间 */
  createdAt: string
}

/**
 * 日报接口
 */
export interface DailyReport {
  /** 日期 */
  date: string
  /** 新增题目数 */
  questionsAdded: number
  /** 完成重做数 */
  redosCompleted: number
  /** 正确重做数 */
  correctRedos: number
  /** 掌握统计 */
  masteryStats: {
    /** 总题目数 */
    total: number
    /** 已掌握题目数 */
    mastered: number
    /** 学习中题目数 */
    learning: number
  }
}

/**
 * 统计接口
 */
export interface Stats {
  /** 总题目数 */
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
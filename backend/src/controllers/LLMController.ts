/**
 * LLM控制器
 * 
 * 处理LLM相关功能，包括：
 * - LLM用量查询
 * - LLM配置管理
 * - LLM用量统计
 * 
 * @author 开发团队
 * @date 2026-07-22
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'
import { AppDataSource } from '../config/database'
import { LLMUsage } from '../models/LLMUsage'
import { User } from '../models/User'

/**
 * LLM控制器类
 * 
 * 提供LLM相关的API接口
 */
export class LLMController {
  private llmUsageRepository = AppDataSource.getRepository(LLMUsage)
  private userRepository = AppDataSource.getRepository(User)

  /**
   * 获取LLM用量
   * 
   * @param {Request} req - 请求对象
   * @param {Response} res - 响应对象
   * @param {NextFunction} next - 下一个中间件
   * @returns {Promise<void>}
   */
  getUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usage = await this.llmUsageRepository.find({
        order: { createdAt: 'DESC' },
        take: 100, // Last 100 records
      })

      res.json({
        status: 'success',
        data: usage,
      })
    } catch (error) {
      next(error)
    }
  }

  getUsageByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { userId } = req.params

      const usage = await this.llmUsageRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
      })

      res.json({
        status: 'success',
        data: usage,
      })
    } catch (error) {
      next(error)
    }
  }


  getUsageByUserStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.llmUsageRepository
        .createQueryBuilder('usage')
        .select('usage.userId', 'userId')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(usage.tokensTotal)', 'tokensTotal')
        .addSelect('SUM(usage.tokensInput)', 'tokensInput')
        .addSelect('SUM(usage.tokensOutput)', 'tokensOutput')
        .groupBy('usage.userId')
        .getRawMany()

      const result = await Promise.all(
        stats.map(async (s) => {
          const user = s.userId ? await this.userRepository.findOne({ where: { id: s.userId } }) : null
          return {
            userId: s.userId,
            username: user ? user.username : '匿名/系统',
            role: user ? user.role : 'system',
            count: Number(s.count || 0),
            tokensInput: Number(s.tokensInput || 0),
            tokensOutput: Number(s.tokensOutput || 0),
            tokensTotal: Number(s.tokensTotal || 0),
          }
        })
      )

      res.json({
        status: 'success',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  getUsageByDateStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.llmUsageRepository
        .createQueryBuilder('usage')
        .select('DATE(usage.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(usage.tokensTotal)', 'tokensTotal')
        .groupBy('DATE(usage.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany()

      const formatted = stats.map((s) => ({
        date: s.date,
        count: Number(s.count || 0),
        tokensTotal: Number(s.tokensTotal || 0),
      }))

      res.json({
        status: 'success',
        data: formatted,
      })
    } catch (error) {
      next(error)
    }
  }

  getUsageSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Get summary by scene
      const sceneSummary = await this.llmUsageRepository
        .createQueryBuilder('usage')
        .select('usage.scene', 'scene')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(usage.tokensTotal)', 'totalTokens')
        .addSelect('SUM(usage.cost)', 'totalCost')
        .addSelect('AVG(usage.latencyMs)', 'avgLatency')
        .groupBy('usage.scene')
        .getRawMany()

      // Get summary by model
      const modelSummary = await this.llmUsageRepository
        .createQueryBuilder('usage')
        .select('usage.provider', 'provider')
        .addSelect('usage.model', 'model')
        .addSelect('usage.isFallback', 'isFallback')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(usage.tokensTotal)', 'totalTokens')
        .addSelect('SUM(usage.cost)', 'totalCost')
        .groupBy('usage.provider')
        .addGroupBy('usage.model')
        .addGroupBy('usage.isFallback')
        .getRawMany()

      // Get daily summary for last 7 days
      const dailySummary = await this.llmUsageRepository
        .createQueryBuilder('usage')
        .select('DATE(usage.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(usage.tokensTotal)', 'totalTokens')
        .addSelect('SUM(usage.cost)', 'totalCost')
        .where('usage.createdAt >= :startDate', {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        })
        .groupBy('DATE(usage.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany()

      // Get success rate
      const totalCalls = await this.llmUsageRepository.count()
      const successfulCalls = await this.llmUsageRepository.count({
        where: { success: true },
      })

      const formattedSceneSummary = sceneSummary.map((s: any) => ({
        ...s,
        count: Number(s.count || 0),
        totalTokens: Number(s.totalTokens || 0),
        totalCost: Number(s.totalCost || 0),
        avgLatency: Number(s.avgLatency || 0),
      }))

      const formattedModelSummary = modelSummary.map((m: any) => ({
        ...m,
        count: Number(m.count || 0),
        totalTokens: Number(m.totalTokens || 0),
        totalCost: Number(m.totalCost || 0),
      }))

      const formattedDailySummary = dailySummary.map((d: any) => ({
        ...d,
        count: Number(d.count || 0),
        totalTokens: Number(d.totalTokens || 0),
        totalCost: Number(d.totalCost || 0),
      }))

      const totalTokensSum = formattedSceneSummary.reduce((acc: number, cur: any) => acc + cur.totalTokens, 0)
      const totalCostSum = formattedSceneSummary.reduce((acc: number, cur: any) => acc + cur.totalCost, 0)

      res.json({
        status: 'success',
        data: {
          totalCalls,
          successfulCalls,
          failedCalls: totalCalls - successfulCalls,
          successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0,
          totalTokens: totalTokensSum,
          totalCost: totalCostSum,
          sceneSummary: formattedSceneSummary,
          modelSummary: formattedModelSummary,
          dailySummary: formattedDailySummary,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Return current LLM configuration (without sensitive data)
      const config = {
        primary: {
          provider: process.env.LLM_PRIMARY_PROVIDER || 'openai',
          model: process.env.LLM_PRIMARY_MODEL || 'gpt-4-vision-preview',
          apiBase: process.env.LLM_PRIMARY_API_BASE,
        },
        fallback: process.env.LLM_FALLBACK_PROVIDER
          ? {
              provider: process.env.LLM_FALLBACK_PROVIDER,
              model: process.env.LLM_FALLBACK_MODEL,
              apiBase: process.env.LLM_FALLBACK_API_BASE,
            }
          : null,
        strategy: {
          enabled: process.env.LLM_FALLBACK_ENABLED === 'true',
          retryCount: parseInt(process.env.LLM_FALLBACK_RETRY_COUNT || '2'),
          timeoutMs: parseInt(process.env.LLM_FALLBACK_TIMEOUT_MS || '30000'),
        },
      }

      res.json({
        status: 'success',
        data: config,
      })
    } catch (error) {
      next(error)
    }
  }

  updateConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { primary, fallback, strategy } = req.body

      // Update environment variables (in production, this would update a config file or database)
      if (primary) {
        process.env.LLM_PRIMARY_PROVIDER = primary.provider
        process.env.LLM_PRIMARY_MODEL = primary.model
        if (primary.apiKey) process.env.LLM_PRIMARY_API_KEY = primary.apiKey
        if (primary.apiBase) process.env.LLM_PRIMARY_API_BASE = primary.apiBase
      }

      if (fallback) {
        process.env.LLM_FALLBACK_PROVIDER = fallback.provider
        process.env.LLM_FALLBACK_MODEL = fallback.model
        if (fallback.apiKey) process.env.LLM_FALLBACK_API_KEY = fallback.apiKey
        if (fallback.apiBase) process.env.LLM_FALLBACK_API_BASE = fallback.apiBase
      }

      if (strategy) {
        process.env.LLM_FALLBACK_ENABLED = strategy.enabled?.toString() || 'false'
        process.env.LLM_FALLBACK_RETRY_COUNT = strategy.retryCount?.toString() || '2'
        process.env.LLM_FALLBACK_TIMEOUT_MS = strategy.timeoutMs?.toString() || '30000'
      }

      res.json({
        status: 'success',
        message: 'LLM configuration updated successfully',
      })
    } catch (error) {
      next(error)
    }
  }
}